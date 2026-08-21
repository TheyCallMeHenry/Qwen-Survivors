#!/usr/bin/env node
// Pure-logic assertions (Node, no browser). Run: node tools/test-logic.mjs
import { mulberry32, hash2, approach, clamp } from '../js/utils/math.js';
import { CFG } from '../js/config.js';
import { generateWorld } from '../js/world/generate.js';
import { HashGrid } from '../js/utils/grid.js';
import { aliveCap, spawnInterval, batchSize, pickType, spawnPoint } from '../js/entities/spawner.js';
import { cardOffers, applyCard } from '../js/entities/player.js';
import { rankScore } from '../js/ui/screens.js';
import { MUSIC } from '../js/audio/music.js';

let pass = 0;
const fails = [];
const ok = (cond, msg) => { if (cond) pass++; else fails.push(msg); };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// --- RNG / math ---
{
  { const a2 = mulberry32(42), b2 = mulberry32(42);
    let lock = true;
    for (let i = 0; i < 50; i++) if (!near(a2(), b2())) lock = false;
    ok(lock, 'mulberry32: same seed → same sequence'); }
  ok(mulberry32(7)() !== mulberry32(8)(), 'mulberry32: different seeds differ');
  let rangeOk = true;
  const r = mulberry32(9);
  for (let i = 0; i < 2000; i++) { const v = r(); if (v < 0 || v >= 1) rangeOk = false; }
  ok(rangeOk, 'mulberry32: output in [0,1)');

  ok(hash2(3, 4) === hash2(3, 4), 'hash2: deterministic');
  ok(hash2(3, 4) !== hash2(4, 3), 'hash2: order-sensitive');
  let hOk = true;
  for (let i = 0; i < 500; i++) { const v = hash2(i, i * 7); if (v < 0 || v >= 1) hOk = false; }
  ok(hOk, 'hash2: output in [0,1)');

  ok(approach(0, 100, 14, 0) === 0, 'approach: dt=0 → no change');
  ok(approach(0, 100, 14, 1) > 99, 'approach: λ=14, 1s → ~converged');
  ok(clamp(5, 0, 10) === 5 && clamp(-1, 0, 10) === 0 && clamp(11, 0, 10) === 10, 'clamp: bounds');
}

// --- XP curve ---
{
  ok(CFG.xpNeed(1) === 4 && CFG.xpNeed(2) === 7 && CFG.xpNeed(3) === 10, 'xpNeed: 4,7,10');
  let inc = true;
  for (let L = 2; L <= 60; L++) if (CFG.xpNeed(L) <= CFG.xpNeed(L - 1)) inc = false;
  ok(inc, 'xpNeed: strictly increasing');
}

// --- Spawner curves (must match CFG.spawner) ---
{
  ok(aliveCap(0) === 60, 'aliveCap(0) = 60');
  ok(aliveCap(120) === 70, 'aliveCap(120) = 70');
  ok(aliveCap(300) === 85, 'aliveCap(300) = 85 (min with 200)');
  let capInc = true, intDec = true, batchInc = true;
  for (let t = 0; t <= 300; t += 5) {
    if (aliveCap(t) < aliveCap(t - 5)) capInc = false;
    if (spawnInterval(t) > spawnInterval(t - 5)) intDec = false;
    if (batchSize(t) < batchSize(t - 5)) batchInc = false;
    if (aliveCap(t) > 200 || spawnInterval(t) < 0.35 || batchSize(t) > 6) { capInc = false; intDec = false; batchInc = false; }
  }
  ok(capInc, 'aliveCap: non-decreasing, ≤200');
  ok(intDec, 'interval: non-increasing, ≥0.35');
  ok(batchInc, 'batch: non-decreasing, ≤6');
  ok(near(spawnInterval(0), 1.7) && near(spawnInterval(300), 0.35), 'interval: 1.7 → 0.35 over run');
  ok(batchSize(0) === 2 && batchSize(55) === 3 && batchSize(275) === 6, 'batch: 2 at t0, 3 at 55s, 6 at 275s');
  ok(CFG.spawner.firstSpawn > 0, 'firstSpawn: positive');

  let badEarly = false;
  {
    const rng = mulberry32(1);
    for (let i = 0; i < 400; i++) {
      const t = pickType(5, rng);
      if (t !== 'rat' && t !== 'bat') badEarly = true;
    }
  }
  ok(!badEarly, 'pickType(t=5): only rat/bat have weight');
  {
    const seen = new Set();
    const rng = mulberry32(2);
    for (let i = 0; i < 3000; i++) seen.add(pickType(250, rng));
    ok(seen.size === 6, 'pickType(t=250): all six types appear');
  }
  {
    const rng = mulberry32(3);
    const W = CFG.world.w, H = CFG.world.h, m = CFG.world.margin;
    let bad = false;
    for (let i = 0; i < 500; i++) {
      const p = spawnPoint(W, H, m, W / 2, H / 2, 1280, 720, rng);
      const inBounds = p.x >= m && p.x <= W - m && p.y >= m && p.y <= H - m;
      const offCam = Math.abs(p.x - W / 2) > 1280 / 2 + 60 || Math.abs(p.y - H / 2) > 720 / 2 + 60;
      if (!inBounds || !offCam) bad = true;
    }
    ok(!bad, 'spawnPoint: in-bounds and off-camera');
  }
}

