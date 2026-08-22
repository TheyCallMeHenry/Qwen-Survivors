#!/usr/bin/env node
// Pure-logic assertions (Node, no browser). Run: node tools/test-logic.mjs
import { mulberry32, hash2, approach, clamp } from '../js/utils/math.js';
import { CFG } from '../js/config.js';
import { generateWorld } from '../js/world/generate.js';
import { LEVELS, LEVEL_ORDER, getLevel } from '../js/world/levels.js';
import { HashGrid } from '../js/utils/grid.js';
import { aliveCap, spawnInterval, batchSize, pickType, spawnPoint } from '../js/entities/spawner.js';
import { Enemies } from '../js/entities/enemies.js';
import { cardOffers, applyCard, recomputeStats, cardEffectText } from '../js/entities/player.js';
import { loadMeta, shardsFor, upgradeCost, applyMeta, loadWins, saveWins, recordWin, isUnlocked, defaultWins, loadSelectedLevel, saveSelectedLevel, defaultZoom, loadZoom, saveZoom } from '../js/core/meta.js';
import { rankScore, loadScores, saveScores, scoreKeyFor } from '../js/ui/screens.js';
import { MUSIC, FLAVOR, initMusic } from '../js/audio/music.js';
import { makeBus } from '../js/utils/bus.js';

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
  ok(CFG.spawner.spawnPad > 0 && CFG.spawner.spawnPad <= 15, 'spawnPad: (0..15] px band just outside view');
  ok(CFG.spawner.spawnFallback >= 20 && CFG.spawner.spawnFallback <= 40, 'spawnFallback: 20..40 px');
  {
    const rng = mulberry32(3);
    const W = CFG.world.w, H = CFG.world.h, m = CFG.world.margin;
    const vw = 1280, vh = 720, pad = CFG.spawner.spawnPad;
    let bad = false;
    for (let i = 0; i < 500; i++) {
      const p = spawnPoint(W, H, m, W / 2, H / 2, vw, vh, rng);
      const inBounds = p.x >= m && p.x <= W - m && p.y >= m && p.y <= H - m;
      const offCam = Math.abs(p.x - W / 2) > vw / 2 || Math.abs(p.y - H / 2) > vh / 2;
      const nearCam = Math.abs(p.x - W / 2) <= vw / 2 + pad && Math.abs(p.y - H / 2) <= vh / 2 + pad;
      if (!inBounds || !offCam || !nearCam) bad = true;
    }
    ok(!bad, 'spawnPoint: in-bounds, off-camera, within pad of view edge');
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
  ok(CFG.lighting.playerR === 510, 'lighting.playerR = 510 (triple vision)');
  ok(CFG.player.knockback === 76, 'player.knockback = 76 (≈33% of the old 230)');
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
  let pisOk = true;
  for (let i = 1; i < 5; i++) {
    const a = L('pistols')[i - 1], b = L('pistols')[i];
    if (b.dmg < a.dmg || b.rate > a.rate || b.spread > a.spread) pisOk = false;
  }
  ok(pisOk, 'weapons.pistols: dmg↑ rate↓ spread↓');
  let bomOk = true;
  for (let i = 1; i < 5; i++) {
    const a = L('bombs')[i - 1], b = L('bombs')[i];
    if (b.dmg < a.dmg || b.r < a.r || b.cd > a.cd || b.fuse > a.fuse) bomOk = false;
  }
  ok(bomOk, 'weapons.bombs: dmg↑ r↑ cd↓ fuse↓');
  let flaOk = true;
  for (let i = 1; i < 5; i++) {
    const a = L('flame')[i - 1], b = L('flame')[i];
    if (b.tick < a.tick || b.dot < a.dot || b.range < a.range || b.fuel < a.fuel || b.recharge > a.recharge) flaOk = false;
  }
  ok(flaOk, 'weapons.flame: tick↑ dot↑ range↑ fuel↑ recharge↓');
}

// --- Passives / startWeapons / boss / spawner weights ---
{
  let pasOk = true;
  for (const p of Object.values(CFG.passives)) if (!(p.max > 0 && p.val > 0)) pasOk = false;
  ok(pasOk, 'passives: max/val positive');
  ok(CFG.player.startWeapons.every((k) => CFG.weapons[k]), 'startWeapons: keys exist in weapons');
  const bosses = Object.keys(CFG.enemies).filter((k) => CFG.enemies[k].boss);
  ok(bosses.length === 3 && bosses[0] === 'wraith' && bosses[1] === 'ryu' && bosses[2] === 'shark', 'enemies: bosses wraith (m01) + ryu (m02) + shark (m03)');
  const wk = Object.keys(getLevel('m01').weights(300));
  ok(wk.length > 0 && wk.every((k) => CFG.enemies[k]), 'm01 weights keys ⊆ enemies');
  ok(Object.values(CFG.enemies).every((e) => Number.isInteger(e.xp) && e.xp > 0), 'enemies.xp: positive integers');
}

