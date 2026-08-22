// Screen management: menu / high scores / pause / level-up cards / game over / quit,
// plus transient #banner and #hurt-flash.
// State-driven: one per-frame poll of game.state (toMenu() emits no bus event, so
// polling is the reliable source of truth); the bus drives transients
// ('banner', 'hurt', 'cards', 'gameover').
// High scores persist in localStorage (CFG.scores).

import { CFG } from '../config.js';
import { fmtTime } from '../utils/math.js';
import { upgradeCost, isUnlocked, saveSelectedLevel } from '../core/meta.js';
import { LEVELS, LEVEL_ORDER } from '../world/levels.js';
import { cardEffectText } from '../entities/player.js';

// --- pure (Node-tested) ---

// Insert entry into the sorted score list. Returns { list (top max), rank, isRecord }.
// rank = entry's final position, or -1 when it missed the cut; isRecord = rank 0.
export function rankScore(entries, entry, max = 10) {
  const cmp = (a, b) => b.score - a.score || b.time - a.time || b.kills - a.kills;
  const list = entries.concat([entry]).sort(cmp);
  const rank = list.indexOf(entry);
  if (rank >= max) return { list: list.slice(0, max), rank: -1, isRecord: false };
  return { list: list.slice(0, max), rank, isRecord: rank === 0 };
}

export function loadScores(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((s) => s && typeof s.score === 'number' && typeof s.time === 'number');
  } catch { return []; }
}

export function saveScores(key, list, max = 10) {
  try { localStorage.setItem(key, JSON.stringify(list.slice(0, max))); } catch { /* private mode */ }
}

// Per-level score-list LS keys (13.9): Map 01 keeps the ORIGINAL key (no data loss);
// other levels get siblings `qsurv.hiscores.<level>.v1`.
export function scoreKeyFor(levelKey) {
  return levelKey === LEVEL_ORDER[0] ? CFG.scores.storageKey : `qsurv.hiscores.${levelKey}.v1`;
}

// --- browser ---

