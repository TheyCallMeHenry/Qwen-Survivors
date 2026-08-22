// Per-level definitions — Phase 13. Pure data + pure layout hooks; no canvas (Node-safe).
// The m01 layout is the original Evernight Wood generator (moved verbatim — identical output).
// m03: layout + weights + roster land with 13.4/13.5 (m02 weights/boss landed 13.3).

import { mulberry32, clamp, TAU } from '../utils/math.js';

export const LEVEL_ORDER = ['m01', 'm02', 'm03'];

export const LEVELS = {
  m01: {
    key: 'm01',
    name: 'Evernight Wood',
    w: 4200, h: 3200, margin: 70,
    diff: 1.0,              // A4: chained ~×1.25 per level step
    menuSeed: 20260820,     // fixed seed for the menu backdrop
    foreground: 'snow',
    audio: 'wood',
    unlock: { level: null, wins: 0 },
    palette: { skyTop: '#0b1026', skyHorizon: '#3a2c4e', ground: '#131c17', mm: '#0b111e', light: '8,10,24' },
    weights: (t) => ({
      rat: 5,
      bat: t > 30 ? 3 : 0.5,
      goblin: t > 60 ? 4 : 0,
      wolf: t > 120 ? 3 : 0,
      brute: t > 150 ? 2 : 0,
      cultist: t > 90 ? 2.5 : 0,
    }),
    boss: { key: 'wraith', at: 240, name: 'THE WRAITH' },
    layout: layoutM01,
  },
  m02: {
    key: 'm02',
    name: 'Higan',
    w: 4200, h: 3200, margin: 70,
    diff: 1.25,
    menuSeed: 20260822,
    foreground: 'petal',    // sakura petals — Map 02 only (replaces snow)
    audio: 'higan',
    unlock: { level: 'm01', wins: 3 },
    palette: { skyTop: '#241226', skyHorizon: '#e8909c', ground: '#1e2a19', mm: '#191016', light: '24,10,16' }, // dusk pink + full moon (A5)
    weights: (t) => ({   // same role curve as m01 (slot re-skins, A1) — difficulty via diff (A4)
      rat: 5,
      bat: t > 30 ? 3 : 0.5,
      goblin: t > 60 ? 4 : 0,
      wolf: t > 120 ? 3 : 0,
      brute: t > 150 ? 2 : 0,
      cultist: t > 90 ? 2.5 : 0,
    }),
    boss: { key: 'ryu', at: 240, name: 'RYŪ' },
    layout: layoutM02,
  },
  m03: {
    key: 'm03',
    name: 'The Drowned City',
    w: 5145, h: 3920, margin: 70,
    diff: 1.56,
    menuSeed: 20260823,
    foreground: 'bubble',   // small rising bubbles (replaces snow / petals)
    audio: 'drowned',
    unlock: { level: 'm02', wins: 3 },
    palette: { skyTop: '#04283e', skyHorizon: '#0a4a66', ground: '#05141e', mm: '#04121e', light: '4,10,22' }, // deep-water gradient: light enters at the surface (A5)
    weights: null, boss: null, layout: layoutM03, // 13.5 / 13.5 / 13.4
  },
};

export function getLevel(key) {
  return LEVELS[key] || LEVELS.m01;
}