// --- Level-up card logic (pure) ---
{
  const cards = cardOffers({ wand: 1 }, {}, {}, mulberry32(1));
  ok(cards.length === 3, 'cardOffers: 3 cards');
  ok(new Set(cards.map((c) => c.kind + ':' + c.key)).size === 3, 'cardOffers: distinct kind:key');
  ok(cards.every((c) => {
    const base = c.kind === 'weapon' ? (c.key === 'wand' ? 1 : 0) : 0;
    return c.level === base + 1;
  }), 'cardOffers: each card is a legal level+1 candidate');
  const full = cardOffers({ wand: 1, garlic: 1, axe: 1, blades: 1 }, {}, {}, mulberry32(3));
  ok(full.length === 3 && full.every((c) => !(c.kind === 'weapon' && c.level === 1)), 'cardOffers: maxWeapons → no new-weapon cards');
  // Phase 9: pool is exactly {hp, dmg, regen, blight, tempest} — 4 maxed weapons + 2 passives max.
  // No weapon cards at all (ownedW=4=max) yet blight/tempest are offered → synergies do NOT
  // count against maxWeapons.
  const maxed = cardOffers({ wand: 5, garlic: 5, axe: 5, blades: 5 }, { speed: 3, magnet: 3 }, {}, mulberry32(2));
  const legalKeys = new Set(['hp', 'dmg', 'regen', 'blight', 'tempest']);
  ok(maxed.length === 3 && maxed.every((c) => c.kind === 'passive' || c.kind === 'synergy')
    && maxed.every((c) => legalKeys.has(c.key)), 'cardOffers: exhausted pool → remaining passives + gated synergies only');
  // Phase 9: deterministic 2-candidate pool. wand:5/axe:5 are the maxed dummies that push
  // ownedW to maxWeapons without gating a third synergy (blight needs garlic, tempest needs
  // blades); all passives maxed → the pool is exactly {inferno, phoenix} and the draw takes both.
  const duo = cardOffers({ pistols: 5, flame: 5, wand: 5, axe: 5 }, { speed: 3, hp: 3, dmg: 5, magnet: 3, regen: 3 }, {}, mulberry32(4));
  ok(duo.length === 2 && duo.every((c) => c.kind === 'synergy')
    && new Set(duo.map((c) => c.key)).size === 2
    && duo.every((c) => c.key === 'inferno' || c.key === 'phoenix'), 'cardOffers: 2-candidate pool {inferno, phoenix}');
}

// --- Phase 9: synergy table shape + gating ---
{
  for (const [k, S] of Object.entries(CFG.synergies)) {
    ok(S.levels.length === 1 && S.requires.length >= 2
      && S.requires.every((r) => CFG.weapons[r] || CFG.passives[r]), `synergies.${k}: single level, valid requires`);
  }
  ok(!cardOffers({ wand: 4, garlic: 5 }, {}, {}, mulberry32(7)).some((c) => c.key === 'blight'),
    'synergy gating: absent below max (wand 4/5)');
  const allW = {};
  for (const k of Object.keys(CFG.weapons)) allW[k] = 5;
  const allP = {};
  for (const k of Object.keys(CFG.passives)) allP[k] = CFG.passives[k].max;
  const syn = cardOffers(allW, allP, {}, mulberry32(9));
  ok(syn.length === 3 && syn.every((c) => c.kind === 'synergy') && new Set(syn.map((c) => c.key)).size === 3,
    'synergy gating: all-max pool → only the 5 synergies remain (3 drawn)');
  const allOwned = {};
  for (const k of Object.keys(CFG.synergies)) allOwned[k] = 1;
  ok(cardOffers(allW, allP, allOwned, mulberry32(9)).length === 0,
    'cardOffers: all owned → empty pool (first-class case)');
}

// --- Phase 10.2: exact-effect card text (pure, player.js) ---
{
  ok(cardEffectText('weapon', 'wand', 1) === '1 bolt · every 0.60 s · 12 dmg · no pierce',
    'cardEffectText: wand L1 = full stat line');
  ok(cardEffectText('weapon', 'wand', 2) === 'rate 0.60→0.50 s · dmg 12→16 · pierce 0→1',
    'cardEffectText: wand L2 = changed-field deltas only (count 1→1 skipped)');
  ok(cardEffectText('passive', 'hp', 1) === '+25 max HP + heal 25 now → total +25 max HP',
    'cardEffectText: hp passive L1 increment + total');
  ok(cardEffectText('passive', 'speed', 2) === '+10% movement speed → total +20%',
    'cardEffectText: speed passive L2 float-safe pct (0.1×2 → 20%)');
  ok(cardEffectText('synergy', 'blight', 1) === 'Moonbolts apply Blight — 14 dmg/s for 3.0 s',
    'cardEffectText: blight synergy states numbers');
  ok(cardEffectText('meta', 'maxHp', 1) === '+20 max HP → total +20 max HP',
    'cardEffectText: maxHp meta L1');
  ok(cardEffectText('meta', 'dash', 1) === '−8% dash cooldown → total −8%',
    'cardEffectText: dash meta uses U+2212 minus');
  ok(cardEffectText('nope', 'x', 1) === '', 'cardEffectText: unknown kind → empty');
  // Coverage: every (kind, key, level) a pick/buy can grant must produce non-empty text
  // (crash classes = missing key/template). `level` = the level the pick/buy grants.
  for (const key of Object.keys(CFG.weapons))
    for (let L = 1; L <= CFG.weapons[key].levels.length; L++)
      ok(cardEffectText('weapon', key, L).length > 0, `cardEffectText coverage: weapon ${key} L${L}`);
  for (const key of Object.keys(CFG.passives))
    for (let L = 1; L <= CFG.passives[key].max; L++)
      ok(cardEffectText('passive', key, L).length > 0, `cardEffectText coverage: passive ${key} L${L}`);
  for (const key of Object.keys(CFG.synergies))
    ok(cardEffectText('synergy', key, 1).length > 0, `cardEffectText coverage: synergy ${key}`);
  for (const key of Object.keys(CFG.meta.upgrades))
    for (let L = 1; L <= CFG.meta.upgrades[key].max; L++)
      ok(cardEffectText('meta', key, L).length > 0, `cardEffectText coverage: meta ${key} L${L}`);
}

