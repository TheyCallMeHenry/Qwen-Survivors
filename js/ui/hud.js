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
import { buildGhost } from '../art/characters.js';
import { charAccent, ghostColor, resolveChars } from '../net/coop.js';

export function initHud(game) {
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
  const btnPause = $('btn-pause');
  const btnDash = $('btn-dash');
  const btnDashHud = $('btn-dash-hud');
  const touchUi = $('touch-ui');
  const setZoom = $('set-zoom');
  const setZoomVal = $('set-zoom-val');
  const setMute = $('set-mute');
  const setMuteVal = $('set-mute-val');
  const input = game.input;

  const setTxt = (el, s) => { if (el.textContent !== s) el.textContent = s; };

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
    const dash = el('div', 'seat-dash');
    root.append(face, name, pHpBar, row, dash);
    hud.appendChild(root);
    return { root, face, name, hpBar: pHpBar, hpFill: pHpFill, ohFill: pOhFill, hpLabel: pHpLabel, lvl, xpFill: pXpFill, dash, _vis: false, _key: '' };
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
    pan.hpFill.style.transform = `scaleX(${clamp(frac, 0, 1)})`;
    pan.ohFill.style.transform = `scaleX(${clamp(pl.hp / cap, 0, 1)})`;
    pan.hpBar.classList.toggle('over', (pl.overHeal || 0) > 0);
    pan.hpBar.classList.toggle('low', frac < CFG.gems.lowHpFrac && (pl.overHeal || 0) <= 0);
    setTxt(pan.hpLabel, `${Math.max(0, Math.ceil(pl.hp))} / ${Math.ceil(cap)}`);
    pan.xpFill.style.transform = `scaleX(${clamp(pl.xp / CFG.xpNeed(pl.level), 0, 1)})`;
    setTxt(pan.lvl, `LV ${pl.level}`);
    pan.dash.style.setProperty('--cd', String(clamp(pl.dashCd / CFG.player.dashCd, 0, 1)));
  };

  // --- buttons (key M and the mute row funnel into one 'mute' toggle point) ---
  btnPause.addEventListener('click', () => game.pause());
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
  const update = () => {
    const st = game.state;
    const show = st === 'PLAYING' || st === 'LEVELUP' || st === 'PAUSED'; // 22.6: no DYING transient — death flips straight to GAMEOVER
    hud.classList.toggle('hidden', !show);
    hud.setAttribute('aria-hidden', show ? 'false' : 'true');
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
    hpFill.style.transform = `scaleX(${clamp(frac, 0, 1)})`;
    ohFill.style.transform = `scaleX(${clamp(p.hp / cap, 0, 1)})`;
    hpBar.classList.toggle('over', (p.overHeal || 0) > 0);
    hpBar.classList.toggle('low', frac < CFG.gems.lowHpFrac && (p.overHeal || 0) <= 0);
    setTxt(hpLabel, `${Math.max(0, Math.ceil(p.hp))} / ${Math.ceil(cap)}`);
    xpFill.style.transform = `scaleX(${clamp(p.xp / CFG.xpNeed(p.level), 0, 1)})`;
    setTxt(lvlBadge, `LV ${p.level}`);
    setTxt(timer, fmtTime(CFG.run.time - game.t));
    setTxt(score, String(game.liveScore()));
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
