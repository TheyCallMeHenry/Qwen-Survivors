// World: generated state + background draw pipeline.
// drawBackground does: sky (screen space) → world space: ground tiles,
// mountains, ground decals (big moss/mud, then small), lakes.
// Standing decor (this.decor) is Y-sorted and drawn by the game (Phase 3);
// this.lights is consumed by systems/lighting.js; colliders via collidersNear().

import { buildSky } from '../art/sky.js';
import { buildTerrain, mountainSprite, lakeSprite, koiPondSprite } from '../art/terrain.js';
import { makeCanvas } from '../art/base.js';
import { generateWorld } from './generate.js';
import { getLevel } from './levels.js';
import { CFG } from '../config.js';
import { mulberry32, hash2 } from '../utils/math.js';
import { HashGrid } from '../utils/grid.js';

const skyCaches = new Map();
let terrainCache = null;
function getSky(levelKey) {
  if (!skyCaches.has(levelKey)) skyCaches.set(levelKey, buildSky(levelKey));
  return skyCaches.get(levelKey);
}
function getTerrain() {
  if (!terrainCache) terrainCache = buildTerrain();
  return terrainCache;
}
let emptyImg = null; // 1x1 transparent stand-in (m03 open-water fish schools have no pond img)
function getEmptyImg() {
  if (!emptyImg) emptyImg = makeCanvas(1, 1);
  return emptyImg;
}

const CELL = 256;

export class World {
  constructor() {
    this.data = null;
    this.level = null;
    this.W = 0;
    this.H = 0;
    this.playerStart = { x: 0, y: 0 };
  }

  generate(seed, levelKey = 'm01') {
    const level = getLevel(levelKey);
    // Per-level bounds: single seam — hot paths (player/enemies/camera/combat) read CFG.world.
    CFG.world.w = level.w; CFG.world.h = level.h; CFG.world.margin = level.margin;
    const terrain = getTerrain();
    const d = generateWorld(seed, levelKey);
    this.data = d;
    this.level = level;
    this.W = d.W;
    this.H = d.H;
    this.playerStart = d.playerStart;
    this.well = d.well;
    this.mountains = d.mountains.map((m) => ({ ...m, img: mountainSprite(mulberry32(m.ms), m.w, m.h) }));
    this.lakes = d.lakes.map((l) => ({
      ...l,
      img: l.school ? getEmptyImg() : l.koi ? koiPondSprite(mulberry32(l.ls), l.rx, l.ry) : lakeSprite(mulberry32(l.ls), l.rx, l.ry),
    }));
    this.decor = d.decor.map((o) => ({ ...o, img: terrain.sprites[o.k] }));
    this.lights = d.lights;
    this.colliders = d.colliders;
    this._grid = new HashGrid(CELL);
    for (const c of d.colliders) this._grid.add(c.x, c.y, c);
  }

  // Colliders in the 3×3 cells around (x, y).
  collidersNear(x, y) {
    return this._grid.near(x, y);
  }

  // cam = {x, y, w, h} — view center + view size in CSS px. t = run time (s).
  drawBackground(ctx, cam, t) {
    const sky = getSky(this.level.key);
    const terrain = getTerrain();
    const pal = this.level.palette;
    const vw = cam.w, vh = cam.h;

    // --- sky (screen space) ---
    const horizon = vh * 0.30 + (cam.y / this.H) * 8;
    const grad = ctx.createLinearGradient(0, 0, 0, horizon);
    grad.addColorStop(0, pal.skyTop);
    grad.addColorStop(1, pal.skyHorizon);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vw, horizon + 2);