// --- Phase 9: meta progression (pure) ---
{
  const m0 = loadMeta('no-such-key');
  ok(m0.shards === 0 && Object.values(m0.upgrades).every((v) => v === 0), 'loadMeta: defaults without storage');
  ok(shardsFor({ score: 800, victory: true }) === 27, 'shardsFor: 800 score + victory → 27');
  ok(shardsFor({ score: 399, victory: false }) === 0, 'shardsFor: 399 score, no victory → 0');
  ok(upgradeCost('maxHp', 0) === 20, 'upgradeCost: maxHp L0 → 20');
  ok(upgradeCost('maxHp', 5) === null, 'upgradeCost: maxed → null');
  const p = { passives: {} };
  applyMeta(p, { shards: 0, upgrades: { maxHp: 1, dmg: 0, speed: 0, xp: 0, dash: 0 } });
  recomputeStats(p);
  ok(p.maxHp === 120, 'applyMeta + recomputeStats: maxHp L1 → maxHp 120');
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

// --- Music data (10.6 eldritch track) ---
{
  const M = MUSIC;
  ok(M.bars === 4 && M.stepsPerBar === 8, 'MUSIC: 4 bars x 8 eighth-steps');
  ok(M.sub.length === 4 && M.sub.every((f) => f > 20 && f < 50), 'MUSIC: 4 sub roots in (20,50) Hz');
  ok(M.drone.length === 4 && M.drone.every((row) => row.length === 3 && row.every((f) => f > 60 && f < 500)),
    'MUSIC: drone rows are 3 tones in (60,500)');
  ok(M.pulse.length === 4 && M.pulse.every((row) => row.length === 8), 'MUSIC: pulse rows are 8 slots');
  ok(M.color.length === 4 && M.color.every((row) => row.length === 8), 'MUSIC: color rows are 8 slots');
  // Every pitched note comes from the D-dim7 set {D, F, Ab, B} — the tritone / minor-2nd
  // dissonance is structural, not decorative.
  const DIM7 = new Set([36.71, 43.65, 87.31, 103.83, 123.47, 146.83, 233.08, 246.94, 293.66, 349.23]);
  const dim7 = [...M.sub, ...M.drone.flat(), ...M.color.flat().filter((f) => f !== null)];
  ok(dim7.every((f) => DIM7.has(f)), 'MUSIC: sub/drone/color notes all in the D-dim7 set');
  ok(M.pulse.flat().filter((f) => f !== null).every((f) => f > 20 && f < 60), 'MUSIC: heartbeat thumps are low (20,60)');
  const slots = (row) => row.filter((f) => f !== null).length;
  ok([2, 0, 2, 1].every((n, b) => slots(M.pulse[b]) === n), 'MUSIC: heartbeat is sparse (per bar: 2, 0, 2, 1)');
  ok(M.color.every((row) => slots(row) === 1), 'MUSIC: exactly one lone color tone per bar');
}

// 13.11 — per-level FLAVOR data (m01 gets NO entry: the 10.6 track stands untouched)
const slots0 = (row) => row.filter((f) => f !== null).length;
{
  ok(Object.keys(FLAVOR).join(',') === 'higan,drowned', 'FLAVOR: only higan/drowned (m01 stays untouched)');
  const h = FLAVOR.higan, d = FLAVOR.drowned;
  ok(h.bell.filter((f) => f !== null).length === 1 && h.bell[0] === 73.42, 'higan bell: 1 strike per loop (D2)');
  ok([1, 0, 1, 1].every((n, b) => slots0(h.chime[b]) === n), 'higan chime: 3 pings per loop (D5/F5/B4)');
  ok([2, 1, 2, 1].every((n, b) => slots0(h.taiko[b]) === n), 'higan taiko: 6 base hits per loop');
  ok([1, 0, 1, 1].every((n, b) => slots0(d.bubble[b]) === n), 'drowned bubble: 3 rising blips per loop');
  ok(d.whale.join(',') === '1,,,', 'drowned whale: exactly 1 glide per loop (bar 0)');
}

// Scheduler seam test: pump a fake AudioContext clock for 12 full loops across
// the loop boundary — the lookahead must wrap cleanly (exact BAR lattice, no
// gap/double/drift) and every voice count must land exactly. No-op params mean
// oscs are classified by (type, assigned frequency, stop-start duration): howls,
// wind LFOs (no stop) and the heartbeat's scheduled pitch are all excluded.
{
  const M = MUSIC;
  const BAR = (60 / CFG.audio.bpm) * 4;
  const param = () => {
    const p = { value: 0 };
    for (const m of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'cancelScheduledValues', 'setTargetAtTime']) p[m] = () => {};
    return p;
  };
  const fake = {
    currentTime: 0.5,
    sampleRate: 44100,
    oscs: [],
    createGain: () => ({ gain: param(), connect() {} }),
    createOscillator: () => {
      const o = { type: 'sine', frequency: param(), detune: { value: 0 }, t0: null, t1: null, connect() {},
        start(t) { o.t0 = t; }, stop(t) { o.t1 = t; } };
      fake.oscs.push(o);
      return o;
    },
    createDelay: () => ({ delayTime: param(), connect() {} }),
    createBiquadFilter: () => ({ type: 'lowpass', frequency: param(), Q: { value: 0 }, connect() {} }),
    createBuffer: (ch, len) => ({ length: len, getChannelData: () => new Float32Array(len) }),
    createBufferSource: () => ({ buffer: null, loop: false, connect() {}, start() {}, stop() {} }),
  };
  const dummy = { connect() {} };
  const bus = makeBus();
  const music = initMusic({ bus }, { ctx: () => fake, gain: () => dummy });
  bus.emit('runstart');
  while (fake.currentTime < 0.5 + 48 * BAR + 0.2) { // 12 loops + margin past the seam
    fake.currentTime += 0.01;
    music.update();
  }
  const started = fake.oscs.filter((o) => o.t0 !== null && o.t1 !== null)
    .map((o) => ({ type: o.type, f0: o.frequency.value, t0: o.t0, t1: o.t1 }));
  const subs = started
    .filter((o) => o.type === 'sine' && o.f0 > 25 && o.f0 < 50 && near(o.t1 - o.t0, BAR, 1e-6))
    .sort((a, b) => a.t0 - b.t0);
  ok(subs.length === 49, `MUSIC pump: ${subs.length} sub starts (want 49 — 48 bars + 1 past the seam)`);
  let lattice = subs.length > 0;
  for (let i = 1; i < subs.length; i++) if (!near(subs[i].t0 - subs[i - 1].t0, BAR, 1e-6)) lattice = false;
  ok(lattice, 'MUSIC pump: exact BAR lattice across 12 loop seams — no gap, no double, no drift');
  const pulses = started.filter((o) => o.type === 'sine' && o.f0 >= 25 && o.f0 < 60 && o.t1 - o.t0 < 1 && o.t0 < 0.5 + 48 * BAR);
  ok(pulses.length === 60, `MUSIC pump: ${pulses.length} heartbeat thumps (want 60 — 5 x 12 loops)`);
  const colors = started.filter((o) => o.type === 'sine' && o.f0 > 150);
  ok(colors.length === 96, `MUSIC pump: ${colors.length} color oscs (want 96 — 2 tones x 48 bars)`);
  const drones = started.filter((o) => o.type === 'sawtooth' && o.f0 > 60 && o.f0 < 500 && near(o.t1 - o.t0, BAR + 0.4, 1e-6));
  ok(drones.length === 294, `MUSIC pump: ${drones.length} drone oscs (want 294 — 6 x 49 bar starts)`);
  const lfos = started.filter((o) => o.type === 'sine' && near(o.f0, CFG.audio.droneLfoHz) && near(o.t1 - o.t0, BAR + 0.4, 1e-6));
  ok(lfos.length === 49, `MUSIC pump: ${lfos.length} drone LFOs (want 49)`);
  // 13.11 — per-level flavor pumps (same fake-ctx trick): m01 invariance first, then
  // higan (bell/chime/taiko, boss-taiko) and drowned (bubble/whale) voice counts.
  const pump = (levelKey, boss) => {
    const f2 = { currentTime: 0.5, sampleRate: 44100, oscs: [] };
    f2.createGain = () => ({ gain: param(), connect() {} });
    f2.createOscillator = () => {
      const o = { type: 'sine', frequency: param(), detune: { value: 0 }, t0: null, t1: null, connect() {},
        start(t) { o.t0 = t; }, stop(t) { o.t1 = t; } };
      f2.oscs.push(o);
      return o;
    };
    f2.createDelay = () => ({ delayTime: param(), connect() {} });
    f2.createBiquadFilter = () => ({ type: 'lowpass', frequency: param(), Q: { value: 0 }, connect() {} });
    f2.createBuffer = (ch, len) => ({ length: len, getChannelData: () => new Float32Array(len) });
    f2.createBufferSource = () => ({ buffer: null, loop: false, connect() {}, start() {}, stop() {} });
    const bus2 = makeBus();
    const m2 = initMusic({ bus: bus2, levelKey, bossSpawned: boss }, { ctx: () => f2, gain: () => dummy });
    bus2.emit('runstart');
    while (f2.currentTime < 0.5 + 48 * BAR + 0.2) { f2.currentTime += 0.01; m2.update(); }
    return f2.oscs.filter((o) => o.t0 !== null && o.t1 !== null)
      .map((o) => ({ type: o.type, f0: o.frequency.value, dur: o.t1 - o.t0, t0: o.t0 }));
  };
  const CUTOFF = 0.5 + 48 * BAR; // exclude the margin-scheduled loop-13 bar-0 hits
  const count = (oscs, f0s, dur) => oscs.filter((o) => o.type === 'sine' && f0s.includes(o.f0) && near(o.dur, dur, 1e-6) && o.t0 < CUTOFF).length;
  {
    const m01 = pump('m01', false);
    const subs = m01.filter((o) => o.type === 'sine' && o.f0 > 25 && o.f0 < 50 && near(o.dur, BAR, 1e-6)).length;
    const pulses = count(m01, [36.71, 43.65, 32], 0.5);
    const colors = m01.filter((o) => o.type === 'sine' && o.f0 > 150).length;
    const drones = m01.filter((o) => o.type === 'sawtooth' && o.f0 > 60 && o.f0 < 500).length;
    ok(subs === 49 && pulses === 60 && colors === 96 && drones === 294, `MUSIC pump m01: ${subs} subs / ${pulses} pulses / ${colors} colors / ${drones} drones — 10.6 invariance, zero flavor oscs`);
  }
  {
    const hi = pump('higan', false);
    ok(count(hi, [73.42, 202.6392], 1.9) === 24, 'higan pump: 24 bell oscs (12 strikes x 2 partials)');
    ok(count(hi, [587.33, 698.46, 493.88], 0.95) === 36, 'higan pump: 36 chime pings (3 per loop)');
    ok(count(hi, [55], 0.45) === 72, 'higan pump: 72 taiko hits (6 per loop base pattern)');
    const hb = pump('higan', true);
    ok(count(hb, [55], 0.45) === 96, 'higan pump boss: 96 taiko hits (8 per loop — s8 0/4 every bar)');
  }
  {
    const dw = pump('drowned', false);
    ok(count(dw, [0], 0.2) === 36, 'drowned pump: 36 bubbles (3 per loop)');
    ok(count(dw, [0], 3.6) === 12, 'drowned pump: 12 whale glides (1 per loop)');
  }
}

