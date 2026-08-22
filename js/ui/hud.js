// Per-frame HUD: HP/XP bars, level badge, timer, score, dash cooldown ring, low-HP pulse.
// Owns #btn-pause / #btn-dash wiring + Pause-menu Settings rows (#set-zoom / #set-mute).
// Mute state lives in localStorage (CFG.scores.muteKey); the audio modules (Phase 5)
// re-read it on the 'mute' bus event. (13.8: mute moved from the HUD button to Settings.)

import { CFG } from '../config.js';
import { clamp, fmtTime } from '../utils/math.js';

export function initHud(game) {
  const $ = (id) => document.getElementById(id);
  const hud = $('hud');
  const hpBar = hud.querySelector('.hp-bar');
  const hpFill = $('hp-fill');
  const hpLabel = $('hp-label');
  const xpFill = $('xp-fill');
  const lvlBadge = $('lvl-badge');
  const timer = $('timer');
  const score = $('score');
  const btnPause = $('btn-pause');
  const btnDash = $('btn-dash');
  const btnDashHud = $('btn-dash-hud');
  const setZoom = $('set-zoom');
  const setZoomVal = $('set-zoom-val');
  const setMute = $('set-mute');
  const setMuteVal = $('set-mute-val');
  const input = game.input;

  const setTxt = (el, s) => { if (el.textContent !== s) el.textContent = s; };

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
  const update = () => {
    const st = game.state;
    const show = st === 'PLAYING' || st === 'LEVELUP' || st === 'PAUSED' || st === 'DYING';
    hud.classList.toggle('hidden', !show);
    hud.setAttribute('aria-hidden', show ? 'false' : 'true');
    if (!show) return;
    const p = game.player;
    const frac = p.hp / p.maxHp;
    hpFill.style.transform = `scaleX(${clamp(frac, 0, 1)})`;
    hpBar.classList.toggle('low', frac < CFG.gems.lowHpFrac);
    setTxt(hpLabel, `${Math.ceil(p.hp)} / ${p.maxHp}`);
    xpFill.style.transform = `scaleX(${clamp(p.xp / CFG.xpNeed(p.level), 0, 1)})`;
    setTxt(lvlBadge, `LV ${p.level}`);
    setTxt(timer, fmtTime(CFG.run.time - game.t));
    setTxt(score, String(game.liveScore()));
    const cd = String(clamp(p.dashCd / CFG.player.dashCd, 0, 1));
    if (cd !== cdStr) { cdStr = cd; btnDash.style.setProperty('--cd', cd); btnDashHud.style.setProperty('--cd', cd); }
  };
  update();
  return { update };
}
