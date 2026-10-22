// Per-frame HUD: HP/XP bars, level badge, timer, score, dash cooldown ring, low-HP pulse.
// Owns #btn-pause / #btn-dash wiring + Pause-menu Settings rows (#set-zoom / #set-mute).
// Mute state lives in localStorage (CFG.scores.muteKey); the audio modules (Phase 5)
// re-read it on the 'mute' bus event. (13.8: mute moved from the HUD button to Settings.)
// 11.7 — Co-op corner panels: #hud-left is ALWAYS the SEAT-0 panel (solo seat 0 = local
// player, so solo is unchanged); seats 1–3 = generated .seat-panel corners (TR/BL/BR),
// one per seated player in join order (A5). Display-only — the input controls
// (#btn-dash / #btn-dash-hud / #btn-pause) always follow the LOCAL player.

import { CFG } from '../config.js';
import { clamp, fmtTime } from '../utils/math.js';
import { shardsFor } from '../core/meta.js';
import { buildGhost } from '../art/heroes.js';   // Phase 27 from-scratch sheets
import { drawIconScaled } from '../art/items.js';
import { charAccent, ghostColor, resolveChars } from '../net/coop.js';

// Ordered loadout split for the HUD equipment area (task 29.5): weapons in their own
// group, items (synergies + passives) in a separate group. Pure (no DOM) so
// tools/test-logic.mjs can pin the split. Order within each group follows CFG definition
// order, and the flattened sequence (weapons → synergies → passives) is unchanged, so the
// boot + co-op seat E2E that read a row's children still match.
export function loadoutRows(pl) {
  const collect = (table, src, kind) => {
    const out = [];
    for (const k in table) if (src && src[k]) out.push({ kind, key: k, level: src[k] });
    return out;
  };
  return [
    collect(CFG.weapons, pl.weapons, 'weapon'),
    [...collect(CFG.synergies, pl.synergies, 'synergy'), ...collect(CFG.passives, pl.passives, 'passive')],
  ];
}

