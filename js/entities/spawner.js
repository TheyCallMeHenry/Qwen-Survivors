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

// Spawn point: inside world margin m, outside the current view (center px,py, size vw×vh).
export function spawnPoint(W, H, m, px, py, vw, vh, rng) {
  const pad = 60;
  for (let i = 0; i < 8; i++) {
    const x = m + rng() * (W - 2 * m);
    const y = m + rng() * (H - 2 * m);
    if (Math.abs(x - px) > vw / 2 + pad || Math.abs(y - py) > vh / 2 + pad) return { x, y };
  }
  const x = clamp(px + (rng() < 0.5 ? -1 : 1) * (vw / 2 + 140), m, W - m);
  const y = clamp(py + (rng() < 0.5 ? -1 : 1) * (vh / 2 + 140), m, H - m);
  return { x, y };
}