// --- Phase 13 — level framework (13.1) ---
{
  ok(LEVEL_ORDER.join(',') === 'm01,m02,m03', 'levels: order m01,m02,m03');
  const m1 = getLevel('m01'), m2 = getLevel('m02'), m3 = getLevel('m03');
  ok(m1.w === 4200 && m1.h === 3200 && m1.margin === 70 && m1.diff === 1.0, 'm01: 4200x3200, margin 70, diff 1.0');
  ok(m2.w === 4200 && m2.h === 3200 && m2.diff === 1.25, 'm02: same scale, diff 1.25');
  ok(m3.w === 5145 && m3.h === 3920 && m3.diff === 1.56, 'm03: 1.5x area (5145x3920), diff 1.56');
  ok(m1.unlock.level === null && m1.unlock.wins === 0, 'm01: always open');
  ok(m2.unlock.level === 'm01' && m2.unlock.wins === 3, 'm02 unlock: 3x m01 victories');
  ok(m3.unlock.level === 'm02' && m3.unlock.wins === 3, 'm03 unlock: 3x m02 victories');
  ok(m1.foreground === 'snow' && m2.foreground === 'petal' && m3.foreground === 'bubble', 'levels: foreground snow/petal/bubble');
  ok(typeof m1.layout === 'function' && m1.weights(1000).rat === 5 && m1.boss.key === 'wraith' && m1.boss.at === 240, 'm01: layout/weights/boss wired');
  ok(typeof m2.layout === 'function' && typeof m2.weights === 'function' && m2.boss.key === 'ryu' && m2.boss.at === 240, 'm02: layout/weights/boss (Ryū) wired (13.2/13.3)');
  ok(typeof m3.layout === 'function' && typeof m3.weights === 'function' && m3.boss.key === 'shark' && m3.boss.at === 240, 'm03: layout/weights/boss (Great White) wired (13.4/13.5)');
  ok(generateWorld(20260820, 'm01').trees.length === 276 && generateWorld(20260820, 'm01').decor.length === 335 && generateWorld(20260820, 'm01').colliders.length === 328, 'm01 layout: golden counts (seed 20260820) — identical to pre-13.1');
  // 13.2 — m02 (Higan) layout
  const g = generateWorld(20260822, 'm02');
  const g2 = generateWorld(20260822, 'm02');
  ok(JSON.stringify(g) === JSON.stringify(g2), 'm02 layout: deterministic (seed 20260822)');
  ok(g.trees.length > 150 && g.trees.every((t) => t.kind === 'cherry' || t.kind === 'cherryBig'), `m02: cherry-only trees (${g.trees.length})`);
  const inb = (o) => o.x >= 70 && o.x <= 4130 && o.y >= 70 && o.y <= 3130;
  ok(g.trees.every(inb) && g.huts.every(inb) && g.bamboo.every(inb) && g.lanterns.every(inb) && inb(g.pagoda), 'm02: trees/huts/bamboo/lanterns/pagoda in bounds');
  ok(g.lakes.length === 1 && g.lakes[0].koi === 3 && g.lakes[0].ks.length === 3 && g.lakes.every(inb), 'm02: 1 koi pond, 3 koi, in bounds');
  ok(g.monoliths.length === 6 && g.huts.length === 6 && g.pagoda && g.lanterns.length === 8 && g.lights.length === g.lanterns.length + 1, 'm02: 6 torii + 6 shrines + pagoda + 8 lanterns, lights = lanterns + ring shrine');
  ok(g.mountains.length === 0 && g.campfires.length === 0 && g.deadTrees.length === 0 && g.rocks.length === 0 && g.mushrooms.length === 0, 'm02: no m01-only fields');
  ok(g.decor.length > 100 && g.decor.every((d) => /^(cherry:|cherryBig:|bamboo:|torii$|shrine:|pagoda:|lantern:|stump$)/.test(d.k)), 'm02: decor keys cherry/cherryBig/bamboo/torii/shrine/pagoda/lantern/stump only');
  const m02Decals = ['tuftG', 'petalDrop', 'flowerC', 'pebble', 'stone', 'moss', 'pathA', 'pathB', 'pathC'];
  ok(g.decals.length > 500 && g.decals.every((d) => m02Decals.includes(d.k)), 'm02: ~900+ decals from m02 set (+ paths)');
  ok(g.decals.filter((d) => d.k.startsWith('path')).length > 40, 'm02: stone paths (village/pond/ring/cluster trails)');
  ok(g.colliders.every((c) => Math.hypot(c.x - g.playerStart.x, c.y - g.playerStart.y) > 70 + (c.r || Math.max(c.rx, c.ry) || 0)), 'm02: spawn clearance');
  ok(g.well && g.ringShrine && inb(g.well) && inb(g.ringShrine), 'm02: well + ringShrine in bounds');
  ok(g.trees.length === 274 && g.decor.length === 324 && g.colliders.length === 331, 'm02 layout: golden counts (seed 20260822)');
  ok(aliveCap(120, m1) === 70 && aliveCap(120, m2) === 87.5 && batchSize(300, m2) === 8 && near(spawnInterval(100, m2), spawnInterval(100) / 1.25), 'spawner: per-level diff scales cap/batch/interval');
}

