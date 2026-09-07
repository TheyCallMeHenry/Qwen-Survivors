// Lighting: half-res darkness canvas, destination-out radial hole per light,
// drawn over the world in screen space; then an additive glow pass on top.
// 25.4a (perf): zero createRadialGradient calls per frame — holes/glows are
// pre-rendered unit-radius sprites (one baked gradient each) scaled by drawImage;
// flicker rides globalAlpha, radius scales the sprite. Visuals match v1 shape.
// Node-safe: canvases only created on resize()/sprite builds (browser).
import { CFG } from '../config.js';
import { TAU, hash2 } from '../utils/math.js';

const SPR = 256; // sprite canvas diameter (unit-radius gradient baked at this scale)

export class Lighting {
  constructor() {
    this.cv = null;
    this.ctx = null;
    this.w = 0;
    this.h = 0;
    this._holeSpr = null; // single black-hole sprite (hole profile is rgb-independent)
    this._glowCache = new Map(); // 'r,g,b' -> glow sprite
  }

  resize(w, h) {
    const hw = Math.max(1, (w / 2) | 0), hh = Math.max(1, (h / 2) | 0);
    if (hw === this.w && hh === this.h && this.cv) return;
    this.cv = document.createElement('canvas');
    this.cv.width = hw;
    this.cv.height = hh;
    this.ctx = this.cv.getContext('2d');
    this.w = hw;
    this.h = hh;
  }

  // cam = {x, y, w, h} view center + size. lights = [{x, y, r, rgb: 'r,g,b', flicker 0..1}] (world space).
  // base = 'r,g,b' darkness base (per-level palette; default = m01/CFG).
  draw(ctx, cam, lights, t, base = CFG.lighting.base) {
    if (!this.cv) this.resize(cam.w, cam.h);
    const g = this.ctx;
    const ox = cam.x - cam.w / 2, oy = cam.y - cam.h / 2; // view top-left (world px)

    g.globalCompositeOperation = 'source-over';
    g.fillStyle = `rgba(${base},${CFG.lighting.baseAlpha})`;
    g.fillRect(0, 0, this.w, this.h);
    g.globalCompositeOperation = 'destination-out';
    for (const L of lights) this._hole(g, L, ox, oy, t);
    g.globalCompositeOperation = 'source-over';

    ctx.drawImage(this.cv, 0, 0, this.w, this.h, 0, 0, cam.w, cam.h);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const L of lights) this._glow(ctx, L, ox, oy, t);
    ctx.restore();
  }

  // Smooth pseudo-noise flicker, phase hashed from light position.
  _flicker(L, t) {
    if (!L.flicker) return 1;
    const ph = hash2(L.x | 0, L.y | 0) * TAU;
    const n = 0.5 + 0.5 * Math.sin(t * 9 + ph) * Math.sin(t * 13.7 + ph * 1.7);
    return 1 - L.flicker + L.flicker * (0.75 + 0.25 * n);
  }

  // Bake-once unit-radius sprites (browser only; draw() never runs under the Node shim).
  _holeSprite() {
    if (!this._holeSpr) {
      const c = document.createElement('canvas');
      c.width = SPR; c.height = SPR;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(SPR / 2, SPR / 2, 0, SPR / 2, SPR / 2, SPR / 2);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.55, 'rgba(0,0,0,0.5)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(SPR / 2, SPR / 2, SPR / 2, 0, TAU);
      g.fill();
      this._holeSpr = c;
    }
    return this._holeSpr;
  }

  _glowSprite(rgb) {
    let s = this._glowCache.get(rgb);
    if (!s) {
      const c = document.createElement('canvas');
      c.width = SPR; c.height = SPR;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(SPR / 2, SPR / 2, 0, SPR / 2, SPR / 2, SPR / 2);
      grad.addColorStop(0, `rgba(${rgb},0.6)`); // baked at peak 0.6; _glow restores exact alpha via globalAlpha
      grad.addColorStop(0.5, `rgba(${rgb},0.21)`);
      grad.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(SPR / 2, SPR / 2, SPR / 2, 0, TAU);
      g.fill();
      s = c;
      this._glowCache.set(rgb, s);
    }
    return s;
  }

  _hole(g, L, ox, oy, t) {
    const f = this._flicker(L, t);
    const cx = (L.x - ox) * 0.5, cy = (L.y - oy) * 0.5;
    const r = L.r * 0.5;
    if (r <= 1) return;
    g.globalAlpha = 0.92 * f; // source-over onto a fully transparent offscreen → premul alpha multiplies
    const d = r * 2;
    g.drawImage(this._holeSprite(), cx - r, cy - r, d, d);
    g.globalAlpha = 1;
  }

  _glow(ctx, L, ox, oy, t) {
    const f = this._flicker(L, t);
    const cx = L.x - ox, cy = L.y - oy;
    const r = L.r * 1.15;
    ctx.globalAlpha = Math.min(1, (CFG.lighting.glowAlpha * f) / 0.6); // bake peak 0.6 → divide restores linear alpha
    const d = r * 2;
    ctx.drawImage(this._glowSprite(L.rgb), cx - r, cy - r, d, d);
    ctx.globalAlpha = 1;
  }
}
