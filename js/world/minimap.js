// Minimap: pre-rendered base (264×202 ≈ world/16) + live dots/camera rect.

import { makeCanvas } from '../art/base.js';
import { TAU } from '../utils/math.js';

export const MM_W = 264;
export const MM_H = 202;

export function buildMinimapBase(world) {
  const c = makeCanvas(MM_W, MM_H);
  const g = c.getContext('2d');
  const sx = MM_W / world.W, sy = MM_H / world.H;
  c._sx = sx; // scale carried on the base for drawMinimapLive
  c._sy = sy;

  g.fillStyle = '#0b111e';
  g.fillRect(0, 0, MM_W, MM_H);

  // lakes
  for (const l of world.data.lakes) {
    g.fillStyle = 'rgba(120,150,200,0.5)';
    g.beginPath();
    g.ellipse(l.x * sx, l.y * sy, Math.max(2, l.rx * sx), Math.max(2, l.ry * sy), 0, 0, TAU);
    g.fill();
  }

  // mountains (triangles, north)
  g.fillStyle = 'rgba(140,150,190,0.55)';
  for (const m of world.mountains) {
    const px = m.x * sx, py = m.y * sy, r = Math.max(3, m.w * sx * 0.3);
    g.beginPath();
    g.moveTo(px - r, py);
    g.lineTo(px, py - r * 1.2);
    g.lineTo(px + r, py);
    g.closePath();
    g.fill();
  }

  // forests read as patches of dots
  g.fillStyle = 'rgba(60,120,80,0.5)';
  for (const t of world.data.trees) g.fillRect(t.x * sx - 1, t.y * sy - 1, 2, 2);

  // village
  g.fillStyle = 'rgba(200,170,120,0.8)';
  for (const h of world.data.huts) g.fillRect(h.x * sx - 2, h.y * sy - 2, 3, 3);
  g.fillStyle = 'rgba(230,220,200,0.9)';
  g.fillRect(world.data.well.x * sx - 1.5, world.data.well.y * sy - 1.5, 3, 3);

  // monoliths cyan, campfires orange
  g.fillStyle = 'rgba(90,220,255,0.9)';
  for (const m of world.data.monoliths) g.fillRect(m.x * sx - 1.5, m.y * sy - 1.5, 3, 3);
  g.fillStyle = 'rgba(255,160,70,0.9)';
  for (const cf of world.data.campfires) g.fillRect(cf.x * sx - 1.5, cf.y * sy - 1.5, 3, 3);

  // border
  g.strokeStyle = 'rgba(120,140,190,0.5)';
  g.lineWidth = 1;
  g.strokeRect(0.5, 0.5, MM_W - 1, MM_H - 1);
  return c;
}

// cam = {x, y} view center; viewW/viewH = viewport CSS px.
export function drawMinimapLive(ctx, base, player, enemies, cam, viewW, viewH) {
  const sx = base._sx, sy = base._sy;
  ctx.clearRect(0, 0, MM_W, MM_H);
  ctx.drawImage(base, 0, 0);

  // red enemy dots (cap ~150), boss 4px
  ctx.fillStyle = 'rgba(230,80,80,0.9)';
  for (let i = 0; i < Math.min(150, enemies.length); i++) {
    const e = enemies[i];
    ctx.beginPath();
    ctx.arc(e.x * sx, e.y * sy, e.boss ? 2 : 1.5, 0, TAU);
    ctx.fill();
  }

  // player
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(player.x * sx, player.y * sy, 2.2, 0, TAU);
  ctx.fill();

  // camera frustum
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect((cam.x - viewW / 2) * sx, (cam.y - viewH / 2) * sy, viewW * sx, viewH * sy);
}