// 13.3 — m02 roster: per-level stat tables (A4) + m02 weights (slot re-skins, A1)
{
  const e1 = new Enemies();
  const e2 = new Enemies();
  const rat0 = e1.spawn('rat', 0, 0);
  e2.diff = 1.25;
  const rat2b = e2.spawn('rat', 0, 0);
  ok(rat0.hp === 20 && rat0.dmg === 8, 'diff 1.0: stats unchanged (rat 20/8)');
  ok(rat2b.hp === 25 && rat2b.dmg === 10, 'diff 1.25: rat hp/dmg ×1.25 (25/10)');
  const brt2 = e2.spawn('brute', 0, 0);
  ok(brt2.hp === 350 && brt2.dmg === 31.25, 'diff 1.25: brute slot (oni) 280→350 hp, 25→31.25 dmg');
  const ryu = e2.spawn('ryu', 0, 0);
  ok(ryu.boss && ryu.hp === 3000 && ryu.dmg === 35, 'Ryū boss ×1.25 (3000 hp / 35 dmg)');
  ok(e1.spawn('ryu', 0, 0).hp === 2400, 'Ryū base stats = Wraith base (pre-diff)');
  const m1 = getLevel('m01'), m2 = getLevel('m02');
  ok(m1.boss.name === 'THE WRAITH' && m2.boss.name === 'RYŪ', 'boss banner names per level');
  const w2 = Object.keys(m2.weights(300));
  ok(w2.length === 6 && w2.every((k) => CFG.enemies[k]), 'm02 weights: 6 slot keys ⊆ enemies');
  ok(JSON.stringify(m2.weights(120)) === JSON.stringify(m1.weights(120)), 'm02 weights = m01 role curve (re-skins, A1)');
  let earlyOk = true;
  {
    const rng = mulberry32(7);
    for (let i = 0; i < 400; i++) {
      const t = pickType(5, rng, m2);
      if (t !== 'rat' && t !== 'bat') earlyOk = false;
    }
  }
  ok(earlyOk, 'm02 pickType(t=5): only tanuki/hō-ōi slots');
  const seen = new Set();
  {
    const rng = mulberry32(8);
    for (let i = 0; i < 3000; i++) {
      const t = pickType(250, rng, m2);
      if (t) seen.add(t);
    }
  }
  ok(seen.size === 6, 'm02 pickType(t=250): all six slot skins appear');
}

