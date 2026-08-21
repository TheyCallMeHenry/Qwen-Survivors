// Per-frame HUD: HP/XP bars, level badge, timer, score, dash cooldown ring, low-HP pulse.
// Owns #btn-pause / #btn-mute / #btn-dash wiring. Mute state lives in localStorage
// (CFG.scores.muteKey); the audio modules (Phase 5) re-read it on the 'mute' bus event.

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
  const btnMute = $('btn-mute');
  const btnDash = $('btn-dash');
  const input = game.input;

  const setTxt = (el, s) => { if (el.textContent !== s) el.textContent = s; };

  // --- buttons (key M and both paths below funnel into one 'mute' toggle point) ---
  btnPause.addEventListener('click', () => game.pause());
  btnMute.addEventListener('click', () => input.queueMute());
  btnDash.addEventListener('pointerdown', (e) => { e.preventDefault(); input.queueDash(); });

  const muted = () => { try { return localStorage.getItem(CFG.scores.muteKey) === '1'; } catch { return false; } };
  const syncMute = () => btnMute.classList.toggle('muted', muted());
  syncMute();
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
    if (cd !== cdStr) { cdStr = cd; btnDash.style.setProperty('--cd', cd); }
  };
  update();
  return { update };
}