// --- m01 layout: original Evernight Wood generator (identical output) ---
function layoutM01(seed) {
  const rng = mulberry32(seed >>> 0);
  const W = LEVELS.m01.w, H = LEVELS.m01.h, M = LEVELS.m01.margin;
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

// --- m02 layout: Higan (traditional-Japanese spring; torii ring landmark) ---
function layoutM02(seed) {
  const rng = mulberry32(seed >>> 0);
  const W = LEVELS.m02.w, H = LEVELS.m02.h, M = LEVELS.m02.margin;
  const rand = (a, b) => a + rng() * (b - a);
  const pick = (arr) => arr[(rng() * arr.length) | 0];
  const clampPos = (x, y) => ({ x: clamp(x, M, W - M), y: clamp(y, M, H - M) });

  // --- village: 6 shrines + 1 pagoda, well at center ---
  const village = { x: W / 2 + rand(-260, 260), y: H / 2 + rand(-200, 200) };
  const well = { x: village.x, y: village.y };
  const huts = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + rand(-0.4, 0.4);
    const p = clampPos(village.x + Math.cos(a) * rand(140, 210), village.y + Math.sin(a) * rand(100, 160));
    huts.push({ x: p.x, y: p.y, v: i % 2 });
  }
  const pagoda = { x: village.x + rand(-320, 320), y: village.y + rand(-260, 260) };
  const playerStart = { x: village.x, y: village.y + 80 };

  // --- koi pond (1), away from the village ---
  let p = { x: 0, y: 0 }, tries = 0;
  do {
    p = clampPos(rand(300, W - 300), rand(700, H - 300));
    tries++;
  } while (Math.hypot(p.x - village.x, p.y - village.y) < 650 && tries < 24);
  const rx = Math.round(rand(140, 240));
  const lakes = [{
    x: p.x, y: p.y, rx, ry: Math.round(rx * 0.45),
    ls: ((seed + 1013904223) >>> 0), koi: 3,
    ks: [0, 1, 2].map((k) => ({ sp: 0.3 + rng() * 0.7, ph: rng() * TAU, k })),
  }];
  const pond = lakes[0];

  // --- 4 cherry clusters ---
  const clusters = [];
  for (let i = 0; i < 4; i++) {
    let c = { x: 0, y: 0 }, tr = 0;
    do {
      c = clampPos(rand(200, W - 200), rand(200, H - 200));
      tr++;
    } while (
      (Math.hypot(c.x - village.x, c.y - village.y) < 550 ||
        Math.hypot(c.x - pond.x, c.y - pond.y) < pond.rx + 250) && tr < 24
    );
    clusters.push(c);
  }

  const trees = [];
  const addTree = (x, y, kind, s) => {
    const pt = clampPos(x, y);
    trees.push({ x: pt.x, y: pt.y, kind, s, v: (rng() * (kind === 'cherryBig' ? 2 : 4)) | 0 });
  };
  for (const c of clusters) {
    const n = 12 + (rng() * 15 | 0); // 12–26
    for (let i = 0; i < n; i++) {
      const gx = c.x + (rng() + rng() - 1) * 260;
      const gy = c.y + (rng() + rng() - 1) * 260;
      if (rng() < 0.16) addTree(gx, gy, 'cherryBig', 1.4 + rng() * 0.5);
      else addTree(gx, gy, 'cherry', 0.8 + rng() * 0.4);
    }
  }
  // scattered singletons
  const nScatter = 14 + (rng() * 10 | 0);
  for (let i = 0; i < nScatter; i++) addTree(rand(M + 40, W - M - 40), rand(M + 40, H - M - 40), 'cherry', 0.8 + rng() * 0.4);
  // perimeter cherry ring (m01 pine-ring pattern)
  const ringStep = 70;
  for (let x = M + 60; x < W - M; x += ringStep * (0.8 + rng() * 0.5)) addTree(x, M + rand(30, 110), 'cherry', 1.0 + rng() * 0.35);
  for (let x = M + 60; x < W - M; x += ringStep * (0.8 + rng() * 0.5)) addTree(x, H - M - rand(30, 110), 'cherry', 1.0 + rng() * 0.35);
  for (let y = M + 240; y < H - M; y += ringStep * (0.8 + rng() * 0.5)) addTree(M + rand(30, 110), y, 'cherry', 1.0 + rng() * 0.35);
  for (let y = M + 240; y < H - M; y += ringStep * (0.8 + rng() * 0.5)) addTree(W - M - rand(30, 110), y, 'cherry', 1.0 + rng() * 0.35);

  const stumps = [];
  for (let i = 0; i < 6; i++) stumps.push(clampPos(rand(M + 40, W - M - 40), rand(M + 40, H - M - 40)));

  // --- bamboo groves ---
  const bamboo = [];
  for (let i = 0; i < 3; i++) {
    let g = { x: 0, y: 0 }, tr = 0;
    do {
      g = clampPos(rand(200, W - 200), rand(200, H - 200));
      tr++;
    } while (
      (Math.hypot(g.x - village.x, g.y - village.y) < 500 ||
        Math.hypot(g.x - pond.x, g.y - pond.y) < pond.rx + 220 ||
        clusters.some((c) => Math.hypot(g.x - c.x, g.y - c.y) < 220)) && tr < 24
    );
    const n = 6 + (rng() * 5 | 0); // 6–10 culms
    for (let j = 0; j < n; j++) {
      const pt = clampPos(g.x + rand(-70, 70), g.y + rand(-70, 70));
      bamboo.push({ x: pt.x, y: pt.y, v: (rng() * 2) | 0 });
    }
  }

  // --- lanterns: 5 village-ring + 3 pond-ring ---
  const lanterns = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + rand(-0.3, 0.3);
    lanterns.push({ x: village.x + Math.cos(a) * rand(240, 300), y: village.y + Math.sin(a) * rand(180, 230) });
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + rand(-0.3, 0.3);
    lanterns.push({ x: pond.x + Math.cos(a) * (pond.rx + 60), y: pond.y + Math.sin(a) * (pond.ry + 50) });
  }

  // --- torii ring (landmark; monoliths field) + center shrine ---
  const ringC = clampPos(W * 0.28 + rand(-150, 150), H * 0.30 + rand(-100, 100));
  const monoliths = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + rand(-0.15, 0.15);
    monoliths.push({ x: ringC.x + Math.cos(a) * 190, y: ringC.y + Math.sin(a) * 150 });
  }
  const ringShrine = { x: ringC.x, y: ringC.y, v: 0 };

  // --- stone paths (decal slabs): village→pond, village→ring, 2 cluster trails ---
  const decals = [];
  const pave = (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const n = Math.max(1, Math.round(Math.hypot(dx, dy) / 64));
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      decals.push({
        k: `path${'ABC'[(i + (rng() * 3 | 0)) % 3]}`,
        x: a.x + dx * f + rand(-14, 14),
        y: a.y + dy * f + rand(-14, 14),
        s: 0.85 + rng() * 0.4,
      });
    }
  };
  pave(village, pond);
  pave(village, ringC);
  pave(clusters[0], clusters[1]);
  pave(clusters[2], clusters[3]);

  // --- ~900 ground decals ---
  const decalKeys = ['tuftG', 'tuftG', 'tuftG', 'tuftG', 'tuftG', 'tuftG', 'tuftG', 'tuftG',
    'petalDrop', 'petalDrop', 'petalDrop', 'petalDrop', 'petalDrop', 'petalDrop',
    'flowerC', 'flowerC', 'flowerC', 'flowerC',
    'pebble', 'pebble', 'pebble', 'pebble', 'pebble',
    'stone', 'stone', 'stone',
    'moss', 'moss', 'moss'];
  for (let i = 0; i < 900; i++) {
    const k = pick(decalKeys);
    decals.push({
      k,
      x: rand(M, W - M),
      y: rand(M, H - M),
      s: k === 'moss' ? 0.8 + rng() * 0.7 : 0.7 + rng() * 0.6,
    });
  }

  // --- colliders ---
  const colliders = [];
  for (const t of trees) colliders.push({ x: t.x, y: t.y, r: t.kind === 'cherryBig' ? 15 : 9 + t.s * 4 });
  for (const b of bamboo) colliders.push({ x: b.x, y: b.y, r: 7 });
  for (const h of huts) {
    colliders.push({ x: h.x - 18, y: h.y, r: 34 });
    colliders.push({ x: h.x + 18, y: h.y, r: 34 });
  }
  colliders.push({ x: pagoda.x - 18, y: pagoda.y, r: 30 });
  colliders.push({ x: pagoda.x + 18, y: pagoda.y, r: 30 });
  for (const l of lanterns) colliders.push({ x: l.x, y: l.y, r: 8 });
  for (const m of monoliths) {
    colliders.push({ x: m.x - 22, y: m.y, r: 10 });
    colliders.push({ x: m.x + 22, y: m.y, r: 10 });
  }
  colliders.push({ x: ringShrine.x - 18, y: ringShrine.y, r: 34 });
  colliders.push({ x: ringShrine.x + 18, y: ringShrine.y, r: 34 });
  colliders.push({ x: well.x, y: well.y, r: 16 });
  for (const l of lakes) colliders.push({ x: l.x, y: l.y, rx: l.rx, ry: l.ry, ellipse: true });
  // keep spawn clear (player margin 70)
  const clear = (c) => {
    const rr = c.r || Math.max(c.rx, c.ry) || 0;
    return Math.hypot(c.x - playerStart.x, c.y - playerStart.y) > 70 + rr;
  };
  const safeColliders = colliders.filter(clear);

  // --- lights: 8 lanterns + ring shrine ---
  const lights = lanterns.map((l) => ({ x: l.x, y: l.y - 14, r: 95, rgb: '255,170,80', flicker: 0.7 }));
  lights.push({ x: ringShrine.x, y: ringShrine.y - 30, r: 150, rgb: '255,180,90', flicker: 0.35 });

  // --- standing decor for Y-sort (keys resolved to canvases by World) ---
  const decor = [];
  const put = (o, k, s, w, h) => decor.push({ x: o.x, y: o.y, k, s, w, h });
  for (const t of trees) {
    const big = t.kind === 'cherryBig';
    put(t, big ? `cherryBig:${t.v}` : `cherry:${t.v}`, t.s, big ? 90 : 64, big ? 120 : 88);
  }
  for (const b of bamboo) put(b, `bamboo:${b.v}`, 1, 44, 110);
  for (const h of huts) put(h, `shrine:${h.v}`, 1, 120, 110);
  put(pagoda, 'pagoda:0', 1, 100, 170);
  for (const l of lanterns) put(l, 'lantern:0', 1, 30, 56);
  for (const m of monoliths) put(m, 'torii', 1, 110, 130);
  put(ringShrine, 'shrine:0', 1, 120, 110);
  for (const s of stumps) put(s, 'stump', 1, 36, 26);

  return {
    seed, W, H,
    village, well, playerStart,
    huts, campfires: [], monoliths,
    lakes, mountains: [],
    trees, deadTrees: [], rocks: [], stumps,
    mushrooms: [],
    colliders: safeColliders,
    decals,
    lights,
    decor,
    pagoda, ringShrine, lanterns, bamboo,
  };
}

