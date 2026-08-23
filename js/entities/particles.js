// Pooled particles: dots (spark/soul/ember), floating text, ghost trails,
// plus ambient foreground snow (parallax 1.25). Node-safe: no canvas at top level.
import { CFG } from '../config.js';
import { TAU, rand } from '../utils/math.js';

const DOT = 0, TEXT = 1, GHOST = 2;

export class Particles {
  constructor(cap = CFG.perf.particleCap) {
    this.pool = [];
    for (let i = 0; i < cap; i++) {
      this.pool.push({
        on: false, kind: DOT, x: 0, y: 0, vx: 0, vy: 0,
        life: 0, max: 1, size: 2, grav: 0,
        r: 255, g: 255, b: 255, img: null, flip: false, str: '', fs: 15,
      });
    }
    this.next = 0;
  }

  reset() {
    for (const p of this.pool) p.on = false;
  }

  // Ring-steal slot: first dead slot from `next`, else the ring head (oldest-ish).
  _slot() {
    const n = this.pool.length;
    for (let i = 0; i < n; i++) {
      const p = this.pool[(this.next + i) % n];
      if (!p.on) { this.next = (this.next + i + 1) % n; return p; }
    }
    const p = this.pool[this.next];
    this.next = (this.next + 1) % n;
    return p;
  }

  dot(x, y, vx, vy, life, size, r, g, b, grav = 0) {
    const p = this._slot();
    p.on = true; p.kind = DOT;
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.life = p.max = life; p.size = size;
    p.r = r; p.g = g; p.b = b; p.grav = grav;
  }

  // Radial burst.
  spark(x, y, n, speed, r, g, b, size = 2.4, life = 0.5, grav = 0) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = speed * (0.4 + Math.random() * 0.6);
      this.dot(
        x, y,
        Math.cos(a) * s, Math.sin(a) * s,
        life * (0.6 + Math.random() * 0.4), size * (0.7 + Math.random() * 0.6),
        r, g, b, grav,
      );
    }
  }

  // Death wisps: rise, fade.
  soul(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      this.dot(x + Math.cos(a) * 4, y + Math.sin(a) * 4, rand(-20, 20), rand(-70, -30), rand(0.5, 0.9), rand(2, 3.6), 140, 240, 200, -30);
    }
  }

  // Rising embers (campfire-ish).
  ember(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.dot(x + rand(-6, 6), y, rand(-8, 8), rand(-60, -25), rand(0.6, 1.2), rand(1.5, 2.6), 255, 170, 70, -20);
    }
  }

  // Fading sprite trail (dash ghosts). img base = bottom-center, like entity frames.
  ghost(img, x, y, flip, life = 0.3) {
    const p = this._slot();
    p.on = true; p.kind = GHOST;
    p.x = x; p.y = y;
    p.life = p.max = life;
    p.img = img; p.flip = flip;
  }

  // Floating combat text. color = [r, g, b].
  text(x, y, str, color) {
    const p = this._slot();
    p.on = true; p.kind = TEXT;
    p.x = x; p.y = y; p.vy = -34;
    p.life = p.max = 0.7; p.fs = 15; p.str = str;
    p.r = color[0]; p.g = color[1]; p.b = color[2];
  }

  update(dt) {
    for (const p of this.pool) {
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; continue; }
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  // World transform must be active (game translates the ctx).
  draw(ctx, x0, y0, x1, y1) {
    for (const p of this.pool) {
      if (!p.on || p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
      const k = p.life / p.max;
      if (p.kind === GHOST) {
        ctx.globalAlpha = 0.35 * k;
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.flip) ctx.scale(-1, 1);
        ctx.drawImage(p.img, -p.img.width / 2, -p.img.height);
        ctx.restore();
      } else if (p.kind === TEXT) {
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.font = `700 ${p.fs}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
        ctx.fillText(p.str, p.x, p.y);
      } else {
        ctx.globalAlpha = k;
        ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size * (0.5 + 0.5 * k)), 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}

// Ambient foreground particles in screen space, parallax 1.25 vs camera.
// kind: 'snow' (m01) | 'petal' (m02 sakura) | 'bubble' (m03 — small, RISING, D49).
export class Snow {
  constructor(count = CFG.perf.snowCount, kind = 'snow') {
    this.flakes = [];
    this.kind = kind;
    this.reset(count, kind);
  }

  reset(count = this.flakes.length, kind = this.kind) {
    this.kind = kind;
    const petal = kind === 'petal';
    const bubble = kind === 'bubble';
    this.flakes = [];
    for (let i = 0; i < count; i++) {
      this.flakes.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        sp: bubble ? 20 + Math.random() * 30 : petal ? 20 + Math.random() * 30 : 28 + Math.random() * 45,
        ph: Math.random() * TAU,
        sz: bubble ? 1.2 + Math.random() * 2 : petal ? 1.6 + Math.random() * 1.8 : 1 + Math.random() * 1.8,
        a: 0.35 + Math.random() * 0.45,
      });
    }
  }

  update(dt) {
    for (const f of this.flakes) f.y += (this.kind === 'bubble' ? -1 : 1) * f.sp * dt;
  }

  // Screen space. cam = view center; vw/vh = view size (CSS px).
  draw(ctx, cam, vw, vh, t) {
    const tx = vw + 80, ty = vh + 80, par = 1.25;
    const petal = this.kind === 'petal';
    const bubble = this.kind === 'bubble';
    const sway = bubble ? 12 : petal ? 34 : 18;
    if (!bubble) ctx.fillStyle = petal ? CFG.perf.petalColor : '#dfe8ff';
    for (const f of this.flakes) {
      const sx = mod(f.x + Math.sin(t * 0.7 + f.ph) * sway - cam.x * par, tx) - 40;
      const sy = mod(f.y - cam.y * par, ty) - 40;
      ctx.globalAlpha = f.a;
      ctx.beginPath();
      if (petal) ctx.ellipse(sx, sy, f.sz * 1.5, f.sz * 0.75, Math.sin(t * 1.4 + f.ph) * 1.2, 0, TAU);
      else if (bubble) {
        ctx.strokeStyle = CFG.perf.bubbleColor;
        ctx.lineWidth = 1;
        ctx.arc(sx, sy, f.sz, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = f.a * 0.6;
        ctx.fillStyle = '#eafaff';
        ctx.beginPath();
        ctx.arc(sx - f.sz * 0.3, sy - f.sz * 0.3, Math.max(0.5, f.sz * 0.32), 0, TAU);
        ctx.fill();
        continue;
      }
      // 16.1: the snowflake path command — 13.4's bubble branch swallowed the old
      // `else ctx.arc(...)` and left beginPath()+fill() on an EMPTY path (a silent
      // no-op in canvas AND in the stub), so Map 01 snow was invisible. Restored
      // exactly as in v1.0.0 (03eeac2).
      else ctx.arc(sx, sy, f.sz, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

const mod = (a, n) => ((a % n) + n) % n;
