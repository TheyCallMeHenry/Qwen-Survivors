// tools/sprite-preview.mjs — Phase 27 (27.3): render js/art/heroes.js sheets in Node.
//
// A Canvas2D→SVG/ASCII recorder: it shims document.createElement('canvas') so the real
// builders run unmodified, records every path op, then (a) rasterizes each frame to ASCII
// so the silhouette can be judged in a terminal, and (b) writes a zoomed SVG contact sheet
// to unsloth-tmp/hero-preview.html. Also prints geometry metrics (content bbox, canvas
// overflow = clipped art, feet anchor) — the automated half of "is this readable at 1×".
//
//   node tools/sprite-preview.mjs            # all five sheets
//   node tools/sprite-preview.mjs mage       # one sheet

import { writeFileSync, mkdirSync } from 'node:fs';

// ── affine matrix + path recorder ────────────────────────────────────────────────
class Grad {
  constructor(kind, coords) { this.kind = kind; this.coords = coords; this.stops = []; }
  addColorStop(t, col) { this.stops.push([t, col]); }
}
const RAMP = ' .:-=+*#%@';
const lumOf = (col) => {
  if (col instanceof Grad) return col.stops.reduce((a, s) => a + lumOf(s[1]), 0) / Math.max(1, col.stops.length);
  const m = /^#([0-9a-f]{3})$/i.exec(col);
  if (m) return (parseInt(m[1][0], 16) * 17 * 0.3 + parseInt(m[1][1], 16) * 17 * 0.6 + parseInt(m[1][2], 16) * 17 * 0.1) / 255;
  const h = /^#([0-9a-f]{6})$/i.exec(col);
  if (h) { const n = parseInt(h[1], 16); return (((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.6 + (n & 255) * 0.1) / 255; }
  const r = /rgba?\(([^)]+)\)/i.exec(col);
  if (r) { const p = r[1].split(',').map(Number); return ((p[0] * 0.3 + p[1] * 0.6 + p[2] * 0.1) / 255) * (p.length > 3 ? p[3] : 1); }
  return 0.5;
};
const isFill = (col) => { // fully transparent paint → skip (glow falloff, not shape)
  if (col instanceof Grad) return false;
  const s = String(col);
  if (!/^rgba?\(/i.test(s)) return false;
  return Number(/,\s*([0-9.]+)\s*\)$/.exec(s)?.[1] ?? 1) < 0.05;
};

class RecCtx {
  constructor(w, h) {
    this.width = w; this.height = h;
    this.m = [1, 0, 0, 1, 0, 0];
    this.stack = [];
    this.fillStyle = '#000'; this.strokeStyle = '#000'; this.lineWidth = 1;
    this.lineCap = 'butt'; this.lineJoin = 'miter'; this.globalAlpha = 1;
    this.globalCompositeOperation = 'source-over';
    this.ops = []; this.path = [];
  }
  // matrix -----------------------------------------------------------------------
  _pt(x, y) { const m = this.m; return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
  save() { this.stack.push([this.m.slice(), this.fillStyle, this.strokeStyle, this.lineWidth, this.globalAlpha]); }
  restore() { const s = this.stack.pop(); if (!s) return; [this.m, this.fillStyle, this.strokeStyle, this.lineWidth, this.globalAlpha] = s; }
  translate(dx, dy) { const m = this.m; m[4] += m[0] * dx + m[2] * dy; m[5] += m[1] * dx + m[3] * dy; }
  scale(sx, sy) { const m = this.m; m[0] *= sx; m[1] *= sx; m[2] *= (sy ?? sx); m[3] *= (sy ?? sx); }
  // path ------------------------------------------------------------------------
  beginPath() { this.path = []; }
  moveTo(x, y) { const p = this._pt(x, y); this.path.push([p]); }
  lineTo(x, y) { this._seg(this._pt(x, y)); }
  quadraticCurveTo(cx, cy, x, y) {
    const a = this._cur(), b = this._pt(cx, cy), c = this._pt(x, y);
    for (let i = 1; i <= 8; i++) { const t = i / 8, u = 1 - t; this._seg([u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]); }
  }
  bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
    const p0 = this._cur(), p1 = this._pt(c1x, c1y), p2 = this._pt(c2x, c2y), p3 = this._pt(x, y);
    for (let i = 1; i <= 12; i++) {
      const t = i / 12, u = 1 - t;
      this._seg([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
                 u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
    }
  }
  arc(cx, cy, r, a0, a1) {
    const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 24)));
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); this._seg(this._pt(cx + Math.cos(a) * r, cy + Math.sin(a) * r), i === 0); }
  }
  ellipse(cx, cy, rx, ry, rot, a0, a1) {
    const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 24)));
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n), c = Math.cos(rot || 0), s = Math.sin(rot || 0);
      const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
      this._seg(this._pt(cx + ex * c - ey * s, cy + ex * s + ey * c), i === 0);
    }
  }
  arcTo(x1, y1, x2, y2, r) {
    const [cx, cy] = this._cur(), p1 = this._pt(x1, y1), p2 = this._pt(x2, y2);
    const d0 = [cx - p1[0], cy - p1[1]], d1 = [p2[0] - p1[0], p2[1] - p1[1]];
    const n0 = Math.hypot(...d0), n1 = Math.hypot(...d1);
    if (!r || n0 < 1e-9 || n1 < 1e-9) { this._seg(p1); return; }
    const cross = d0[0] * d1[1] - d0[1] * d1[0];
    if (Math.abs(cross) < 1e-9) { this._seg(p1); return; }
    const ang = Math.acos(Math.max(-1, Math.min(1, (d0[0] * d1[0] + d0[1] * d1[1]) / (n0 * n1))));
    const t = Math.min(r / Math.tan(ang / 2), n0, n1);
    const u0 = [d0[0] / n0, d0[1] / n0], u1 = [d1[0] / n1, d1[1] / n1];
    const bx = u0[0] + u1[0], by = u0[1] + u1[1], bn = Math.hypot(bx, by) || 1;
    const ccx = p1[0] + (bx / bn) * (r / Math.sin(ang / 2)), ccy = p1[1] + (by / bn) * (r / Math.sin(ang / 2));
    const aA = Math.atan2(p1[1] + u0[1] * t - ccy, p1[0] + u0[0] * t - ccx);
    let aB = Math.atan2(p1[1] + u1[1] * t - ccy, p1[0] + u1[0] * t - ccx);
    while (cross > 0 ? aB > aA : aB < aA) aB += (cross > 0 ? -1 : 1) * Math.PI * 2;
    const steps = Math.max(3, Math.ceil(Math.abs(aB - aA) / (Math.PI / 12)));
    this._seg([p1[0] + u0[0] * t, p1[1] + u0[1] * t]);
    for (let i = 1; i <= steps; i++) {
      const a = aA + (aB - aA) * (i / steps);
      this.path[this.path.length - 1].push([ccx + Math.cos(a) * r, ccy + Math.sin(a) * r]);
    }
  }
  closePath() { const s = this.path[this.path.length - 1]; if (s && s.length > 1) s.push(s[0].slice()); }
  _cur() { const s = this.path[this.path.length - 1]; return s ? s[s.length - 1] : [0, 0]; }
  _seg(p, force = false) {
    let s = this.path[this.path.length - 1];
    if (!s || (Math.hypot(p[0] - s[s.length - 1][0], p[1] - s[s.length - 1][1]) < 1e-9 && !force)) { if (!s) this.path.push([[p[0], p[1]]]); return; }
    s.push(p);
  }
  // paint -----------------------------------------------------------------------
  fill() { this.ops.push({ kind: 'fill', sub: this.path.map((s) => s.slice()), style: this.fillStyle, alpha: this.globalAlpha }); }
  stroke() { this.ops.push({ kind: 'stroke', sub: this.path.map((s) => s.slice()), style: this.strokeStyle, alpha: this.globalAlpha, w: this.lineWidth }); }
  fillRect(x, y, w, h) {
    const a = this._pt(x, y), b = this._pt(x + w, y), c = this._pt(x + w, y + h), d = this._pt(x, y + h);
    this.ops.push({ kind: 'fill', sub: [[a, b, c, d, a.slice()]], style: this.fillStyle, alpha: this.globalAlpha });
  }
  clearRect() {}
  createLinearGradient(x0, y0, x1, y1) { return new Grad('lin', [this._pt(x0, y0), this._pt(x1, y1)]); }
  createRadialGradient(x0, y0, r0, x1, y1, r1) { return new Grad('rad', [this._pt(x0, y0), this._pt(x1, y1), r0, r1]); }
  drawImage() {} // composites are irrelevant to silhouette checks
  measureText(t) { return { width: String(t).length * 6 }; }
  fillText() {}
}

