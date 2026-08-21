// Uniform spatial hash grid (cell size in world px). Pure — Node-safe.
export class HashGrid {
  constructor(cell) {
    this.cell = cell;
    this.map = new Map();
  }

  add(x, y, item) {
    const k = ((x / this.cell) | 0) + ',' + ((y / this.cell) | 0);
    const arr = this.map.get(k);
    if (arr) arr.push(item);
    else this.map.set(k, [item]);
  }

  // Items in the 3×3 cell neighborhood around (x, y).
  near(x, y) {
    const out = [];
    const cx = (x / this.cell) | 0, cy = (y / this.cell) | 0;
    for (let ix = cx - 1; ix <= cx + 1; ix++) {
      for (let iy = cy - 1; iy <= cy + 1; iy++) {
        const cell = this.map.get(ix + ',' + iy);
        if (cell) for (const it of cell) out.push(it);
      }
    }
    return out;
  }

  // Candidate items inside the bounding box [x-r, x+r] x [y-r, y+r] (cell-aligned superset).
  // Callers must apply the exact radius test.
  range(x, y, r) {
    const out = [];
    const x0 = Math.floor((x - r) / this.cell), x1 = Math.floor((x + r) / this.cell);
    const y0 = Math.floor((y - r) / this.cell), y1 = Math.floor((y + r) / this.cell);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iy = y0; iy <= y1; iy++) {
        const cell = this.map.get(ix + ',' + iy);
        if (cell) for (const it of cell) out.push(it);
      }
    }
    return out;
  }

  clear() {
    this.map.clear();
  }
}
