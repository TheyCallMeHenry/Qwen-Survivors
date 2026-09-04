// Pooled XP gems + healing hearts. Node-safe: sprites injected, no canvas at top level.
import { CFG } from '../config.js';
import { TAU } from '../utils/math.js';

// 22.2: push a point out of every non-traversable ellipse spot (m01 lakes /
// m02 koi pond — registered colliders with `ellipse: true`) radially from the
// spot center to its perimeter + pad (walkable ground just outside the edge).
// Loops so overlapping spots resolve; capped so pathological stacks can't hang.
export function escapeFromSpots(x, y, spots, pad) {
  if (!spots || spots.length === 0) return { x, y };
  let guard = 0;
  for (let moved = true; moved && guard++ < 8;) {
    moved = false;
    for (const s of spots) {
      const dx = x - s.x, dy = y - s.y;
      const k = (dx * dx) / (s.rx * s.rx) + (dy * dy) / (s.ry * s.ry);
      if (k >= 1) continue;
      let bx, by; // boundary point on the center→point ray (radial projection)
      if (k < 1e-9) { bx = s.x + s.rx; by = s.y; } // dead center — pick the +x edge
      else { bx = s.x + dx / Math.sqrt(k); by = s.y + dy / Math.sqrt(k); }
      const bd = Math.hypot(bx - s.x, by - s.y) || 1;
      x = bx + ((bx - s.x) / bd) * pad;
      y = by + ((by - s.y) / bd) * pad;
      moved = true;
    }
  }
  return { x, y };
}

export class Pickups {
  constructor(sprites = {}) {
    this.gemImg = sprites.gem || null;
    this.heartImg = sprites.heart || null;
    this.gems = [];
    for (let i = 0; i < CFG.gems.maxAlive; i++) {
      this.gems.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, val: 1, mag: false, ph: 0 });
    }
    this.hearts = [];
    for (let i = 0; i < CFG.gems.heartPool; i++) {
      this.hearts.push({ on: false, x: 0, y: 0, ph: 0 });
    }
    this.gemNext = 0;
    this.heartNext = 0;
  }

  reset() {
    for (const g of this.gems) g.on = false;
    for (const h of this.hearts) h.on = false;
  }

  gem(x, y, value) {
    let slot = null;
    const n = this.gems.length;
    for (let i = 0; i < n; i++) {
      const g = this.gems[(this.gemNext + i) % n];
      if (!g.on) { slot = g; this.gemNext = (this.gemNext + i + 1) % n; break; }
    }
    if (!slot) { slot = this.gems[this.gemNext]; this.gemNext = (this.gemNext + 1) % n; }
    slot.on = true; slot.x = x; slot.y = y;
    slot.vx = slot.vy = 0; slot.val = value; slot.mag = false;
    slot.ph = (x * 0.13 + y * 0.07) % TAU;
  }

  heart(x, y) {
    let slot = null;
    const n = this.hearts.length;
    for (let i = 0; i < n; i++) {
      const h = this.hearts[(this.heartNext + i) % n];
      if (!h.on) { slot = h; this.heartNext = (this.heartNext + i + 1) % n; break; }
    }
    if (!slot) { slot = this.hearts[this.heartNext]; this.heartNext = (this.heartNext + 1) % n; }
    slot.on = true; slot.x = x; slot.y = y;
    slot.ph = (x * 0.11 + y * 0.09) % TAU;
  }

  // player: {x, y, r, magnet} — magnet = passive multiplier (1 = none).
  // spots (22.2): ellipse colliders — an unmagnetized gem inside one is nudged
  // out to the spot's edge every step (dropped-inside can never happen again,
  // even if a future feature moves gems post-spawn). Magnetized gems fly to
  // the player and may legally cross water on their way in.
  // Returns {xp, heal} collected this step.
  update(dt, player, spots) {
    const out = { xp: 0, heal: 0 };
    if (spots && spots.length) {
      for (const g of this.gems) {
        if (!g.on || g.mag) continue;
        const o = escapeFromSpots(g.x, g.y, spots, CFG.gems.escapePad);
        g.x = o.x; g.y = o.y;
      }
    }
    const magR = CFG.gems.magnetBase * (player.magnet || 1);
    for (const g of this.gems) {
      if (!g.on) continue;
      const dx = player.x - g.x, dy = player.y - g.y;
      const d = Math.hypot(dx, dy);
      if (!g.mag && d < magR) g.mag = true;
      if (g.mag) {
        const inv = d > 0.001 ? 1 / d : 0;
        const sp = Math.min(900, 220 + (magR - d) * 6);
        g.vx = dx * inv * sp;
        g.vy = dy * inv * sp;
      } else {
        g.vx *= Math.exp(-3 * dt);
        g.vy *= Math.exp(-3 * dt);
      }
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      if (d < CFG.gems.collectR + player.r) {
        g.on = false;
        out.xp += g.val;
      }
    }
    for (const h of this.hearts) {
      if (!h.on) continue;
      const dx = player.x - h.x, dy = player.y - h.y;
      if (Math.hypot(dx, dy) < CFG.gems.collectR + player.r) {
        h.on = false;
        out.heal += CFG.gems.heartHeal;
      }
    }
    return out;
  }

  // World transform must be active. Bobbing pickup float.
  draw(ctx, t, x0, y0, x1, y1) {
    for (const g of this.gems) {
      if (!g.on || g.x < x0 || g.x > x1 || g.y < y0 || g.y > y1) continue;
      const bob = Math.sin(t * 3 + g.ph) * 3;
      if (this.gemImg) ctx.drawImage(this.gemImg, g.x - 12, g.y - 13 + bob);
    }
    for (const h of this.hearts) {
      if (!h.on || h.x < x0 || h.x > x1 || h.y < y0 || h.y > y1) continue;
      const bob = Math.sin(t * 2.6 + h.ph) * 3;
      if (this.heartImg) ctx.drawImage(this.heartImg, h.x - 11, h.y - 10 + bob);
    }
  }
}
