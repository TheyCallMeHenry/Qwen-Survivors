// Lighting: half-res darkness canvas, destination-out radial hole per light,
// drawn over the world in screen space; then an additive glow pass on top.
// Node-safe: canvas only created on resize() (browser).
import { CFG } from '../config.js';
import { TAU, hash2 } from '../utils/math.js';

export class Lighting {
  constructor() {
    this.cv = null;
    this.ctx = null;
    this.w = 0;
    this.h = 0;
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
  draw(ctx, cam, lights, t) {
    if (!this.cv) this.resize(cam.w, cam.h);
    const g = this.ctx;
    const ox = cam.x - cam.w / 2, oy = cam.y - cam.h / 2; // view top-left (world px)

    g.globalCompositeOperation = 'source-over';
    g.fillStyle = `rgba(${CFG.lighting.base},${CFG.lighting.baseAlpha})`;
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

  _hole(g, L, ox, oy, t) {
    const f = this._flicker(L, t);
    const cx = (L.x - ox) * 0.5, cy = (L.y - oy) * 0.5;
    const r = L.r * 0.5;
    if (r <= 1) return;
    const a = 0.92 * f;
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(0,0,0,${a})`);
    grad.addColorStop(0.55, `rgba(0,0,0,${a * 0.5})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.fill();
  }

  _glow(ctx, L, ox, oy, t) {
    const f = this._flicker(L, t);
    const cx = L.x - ox, cy = L.y - oy;
    const r = L.r * 1.15;
    const a = CFG.lighting.glowAlpha * f;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(${L.rgb},${a})`);
    grad.addColorStop(0.5, `rgba(${L.rgb},${a * 0.35})`);
    grad.addColorStop(1, `rgba(${L.rgb},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
  }
}