// --- Spatial hash grid (World.collidersNear semantics) ---
{
  const g = new HashGrid(96);
  ok(g.near(100, 100).length === 0, 'HashGrid: empty → no results');
  const rng = mulberry32(4);
  const pts = [];
  for (let i = 0; i < 300; i++) {
    const p = { x: rng() * 2000, y: rng() * 2000 };
    pts.push(p);
    g.add(p.x, p.y, p);
  }
  const qx = 1000, qy = 1000, cell = 96;
  const brute = pts.filter((p) =>
    Math.abs(((p.x / cell) | 0) - ((qx / cell) | 0)) <= 1 &&
    Math.abs(((p.y / cell) | 0) - ((qy / cell) | 0)) <= 1);
  const got = g.near(qx, qy);
  ok(got.length === brute.length, 'HashGrid: near() count matches brute-force');
  ok(brute.every((p) => got.includes(p)), 'HashGrid: near() membership matches brute-force');
}

// --- World layout (generateWorld is pure — Node-testable) ---
{
  const w = generateWorld(12345);
  ok(w.W === CFG.world.w && w.H === CFG.world.h, 'generateWorld: W/H match config');
  const w2 = generateWorld(12345);
  ok(w.trees.length === w2.trees.length && w.colliders.length === w2.colliders.length &&
    w.decor.length === w2.decor.length, 'generateWorld: deterministic counts per seed');
  ok(w.trees[0].x === w2.trees[0].x && w.trees[0].y === w2.trees[0].y, 'generateWorld: deterministic layout');

  const inB = (o) => o.x >= 0 && o.x <= w.W && o.y >= 0 && o.y <= w.H;
  for (const key of ['trees', 'deadTrees', 'rocks', 'huts', 'campfires', 'monoliths', 'stumps', 'mushrooms', 'colliders', 'decals']) {
    ok(w[key].every(inB), `generateWorld: ${key} in bounds`);
  }
  ok(w.huts.length === 5, 'generateWorld: 5 village huts');
  ok(w.lakes.length >= 1 && w.lakes.length <= 2, 'generateWorld: 1–2 lakes');
  ok(w.lights.length === w.campfires.length + w.monoliths.length, 'generateWorld: lights = campfires + monoliths');
  ok(w.well && w.playerStart, 'generateWorld: well + playerStart present');
  const ps = w.playerStart;
  ok(w.colliders.every((c) => {
    const rr = c.r || Math.max(c.rx, c.ry) || 0;
    return Math.hypot(c.x - ps.x, c.y - ps.y) > 70 + rr;
  }), 'generateWorld: spawn clearance 70 + collider radius');
  ok(w.decor.length > 100, 'generateWorld: standing decor non-trivial');
}

// --- Config sanity ---
{
  for (const [k, wpn] of Object.entries(CFG.weapons)) {
    ok(wpn.levels.length === 5, `weapons.${k}: 5 levels`);
  }
  for (const [k, e] of Object.entries(CFG.enemies)) {
    ok(e.hp > 0 && e.r > 0 && e.xp > 0 && e.dmg > 0 && e.speed[0] > 0, `enemies.${k}: positive stats`);
  }
  ok(CFG.run.bossAt < CFG.run.time, 'run: boss spawns before end');
  ok(CFG.perf.particleCap > 0 && CFG.perf.snowCount > 0, 'perf: caps positive');
}