export function initHud(game, { icons } = {}) {
  const $ = (id) => document.getElementById(id);
  const hud = $('hud');
  const hpBar = hud.querySelector('.hp-bar');
  const hpFill = $('hp-fill');
  const ohFill = $('oh-fill');
  const hpLabel = $('hp-label');
  const xpFill = $('xp-fill');
  const lvlBadge = $('lvl-badge');
  const timer = $('timer');
  const score = $('score');
  const hudShards = $('hud-shards');
  const btnPause = $('btn-pause');
  const btnDash = $('btn-dash');
  const btnDashHud = $('btn-dash-hud');
  const touchUi = $('touch-ui');
  const setZoom = $('set-zoom');
  const setZoomVal = $('set-zoom-val');
  const setMute = $('set-mute');
  const setMuteVal = $('set-mute-val');
  const equipRow = $('equip-row');
  const input = game.input;

  const setTxt = (el, s) => { if (el.textContent !== s) el.textContent = s; };
  // Change-detected bar scale: PAUSED/LEVELUP hold every frame — skip identical DOM writes.
  const setScale = (el, v) => { if (el._sx !== v) { el._sx = v; el.style.transform = `scaleX(${v})`; } };

  // --- 19.1: equipment row — every equipped weapon / synergy / passive shown as an icon
  // chip with its current level, live all run. Rebuilt only when the loadout signature
  // changes (a pick), never per frame. Order: weapons → synergies → passives.
  // Same touch signal as main.js/game.js set (body.touch) — Input has no isTouch field.
  const equipDpr = Math.min(
    (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1),
    (document.body.classList.contains('touch') ? CFG.perf.dprCapMobile : CFG.perf.dprCapDesktop),
  );
  const equipSig = new WeakMap(); // player → last signature string
  const buildChip = (icon, level) => {
    const chip = document.createElement('div');
    chip.className = 'equip-chip';
    chip.setAttribute('role', 'listitem');
    const cv = document.createElement('canvas');
    cv.className = 'equip-icon';
    if (icons && icon) drawIconScaled(cv, icon, 34, equipDpr);
    const num = document.createElement('span');
    num.className = 'equip-lvl';
    num.textContent = String(level);
    chip.append(cv, num);
    return { chip, num };
  };
  // Renders a player's loadout into `container` as two visually separated bands —
  // weapons, then items (synergies + passives) — via an explicit two-row grid so a group
  // that exceeds one row wraps inside its own band instead of bleeding into the other's
  // (task 29.5). Chips stay direct children in the existing order, so the co-op seat E2E +
  // boot E2E that read the row's children still match. `cell`/`gap` are the real chip box
  // for this context (seat-0 34/4, seat panels 24/3) so the column count is measured
  // against the live width — mobile-safe, no horizontal overflow.
  const renderRows = (container, rows, cell, gap) => {
    container.innerHTML = '';
    container._gatCell = null; // 29.8: drop any stale reload-ring target when the row is rebuilt
    container.style.display = 'grid';
    // Column count that fits this box; fall back to the widest box (~8 chips) when the
    // element has no measurable width yet (before first layout / in the headless tests).
    const avail = container.clientWidth || (cell * 8 + gap * 7);
    const cols = Math.max(1, Math.floor((avail + gap) / (cell + gap)));
    let row = 1;
    for (const group of rows) {
      if (!group.length) continue;
      group.forEach((e, i) => {
        const def = CFG.weapons[e.key] || CFG.synergies[e.key] || CFG.passives[e.key];
        const icon = icons && def ? icons[def.icon] : null;
        const { chip } = buildChip(icon, e.level);
        chip.title = `${def ? def.name : e.key} · Lv ${e.level}`;
        chip.setAttribute('aria-label', `${def ? def.name : e.key}, level ${e.level}`);
        chip.style.gridRow = String(row + Math.floor(i / cols));
        chip.style.gridColumn = String((i % cols) + 1);
        container.appendChild(chip);
        if (e.kind === 'weapon' && e.key === 'gatling') container._gatCell = chip; // 29.8: ring target
      });
      row += Math.ceil(group.length / cols); // hard line break between groups
    }
  };
  const syncEquip = (pl) => {
    const rows = loadoutRows(pl);
    const sig = rows[0].concat(rows[1]).map((e) => `${e.key}:${e.level}`).join(',');
    if (equipSig.get(pl) === sig) return; // unchanged since last build
    equipSig.set(pl, sig);
    renderRows(equipRow, rows, 34, 4); // seat-0 row (matches #equip-row chip size)
  };

  // 29.8: gatling reload ring. Player._weapons publishes a monotonically-decreasing remaining
  // time (_gatReload, from _gatReloadTotal). Drive it as a --cd sweep on the weapon chip's cell,
  // the same change-detected custom-property idiom as the dash cooldown: the ring shows only while
  // reloading and clears the instant the mag refills. No per-frame text/DOM churn; CSS paints it.
  const syncGat = (cell, pl) => {
    if (!cell) return;
    if (pl._gatReload > 0) {
      if (!cell._gatOn) { cell.classList.add('gat-reload'); cell._gatOn = true; }
      const frac = pl._gatReloadTotal > 0 ? clamp(pl._gatReload / pl._gatReloadTotal, 0, 1) : 0;
      const s = frac.toFixed(3);
      if (cell._cd !== s) { cell._cd = s; cell.style.setProperty('--cd', s); }
    } else if (cell._gatOn) {
      cell.classList.remove('gat-reload'); cell._gatOn = false;
    }
  };

  // 11.8 — per-character UI theming (D62 channel): sets the --char* vars on a themed
  // root; main.css consumes them with legacy fallbacks. Roster char = its accent, ghost
  // = per-seat Pac-Man tint (charAccent).
  const applyTheme = (el, key, seat) => {
    const c = charAccent(key, seat);
    const n = parseInt(c.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const w = (t) => `rgb(${[r, g, b].map((v) => Math.round(v + (255 - v) * t)).join(',')})`;
    el.style.setProperty('--char', c);
    el.style.setProperty('--char-soft', `rgba(${r},${g},${b},0.16)`);
    el.style.setProperty('--char-line', `rgba(${r},${g},${b},0.65)`);
    el.style.setProperty('--char-inset', `rgba(${r},${g},${b},0.5)`);
    el.style.setProperty('--char-grad', `linear-gradient(90deg, ${c}, ${w(0.4)})`);
  };

  // --- 11.7: co-op corner panels (seats 1–3; seat 0 = the existing #hud-left) ---
  const mkPanel = (seat) => {
    const el = (tag, cls) => { const n = document.createElement(tag); n.className = cls; return n; };
    const root = el('div', 'seat-panel');
    root.id = `hud-seat-${seat}`;
    root.classList.add('off');
    const face = el('canvas', 'seat-face');
    const name = el('div', 'seat-name');
    const pHpBar = el('div', 'bar hp-bar');
    const pOhFill = el('div', 'bar-fill oh-fill');
    const pHpFill = el('div', 'bar-fill');
    const pHpLabel = el('span', 'bar-label');
    // 23.3: oh-fill FIRST so hp-fill paints over it (stacking order in the DOM)
    pHpBar.append(pOhFill, pHpFill, pHpLabel);
    const row = el('div', 'seat-row');
    const lvl = el('div', 'seat-lvl');
    const pXpBar = el('div', 'bar xp-bar');
    const pXpFill = el('div', 'bar-fill');
    pXpBar.append(pXpFill);
    row.append(lvl, pXpBar);
    const equip = el('div', 'seat-equip'); // 19.3: per-seat equipment chips (co-op parity)
    const dash = el('div', 'seat-dash');
    root.append(face, name, pHpBar, row, equip, dash);
    hud.appendChild(root);
    return { root, face, name, hpBar: pHpBar, hpFill: pHpFill, ohFill: pOhFill, hpLabel: pHpLabel, lvl, xpFill: pXpFill, equip, dash, _vis: false, _key: '', _sig: '', _cd: '' };
  };
  const panels = [mkPanel(1), mkPanel(2), mkPanel(3)];
  const ghostSheet = [null, null, null, null]; // seat → tinted ghost sheet cache (D62 per-seat tint)
  const seatPlayer = (j) => {
    if (!game.net || game.netRole === 'solo') return game.player;
    const seat = game._seat();
    if (seat < 0 || j >= game.players.length) return null;
    return j === seat ? game.player : game.remote[j < seat ? j : j - 1]; // same mapping as _netState/_interp
  };
  const syncFace = (pan, key, seat) => {
    if (pan._key === key) return; // redraw only on (re)assignment
    pan._key = key;
    applyTheme(pan.root, key, seat); // 11.8: panel theme follows the (re)assigned char
    const sheet = key === 'ghost'
      ? (ghostSheet[seat] || (ghostSheet[seat] = buildGhost(ghostColor(seat))))
      : game.roster[key];
    if (!sheet) return;
    pan.face.width = sheet.w * 2;
    pan.face.height = sheet.h * 2;
    pan.face.getContext('2d').drawImage(sheet.idle[0], 0, 0, sheet.w * 2, sheet.h * 2);
  };
  const syncPanel = (pan, seat, key, pl) => {
    setTxt(pan.name, CFG.characters[key].name);
    syncFace(pan, key, seat);
    // 23.3: same over-health treatment as the seat-0 panel (bonus segment + ceiling label)
    const cap = pl.maxHp + (pl.overHeal || 0);
    const frac = pl.hp / pl.maxHp;
    setScale(pan.hpFill, clamp(frac, 0, 1));
    setScale(pan.ohFill, clamp(pl.hp / cap, 0, 1));
    pan.hpBar.classList.toggle('over', (pl.overHeal || 0) > 0);
    pan.hpBar.classList.toggle('low', frac < CFG.gems.lowHpFrac && (pl.overHeal || 0) <= 0);
    setTxt(pan.hpLabel, `${Math.max(0, Math.ceil(pl.hp))} / ${Math.ceil(cap)}`);
    setScale(pan.xpFill, clamp(pl.xp / CFG.xpNeed(pl.level), 0, 1));
    setTxt(pan.lvl, `LV ${pl.level}`);
    // 19.3: per-seat equipment chips (rebuilt only when this seat's loadout changes),
    // split into weapon / item bands exactly like the seat-0 row (29.5 co-op parity).
    const rows = loadoutRows(pl);
    const sig = rows[0].concat(rows[1]).map((e) => `${e.key}:${e.level}`).join(',');
    if (pan._sig !== sig) {
      pan._sig = sig;
      renderRows(pan.equip, rows, 24, 3); // seat-panel chips (.seat-equip 24px)
    }
    const cd = String(clamp(pl.dashCd / CFG.player.dashCd, 0, 1));
    if (pan._cd !== cd) { pan._cd = cd; pan.dash.style.setProperty('--cd', cd); }
  };

  // --- buttons (key M and the mute row funnel into one 'mute' toggle point) ---
  // Blur after click: #btn-pause stays visible through PAUSED→PLAYING, and a focused
  // button would swallow Space-dash (input.js defers Space to focused UI).
  btnPause.addEventListener('click', (e) => { e?.currentTarget?.blur?.(); game.pause(); });
  btnDash.addEventListener('pointerdown', (e) => { e.preventDefault(); input.queueDash(); });
  btnDashHud.addEventListener('pointerdown', (e) => { e.preventDefault(); input.queueDash(); });

  // --- Pause-menu Settings (13.8): view zoom + mute ---
  const syncZoom = () => {
    const zoomed = game.zoom === CFG.zoom.touch;
    setZoomVal.textContent = zoomed ? 'Zoomed out' : 'Full view';
    setZoom.classList.toggle('on', zoomed);
    setZoom.setAttribute('aria-pressed', zoomed ? 'true' : 'false');
  };
  setZoom.addEventListener('click', () => {
    game.setZoom(game.zoom === CFG.zoom.full ? CFG.zoom.touch : CFG.zoom.full);
    syncZoom();
  });
  syncZoom();

  const muted = () => { try { return localStorage.getItem(CFG.scores.muteKey) === '1'; } catch { return false; } };
  const syncMute = () => {
    const m = muted();
    setMuteVal.textContent = m ? 'On' : 'Off';
    setMute.classList.toggle('muted', m);
    setMute.setAttribute('aria-pressed', m ? 'true' : 'false');
  };
  syncMute();
  setMute.addEventListener('click', () => input.queueMute());
  game.bus.on('mute', () => {
    try { localStorage.setItem(CFG.scores.muteKey, muted() ? '0' : '1'); } catch { /* private mode */ }
    syncMute();
  });

  // --- per-frame (called from the render hook) ---
  let cdStr = '';
  let themeKey = null;
  let shown = null;
  const update = () => {
    const st = game.state;
    const show = st === 'PLAYING' || st === 'LEVELUP' || st === 'PAUSED'; // 22.6: no DYING transient — death flips straight to GAMEOVER
    if (show !== shown) {
      shown = show;
      hud.classList.toggle('hidden', !show);
      hud.setAttribute('aria-hidden', show ? 'false' : 'true');
      // 22.10: the touch dash ring lived on every screen (body.touch alone) — gate it to run states.
      touchUi.hidden = !show;
    }
    if (!show) return;
    const coop = !!(game.net && game.netRole !== 'solo');
    const chars = coop ? resolveChars(game.netRoster) : null;
    // 11.8: the LOCAL theming follows the SEAT-0 player's char (TL panel source —
    // host on the host, remote host on clients, local player in solo) + the dash
    // controls (which always follow the local player; #btn-dash lives in #touch-ui).
    const localKey = chars ? chars[0] : game.charKey;
    if (localKey !== themeKey) { themeKey = localKey; applyTheme(hud, localKey, 0); applyTheme(touchUi, localKey, 0); }
    // 11.7: TL (#hud-left) is the SEAT-0 panel — solo seat 0 = local player (invariance);
    // in co-op seat 0 is the host (on the host) or the remote host (on clients).
    const p = seatPlayer(0) || game.player;
    // 23.3: over-health rides the same bar — hpFill shows hp/maxHp (may exceed 1),
    // ohFill tints the bonus segment, the bar frame grows to the ceiling while any
    // over-health pool exists.
    const cap = p.maxHp + (p.overHeal || 0);
    const frac = p.hp / p.maxHp;
    setScale(hpFill, clamp(frac, 0, 1));
    setScale(ohFill, clamp(p.hp / cap, 0, 1));
    hpBar.classList.toggle('over', (p.overHeal || 0) > 0);
    hpBar.classList.toggle('low', frac < CFG.gems.lowHpFrac && (p.overHeal || 0) <= 0);
    setTxt(hpLabel, `${Math.max(0, Math.ceil(p.hp))} / ${Math.ceil(cap)}`);
    setScale(xpFill, clamp(p.xp / CFG.xpNeed(p.level), 0, 1));
    setTxt(lvlBadge, `LV ${p.level}`);
    syncEquip(p); // 19.1: seat-0 (solo = local) equipment row, rebuilt only on loadout change
    syncGat(equipRow._gatCell, p); // 29.8: gatling reload ring — driven only while reloading
    // 17.3: count down the selected duration; ENDLESS (null) counts up. runDuration is
    // always number|null by the time a run state renders (set in game.js at run start).
    setTxt(timer, fmtTime(game.runDuration === null ? game.t : game.runDuration - game.t));
    setTxt(score, String(game.liveScore()));
    // 14.1 (D54): live projected Soulshard award — same formula the run-end uses
    // (victory bonus can only land at the end; the game-over screen shows the total).
    setTxt(hudShards, `${shardsFor({ score: game.liveScore(), victory: false })} ◆`);
    const cd = String(clamp(p.dashCd / CFG.player.dashCd, 0, 1));
    if (cd !== cdStr) { cdStr = cd; btnDash.style.setProperty('--cd', cd); btnDashHud.style.setProperty('--cd', cd); }
    // 11.7: co-op corners — visible count = current player count, join order (A5).
    hud.classList.toggle('coop', coop);
    if (!coop) return;
    const n = Math.min(chars.length, game.players.length);
    for (let s = 1; s <= panels.length; s++) {
      const pan = panels[s - 1];
      const on = s < n;
      if (pan._vis !== on) { pan._vis = on; pan.root.classList.toggle('off', !on); }
      if (!on) continue;
      const pl = seatPlayer(s);
      if (!pl) continue;
      syncPanel(pan, s, chars[s], pl);
    }
  };
  update();
  return { update, panels };
}