class RecCanvas {
  constructor(w, h) { this.width = w; this.height = h; this._ctx = new RecCtx(w, h); }
  getContext() { return this._ctx; }
}
globalThis.document = { createElement: (t) => (t === 'canvas' ? new RecCanvas(1, 1) : { style: {}, appendChild() {} }) };
globalThis.window = globalThis;

// ── rasterize recorded ops to an ASCII grid (fills by scanline, strokes as lines) ─
function ascii(canvas, { silhouette = false } = {}) {
  const W = canvas.width, H = canvas.height;
  const grid = Array.from({ length: H }, () => new Array(W).fill(null));
  const put = (x, y, v) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < W && y >= 0 && y < H) grid[y][x] = v; };
  for (const op of canvas._ctx.ops) {
    if (isFill(op.style)) continue;
    const val = silhouette ? 1 : lumOf(op.style);
    if (op.kind === 'fill') {
      for (let y = 0; y < H; y++) {
        const yc = y + 0.5, xs = [];
        for (const s of op.sub) for (let i = 1; i < s.length; i++) {
          const [x0, y0] = s[i - 1], [x1, y1] = s[i];
          if ((y0 <= yc && y1 > yc) || (y1 <= yc && y0 > yc)) xs.push(x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0));
        }
        xs.sort((a, b) => a - b);
        for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.ceil(xs[i] - 0.5); x <= Math.floor(xs[i + 1] - 0.5); x++) put(x, y, val);
      }
    } else {
      const wdt = Math.max(1, Math.round((op.w || 1) / 2));
      for (const s of op.sub) for (let i = 1; i < s.length; i++) {
        const [x0, y0] = s[i - 1], [x1, y1] = s[i], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
        for (let k = 0; k <= n; k++) {
          const x = x0 + (x1 - x0) * (k / n), y = y0 + (y1 - y0) * (k / n);
          for (let dy = -wdt; dy <= wdt; dy++) for (let dx = -wdt; dx <= wdt; dx++) put(x + dx, y + dy, val);
        }
      }
    }
  }
  let out = '', ink = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let y = 0; y < H; y++) {
    let row = '';
    for (let x = 0; x < W; x++) {
      const v = grid[y][x];
      if (v == null) { row += ' '; continue; }
      ink++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      row += RAMP[Math.max(1, Math.min(RAMP.length - 1, Math.round(v * (RAMP.length - 1))))];
    }
    out += row + '\n';
  }
  return { text: out, ink, bbox: ink ? [x0, y0, x1 - x0 + 1, y1 - y0 + 1] : null };
}