// --- m03 layout: The Drowned City (underwater; colonnade+dome ring landmark, wreck) ---
function layoutM03(seed) {
  const rng = mulberry32(seed >>> 0);
  const W = LEVELS.m03.w, H = LEVELS.m03.h, M = LEVELS.m03.margin;
  const rand = (a, b) => a + rng() * (b - a);
  const pick = (arr) => arr[(rng() * arr.length) | 0];
  const clampPos = (x, y) => ({ x: clamp(x, M, W - M), y: clamp(y, M, H - M) });

  // --- city: colonnade ring around a central dome/spire, trident south of it ---
  const village = { x: W / 2 + rand(-300, 300), y: H / 2 + rand(-240, 240) };
  const well = { x: village.x, y: village.y };
  const ringC = { x: village.x, y: village.y };
  const monoliths = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + rand(-0.12, 0.12);
    monoliths.push({ x: ringC.x + Math.cos(a) * rand(240, 270), y: ringC.y + Math.sin(a) * rand(180, 200), v: i % 3 });
  }
  const ringShrine = { x: village.x, y: village.y, v: 0 }; // central dome/spire
  const trident = { x: village.x + rand(-60, 60), y: village.y + 280 + rand(-40, 40) };
  const pagoda = trident; // field kept for framework shape (m02 = pagoda)
  const playerStart = { x: village.x, y: village.y + 90 };

  // --- sunken shipwreck, away from the city ---
  let w = { x: 0, y: 0 }, tries = 0;
  do {
    w = clampPos(rand(400, W - 400), rand(300, H - 300));
    tries++;
  } while (Math.hypot(w.x - village.x, w.y - village.y) < 1200 && tries < 24);
  const wreck = { x: w.x, y: w.y };

  // --- fish schools (open water; no pond water, koi-style t-driven orbits) ---
  const lakes = [];
  for (let i = 0; i < 3; i++) {
    let s = { x: 0, y: 0 }, tr = 0;
    do {
      s = clampPos(rand(350, W - 350), rand(300, H - 300));
      tr++;
    } while (
      (Math.hypot(s.x - village.x, s.y - village.y) < 560 ||
        Math.hypot(s.x - wreck.x, s.y - wreck.y) < 340 ||
        lakes.some((l) => Math.hypot(s.x - l.x, s.y - l.y) < 520)) && tr < 24
    );
    const rx = Math.round(rand(120, 210));
    lakes.push({
      x: s.x, y: s.y, rx, ry: Math.round(rx * 0.45),
      school: true, koi: 5,
      ks: [0, 1, 2, 3, 4].map((k) => ({ sp: 0.25 + rng() * 0.6, ph: rng() * TAU, k: k % 3 })),
    });
  }

  // --- 5 kelp clusters ---
  const clusters = [];
  for (let i = 0; i < 5; i++) {
    let c = { x: 0, y: 0 }, tr = 0;
    do {
      c = clampPos(rand(200, W - 200), rand(200, H - 200));
      tr++;
    } while (
      (Math.hypot(c.x - village.x, c.y - village.y) < 600 ||
        Math.hypot(c.x - wreck.x, c.y - wreck.y) < 380 ||
        lakes.some((l) => Math.hypot(c.x - l.x, c.y - l.y) < l.rx + 240)) && tr < 24
    );
    clusters.push(c);
  }

  const trees = [];
  const addTree = (x, y, kind, s) => {
    const pt = clampPos(x, y);
    trees.push({ x: pt.x, y: pt.y, kind, s, v: (rng() * (kind === 'kelpBig' ? 2 : 4)) | 0 });
  };
  for (const c of clusters) {
    const n = 14 + (rng() * 15 | 0); // 14–28
    for (let i = 0; i < n; i++) {
      const gx = c.x + (rng() + rng() - 1) * 280;
      const gy = c.y + (rng() + rng() - 1) * 280;
      if (rng() < 0.16) addTree(gx, gy, 'kelpBig', 1.4 + rng() * 0.5);
      else addTree(gx, gy, 'kelp', 0.8 + rng() * 0.4);
    }
  }
  const nScatter = 16 + (rng() * 10 | 0);
  for (let i = 0; i < nScatter; i++) addTree(rand(M + 40, W - M - 40), rand(M + 40, H - M - 40), 'kelp', 0.8 + rng() * 0.4);
  // perimeter kelp ring (m01/m02 ring pattern)
  const ringStep = 80;
  for (let x = M + 60; x < W - M; x += ringStep * (0.8 + rng() * 0.5)) addTree(x, M + rand(30, 110), 'kelp', 1.0 + rng() * 0.35);
  for (let x = M + 60; x < W - M; x += ringStep * (0.8 + rng() * 0.5)) addTree(x, H - M - rand(30, 110), 'kelp', 1.0 + rng() * 0.35);
  for (let y = M + 240; y < H - M; y += ringStep * (0.8 + rng() * 0.5)) addTree(M + rand(30, 110), y, 'kelp', 1.0 + rng() * 0.35);
  for (let y = M + 240; y < H - M; y += ringStep * (0.8 + rng() * 0.5)) addTree(W - M - rand(30, 110), y, 'kelp', 1.0 + rng() * 0.35);

  // --- coral groves ---
  const bamboo = [];
  for (let i = 0; i < 3; i++) {
    let g = { x: 0, y: 0 }, tr = 0;
    do {
      g = clampPos(rand(250, W - 250), rand(250, H - 250));
      tr++;
    } while (
      (Math.hypot(g.x - village.x, g.y - village.y) < 520 ||
        Math.hypot(g.x - wreck.x, g.y - wreck.y) < 300 ||
        clusters.some((c) => Math.hypot(g.x - c.x, g.y - c.y) < 240) ||
        lakes.some((l) => Math.hypot(g.x - l.x, g.y - l.y) < l.rx + 160)) && tr < 24
    );
    const n = 6 + (rng() * 5 | 0); // 6–10
    for (let j = 0; j < n; j++) {
      const pt = clampPos(g.x + rand(-80, 80), g.y + rand(-60, 60));
      bamboo.push({ x: pt.x, y: pt.y, v: (rng() * 2) | 0 });
    }
  }

  // --- glowing anemones: 5 city-ring + 3 per school (8) = bioluminescent light holes ---
  const lanterns = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + rand(-0.3, 0.3);
    lanterns.push({ x: village.x + Math.cos(a) * rand(320, 380), y: village.y + Math.sin(a) * rand(240, 300), v: i % 2 });
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + rand(-0.3, 0.3);
    const l = lakes[i];
    lanterns.push({ x: l.x + Math.cos(a) * (l.rx + 60), y: l.y + Math.sin(a) * (l.ry + 50), v: i % 2 });
  }

  // --- vents (bubble columns) ---
  const vents = [];
  for (let i = 0; i < 4; i++) {
    let v = { x: 0, y: 0 }, tr = 0;
    do {
      v = clampPos(rand(300, W - 300), rand(300, H - 300));
      tr++;
    } while (Math.hypot(v.x - village.x, v.y - village.y) < 460 && tr < 24);
    vents.push({ x: v.x, y: v.y, v: i % 2 });
  }

  // --- ruined street slabs: city→wreck, city→school, school→school ---
  const decals = [];
  const pave = (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const n = Math.max(1, Math.round(Math.hypot(dx, dy) / 64));
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      decals.push({
        k: `ruin${'ABC'[(i + (rng() * 3 | 0)) % 3]}`,
        x: a.x + dx * f + rand(-14, 14),
        y: a.y + dy * f + rand(-14, 14),
        s: 0.85 + rng() * 0.4,
      });
    }
  };
  pave(village, wreck);
  pave(village, lakes[0]);
  pave(lakes[1], lakes[2]);

  // --- ~900 ground decals ---
  const decalKeys = ['sandTuft', 'sandTuft', 'sandTuft', 'sandTuft', 'sandTuft', 'sandTuft', 'sandTuft', 'sandTuft',
    'bubbleRise', 'bubbleRise', 'bubbleRise', 'bubbleRise', 'bubbleRise', 'bubbleRise',
    'coralDrop', 'coralDrop', 'coralDrop', 'coralDrop',
    'shell', 'shell', 'shell', 'shell', 'shell',
    'pebble', 'pebble', 'pebble',
    'moss', 'moss', 'moss'];
  for (let i = 0; i < 900; i++) {
    const k = pick(decalKeys);
    decals.push({
      k,
      x: rand(M, W - M),
      y: rand(M, H - M),
      s: k === 'moss' ? 0.8 + rng() * 0.7 : 0.7 + rng() * 0.6,
    });
  }

  // --- colliders ---
  const colliders = [];
  for (const t of trees) colliders.push({ x: t.x, y: t.y, r: t.kind === 'kelpBig' ? 12 : 7 + t.s * 3 });
  for (const b of bamboo) colliders.push({ x: b.x, y: b.y, r: 7 });
  for (const m of monoliths) colliders.push({ x: m.x, y: m.y, r: 12 });
  colliders.push({ x: ringShrine.x - 18, y: ringShrine.y, r: 32 });
  colliders.push({ x: ringShrine.x + 18, y: ringShrine.y, r: 32 });
  colliders.push({ x: trident.x, y: trident.y, r: 12 });
  colliders.push({ x: wreck.x - 55, y: wreck.y, r: 36 });
  colliders.push({ x: wreck.x + 55, y: wreck.y, r: 36 });
  for (const l of lanterns) colliders.push({ x: l.x, y: l.y, r: 8 });
  for (const v of vents) colliders.push({ x: v.x, y: v.y, r: 10 });
  // keep spawn clear (player margin 70)
  const clear = (c) => {
    const rr = c.r || Math.max(c.rx, c.ry) || 0;
    return Math.hypot(c.x - playerStart.x, c.y - playerStart.y) > 70 + rr;
  };
  const safeColliders = colliders.filter(clear);

  // --- lights: 8 anemones + city dome (bioluminescent) ---
  const lights = lanterns.map((l) => ({ x: l.x, y: l.y - 10, r: 95, rgb: '90,225,235', flicker: 0.7 }));
  lights.push({ x: ringShrine.x, y: ringShrine.y - 30, r: 170, rgb: '140,235,255', flicker: 0.35 });

  // --- standing decor for Y-sort (keys resolved to canvases by World) ---
  const decor = [];
  const put = (o, k, s, w, h) => decor.push({ x: o.x, y: o.y, k, s, w, h });
  for (const t of trees) {
    const big = t.kind === 'kelpBig';
    put(t, big ? `kelpBig:${t.v}` : `kelp:${t.v}`, t.s, big ? 84 : 60, big ? 190 : 150);
  }
  for (const b of bamboo) put(b, `coral:${b.v}`, 1, 40, 46);
  for (const m of monoliths) put(m, `column:${m.v}`, 1, 44, 130);
  put(ringShrine, 'dome:0', 1, 150, 170);
  put(trident, 'trident:0', 1, 48, 100);
  put(wreck, 'wreck:0', 1, 170, 100);
  for (const l of lanterns) put(l, `anemone:${l.v}`, 1, 26, 30);
  for (const v of vents) put(v, `vent:${v.v}`, 1, 44, 40);

  return {
    seed, W, H,
    village, well, playerStart,
    huts: [], campfires: [], monoliths,
    lakes, mountains: [],
    trees, deadTrees: [], rocks: [], stumps: [],
    mushrooms: [],
    colliders: safeColliders,
    decals,
    lights,
    decor,
    pagoda, ringShrine, lanterns, bamboo, vents, wreck, trident,
  };
}