    ctx.fillStyle = sky.star;
    for (const s of sky.stars) {
      ctx.globalAlpha = s.a * (0.55 + 0.45 * Math.sin(t * s.sp + s.ph));
      ctx.fillRect(s.x * vw, s.y * horizon * 0.9, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    // moon
    ctx.drawImage(sky.moon, vw * sky.moonX, horizon * sky.moonY, 240 * sky.moonScale, 240 * sky.moonScale);

    // drifting clouds (stateless: derive x from t)
    for (const cl of sky.clouds) {
      const cw = cl.img.width * cl.scale, ch = cl.img.height * cl.scale;
      const span = vw + cw;
      const cx = ((cl.x + cl.speed * t) % span) - cw;
      ctx.globalAlpha = cl.alpha;
      ctx.drawImage(cl.img, cx, horizon * cl.yFrac - ch * 0.5, cw, ch);
    }
    ctx.globalAlpha = 1;

    // ridge silhouettes, tiled, base at horizon (parallax far 0.12 / near 0.22)
    const ridge = (img, par) => {
      const off = (((cam.x * par) % 2400) + 2400) % 2400;
      for (let x = -off; x < vw; x += 2400) ctx.drawImage(img, x, horizon - img.height);
    };
    ridge(sky.ridges.far, 0.12);
    ridge(sky.ridges.near, 0.22);

    // --- world space ---
    ctx.save();
    ctx.translate(vw / 2 - cam.x, vh / 2 - cam.y);
    const pad = 260;
    const x0 = Math.max(0, cam.x - vw / 2 - pad), x1 = Math.min(this.W, cam.x + vw / 2 + pad);
    const y0 = Math.max(0, cam.y - vh / 2 - pad), y1 = Math.min(this.H, cam.y + vh / 2 + pad);

    // ground base under tiles (keeps world edges solid)
    ctx.fillStyle = pal.ground;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);

    // grass tiles, deterministic per-tile pick + alpha tint
    const T = CFG.world.tile;
    const tiles = terrain.ground[this.level.key] || terrain.grassTiles;
    for (let ty = (y0 / T) | 0; ty * T < y1; ty++) {
      for (let tx = (x0 / T) | 0; tx * T < x1; tx++) {
        const h = hash2(tx, ty);
        ctx.globalAlpha = 0.88 + h * 0.12;
        ctx.drawImage(tiles[(h * 3) | 0], tx * T, ty * T);
      }
    }
    ctx.globalAlpha = 1;

    // mountains (behind all standing decor)
    for (const m of this.mountains) {
      if (m.x + m.img.width / 2 < x0 || m.x - m.img.width / 2 > x1 || m.y + m.img.height < y0) continue;
      ctx.drawImage(m.img, m.x - m.img.width / 2, m.y);
    }

    const D = terrain.decals;
    // big ground decals (moss / mud)
    for (const d of this.data.decals) {
      if (d.k !== 'moss' && d.k !== 'mud') continue;
      if (d.x < x0 - 80 || d.x > x1 + 80 || d.y < y0 - 80 || d.y > y1 + 80) continue;
      const img = D[d.k];
      const w = img.width * d.s, h = img.height * d.s;
      ctx.drawImage(img, d.x - w / 2, d.y - h / 2, w, h);
    }

    // lakes
    for (const l of this.lakes) {
      if (l.x - l.img.width / 2 > x1 || l.x + l.img.width / 2 < x0) continue;
      if (l.y - l.img.height / 2 > y1 || l.y + l.img.height / 2 < y0) continue;
      ctx.drawImage(l.img, l.x - l.img.width / 2, l.y - l.img.height / 2);
      if (l.koi) {
        // koi: stateless t-driven elliptical orbits, flip on the half going screen-down
        for (let i = 0; i < l.koi; i++) {
          const ks = l.ks[i];
          const a = t * ks.sp + ks.ph;
          const kx = l.x + Math.cos(a) * l.rx * 0.5;
          const ky = l.y + Math.sin(a) * l.ry * 0.5;
          const img = (Math.sin(a) > 0 ? terrain.koiF : terrain.koi)[ks.k];
          ctx.drawImage(img, kx - 9, ky - 4.5);
        }
      }
    }

    // small ground decals
    for (const d of this.data.decals) {
      if (d.k === 'moss' || d.k === 'mud') continue;
      if (d.x < x0 - 32 || d.x > x1 + 32 || d.y < y0 - 32 || d.y > y1 + 32) continue;
      const img = D[d.k];
      const w = img.width * d.s, h = img.height * d.s;
      ctx.drawImage(img, d.x - w / 2, d.y - h / 2, w, h);
    }

    ctx.restore();

    // m03: god-ray light shafts (screen space, slight cam parallax; under the lighting pass)
    if (sky.godrays) {
      for (const gr of sky.godrays) {
        const w = gr.img.width, h = gr.img.height;
        const span = vw + w;
        const off = ((((gr.x + cam.x * gr.par + gr.speed * t) % span) + span) % span) - w;
        ctx.globalAlpha = gr.alpha;
        for (let xx = off; xx < vw; xx += span) ctx.drawImage(gr.img, xx, -24, w, h);
      }
      ctx.globalAlpha = 1;
    }
  }
}
