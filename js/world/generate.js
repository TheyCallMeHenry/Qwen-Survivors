// Seeded world layout — pure data, no canvas (safe to import/call in Node).
// World.generate() resolves the sprite keys (`k`) against the terrain pack
// and builds the collider grid.

import { CFG } from '../config.js';
import { mulberry32, clamp, TAU } from '../utils/math.js';

export function generateWorld(seed) {
  const rng = mulberry32(seed >>> 0);
  const W = CFG.world.w, H = CFG.world.h, M = CFG.world.margin;
  const rand = (a, b) => a + rng() * (b - a);
  const pick = (arr) => arr[(rng() * arr.length) | 0];
  const clampPos = (x, y) => ({ x: clamp(x, M, W - M), y: clamp(y, M, H - M) });

  // --- village: 5 huts + well + 2 campfires, near center ---
  const village = { x: W / 2 + rand(-260, 260), y: H / 2 + rand(-200, 200) };
  const well = { x: village.x, y: village.y };
  const huts = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + rand(-0.4, 0.4);
    const p = clampPos(village.x + Math.cos(a) * rand(130, 200), village.y + Math.sin(a) * rand(95, 150));
    huts.push({ x: p.x, y: p.y, v: i % 2 });
  }
  const campfires = [
    { x: village.x - 95, y: village.y + 40 },
    { x: village.x + 85, y: village.y - 55 },
  ];
  const playerStart = { x: village.x, y: village.y + 80 };

  // --- mountains: NW + E clusters, base band near the top of the map ---
  const mountains = [];
  const peakCluster = (x0, x1, baseY, n) => {
    for (let i = 0; i < n; i++) {
      const w = Math.round(rand(400, 700));
      const h = Math.round(rand(220, 320));
      const x = rand(x0, x1);
      mountains.push({ x, y: baseY + rand(-30, 30), w, h, ms: ((seed ^ 0x9e3779b9) + i * 0x85ebca6b) >>> 0 });
    }
  };
  peakCluster(500, 1700, 420, 3 + (rng() * 2 | 0));
  peakCluster(2900, 3900, 480, 3 + (rng() * 2 | 0));

  // --- lakes: 1–2, away from the village ---
  const lakes = [];
  const nLakes = 1 + (rng() < 0.5 ? 1 : 0);
  for (let i = 0; i < nLakes; i++) {
    let p = { x: 0, y: 0 }, tries = 0;
    do {
      p = clampPos(rand(300, W - 300), rand(700, H - 300));
      tries++;
    } while (Math.hypot(p.x - village.x, p.y - village.y) < 650 && tries < 24);
    const rx = Math.round(rand(140, 240));
    lakes.push({ x: p.x, y: p.y, rx, ry: Math.round(rx * 0.45), ls: ((seed + i * 1013904223) >>> 0) });
  }

  // --- 4 forest clusters ---
  const clusters = [];
  for (let i = 0; i < 4; i++) {
    let p = { x: 0, y: 0 }, tries = 0;
    do {
      p = clampPos(rand(200, W - 200), rand(200, H - 200));
      tries++;
    } while (
      (Math.hypot(p.x - village.x, p.y - village.y) < 550 ||
        lakes.some((l) => Math.hypot(p.x - l.x, p.y - l.y) < l.rx + 250)) && tries < 24
    );
    clusters.push(p);
  }

  const trees = [];
  const addTree = (x, y, kind, s) => {
    const p = clampPos(x, y);
    trees.push({
      x: p.x, y: p.y, kind, s,
      v: kind === 'pine' ? (rng() * 4) | 0 : (rng() * 2) | 0,
    });
  };
  for (const c of clusters) {
    const n = 12 + (rng() * 15 | 0); // 12–26
    for (let i = 0; i < n; i++) {
      const gx = c.x + (rng() + rng() - 1) * 260;
      const gy = c.y + (rng() + rng() - 1) * 260;
      if (rng() < 0.16) addTree(gx, gy, 'pineBig', 1.4 + rng() * 0.5);
      else addTree(gx, gy, 'pine', 0.8 + rng() * 0.4);
    }
  }
  // scattered singletons
  const nScatter = 14 + (rng() * 10 | 0);
  for (let i = 0; i < nScatter; i++) addTree(rand(M + 40, W - M - 40), rand(M + 40, H - M - 40), 'pine', 0.8 + rng() * 0.5);
  // perimeter pine ring
  const ringStep = 70;
  for (let x = M + 60; x < W - M; x += ringStep * (0.8 + rng() * 0.5)) addTree(x, M + rand(30, 110), 'pine', 1.0 + rng() * 0.35);
  for (let x = M + 60; x < W - M; x += ringStep * (0.8 + rng() * 0.5)) addTree(x, H - M - rand(30, 110), 'pine', 1.0 + rng() * 0.35);
  for (let y = M + 240; y < H - M; y += ringStep * (0.8 + rng() * 0.5)) addTree(M + rand(30, 110), y, 'pine', 1.0 + rng() * 0.35);
  for (let y = M + 240; y < H - M; y += ringStep * (0.8 + rng() * 0.5)) addTree(W - M - rand(30, 110), y, 'pine', 1.0 + rng() * 0.35);

  const deadTrees = [];
  for (let i = 0; i < 6 + (rng() * 5 | 0); i++) deadTrees.push(clampPos(rand(M + 40, W - M - 40), rand(M + 40, H - M - 40)));

  const rocks = [];
  for (let i = 0; i < 10 + (rng() * 5 | 0); i++) {
    const p = clampPos(rand(M + 40, W - M - 40), rand(M + 40, H - M - 40));
    rocks.push({ x: p.x, y: p.y, v: (rng() * 2) | 0, s: 0.9 + rng() * 0.6 });
  }
  const stumps = [];
  for (let i = 0; i < 8; i++) stumps.push(clampPos(rand(M + 40, W - M - 40), rand(M + 40, H - M - 40)));
  const mushrooms = [];
  for (let i = 0; i < 10; i++) {
    const c = pick(clusters);
    mushrooms.push(clampPos(c.x + rand(-180, 180), c.y + rand(-180, 180)));
  }

  // --- monolith ring (separate landmark) ---
  const ringC = clampPos(W * 0.28 + rand(-150, 150), H * 0.30 + rand(-100, 100));
  const monoliths = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + rand(-0.15, 0.15);
    monoliths.push({ x: ringC.x + Math.cos(a) * 190, y: ringC.y + Math.sin(a) * 150 });
  }
  monoliths.push({ x: ringC.x, y: ringC.y }); // center stone

  // --- scattered campfires near forest paths ---
  for (let i = 0; i < 4 + (rng() * 3 | 0); i++) {
    const c = pick(clusters);
    campfires.push({ x: c.x + rand(-260, 260), y: c.y + rand(-260, 260) });
  }

  // --- ~1000 ground decals ---
  const decalKeys = ['tuft', 'tuft', 'tuft', 'tuft', 'tuft', 'tuft', 'tuft', 'tuft',
    'pebble', 'pebble', 'pebble', 'pebble', 'pebble',
    'flowerA', 'flowerA', 'flowerB', 'flowerB',
    'bone', 'mud', 'mud', 'moss', 'moss'];
  const decals = [];
  for (let i = 0; i < 1000; i++) {
    const k = pick(decalKeys);
    decals.push({
      k,
      x: rand(M, W - M),
      y: rand(M, H - M),
      s: k === 'moss' ? 0.8 + rng() * 0.7 : k === 'mud' ? 0.7 + rng() * 0.6 : 0.7 + rng() * 0.6,
    });
  }

  // --- colliders ---
  const colliders = [];
  for (const t of trees) {
    const r = t.kind === 'pineBig' ? 15 : t.kind === 'dead' ? 7 : 9 + t.s * 4; // ≈10–14
    colliders.push({ x: t.x, y: t.y, r });
  }
  for (const t of deadTrees) colliders.push({ x: t.x, y: t.y, r: 7 });
  for (const h of huts) {
    colliders.push({ x: h.x - 18, y: h.y, r: 34 });
    colliders.push({ x: h.x + 18, y: h.y, r: 34 });
  }
  for (const r of rocks) colliders.push({ x: r.x, y: r.y, r: 14 + r.s * 8 }); // ≈14–22
  for (const l of lakes) colliders.push({ x: l.x, y: l.y, rx: l.rx, ry: l.ry, ellipse: true });
  for (const m of mountains) colliders.push({ x: m.x, y: m.y - 30, r: m.w * 0.3 });
  for (const m of monoliths) colliders.push({ x: m.x, y: m.y, r: 12 });
  colliders.push({ x: well.x, y: well.y, r: 16 });
  for (const cf of campfires) colliders.push({ x: cf.x, y: cf.y, r: 10 });
  // keep spawn clear (player margin 70)
  const clear = (c) => {
    const rr = c.r || Math.max(c.rx, c.ry) || 0;
    return Math.hypot(c.x - playerStart.x, c.y - playerStart.y) > 70 + rr;
  };
  const safeColliders = colliders.filter(clear);

  // --- lights (static data; flicker applied at runtime) ---
  const lights = campfires.map((cf) => ({ x: cf.x, y: cf.y - 8, r: 150, rgb: '255,150,60', flicker: 1 }));
  for (const m of monoliths) lights.push({ x: m.x, y: m.y - 30, r: 120, rgb: '90,220,255', flicker: 0.25 });

  // --- standing decor for Y-sort (keys resolved to canvases by World) ---
  const decor = [];
  const put = (o, k, s, w, h) => decor.push({ x: o.x, y: o.y, k, s, w, h });
  for (const t of trees) {
    const big = t.kind === 'pineBig';
    put(t, big ? `pineBig:${t.v}` : `pine:${t.v}`, t.s, big ? 90 : 64, big ? 120 : 88);
  }
  for (const t of deadTrees) put(t, 'dead', 1, 44, 92);
  for (const r of rocks) put(r, `boulder:${r.v}`, r.s, 48, 36);
  for (const h of huts) put(h, `hut:${h.v}`, 1, 120, 96);
  for (const m of monoliths) put(m, 'monolith', 1, 44, 96);
  for (const cf of campfires) put(cf, 'campfire', 1, 56, 48);
  for (const s of stumps) put(s, 'stump', 1, 36, 26);
  for (const m of mushrooms) put(m, 'mushroom', 1, 20, 22);
  put(well, 'well', 1, 56, 64);

  return {
    seed, W, H,
    village, well, playerStart,
    huts, campfires, monoliths,
    lakes, mountains,
    trees, deadTrees, rocks, stumps, mushrooms,
    colliders: safeColliders,
    decals,
    lights,
    decor,
  };
}
