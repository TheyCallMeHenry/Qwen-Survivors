// Screen management: menu / high scores / pause / level-up cards / game over / quit,
// plus transient #banner and #hurt-flash.
// State-driven: one per-frame poll of game.state (toMenu() emits no bus event, so
// polling is the reliable source of truth); the bus drives transients
// ('banner', 'hurt', 'cards', 'gameover').
// High scores persist in localStorage (CFG.scores).

import { CFG } from '../config.js';
import { fmtTime } from '../utils/math.js';

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
  };
  const banner = $('banner');
  const hurtFlash = $('hurt-flash');
  const cardsEl = $('cards');
  const scoresList = $('scores-list');
  const goTitle = $('go-title');
  const goNewRecord = $('go-newrecord');
  const goStats = $('go-stats');
  const { storageKey, max } = CFG.scores;

  let cur = '';
  let overlay = null; // 'scores' | 'quit' | null — local overlays above the menu
  let hurtTimer = null;

  const show = (name) => { for (const k of Object.keys(screens)) screens[k].classList.toggle('hidden', k !== name); };

  const update = () => {
    const st = game.state;
    let name;
    if (overlay) name = overlay;
    else if (st === 'MENU') name = 'menu';
    else if (st === 'PAUSED') name = 'pause';
    else if (st === 'LEVELUP') name = 'levelup';
    else if (st === 'GAMEOVER') name = 'gameover';
    else name = 'none';
    if (name !== cur) { cur = name; show(name); }
  };

  // --- transients ---
  game.bus.on('banner', (b) => {
    banner.textContent = b.text;
    banner.classList.remove('show');
    void banner.offsetWidth; // reflow to restart the CSS animation
    banner.classList.add('show');
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
      const def = c.kind === 'weapon' ? CFG.weapons[c.key] : CFG.passives[c.key];
      const isNew = c.kind === 'weapon' && !game.player.weapons[c.key];
      const card = document.createElement('div');
      card.className = isNew ? 'card new' : 'card';
      card.setAttribute('role', 'listitem');
      card.tabIndex = 0;
      const badge = document.createElement('span');
      badge.className = 'card-badge';
      badge.textContent = 'NEW';
      const cv = document.createElement('canvas');
      cv.width = 72; cv.height = 72;
      cv.getContext('2d').drawImage(icons[def.icon], 0, 0);
      const h = document.createElement('h3');
      h.textContent = c.kind === 'weapon' ? `${def.name} · Lv ${c.level}` : `${def.name} · Lv ${c.level}/${def.max}`;
      const p = document.createElement('p');
      p.textContent = def.desc;
      const k = document.createElement('span');
      k.className = 'card-key';
      k.textContent = String(i + 1);
      card.append(badge, cv, h, p, k);
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
    const { list, isRecord } = rankScore(loadScores(storageKey), entry, max);
    saveScores(storageKey, list, max);
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
  });

  // --- high scores screen ---
  function renderScores() {
    const list = loadScores(storageKey);
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
  on('btn-start', () => game.startRun());
  on('btn-scores', () => { renderScores(); overlay = 'scores'; });
  on('btn-quit', attemptClose);
  on('btn-clear-scores', () => { saveScores(storageKey, [], max); renderScores(); });
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
