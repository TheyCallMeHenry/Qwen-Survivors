// Uniform spatial hash grid (cell size in world px). Pure — Node-safe.
// Perf (2026-10-20 audit, 200-foe cap): near()/range() run ~500-900×/frame, so cell
// keys are packed integers (not "ix,iy" strings — ~9 key allocations per query) and
// both queries fill reusable scratch arrays instead of allocating fresh ones.
// Contract: the returned array belongs to the grid — iterate it immediately (for-of
// over the call) and never hold it across a later same-kind query on the same grid.
// Verified for every call site: the combat.js projectile/AoE loops, enemies._ai
// separation, and world.collidersNear's two consumers (which inherits this contract
// through its pass-through) all iterate in place; none re-queries the same grid
// mid-iteration (verified by grep: _chainArc/_explode bodies touch enemies.list or
// status fields only, never grid.near/range).
export class HashGrid {
  constructor(cell) {
    this.cell = cell;
    this.map = new Map();
    this._outNear = [];
    this._outRange = [];
  }

  // Packs (ix, iy) into one exactly-representable double. Exact for |ix|,|iy| < 2^25
  // (33.5M cells ≈ ±3.2B world px at cell=96 — every CFG world is orders smaller).
  _key(ix, iy) {
    return (ix + (1 << 25)) * (1 << 26) + (iy + (1 << 25));
  }

  add(x, y, item) {
    const k = this._key((x / this.cell) | 0, (y / this.cell) | 0);
    const arr = this.map.get(k);
    if (arr) arr.push(item);
    else this.map.set(k, [item]);
  }

  // Items in the 3×3 cell neighborhood around (x, y).
  near(x, y) {
    const out = this._outNear;
    out.length = 0;
    const cx = (x / this.cell) | 0, cy = (y / this.cell) | 0;
    for (let ix = cx - 1; ix <= cx + 1; ix++) {
      for (let iy = cy - 1; iy <= cy + 1; iy++) {
        const cell = this.map.get(this._key(ix, iy));
        if (cell) for (const it of cell) out.push(it);
      }
    }
    return out;
  }

  // Candidate items inside the bounding box [x-r, x+r] x [y-r, y+r] (cell-aligned superset).
  // Callers must apply the exact radius test. Non-finite args return empty — the cell
  // loop below would spin forever on ±Infinity.
  range(x, y, r) {
    const out = this._outRange;
    out.length = 0;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(r)) return out;
    const x0 = Math.floor((x - r) / this.cell), x1 = Math.floor((x + r) / this.cell);
    const y0 = Math.floor((y - r) / this.cell), y1 = Math.floor((y + r) / this.cell);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iy = y0; iy <= y1; iy++) {
        const cell = this.map.get(this._key(ix, iy));
        if (cell) for (const it of cell) out.push(it);
      }
    }
    return out;
  }

  clear() {
    this.map.clear();
    this._outNear.length = 0; // drop references to cleared items so they can be GC'd
    this._outRange.length = 0;
  }
}