// 13.4 — m03 (The Drowned City) layout
{
  const m3 = getLevel('m03');
  ok(typeof m3.layout === 'function' && typeof m3.weights === 'function' && m3.boss.key === 'shark', 'm03: layout/weights/boss wired (13.4/13.5)');
  const g = generateWorld(20260823, 'm03');
  const g2 = generateWorld(20260823, 'm03');
  ok(JSON.stringify(g) === JSON.stringify(g2), 'm03 layout: deterministic (seed 20260823)');
  ok(g.W === 5145 && g.H === 3920, 'm03: world 5145x3920 (1.5x area)');
  ok(g.trees.length > 150 && g.trees.every((t) => t.kind === 'kelp' || t.kind === 'kelpBig'), `m03: kelp-only trees (${g.trees.length})`);
  const inb = (o) => o.x >= 70 && o.x <= 5075 && o.y >= 70 && o.y <= 3850;
  ok(g.trees.every(inb) && g.bamboo.every(inb) && g.lanterns.every(inb) && g.monoliths.every(inb) && inb(g.pagoda) && inb(g.wreck), 'm03: kelp/coral/anemones/columns/trident/wreck in bounds');
  ok(g.lakes.length === 3 && g.lakes.every((l) => l.school && l.koi === 5 && l.ks.length === 5) && g.lakes.every(inb), 'm03: 3 open-water fish schools (5 each), in bounds');
  ok(g.monoliths.length === 10 && g.huts.length === 0 && g.lanterns.length === 8 && g.lights.length === g.lanterns.length + 1, 'm03: 10 broken columns + 8 anemones, lights = anemones + dome');
  ok(g.mountains.length === 0 && g.campfires.length === 0 && g.deadTrees.length === 0 && g.rocks.length === 0 && g.mushrooms.length === 0, 'm03: no m01-only fields');
  ok(g.decor.length > 100 && g.decor.every((d) => /^(kelp:|kelpBig:|coral:|column:|anemone:|vent:|dome:|trident:|wreck:)/.test(d.k)), 'm03: decor keys kelp/coral/column/anemone/vent/dome/trident/wreck only');
  const m03Decals = ['sandTuft', 'bubbleRise', 'coralDrop', 'shell', 'pebble', 'moss', 'ruinA', 'ruinB', 'ruinC'];
  ok(g.decals.length > 500 && g.decals.every((d) => m03Decals.includes(d.k)), 'm03: ~900+ decals from m03 set (+ ruin paths)');
  ok(g.decals.filter((d) => d.k.startsWith('ruin')).length > 40, 'm03: ruined street slabs (city/wreck/school trails)');
  ok(g.colliders.every((c) => Math.hypot(c.x - g.playerStart.x, c.y - g.playerStart.y) > 70 + (c.r || Math.max(c.rx, c.ry) || 0)), 'm03: spawn clearance');
  ok(g.well && g.ringShrine && inb(g.well) && inb(g.ringShrine), 'm03: well (city) + dome (ringShrine) in bounds');
  ok(g.trees.length === 319 && g.decor.length === 370 && g.colliders.length === 370, 'm03 layout: golden counts (seed 20260823)');
}

