// Offscreen canvas helpers + 2.5D shading primitives for procedural art.

import { TAU } from '../utils/math.js';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// Soft ellipse shadow sprite (dark, radial). Size: ~2rx x 2ry.
export function shadowSprite(rx, ry, alpha = 0.38) {
  const s = makeCanvas(rx * 2, rx * 2);
  const g = s.getContext('2d');
  const grad = g.createRadialGradient(rx, ry, 0, rx, ry, rx);
  grad.addColorStop(0, `rgba(4,6,12,${alpha})`);
  grad.addColorStop(0.65, `rgba(4,6,12,${alpha * 0.5})`);
  grad.addColorStop(1, 'rgba(4,6,12,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(rx, ry, rx, 0, TAU);
  g.fill();
  const out = makeCanvas(rx * 2, Math.max(2, ry * 2));
  const og = out.getContext('2d');
  og.drawImage(s, 0, 0, rx * 2, ry * 2);
  return out;
}

// Radial glow sprite (color as "r,g,b").
export function glowSprite(r, rgb, alpha = 0.45) {
  const c = makeCanvas(r * 2, r * 2);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, `rgba(${rgb},${alpha})`);
  grad.addColorStop(0.4, `rgba(${rgb},${alpha * 0.4})`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, r * 2, r * 2);
  return c;
}

// White silhouette copy (for hit-flash).
export function flashCopy(src) {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

// Horizontal flip copy.
export function flipX(src) {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.translate(c.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

export function poly(ctx, pts, close = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}

export function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Right-side occlusion shade over a shape path (call with path already current).
export function sideShade(ctx, w, h, side = 'right', alpha = 0.3) {
  const g = ctx.createLinearGradient(side === 'right' ? 0 : w, 0, side === 'right' ? w : 0, 0);
  g.addColorStop(0, 'rgba(6,10,14,0)');
  g.addColorStop(1, `rgba(6,10,14,${alpha})`);
  ctx.fillStyle = g;
  ctx.fill();
}

// Top rim-light stroke for moonlight (call with path already current).
export function rimLight(ctx, color = 'rgba(170,196,255,0.30)') {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

// 24.4 global light-source convention (Phase 24 visual overhaul): a single top-left key
// light across every character/enemy body. Call with the body path already current +
// filled; it lays a right/bottom occlusion shade then a top-left rim-light in one step,
// so all sprites read as lit from the same direction (2.5D volume). Bakes at build time
// only — never called per frame. `x/y/w/h` bound the shape's box for the shade gradient.
export function formShade(ctx, x, y, w, h, opts = {}) {
  const { shade = 0.32, rim = 'rgba(180,205,255,0.34)' } = opts;
  // occlusion on the away-from-light side (right)
  sideShade(ctx, w + x, h, 'right', shade);
  // subtle bottom shade toward the light convention's falloff
  const bg = ctx.createLinearGradient(0, y, 0, y + h);
  bg.addColorStop(0, 'rgba(6,10,14,0)');
  bg.addColorStop(0.65, 'rgba(6,10,14,0)');
  bg.addColorStop(1, `rgba(6,10,14,${shade * 0.7})`);
  ctx.fillStyle = bg;
  ctx.fill();
  // top-left rim-light stroke
  rimLight(ctx, rim);
}