// ── SVG (for the zoomed HTML contact sheet) ────────────────────────────────────────
function svgOf(canvas, { silhouette = false, zoom = 7 } = {}) {
  const defs = []; let gid = 0;
  const styleAttr = (st, alpha, kind, w) => {
    if (silhouette) return `fill="${kind === 'fill' ? '#12161f' : 'none'}" stroke="${kind === 'stroke' ? '#3c475c' : 'none'}" stroke-width="${(w ?? 1)}"`;
    let paint = st;
    if (st instanceof Grad) {
      const id = `g${gid++}`;
      if (st.kind === 'lin') defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${st.coords[0][0]}" y1="${st.coords[0][1]}" x2="${st.coords[1][0]}" y2="${st.coords[1][1]}">${st.stops.map(([t, c]) => `<stop offset="${t}" stop-color="${c}"/>`).join('')}</linearGradient>`);
      else defs.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${st.coords[1][0]}" cy="${st.coords[1][1]}" r="${st.coords[3]}">${st.stops.map(([t, c]) => `<stop offset="${t}" stop-color="${c}"/>`).join('')}</radialGradient>`);
      paint = `url(#${id})`;
    }
    return kind === 'fill' ? `fill="${paint}" fill-opacity="${alpha}" stroke="none"`
                           : `fill="none" stroke="${paint}" stroke-opacity="${alpha}" stroke-width="${w ?? 1}" stroke-linecap="round"`;
  };
  const body = canvas._ctx.ops.filter((o) => !isFill(o.style)).map((op) => {
    const d = op.sub.map((s) => `M${s.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}Z`).join('');
    return `<path d="${d}" ${styleAttr(op.kind === 'fill' ? op.style : op.style, op.alpha, op.kind, op.w)}/>`;
  }).join('');
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width * zoom}" height="${canvas.height * zoom}" viewBox="0 0 ${canvas.width} ${canvas.height}">${defs.length ? `<defs>${defs.join('')}</defs>` : ''}${body}</svg>`, w: canvas.width, h: canvas.height };
}