// 13.5 — m03 roster: stat tables ×1.56 (A4) + m03 weights (slot re-skins) + Great White boss
{
  const lm1 = getLevel('m01'), lm3 = getLevel('m03');
  const eb = new Enemies();
  ok(eb.spawn('shark', 0, 0).hp === 2400, 'Great White base stats = Wraith base (pre-diff)');
  const e3 = new Enemies();
  e3.diff = 1.56;
  const rat3 = e3.spawn('rat', 0, 0);
  ok(near(rat3.hp, 31.2) && rat3.dmg === 12.48, 'diff 1.56: crab slot 20→31.2 hp, 8→12.48 dmg');
  const brt3 = e3.spawn('brute', 0, 0);
  ok(brt3.hp === 436.8 && brt3.dmg === 39, 'diff 1.56: orca slot 280→436.8 hp, 25→39 dmg');
  const shark = e3.spawn('shark', 0, 0);
  ok(shark.boss && shark.hp === 3744 && shark.dmg === 43.68, 'Great White boss ×1.56 (3744 hp / 43.68 dmg)');
  ok(lm3.boss.name === 'THE GREAT WHITE', 'm03 boss banner name');
  const w3 = Object.keys(lm3.weights(300));
  ok(w3.length === 6 && w3.every((k) => CFG.enemies[k]), 'm03 weights: 6 slot keys ⊆ enemies');
  ok(JSON.stringify(lm3.weights(120)) === JSON.stringify(lm1.weights(120)), 'm03 weights = m01 role curve (re-skins)');
  let earlyOk = true;
  {
    const rng = mulberry32(7);
    for (let i = 0; i < 400; i++) {
      const t = pickType(5, rng, lm3);
      if (t !== 'rat' && t !== 'bat') earlyOk = false;
    }
  }
  ok(earlyOk, 'm03 pickType(t=5): only crab/goldfish slots');
  const seen = new Set();
  {
    const rng = mulberry32(8);
    for (let i = 0; i < 3000; i++) {
      const t = pickType(250, rng, lm3);
      if (t) seen.add(t);
    }
  }
  ok(seen.size === 6, 'm03 pickType(t=250): all six slot skins appear');
}

