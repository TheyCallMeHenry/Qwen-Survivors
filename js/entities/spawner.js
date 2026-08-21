// Pure spawn curves + spawn placement. t = run seconds (t ≥ 0).
// Wraps CFG.spawner so game code never reads spawn tuning from config directly.
import { CFG } from '../config.js';
import { clamp } from '../utils/math.js';

export const aliveCap = (t) => CFG.spawner.aliveCap(t);
export const spawnInterval = (t) => CFG.spawner.interval(t);
export const batchSize = (t) => CFG.spawner.batch(t);

// Weighted enemy-type pick for time t. rng = mulberry32 fn. Null if nothing has weight.
export function pickType(t, rng) {
  const w = CFG.spawner.weights(t);
  let total = 0;
  for (const k in w) total += w[k];
  if (total <= 0) return null;
  let r = rng() * total;
  for (const k in w) {
    if (r < w[k]) return k;
    r -= w[k];
  }
  return null;
}

// Spawn point: inside world margin m, in a thin band just outside the current view
// (center px,py, size vw×vh) so the enemy walks in almost immediately. Falls back to
// a clamped point beyond a view edge when the band sits outside the world.
export function spawnPoint(W, H, m, px, py, vw, vh, rng) {
  const pad = CFG.spawner.spawnPad;
  const hw = vw / 2, hh = vh / 2;
  for (let i = 0; i < 8; i++) {
    const side = (rng() * 4) | 0;
    const o = rng() * pad;
    let x, y;
    if (side === 0)      { x = px - hw - o; y = py + (rng() * 2 - 1) * hh; }
    else if (side === 1) { x = px + hw + o; y = py + (rng() * 2 - 1) * hh; }
    else if (side === 2) { x = px + (rng() * 2 - 1) * hw; y = py - hh - o; }
    else                 { x = px + (rng() * 2 - 1) * hw; y = py + hh + o; }
    if (x >= m && x <= W - m && y >= m && y <= H - m) return { x, y };
  }
  const fb = CFG.spawner.spawnFallback;
  const x = clamp(px + (rng() < 0.5 ? -1 : 1) * (hw + fb), m, W - m);
  const y = clamp(py + (rng() < 0.5 ? -1 : 1) * (hh + fb), m, H - m);
  return { x, y };
}