// ── drive the real builders ───────────────────────────────────────────────────────
const { buildRoster } = await import('../js/art/heroes.js');
const roster = buildRoster();
const only = process.argv[2];
const keys = (only && roster[only]) ? [only] : ['mage', 'warden', 'ranger', 'swash', 'ghost'];
const sections = [];

for (const key of keys) {
  const sh = roster[key];
  const frames = [['idle0', sh.idle[0]], ['idle1', sh.idle[1]], ...sh.run.map((f, i) => [`run${i}`, f])];
  console.log(`\n=== ${key}  ${sh.w}\u00d7${sh.h}  shadowR ${sh.shadowR} ===`);
  const cols = frames.map(([, f]) => ascii(f));
  const sils = frames.map(([, f]) => ascii(f, { silhouette: true }));
  for (let y = 0; y < sh.h; y++) {
    console.log(cols.map((a) => (a.text.split('\n')[y] || '').padEnd(sh.w, ' ')).join(' \u2502'));
  }
  const cells = frames.map(([name], i) => {
    const a = cols[i], s = sils[i];
    const [bx, by, bw, bh] = a.bbox || [0, 0, 0, 0];
    const over = bx < 0 || by < 0 || bx + bw > sh.w || by + bh > sh.h;
    return `${name} bbox ${bw}\u00d7${bh}@${bx},${by} feetY=${by + bh - 1} ink=${(a.ink / (sh.w * sh.h) * 100).toFixed(0)}% sil=${(s.ink / (sh.w * sh.h) * 100).toFixed(0)}%${over ? ' OVERFLOW' : ''}`;
  });
  console.log(cells.join('\n'));
  const cellsHtml = frames.map(([name, f]) => {
    const sv = svgOf(f), ss = svgOf(f, { silhouette: true });
    return `<div class="cell"><h4>${name} \u2014 colored / silhouette</h4><div class="pair"><div>${sv.svg}</div><div class="sil">${ss.svg}</div></div></div>`;
  });
  sections.push(`<h3>${key} ${sh.w}\u00d7${sh.h}</h3><div>${cellsHtml.join('')}</div>`);
}

mkdirSync('unsloth-tmp', { recursive: true });
writeFileSync('unsloth-tmp/hero-preview.html', `<!doctype html><meta charset=utf-8>
<title>hero sheets \u2014 Phase 27</title><style>
body{background:#1a1d26;color:#c9d2e2;font:13px system-ui;margin:18px}
h3{margin:14px 0 4px} .cell{display:inline-block;margin:6px;vertical-align:top}
h4{font-size:11px;font-weight:500;color:#7f8ea6;margin:2px 0}
.pair{display:flex;gap:6px;background:#12151d;padding:6px;border-radius:6px}
svg{image-rendering:pixelated;background:#232836;border-radius:3px} .sil svg{background:#e9edf5}
</style>${sections.join('')}<p>left = colored sheet \u00b7 right = silhouette (shape-only readability check at 1\u00d7)</p>`);
console.log('\nwrote unsloth-tmp/hero-preview.html');