export function initScreens(game, { icons }) {
  const $ = (id) => document.getElementById(id);
  const screens = {
    menu: $('screen-menu'),
    scores: $('screen-scores'),
    pause: $('screen-pause'),
    levelup: $('screen-levelup'),
    gameover: $('screen-gameover'),
    quit: $('screen-quit'),
    upgrades: $('screen-upgrades'),
  };
  const banner = $('banner');
  const hurtFlash = $('hurt-flash');
  const cardsEl = $('cards');
  const scoresList = $('scores-list');
  const goTitle = $('go-title');
  const goNewRecord = $('go-newrecord');
  const goStats = $('go-stats');
  const metaShards = $('meta-shards');
  const metaList = $('meta-list');
  const levelSelect = $('level-select');
  const { max } = CFG.scores;

  let cur = '';
  let overlay = null; // 'scores' | 'quit' | 'upgrades' | null — local overlays above the menu
  let hurtTimer = null;
  let bannerQueue = [];
  let bannerAt = 0;

  const show = (name) => { for (const k of Object.keys(screens)) screens[k].classList.toggle('hidden', k !== name); };

  // --- level select (13.7): 3 radio cards; locked visible + denied; selection persists ---
  function renderLevels() {
    levelSelect.innerHTML = '';
    const wins = game.wins;
    for (const key of LEVEL_ORDER) {
      const lvl = LEVELS[key];
      const unlocked = isUnlocked(wins, key);
      const sel = key === game.selectedLevelKey;
      const need = lvl.unlock.wins;
      const have = Math.min(wins[lvl.unlock.level] || 0, need);
      const card = document.createElement('div');
      card.classList.add('lv-card');
      if (sel) card.classList.add('sel');
      if (!unlocked) card.classList.add('locked');
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', sel ? 'true' : 'false');
      card.tabIndex = 0;
      const chip = document.createElement('span');
      chip.className = 'lv-chip';
      chip.style.background = `linear-gradient(180deg, ${lvl.palette.skyTop}, ${lvl.palette.skyHorizon})`;
      const h = document.createElement('h3');
      h.textContent = lvl.name;
      card.append(chip, h);
      if (need > 0) {
        const line = document.createElement('div');
        line.className = 'lv-line';
        if (!unlocked) {
          const r = document.createElement('span');
          r.className = 'lv-req';
          r.textContent = `Locked · ${need}\u00d7 ${LEVELS[lvl.unlock.level].name}`;
          line.append(r);
        }
        const pips = document.createElement('div');
        pips.className = 'lv-pips';
        for (let i = 0; i < need; i++) {
          const d = document.createElement('span');
          d.className = i < have ? 'pip on' : 'pip';
          pips.append(d);
        }
        line.append(pips);
        card.append(line);
      }
      const choose = () => {
        if (!unlocked) {
          game.bus.emit('denied'); // blip (sfx) + shake (below)
          card.classList.add('shake');
          setTimeout(() => card.classList.remove('shake'), 320);
          return;
        }
        game.selectedLevelKey = key;
        saveSelectedLevel(CFG.meta.levelKey, key);
        game.previewLevel(key); // big menu backdrop re-generates for this level
        renderLevels();
      };
      card.addEventListener('click', choose);
      card.addEventListener('keydown', (e) => {
        if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); choose(); }
      });
      levelSelect.append(card);
    }
  }

  const update = () => {
    const st = game.state;
    let name;
    if (overlay) name = overlay;
    else if (st === 'MENU') name = 'menu';
    else if (st === 'PAUSED') name = 'pause';
    else if (st === 'LEVELUP') name = 'levelup';
    else if (st === 'GAMEOVER') name = 'gameover';
    else name = 'none';
    if (name !== cur) { cur = name; show(name); if (name === 'menu') renderLevels(); }
    // Banner queue (13.10): a queued banner (e.g. NEW MAP UNLOCKED after DAWN BREAKS)
    // takes over once the current one holds for CFG.ui.bannerMs.
    if (bannerQueue.length && performance.now() - bannerAt >= CFG.ui.bannerMs) {
      banner.textContent = bannerQueue.shift();
      banner.classList.remove('show');
      void banner.offsetWidth; // reflow to restart the CSS animation
      banner.classList.add('show');
      bannerAt = performance.now();
    }
  };

  // --- transients ---
  game.bus.on('banner', (b) => {
    if (banner.classList.contains('show')) bannerQueue.push(b.text); // 13.10: queue instead of clobbering
    else {
      banner.textContent = b.text;
      banner.classList.remove('show');
      void banner.offsetWidth; // reflow to restart the CSS animation
      banner.classList.add('show');
      bannerAt = performance.now();
    }
  });
  game.bus.on('hurt', () => {
    hurtFlash.classList.add('on');
    clearTimeout(hurtTimer);
    hurtTimer = setTimeout(() => hurtFlash.classList.remove('on'), 140);
  });

  // --- level-up cards ---
  game.bus.on('cards', (cards) => {
    cardsEl.innerHTML = '';
    cards.forEach((c, i) => {
      const def = c.kind === 'weapon' ? CFG.weapons[c.key]
        : c.kind === 'synergy' ? CFG.synergies[c.key]
        : CFG.passives[c.key];
      const isNew = c.kind === 'synergy' || (c.kind === 'weapon' && !game.player.weapons[c.key]);
      const card = document.createElement('div');
      card.className = isNew ? 'card new' : 'card';
      card.setAttribute('role', 'listitem');
      card.tabIndex = 0;
      const badge = document.createElement('span');
      badge.className = 'card-badge';
      badge.textContent = c.kind === 'synergy' ? 'FUSED' : 'NEW';
      const cv = document.createElement('canvas');
      cv.width = 72; cv.height = 72;
      cv.getContext('2d').drawImage(icons[def.icon], 0, 0);
      const h = document.createElement('h3');
      h.textContent = c.kind === 'synergy' ? def.name
        : c.kind === 'weapon' ? `${def.name} · Lv ${c.level}`
        : `${def.name} · Lv ${c.level}/${def.max}`;
      // exact effect of selecting this card is MANDATORY (user rule); flavour desc stays only as secondary
      const pe = document.createElement('p');
      pe.className = 'card-effect';
      pe.textContent = cardEffectText(c.kind, c.key, c.level);
      const p = document.createElement('p');
      p.className = 'card-desc';
      p.textContent = def.desc;
      const k = document.createElement('span');
      k.className = 'card-key';
      k.textContent = String(i + 1);
      card.append(badge, cv, h, pe, p, k);
      const pick = () => game.pickCard(i);
      card.addEventListener('click', pick);
      card.addEventListener('keydown', (e) => {
        if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); pick(); }
      });
      cardsEl.append(card);
    });
  });

  // --- game over + high scores ---
  game.bus.on('gameover', (stats) => {
    goTitle.textContent = stats.victory ? 'DAWN BREAKS' : 'YOU DIED';
    const entry = {
      score: stats.score, time: stats.time, kills: stats.kills, level: stats.level,
      date: new Date().toISOString().slice(0, 10),
    };
    const key = scoreKeyFor(game.levelKey || LEVEL_ORDER[0]);
    const { list, isRecord } = rankScore(loadScores(key), entry, max);
    saveScores(key, list, max);
    goNewRecord.classList.toggle('hidden', !isRecord);
    goStats.innerHTML = '';
    const row = (k, v) => {
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v;
      goStats.append(dt, dd);
    };
    row('Score', String(stats.score));
    row('Time', fmtTime(stats.time));
    row('Kills', String(stats.kills));
    row('Level', String(stats.level));
    row('Soulshards', '+' + (stats.shards || 0));
    // 13.10: unlock-progress line for the next locked level (victory lines stay deferred, D51)
    for (const k of LEVEL_ORDER) {
      const lvl = LEVELS[k];
      if (!isUnlocked(game.wins, k)) {
        row('Unlocks', `${lvl.name} — ${game.wins[lvl.unlock.level] || 0}/${lvl.unlock.wins} wins`);
        break;
      }
    }
  });

  // --- upgrades (meta progression) screen ---
  function renderUpgrades() {
    metaShards.textContent = String(game.meta.shards);
    metaList.innerHTML = '';
    for (const key of Object.keys(CFG.meta.upgrades)) {
      const def = CFG.meta.upgrades[key];
      const level = game.meta.upgrades[key] || 0;
      const cost = upgradeCost(key, level);
      const rowEl = document.createElement('div');
      rowEl.className = 'meta-row';
      const cv = document.createElement('canvas');
      cv.width = 72; cv.height = 72;
      cv.getContext('2d').drawImage(icons[def.icon], 0, 0);
      const info = document.createElement('div');
      info.className = 'meta-info';
      const h = document.createElement('h3'); h.textContent = def.name;
      const p = document.createElement('p'); p.className = 'meta-desc'; p.textContent = def.desc;
      const pe = document.createElement('p'); pe.className = 'meta-effect';
      pe.textContent = cardEffectText('meta', key, level >= def.max ? def.max : level + 1);
      const line = document.createElement('div');
      line.className = 'meta-line';
      const pips = document.createElement('div');
      pips.className = 'pips';
      for (let i = 0; i < def.max; i++) {
        const d = document.createElement('span');
        d.className = i < level ? 'pip on' : 'pip';
        pips.append(d);
      }
      const costEl = document.createElement('span');
      costEl.className = 'meta-cost';
      costEl.textContent = cost === null ? 'MAX' : cost + ' ◆';
      line.append(pips, costEl);
      info.append(h, p, pe, line);
      const btn = document.createElement('button');
      btn.className = 'btn btn-small';
      btn.textContent = 'Buy';
      btn._upgKey = key;
      btn.disabled = cost === null || game.meta.shards < cost;
      btn.addEventListener('click', () => { game.buyMeta(key); renderUpgrades(); });
      rowEl.append(cv, info, btn);
      metaList.append(rowEl);
    }
  }
  game.bus.on('meta', () => { if (overlay === 'upgrades') renderUpgrades(); });

  // --- high scores screen ---
  function renderScores() {
    const list = loadScores(scoreKeyFor(game.selectedLevelKey || LEVEL_ORDER[0]));
    scoresList.innerHTML = '';
    if (!list.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'No scores yet';
      scoresList.append(li);
      return;
    }
    for (const s of list) {
      const li = document.createElement('li');
      const sc = document.createElement('span');
      sc.className = 'sc-score';
      sc.textContent = String(s.score);
      const meta = document.createElement('span');
      meta.className = 'sc-meta';
      meta.textContent = `${fmtTime(s.time)} · ${s.kills} kills · LV ${s.level}`;
      const when = document.createElement('span');
      when.className = 'sc-meta';
      when.textContent = s.date || '';
      li.append(sc, meta, when);
      scoresList.append(li);
    }
  }

  // --- buttons ---
  const on = (id, fn) => $(id).addEventListener('click', fn);
  function attemptClose() {
    window.close();
    overlay = 'quit'; // fallback notice if close() is blocked
  }
  on('btn-start', () => game.startRun()); // no-arg → starts game.levelKey (the level-select choice, 13.7)
  on('btn-scores', () => { renderScores(); overlay = 'scores'; });
  on('btn-upgrades', () => { renderUpgrades(); overlay = 'upgrades'; });
  on('btn-upgrades-back', () => { overlay = null; });
  on('btn-quit', attemptClose);
  on('btn-clear-scores', () => { saveScores(scoreKeyFor(game.selectedLevelKey || LEVEL_ORDER[0]), [], max); renderScores(); });
  on('btn-scores-back', () => { overlay = null; });
  on('btn-resume', () => game.resume());
  on('btn-restart', () => game.startRun());
  on('btn-menu', () => game.toMenu());
  on('btn-retry', () => game.startRun());
  on('btn-go-menu', () => game.toMenu());
  on('btn-quit-ack', attemptClose);

  update();
  return { update };
}