// --- HashGrid.range (cell-aligned candidate superset) ---
{
  const g = new HashGrid(96);
  const rng = mulberry32(11);
  const pts = [];
  for (let i = 0; i < 400; i++) {
    const p = { x: rng() * 2000, y: rng() * 2000 };
    pts.push(p);
    g.add(p.x, p.y, p);
  }
  const qx = 1000, qy = 1000, R = 160;
  const got = g.range(qx, qy, R);
  const missed = pts.filter((p) => Math.hypot(p.x - qx, p.y - qy) <= R && !got.includes(p));
  ok(missed.length === 0, 'HashGrid.range: covers every point within radius');
  // corner of the corner cell is at most √2·(R + cell) away
  const far = got.filter((p) => Math.hypot(p.x - qx, p.y - qy) > Math.SQRT2 * (R + 96) + 1e-6);
  ok(far.length === 0, 'HashGrid.range: no candidate beyond √2·(radius + cell)');
}

// --- Weapon level tables ---
{
  const L = (k) => CFG.weapons[k].levels;
  let wandOk = true;
  for (let i = 1; i < 5; i++) {
    if (L('wand')[i].dmg < L('wand')[i - 1].dmg || L('wand')[i].rate > L('wand')[i - 1].rate) wandOk = false;
  }
  ok(wandOk, 'weapons.wand: dmg non-decreasing, rate non-increasing');
  let garOk = true;
  for (let i = 1; i < 5; i++) {
    const a = L('garlic')[i - 1], b = L('garlic')[i];
    if (b.r < a.r || b.dmg < a.dmg) garOk = false;
  }
  ok(garOk, 'weapons.garlic: r/dmg non-decreasing');
  let axeOk = true;
  for (let i = 1; i < 5; i++) {
    const a = L('axe')[i - 1], b = L('axe')[i];
    if (b.dmg < a.dmg || b.cd > a.cd) axeOk = false;
  }
  ok(axeOk, 'weapons.axe: dmg non-decreasing, cd non-increasing');
  let blaOk = true;
  for (let i = 1; i < 5; i++) {
    const a = L('blades')[i - 1], b = L('blades')[i];
    if (b.n < a.n || b.dmg < a.dmg || b.rad < a.rad) blaOk = false;
  }
  ok(blaOk, 'weapons.blades: n/dmg/rad non-decreasing');
}

// --- Passives / startWeapons / boss / spawner weights ---
{
  let pasOk = true;
  for (const p of Object.values(CFG.passives)) if (!(p.max > 0 && p.val > 0)) pasOk = false;
  ok(pasOk, 'passives: max/val positive');
  ok(CFG.player.startWeapons.every((k) => CFG.weapons[k]), 'startWeapons: keys exist in weapons');
  const bosses = Object.keys(CFG.enemies).filter((k) => CFG.enemies[k].boss);
  ok(bosses.length === 1 && bosses[0] === 'wraith', 'enemies: exactly one boss (wraith)');
  const wk = Object.keys(CFG.spawner.weights(300));
  ok(wk.length > 0 && wk.every((k) => CFG.enemies[k]), 'spawner.weights keys ⊆ enemies');
  ok(Object.values(CFG.enemies).every((e) => Number.isInteger(e.xp) && e.xp > 0), 'enemies.xp: positive integers');
}

// --- Level-up card logic (pure) ---
{
  const cards = cardOffers({ wand: 1 }, {}, mulberry32(1));
  ok(cards.length === 3, 'cardOffers: 3 cards');
  ok(new Set(cards.map((c) => c.kind + ':' + c.key)).size === 3, 'cardOffers: distinct kind:key');
  ok(cards.every((c) => {
    const base = c.kind === 'weapon' ? (c.key === 'wand' ? 1 : 0) : 0;
    return c.level === base + 1;
  }), 'cardOffers: each card is a legal level+1 candidate');
  const full = cardOffers({ wand: 1, garlic: 1, axe: 1, blades: 1 }, {}, mulberry32(3));
  ok(full.length === 3 && full.every((c) => !(c.kind === 'weapon' && c.level === 1)), 'cardOffers: maxWeapons → no new-weapon cards');
  const maxed = cardOffers({ wand: 5, garlic: 5, axe: 5, blades: 5 }, { speed: 3, magnet: 3 }, mulberry32(2));
  ok(maxed.length === 3 && maxed.map((c) => c.key).sort().join(',') === 'dmg,hp,regen', 'cardOffers: exhausted pool → remaining passives');
  const single = cardOffers({ wand: 2, garlic: 5, axe: 5, blades: 5 }, { speed: 3, hp: 3, dmg: 5, magnet: 3, regen: 3 }, mulberry32(4));
  ok(single.length === 1 && single[0].kind === 'weapon' && single[0].key === 'wand' && single[0].level === 3, 'cardOffers: single-candidate pool');
}