// 13.6 — unlock persistence: cumulative wins (victory-only) + unlock rules (3× each, chained)
{
  const lw = loadWins('no-such-key');
  ok(LEVEL_ORDER.every((k) => lw[k] === 0), 'loadWins: defaults {0,0,0} without storage');
  const w = defaultWins();
  recordWin(w, 'm01'); recordWin(w, 'm01');
  ok(w.m01 === 2 && w.m02 === 0, 'recordWin: only increments the level won');
  ok(isUnlocked(w, 'm01'), 'm01 always unlocked');
  ok(!isUnlocked(w, 'm02') && !isUnlocked(w, 'm03'), 'm02/m03 locked with 2 m01 wins');
  recordWin(w, 'm01');
  ok(isUnlocked(w, 'm02') && !isUnlocked(w, 'm03'), 'm02 unlocked at 3× m01 wins; m03 still locked');
  recordWin(w, 'm02'); recordWin(w, 'm02'); recordWin(w, 'm02');
  ok(isUnlocked(w, 'm03'), 'm03 unlocked at 3× m02 wins (chained)');
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  saveWins(CFG.meta.winsKey, w);
  const w2 = loadWins(CFG.meta.winsKey);
  ok(w2.m01 === 3 && w2.m02 === 3 && w2.m03 === 0, 'wins: localStorage round-trip');
  delete globalThis.localStorage;
}

// 13.7 — level-select persistence: last-selected level (qsurv.level.v1)
{
  ok(loadSelectedLevel('no-such-key') === 'm01', 'loadSelectedLevel: defaults to m01 without storage');
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  saveSelectedLevel(CFG.meta.levelKey, 'm02');
  ok(loadSelectedLevel(CFG.meta.levelKey) === 'm02', 'selected level: localStorage round-trip (m02)');
  saveSelectedLevel(CFG.meta.levelKey, 'not-a-level');
  ok(loadSelectedLevel(CFG.meta.levelKey) === 'm02', 'saveSelectedLevel: invalid level key ignored (keeps m02)');
  ok(loadSelectedLevel('other-key') === 'm01', 'loadSelectedLevel: empty/absent key falls back to m01');
  delete globalThis.localStorage;
}

// 13.8 — view zoom: device default + persisted 0.80/1.0 (qsurv.zoom.v1)
{
  ok(defaultZoom(true) === CFG.zoom.touch && defaultZoom(false) === CFG.zoom.full, 'defaultZoom: 0.80 touch / 1.0 desktop');
  ok(loadZoom('no-such-key', true) === CFG.zoom.touch, 'loadZoom: touch default without storage');
  ok(loadZoom('no-such-key', false) === CFG.zoom.full, 'loadZoom: desktop default without storage');
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  saveZoom(CFG.zoom.key, CFG.zoom.touch);
  ok(loadZoom(CFG.zoom.key, false) === CFG.zoom.touch, 'zoom: persisted 0.80 wins over desktop default');
  saveZoom(CFG.zoom.key, CFG.zoom.full);
  ok(loadZoom(CFG.zoom.key, true) === CFG.zoom.full, 'zoom: persisted 1.0 wins over touch default');
  store.set(CFG.zoom.key, 'garbage');
  ok(loadZoom(CFG.zoom.key, true) === CFG.zoom.touch, 'loadZoom: invalid stored value → device default');
  delete globalThis.localStorage;
}

// --- 13.9 Per-level high-score keys: m01 keeps the original key (no data loss) ---
{
  ok(scoreKeyFor('m01') === CFG.scores.storageKey, '13.9: m01 keeps the original score key');
  ok(scoreKeyFor('m02') === 'qsurv.hiscores.m02.v1', '13.9: m02 sibling key');
  ok(scoreKeyFor('m03') === 'qsurv.hiscores.m03.v1', '13.9: m03 sibling key');
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  saveScores(CFG.scores.storageKey, [{ score: 100, time: 30, kills: 1, level: 1, date: '2026-01-01' }], CFG.scores.max);
  saveScores(scoreKeyFor('m02'), [{ score: 50, time: 20, kills: 2, level: 2, date: '2026-01-01' }], CFG.scores.max);
  ok(loadScores(CFG.scores.storageKey).length === 1 && loadScores(CFG.scores.storageKey)[0].score === 100, '13.9: m01 list untouched by m02 save');
  ok(loadScores(scoreKeyFor('m02')).length === 1 && loadScores(scoreKeyFor('m02'))[0].score === 50, '13.9: m02 list separate');
  ok(loadScores(scoreKeyFor('m03')).length === 0, '13.9: m03 list empty until saved');
  const r = rankScore(loadScores(scoreKeyFor('m02')), { score: 60, time: 25, kills: 3, level: 2, date: '2026-01-02' }, CFG.scores.max);
  ok(r.rank === 0 && r.isRecord, '13.9: ranking computed within the run-level list');
  delete globalThis.localStorage;
}

console.log(`test-logic: ${pass} checks passed, ${fails.length} failed`);
for (const f of fails) console.error(`  FAIL ${f}`);
process.exit(fails.length ? 1 : 0);