// --- applyCard (pure) ---
{
  const mk = () => ({ weapons: { wand: 1 }, passives: {}, maxHp: 100, hp: 100, dmgMul: 1, speedMul: 1, magnet: 1, regen: 0 });
  let t = mk();
  applyCard(t, { kind: 'weapon', key: 'wand', level: 2 });
  ok(t.weapons.wand === 2, 'applyCard: weapon upgrade sets level');
  applyCard(t, { kind: 'weapon', key: 'garlic', level: 1 });
  ok(t.weapons.garlic === 1, 'applyCard: new weapon added at 1');
  applyCard(t, { kind: 'passive', key: 'hp', level: 1 });
  ok(t.maxHp === 125 && t.hp === 125, 'applyCard: hp passive raises maxHp + heals');
  applyCard(t, { kind: 'passive', key: 'speed', level: 1 });
  ok(near(t.speedMul, 1.1), 'applyCard: speed → 1.1×');
  const t2 = mk();
  applyCard(t2, { kind: 'passive', key: 'dmg', level: 1 });
  ok(near(t2.dmgMul, 1.12), 'applyCard: dmg → 1.12×');
  applyCard(t2, { kind: 'passive', key: 'magnet', level: 1 });
  ok(near(t2.magnet, 1.6), 'applyCard: magnet → 1.6×');
  applyCard(t2, { kind: 'passive', key: 'regen', level: 1 });
  ok(near(t2.regen, 0.8), 'applyCard: regen → 0.8/s');
  for (let i = 0; i < 5; i++) applyCard(t, { kind: 'passive', key: 'speed', level: i + 1 });
  ok(t.passives.speed === 3 && near(t.speedMul, 1.3), 'applyCard: passive caps at max (speed 3 → 1.3×)');
}

// --- High-score ranking (pure, ui/screens.js) ---
{
  const E = (score, time, kills) => ({ score, time, kills, level: 1, date: '2026-01-01' });
  const r0 = rankScore([], E(100, 60, 10));
  ok(r0.rank === 0 && r0.isRecord && r0.list.length === 1, 'rankScore: empty list → rank 0, record');

  const r1 = rankScore([E(500, 300, 40), E(300, 250, 30), E(200, 200, 20)], E(400, 280, 35));
  ok(r1.rank === 1 && !r1.isRecord, 'rankScore: middle insert is not a record');
  ok(r1.list[0].score === 500 && r1.list[1].score === 400 && r1.list[2].score === 300, 'rankScore: sorted order preserved');

  const many = [];
  for (let i = 0; i < 12; i++) many.push(E(1000 - i * 10, 300, i));
  const r2 = rankScore(many, E(5, 10, 0));
  ok(r2.rank === -1 && !r2.isRecord, 'rankScore: below the cut → rank -1');
  ok(r2.list.length === CFG.scores.max && r2.list[0].score === 1000, 'rankScore: caps at max, top kept');

  const r3 = rankScore([E(100, 60, 1)], E(100, 90, 1));
  ok(r3.rank === 0 && r3.isRecord, 'rankScore: score tie → longer time ranks higher');

  const r4 = rankScore([E(5, 10, 1)], E(0, 300, 500));
  ok(r4.rank === 1 && r4.list[0].score === 5 && !r4.isRecord, 'rankScore: low score ranks below existing');
}

// --- Music data (Phase 5) ---
{
  const M = MUSIC;
  ok(M.bars === 4 && M.stepsPerBar === 8, 'MUSIC: 4 bars x 8 eighth-steps');
  let shapeOk = true, freqOk = true, padOk = true;
  for (let b = 0; b < M.bars; b++) {
    if (M.bass[b].length !== 8 || M.pluck[b].length !== 8) shapeOk = false;
    if (M.pad[b].length !== 3) padOk = false;
    for (const row of [M.bass[b], M.pluck[b]]) for (const f of row) if (f !== null && !(f > 30 && f < 1000)) freqOk = false;
    for (const f of M.pad[b]) if (!(f > 60 && f < 500)) padOk = false;
  }
  ok(shapeOk, 'MUSIC: bass/pluck rows are 8 slots');
  ok(freqOk, 'MUSIC: bass/pluck freqs null or (30,1000)');
  ok(padOk, 'MUSIC: pads are 3 tones in (60,500)');
  ok(M.bass[3][0] < M.bass[0][0] && M.bass[3][4] < M.bass[0][4], 'MUSIC: bar 4 (V) sits below bar 1 (i) — tension before resolve');
}

console.log(`test-logic: ${pass} checks passed, ${fails.length} failed`);
for (const f of fails) console.error(`  FAIL ${f}`);
process.exit(fails.length ? 1 : 0);
