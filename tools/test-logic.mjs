#!/usr/bin/env node
// Pure-logic assertions (Node, no browser). Run: node tools/test-logic.mjs
import { mulberry32, hash2, approach, clamp } from '../js/utils/math.js';
import { CFG } from '../js/config.js';
import { generateWorld } from '../js/world/generate.js';
import { LEVELS, LEVEL_ORDER, getLevel } from '../js/world/levels.js';
import { HashGrid } from '../js/utils/grid.js';
import { aliveCap, spawnInterval, batchSize, pickType, spawnPoint } from '../js/entities/spawner.js';
import { Enemies } from '../js/entities/enemies.js';
import { Player, cardOffers, applyCard, recomputeStats, cardEffectText, charDef } from '../js/entities/player.js';
import { Combat } from '../js/entities/combat.js';
import { SNAP_V, WEAPON_KEYS, PASSIVE_KEYS, SYNERGY_KEYS, ENEMY_KEYS, E_FLAG_FLASH, E_FLAG_BURN, E_FLAG_BLIGHT, E_FLAG_BOSS, E_FLAG_FLIP, playerSnap, applyPlayerSnap, enemySnap, applyEnemySnap, pickupSnaps, applyPickupSnaps, stateMsg, unpackState } from '../js/net/sync.js';
import { loadMeta, shardsFor, upgradeCost, applyMeta, loadWins, saveWins, recordWin, isUnlocked, defaultWins, loadSelectedLevel, saveSelectedLevel, defaultZoom, loadZoom, saveZoom, defaultChars, loadChars, saveChars, isCharUnlocked, buyChar, loadSelectedChar, saveSelectedChar } from '../js/core/meta.js';
import { rankScore, loadScores, saveScores, scoreKeyFor } from '../js/ui/screens.js';
import { MUSIC, FLAVOR, initMusic } from '../js/audio/music.js';
import { makeBus } from '../js/utils/bus.js';
import { MSG, pack, unpack, profileFromMeta, joinProfile, sanitizeChars, allStarterLobby, ghostColor, charAccent, allocateGhostOffers, createRoom, joinRoom, leaveRoom, closeRoom, coopScale, leashClamp, weaponCap, selChar, assignChars, resolveChars } from '../js/net/coop.js';
import { encodeFrame, consumeFrames, wsAcceptKey } from './serve.mjs';

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

// --- Passives / character starting weapons / boss / spawner weights ---
{
  let pasOk = true;
  for (const p of Object.values(CFG.passives)) if (!(p.max > 0 && p.val > 0)) pasOk = false;
  ok(pasOk, 'passives: max/val positive');
  ok(CFG.characters.order.every((k) => CFG.weapons[CFG.characters[k].weapon]) && CFG.characters.ghost.weapon === null,
    'characters: starting weapons exist in weapons (ghost: none)');
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
  const full = cardOffers({ wand: 1, garlic: 1, axe: 1, blades: 1, pistols: 1 }, {}, {}, mulberry32(3));
  ok(full.length === 3 && full.every((c) => !(c.kind === 'weapon' && c.level === 1)), 'cardOffers: maxWeapons=5 → no new-weapon cards');
  // Phase 9: pool is exactly {hp, dmg, regen, blight, tempest} — 5 maxed weapons + 2 passives max.
  // No weapon cards at all (ownedW=5=cap) yet blight/tempest are offered → synergies do NOT
  // count against maxWeapons.
  const maxed = cardOffers({ wand: 5, garlic: 5, axe: 5, blades: 5, pistols: 5 }, { speed: 3, magnet: 3 }, {}, mulberry32(2));
  const legalKeys = new Set(['hp', 'dmg', 'regen', 'blight', 'tempest']);
  ok(maxed.length === 3 && maxed.every((c) => c.kind === 'passive' || c.kind === 'synergy')
    && maxed.every((c) => legalKeys.has(c.key)), 'cardOffers: exhausted pool → remaining passives + gated synergies only');
  // Phase 9 (11.5: cap 4→5): deterministic pool. 5 maxed weapons push ownedW to the cap with
  // no garlic (blight stays gated); all passives maxed → the pool is exactly {inferno, tempest,
  // phoenix} and the draw takes all three.
  const trio = cardOffers({ pistols: 5, flame: 5, wand: 5, axe: 5, blades: 5 }, { speed: 3, hp: 3, dmg: 5, magnet: 3, regen: 3 }, {}, mulberry32(4));
  ok(trio.length === 3 && trio.every((c) => c.kind === 'synergy')
    && new Set(trio.map((c) => c.key)).size === 3
    && trio.every((c) => c.key === 'inferno' || c.key === 'phoenix' || c.key === 'tempest'), 'cardOffers: 3-candidate pool {inferno, tempest, phoenix}');
}

// --- 11.5.1: base maxWeapons 4→5 + per-player co-op equip cap (pure) ---
{
  ok(CFG.run.maxWeapons === 5, '11.5.1: base maxWeapons raised 4→5');
  ok(weaponCap(1) === 5 && weaponCap(2) === 4 && weaponCap(3) === 3 && weaponCap(4) === 2,
    'weaponCap: 1P=5, 2P=4, 3P=3, 4P=2');
  ok(weaponCap(0) === 5 && weaponCap(7) === 2, 'weaponCap: clamped at 1..maxPlayers');
}

// --- 11.5.2: per-player cardOffers (cap + ownership exclusivity, pure) ---
{
  const allPassMax = {};
  for (const k of Object.keys(CFG.passives)) allPassMax[k] = CFG.passives[k].max;
  // Deterministic narrow pool: all weapons except bombs/flame owned by ANOTHER player →
  // pool = {bombs:1, flame:1, phoenix} (passives maxed gate phoenix) — the full 3 are drawn,
  // and no excluded key can appear in any draw.
  const exSet = new Set(Object.keys(CFG.weapons).filter((k) => k !== 'bombs' && k !== 'flame'));
  const two = cardOffers({}, allPassMax, {}, mulberry32(3), 5, exSet);
  ok(two.length === 3
    && two.every((c) => !(c.kind === 'weapon' && exSet.has(c.key)))
    && two.every((c) => c.kind !== 'weapon' || (c.key === 'bombs' || c.key === 'flame'))
    && new Set(two.map((c) => c.kind + ':' + c.key)).size === 3,
    '11.5.2: other-owned weapons never offered (pool = bombs/flame + phoenix only)');
  // Cap drives the new-weapon slots. Owned weapons MAXED (no upgrade cards) with incomplete synergy
  // pairs (no garlic/blades/flame → no weapon synergies); passives maxed (phoenix IS gated — the only
  // 4th pool item). Cap 5: pool = {garlic:1, blades:1, flame:1, phoenix}. Cap 4 (2P): new-weapon
  // slots closed → pool = {phoenix} only.
  const w4 = { wand: 5, axe: 5, pistols: 5, bombs: 5 };
  for (let seed = 1; seed <= 3; seed++) {
    const draw = cardOffers(w4, allPassMax, {}, mulberry32(seed), 5);
    ok(draw.length === 3 && draw.every((c) => (c.kind === 'weapon' && c.level === 1
        && (c.key === 'garlic' || c.key === 'blades' || c.key === 'flame'))
        || (c.kind === 'synergy' && c.key === 'phoenix')), `11.5.2: cap 5 → new-weapon slots open (seed ${seed})`);
  }
  const cap4 = cardOffers(w4, allPassMax, {}, mulberry32(1), 4);
  ok(cap4.length === 1 && cap4[0].kind === 'synergy' && cap4[0].key === 'phoenix',
    '11.5.2: cap 4 (2P) → no new-weapon cards (pool = phoenix only)');
  // Passives are NEVER locked — offered even with every weapon excluded by other owners.
  const passivesOnly = cardOffers({}, {}, {}, mulberry32(5), 2, new Set(Object.keys(CFG.weapons)));
  ok(passivesOnly.length === 3 && passivesOnly.every((c) => c.kind === 'passive'),
    '11.5.2: passives not locked (all weapons excluded → 3 passives drawn)');
}

// --- 11.6b: synergy exclusivity (pure cardOffers) ---
{
  const allPassMax = {};
  for (const k of Object.keys(CFG.passives)) allPassMax[k] = CFG.passives[k].max;
  // Cap filled with 5 maxed weapons → no new-weapon slots; all passives maxed → no
  // passive slots; the pool is exactly the gated synergies {blight, tempest, phoenix}
  // (all three drawn). Once ANOTHER player owns blight, it must never be offered.
  const exBlight = new Set(['blight']);
  const blightMax = { wand: 5, garlic: 5, axe: 5, blades: 5, pistols: 5 };
  for (let seed = 1; seed <= 3; seed++) {
    const draw = cardOffers(blightMax, allPassMax, {}, mulberry32(seed), 5, exBlight);
    ok(draw.every((c) => !(c.kind === 'synergy' && c.key === 'blight')),
      `11.6b: other-owned synergy never offered (sources at max, seed ${seed})`);
  }
  // Control: the same pool with no owner offers blight.
  ok(cardOffers(blightMax, allPassMax, {}, mulberry32(1), 5)
    .some((c) => c.kind === 'synergy' && c.key === 'blight'),
    '11.6b: control — unowned blight IS offerable');
  // Excluding an (unoffered) synergy key must not perturb the weapon draw (rng parity).
  const base = { wand: 3, garlic: 1 };
  const a = cardOffers(base, {}, {}, mulberry32(11), 5);
  const b = cardOffers(base, {}, {}, mulberry32(11), 5, new Set(['tempest']));
  ok(JSON.stringify(a) === JSON.stringify(b),
    '11.6b: excluding a synergy does not shift the weapon draw (same rng)');
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
  ok(p.maxHp === 80, 'applyMeta + recomputeStats: maxHp L1 → 80 (mage 60 + 20; plain obj = solo default)');
}

// --- applyCard (pure) ---
{
  // charKey 'ghost' = baseline stats (D59) so this block tests passive mechanics,
  // not character values (the 11.6.1 block covers per-char stats).
  const mk = () => ({ charKey: 'ghost', weapons: { wand: 1 }, passives: {}, maxHp: 100, hp: 100, dmgMul: 1, speedMul: 1, magnet: 1, regen: 0 });
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

// --- 11.1 co-op room semantics + wire protocol + frame codec; 11.3 scaling ---
{
  const room = createRoom('m02');
  ok(joinRoom(room, { id: 1, profile: { a: 1 } }).ok, '11.1: first client opens the room');
  ok(room.hostId === 1 && room.status === 'open', '11.1: first client is host, room open');
  ok(joinRoom(room, { id: 2 }).seat === 1 && joinRoom(room, { id: 3 }).seat === 2, '11.1: seats assigned in join order');
  const f4 = joinRoom(room, { id: 4 });
  ok(f4.ok && f4.n === 4, '11.1: 4 clients seated');
  ok(joinRoom(room, { id: 5 }).reason === 'full', '11.1: 5th client → full');
  ok(leaveRoom(room, 2).closed === false, '11.1: non-host leave keeps room open');
  ok(room.players.length === 3 && room.players[1].seat === 1, '11.1: re-seat in join order after leave');
  ok(leaveRoom(room, 99).closed === false, '11.1: leave unknown id is a no-op');
  const h = leaveRoom(room, 1);
  ok(h.closed && room.status === 'closed', '11.1: host leave closes the room');
  ok(joinRoom(room, { id: 6 }).reason === 'closed', '11.1: join after close → closed');
  const room2 = createRoom('m01');
  joinRoom(room2, { id: 7 });
  closeRoom(room2, 'run-end');
  ok(room2.status === 'closed' && room2.reason === 'run-end', '11.1: explicit close (run end)');

  const prof = profileFromMeta({ shards: 999, upgrades: { maxHp: 2, dmg: 1, speed: 3, xp: 0, dash: 5 } });
  ok(prof.maxHpBonus === 40 && near(prof.dmgMult, 1.08) && near(prof.speedMult, 1.18) && near(prof.dashCdMult, 0.6) && prof.xpMult === 1, '11.1/D53: profile derived from meta upgrades only');
  const round = unpack(pack({ t: 'x', v: 1 }));
  ok(round && round.t === 'x' && round.v === 1, '11.1: pack/unpack round-trip');
  ok(unpack('nope') === null && unpack('[1]') === null && unpack('null') === null, '11.1: unpack rejects non-objects');
  ok(MSG.hello === 'hello' && MSG.state === 'state' && MSG.closed === 'closed', '11.1: message table');

  ok(near(coopScale(1), 1) && near(coopScale(2), 1.33) && near(coopScale(3), 1.66) && near(coopScale(4), 1.99) && near(coopScale(99), 1.99) && near(coopScale(0), 1), '11.3: coopScale 1/1.33/1.66/1.99, clamped to 1..max');

  const mk = (str, mask) => {
    const p = Buffer.from(str); const len = p.length;
    const lenB = len < 126 ? Buffer.from([0x80 | len]) : Buffer.concat([Buffer.from([0x80 | 126]), Buffer.from([(len >> 8) & 0xff, len & 0xff])]);
    const h = Buffer.concat([Buffer.from([0x81]), lenB, Buffer.from(mask)]);
    return Buffer.concat([h, Buffer.from(p.map((b, i) => b ^ mask[i & 3]))]);
  };
  let got = null;
  const rr = consumeFrames(mk('{"t":"hello"}', [1, 2, 3, 4]), (e) => { got = e; });
  ok(got && got.type === 'text' && unpack(got.str).t === 'hello' && rr.rest.length === 0, '11.1: consumeFrames masked client frame');
  const seq = [];
  consumeFrames(Buffer.concat([mk('{"a":1}', [9, 8, 7, 6]), mk('{"b":2}', [5, 4, 3, 2])]), (e) => seq.push(e.str));
  ok(seq.length === 2 && seq[1].includes('"b"'), '11.1: two frames in one buffer');
  const part = mk('{"split":true}', [1, 1, 1, 1]);
  const r1 = consumeFrames(part.subarray(0, 5), () => {});
  consumeFrames(Buffer.concat([r1.rest, part.subarray(5)]), (e) => { got = e; });
  ok(got && got.str.includes('split'), '11.1: partial frame reassembly');
  const out = encodeFrame(0x1, 'ok');
  ok(out[0] === 0x81 && out[1] === 2 && out.slice(2).toString() === 'ok', '11.1: encodeFrame unmasked text');
  const bigP = Buffer.alloc(70000, 120); // 'x'
  const bigLen = Buffer.alloc(9); bigLen[0] = 0x80 | 127; bigLen.writeBigUInt64BE(70000n, 1);
  const bigMask = Buffer.from([1, 1, 1, 1]);
  for (let i = 0; i < 70000; i++) bigP[i] ^= bigMask[i & 3];
  const rb = consumeFrames(Buffer.concat([Buffer.from([0x81]), bigLen, bigMask, bigP]), () => {});
  ok(rb.error === 'max-payload', '11.1: oversized frame → max-payload');
  ok(wsAcceptKey('dGhlIHNhbXBsZSBub25jZQ==') === 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=', '11.1: RFC 6455 accept key');
}

// --- 11.2 host-authoritative sync: snapshot codec + per-player ownership ---
{
  ok(WEAPON_KEYS.length === 7 && PASSIVE_KEYS.length === 5 && SYNERGY_KEYS.length === 5 && ENEMY_KEYS.length === 9,
    '11.2: key tables follow CFG order/counts');

  const p = new Player({});
  p.reset(10, 20);
  applyCard(p, { kind: 'weapon', key: 'axe', level: 2 });
  applyCard(p, { kind: 'passive', key: 'dmg', level: 1 });
  applyCard(p, { kind: 'synergy', key: 'blight', level: 1 });
  p.xp = 12.345; p.hp = 55.55; p.dashT = 0.333; p.dashCd = 1.666; p.flip = true;
  const ps = playerSnap(p);
  ok(ps.length === 26, '11.2: playerSnap is 26 slots');
  const p2 = new Player({});
  p2.reset(0, 0);
  applyPlayerSnap(p2, ps);
  ok(near(p2.x, 10) && near(p2.y, 20) && near(p2.hp, 55.6) && p2.maxHp === p.maxHp && near(p2.xp, 12.3)
    && p2.level === p.level && p2.flip === true && near(p2.dashT, 0.3) && near(p2.dashCd, 1.7),
    '11.2: playerSnap/apply round-trip (r1 rounding)');
  ok(Object.keys(p2.weapons).length === Object.keys(p.weapons).length && p2.weapons.axe === p.weapons.axe
    && p2.passives.dmg === 1 && p2.synergies.blight === 1,
    '11.2: applyPlayerSnap rebuilds weapon/passive/synergy maps');

  const es = enemySnap({ sid: 3, type: ENEMY_KEYS[1], x: 100.04, y: 200.06, hp: 7.4, maxHp: 10, frame: 2, flash: 0.2, burnT: 1, blightT: 0, boss: true, flip: true });
  ok(es[0] === 3 && es[1] === 1 && near(es[2], 100) && near(es[3], 200.1) && es[4] === 7 && es[5] === 10 && es[6] === 2
    && es[7] === (E_FLAG_FLASH | E_FLAG_BURN | E_FLAG_BOSS | E_FLAG_FLIP),
    '11.2: enemySnap [sid,typeIdx,x,y,hp,maxHp,frame,flags]');
  const e2 = {};
  applyEnemySnap(e2, es);
  ok(near(e2.x, 100) && near(e2.y, 200.1) && e2.hp === 7 && e2.frame === 2 && e2.flip === true && e2.flash > 0 && e2.burnT > 0 && e2.blightT === 0,
    '11.2: applyEnemySnap (flags → flash/burn/blight/flip)');

  const pk = { gems: [{ on: true, x: 1.25, y: 2.5 }, { on: false }], hearts: [{ on: false }, { on: true, x: 3.4, y: 4.6 }] };
  const snaps = pickupSnaps(pk);
  ok(snaps.length === 2 && snaps[0][0] === 0 && snaps[0][1] === 0 && near(snaps[0][2], 1.3) && near(snaps[0][3], 2.5)
    && snaps[1][0] === 1 && snaps[1][1] === 1,
    '11.2: pickupSnaps [kind,poolSlot,x,y] stable slots, alive only');
  const pk2 = { gems: [{ on: false }, { on: false }], hearts: [{ on: false }, { on: false }] };
  applyPickupSnaps(pk2, snaps);
  ok(pk2.gems[0].on === true && pk2.gems[1].on === false && pk2.hearts[1].on === true && typeof pk2.gems[0].ph === 'number',
    '11.2: applyPickupSnaps toggles by pool slot + recomputes ph');

  const st = stateMsg(5, 12.345, 100, 7, [ps], [es], [[0, 0, 1, 1]]);
  ok(st.v === SNAP_V && st.step === 5 && near(st.time, 12.35) && st.score === 100 && st.kills === 7, '11.2: stateMsg fields (time r2)');
  ok(unpackState(st) === st, '11.2: unpackState accepts valid');
  ok(unpackState({ ...st, v: 99 }) === null, '11.2: wrong version → null');
  ok(unpackState({ ...st, step: 2.5 }) === null, '11.2: non-integer step → null');
  ok(unpackState({ ...st, players: [ps, [1, 2]] }) === null, '11.2: short player snap → null');
  ok(unpackState({ ...st, enemies: [[1, 0, 1, 1, 1, 1, 0]] }) === null, '11.2: short enemy snap → null');
  ok(unpackState({ ...st, pickups: [[0, 0, 1]] }) === null, '11.2: short pickup snap → null');
  ok(unpackState(null) === null, '11.2: null → null');

  // Per-player ownership: synergies ride the projectile; kills credit the shooter.
  const c = new Combat();
  const A = { id: 'A' }, B = { id: 'B' };
  c.fireBolt(0, 0, 0, 10, 0, 2, A);
  ok(c.bolts[0].blight === 2 && c.bolts[0].owner === A, '11.2: fireBolt carries blight level + owner');
  c.fireBullet(0, 0, 0, 5, null, B);
  ok(c.bullets[0].inferno === null && c.bullets[0].owner === B, '11.2: fireBullet carries owner (no inferno)');
  c.fireBomb(0, 0, 0, 30, 8, 20, 0.5, null, A);
  ok(c.bombs[0].napalm === null && c.bombs[0].owner === A, '11.2: fireBomb carries owner');
  c.emitFlame(0, 0, 0, 1, 2, 1.5, B);
  ok(c.flames[0].owner === B, '11.2: emitFlame carries owner');
  c.fireAxe(0, 0, 0, 6, 10, 3, A);
  ok(c.axes.length === 3 && c.axes.every((a) => a.owner === A), '11.2: fireAxe stamps every throw');
  let killed = null;
  c.onKill = (e, killer) => { killed = killer; };
  c.damageEnemy({ hp: 10, maxHp: 10, flash: 0 }, 10, 0, 0, 0, B);
  ok(killed === B, '11.2: damageEnemy → onKill(e, owner)');
}

// --- 11.3 difficulty scaling: coopScale ramp on enemy HP/dmg, spawn curves, boss ---
{
  ok(coopScale(1) === 1 && coopScale(0) === 1, '11.3: coopScale(≤1) = 1 (solo invariance)');
  ok(near(coopScale(2), 1.33) && near(coopScale(3), 1.66) && near(coopScale(4), 1.99),
    '11.3: coopScale 2P/3P/4P = 1.33/1.66/1.99');
  ok(coopScale(99) === coopScale(4), '11.3: coopScale clamps at maxPlayers');
  const m01 = getLevel('m01');
  ok(aliveCap(120, m01, 1.33) === aliveCap(120, m01) * 1.33
    && batchSize(300, m01, 1.33) === Math.round(batchSize(300, m01) * 1.33)
    && near(spawnInterval(100, m01, 1.33), spawnInterval(100, m01) / 1.33),
    '11.3: aliveCap ×s, batch ×s (rounded), interval ÷s');
  ok(aliveCap(120, m01) === 70 && batchSize(300, m01) === 6 && near(spawnInterval(100, m01), 1.23),
    '11.3: s default 1 = solo invariance (m01 curves)');
  const en = new Enemies();
  en.diff = 1; en.coopS = 1;
  const r1 = en.spawn('rat', 0, 0);
  en.coopS = 1.33;
  const r2 = en.spawn('rat', 0, 0);
  ok(r1.maxHp === CFG.enemies.rat.hp && near(r2.maxHp, CFG.enemies.rat.hp * 1.33) && near(r2.dmg, CFG.enemies.rat.dmg * 1.33),
    '11.3: spawn HP/dmg ×coopS (non-boss)');
  en.coopS = 1.66;
  const boss = en.spawn('wraith', 0, 0);
  ok(boss.boss && near(boss.maxHp, CFG.enemies.wraith.hp * 1.66) && near(boss.dmg, CFG.enemies.wraith.dmg * 1.66),
    '11.3: boss HP/dmg same ramp (Q7)');
}

// --- 11.4 player leash: pairwise vision radius (A2) — pure projection helper ---
{
  const R = CFG.coop.leashR;
  ok(Number.isFinite(R) && R > CFG.lighting.playerR,
    '11.4: CFG.coop.leashR expanded from the solo vision radius');
  const none = leashClamp(10, 20, [], R);
  ok(none[0] === 10 && none[1] === 20, '11.4: no others → no-op (solo invariance)');
  const same = leashClamp(100, 100, [{ x: 100, y: 100 }], R);
  ok(same[0] === 100 && same[1] === 100, '11.4: coincident other (d=0) → unchanged, no NaN');
  const inside = leashClamp(0, 100, [{ x: 0, y: 0 }, { x: 200, y: 0 }], R);
  ok(inside[0] === 0 && inside[1] === 100, '11.4: within R of all → unchanged');
  const exact = leashClamp(0, R, [{ x: 0, y: 0 }], R);
  ok(exact[0] === 0 && exact[1] === R, '11.4: exactly at R → unchanged (strict >)');
  const far = leashClamp(0, 2000, [{ x: 0, y: 0 }], R);
  ok(near(Math.hypot(far[0], far[1]), R, 1e-6), '11.4: >R from one other → projected to the R circle');
  const lens = leashClamp(1500, 400, [{ x: 0, y: 0 }, { x: 800, y: 0 }], R);
  ok(Math.hypot(lens[0], lens[1]) <= R + 1e-6 && Math.hypot(lens[0] - 800, lens[1]) <= R + 1e-6,
    '11.4: >R from two others → converges within R of both');
  const tri = leashClamp(1200, 800, [{ x: 0, y: 0 }, { x: 600, y: 0 }, { x: 300, y: 500 }], R);
  ok([0, 1, 2].every((i) => {
    const o = [{ x: 0, y: 0 }, { x: 600, y: 0 }, { x: 300, y: 500 }][i];
    return Math.hypot(tri[0] - o.x, tri[1] - o.y) <= R + 1e-6;
  }), '11.4: 3 others (4P worst case) → within R of every one');
}

// --- 11.6.1 character roster: CFG table + per-char stats (D28/D56–D62; stat values O pending user approval) ---
{
  const C = CFG.characters;
  ok(C.order.length === 4 && C.order.every((k) => C[k] && C[k].name && C[k].desc), '11.6.1: order defines 4 named chars with select desc');
  ok(C.mage.cost === 0 && C.ranger.cost === 1500 && C.warden.cost === 3500 && C.swash.cost === 7500,
    '11.6.1: D58 costs — mage 0, ranger 1500, warden 3500, swash 7500');
  ok(C.order.every((k) => CFG.weapons[C[k].weapon]) && C.ghost.weapon === null, '11.6.1: starting weapons in weapons (ghost: none)');
  ok(C.ghost.hp === 100 && C.ghost.dmg === 1 && C.ghost.speed === 265, '11.6.1: ghost = baseline (100 / 1.0 / 265)');
  ok(C.order.every((k) => C[k].hp > 0 && C[k].dmg > 0 && C[k].speed > 0), '11.6.1: stats positive');
  ok(charDef('nope') === C.mage && charDef('mage') === C.mage, '11.6.1: charDef unknown → mage');
  const p0 = new Player({});
  ok(p0.charKey === 'mage', '11.6.1: solo default charKey = mage');
  p0.setCharacter('nope');
  ok(p0.charKey === 'mage', '11.6.1: setCharacter ignores unknown');
  for (const k of [...C.order, 'ghost']) {
    const pl = new Player({});
    pl.setCharacter(k);
    pl.reset(0, 0);
    const w = C[k].weapon;
    ok(pl.maxHp === C[k].hp && pl.hp === C[k].hp
      && Object.keys(pl.weapons).length === (w ? 1 : 0)
      && (!w || pl.weapons[w] === 1), `11.6.1: ${k} reset → hp ${C[k].hp} + starting weapon ${w || 'none'}`);
  }
  for (const k of [...C.order, 'ghost']) {
    const t = { charKey: k, passives: {} };
    recomputeStats(t);
    ok(near(t.maxHp, C[k].hp) && near(t.dmgMul, C[k].dmg) && t.speedMul === 1, `11.6.1: ${k} recomputeStats base (plain obj)`);
    t.passives = { hp: 1, dmg: 1 }; t.metaHp = 20; t.metaDmg = 0.08;
    recomputeStats(t);
    ok(near(t.maxHp, C[k].hp + 25 + 20) && near(t.dmgMul, 1.12 * 1.08 * C[k].dmg), `11.6.1: ${k} recomputeStats w/ passives + meta`);
  }
}

// --- 11.6.2 character unlock shop + selection persistence (D58, meta.js pattern) ---
{
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const starter = CFG.characters.order[0];
  ok(defaultChars().length === 1 && defaultChars()[0] === starter, '11.6.2: defaultChars = starter only');
  ok(isCharUnlocked([], starter) && !isCharUnlocked([], 'warden'), '11.6.2: starter always unlocked, warden not by default');
  ok(isCharUnlocked(['ranger'], 'ranger') && !isCharUnlocked(['ranger'], 'swash'), '11.6.2: unlocked list gates non-starters');
  ok(!isCharUnlocked(['ghost'], 'ghost'), '11.6.2: ghost is not a buyable select char');
  let r = buyChar(['mage'], 9999, 'warden');
  ok(r.ok && r.chars.includes('warden') && r.shards === 9999 - CFG.characters.warden.cost, '11.6.2: buyChar spends the D58 cost');
  r = buyChar(['mage'], 1499, 'ranger');
  ok(!r.ok && r.shards === 1499 && !r.chars.includes('ranger'), '11.6.2: buyChar below cost no-ops');
  r = buyChar(['mage', 'warden'], 9999, 'warden');
  ok(!r.ok && r.shards === 9999, '11.6.2: buying an unlocked char no-ops (no double spend)');
  r = buyChar(['mage'], 9999, 'nope');
  ok(!r.ok && r.shards === 9999, '11.6.2: buyChar unknown key no-ops');
  r = buyChar(['mage'], 9999, starter);
  ok(!r.ok && r.shards === 9999, '11.6.2: buying the starter no-ops');

  const KEY = 'qsurv.test.chars';
  ok(isCharUnlocked(loadChars(KEY), starter) && loadChars(KEY).length === 1, '11.6.2: loadChars fresh LS → starter only');
  saveChars(KEY, ['mage', 'ranger', 'bogus']);
  const lc = loadChars(KEY);
  ok(lc.length === 2 && lc.includes('ranger') && !lc.includes('bogus') && lc.includes('mage'),
    '11.6.2: loadChars filters to valid keys + keeps the starter');
  saveChars(KEY, 'corrupt{');
  ok(loadChars(KEY).length === 1 && loadChars(KEY)[0] === starter, '11.6.2: loadChars corrupt JSON → default');

  const CKEY = 'qsurv.test.char';
  ok(loadSelectedChar(CKEY) === starter, '11.6.2: loadSelectedChar fresh LS → starter');
  saveSelectedChar(CKEY, 'swash');
  ok(loadSelectedChar(CKEY) === 'swash', '11.6.2: loadSelectedChar round-trips a valid char');
  saveSelectedChar(CKEY, 'ghost');
  ok(loadSelectedChar(CKEY) === 'swash', '11.6.2: saveSelectedChar rejects ghost (co-op-only)');
  saveSelectedChar(CKEY, 'nope');
  ok(loadSelectedChar(CKEY) === 'swash', '11.6.2: saveSelectedChar rejects unknown keys');
  delete globalThis.localStorage;
}

// --- 11.6.3 ghost fallback: all-starter detection + unique 2-offer allocation (D59/D62) ---
{
  const starter = CFG.characters.order[0];
  ok(sanitizeChars(['ranger', 'mage', 'ghost', 'nope']).join() === 'mage,ranger',
    '11.6.3: sanitizeChars keeps playable keys, drops ghost/unknown, keeps the starter');
  ok(sanitizeChars(null).join() === starter && sanitizeChars(['swash']).join() === 'mage,swash',
    '11.6.3: sanitizeChars null/missing-starter → starter present (fresh seat)');

  const rosterOf = (perSeat) => perSeat.map((c) => ({ id: 'x', seat: 0, profile: { chars: c } }));
  ok(allStarterLobby(rosterOf([[starter], [starter]])), '11.6.3: 2P all-starter lobby → ghost');
  ok(allStarterLobby(rosterOf([[starter], [starter], [starter], [starter]])), '11.6.3: 4P all-starter lobby → ghost');
  ok(allStarterLobby([null, { profile: {} }]), '11.6.3: legacy profiles (no chars) normalize to starter → ghost');
  ok(!allStarterLobby([starter]), '11.6.3: solo (1 seat) never ghosts');
  ok(!allStarterLobby(null) && !allStarterLobby([]), '11.6.3: null/empty roster → false');
  ok(!allStarterLobby(rosterOf([[starter], ['mage', 'ranger']])),
    '11.6.3: any seat with a non-starter unlocked → no ghost');
  ok(!allStarterLobby(rosterOf([['mage', 'warden'], [starter]])), '11.6.3: symmetric — any seat breaks it');

  ok(ghostColor(0) === CFG.ghostColors[0] && ghostColor(3) === CFG.ghostColors[3]
    && ghostColor(4) === CFG.ghostColors[0] && ghostColor(-1) === CFG.ghostColors[0],
    '11.6.3: ghostColor seat 0→3 = the 4 tints, wraps (D62)');

  const nRoster = Object.keys(CFG.weapons).length;
  const mkDeal = (n, seed) => allocateGhostOffers(n, mulberry32(seed));
  for (const n of [1, 2, 3]) {
    const d = mkDeal(n, 1234);
    ok(d.length === n, `11.6.3: allocateGhostOffers(${n}) → n pairs`);
    ok(d.every((pair) => pair.length === 2 && new Set(pair).size === 2 && pair.every((k) => CFG.weapons[k])),
      `11.6.3: ${n}P — 2 valid, unique weapons per player`);
    ok(new Set(d.flat()).size === d.flat().length, `11.6.3: ${n}P — never duplicated across players`);
    ok(JSON.stringify(mkDeal(n, 1234)) === JSON.stringify(d), `11.6.3: ${n}P — seeded determinism`);
  }
  const d4 = mkDeal(4, 99);
  ok(d4.length === 4 && d4[0].length === 2 && d4[1].length === 2 && d4[2].length === 2 && d4[3].length === 1,
    `11.6.3: 4P × 2 = 8 > roster ${nRoster} → 2/2/2/1 (last seat gets the remainder)`);
  ok(new Set(d4.flat()).size === d4.flat().length, '11.6.3: 4P — still never duplicated across players');
  ok(JSON.stringify(mkDeal(4, 100)) !== JSON.stringify(mkDeal(4, 99)), '11.6.3: seed varies the deal');

  // Ghost routing through cardOffers (D59): the pair replaces the offer pool,
  // already-held pair weapons are filtered, and applyCard clears the pair.
  const empty = { weapons: {}, passives: {}, synergies: {} };
  const pair = ['wand', 'bombs'];
  const g = cardOffers(empty.weapons, empty.passives, empty.synergies, mulberry32(7), 5, null, pair);
  ok(g.length === 2 && g.every((c) => c.kind === 'weapon' && c.level === 1) && g[0].key === 'wand' && g[1].key === 'bombs',
    '11.6.3: ghost first level-up offers exactly the assigned pair');
  const g2 = cardOffers(empty.weapons, empty.passives, empty.synergies, mulberry32(7), 5, null, pair.slice(1));
  ok(g2.length === 1 && g2[0].key === 'bombs', '11.6.3: held pair weapon filtered (second draw = remainder only)');
  applyCard(empty, g[0]);
  ok(empty._ghostOffers === null && empty.weapons.wand === 1, '11.6.3: applying a level-1 weapon clears _ghostOffers');
  const g3 = cardOffers({ wand: 1 }, {}, {}, mulberry32(7), 5, null, null);
  ok(g3.length === 3 && g3.every((c) => !(c.kind === 'weapon' && c.key === 'wand') || c.level === 2),
    '11.6.3: pair cleared → normal offer pool resumes');
  const exSet = new Set(['garlic']);
  const g4 = cardOffers({}, {}, {}, mulberry32(7), 5, exSet, ['garlic', 'axe']);
  ok(g4.length === 2 && g4[0].key === 'garlic' && g4[1].key === 'axe',
    "11.6.3: the pair is the seat's own contract — supersedes the 11.5 exclusion pool (allocation keeps pairs disjoint)");
}

// --- 11.6.4 per-seat char assignment: D53 profile charKey + D56 uniqueness ---
{
  const starter = CFG.characters.order[0];
  const seat = (chars, sel) => ({ id: 'x', seat: 0, profile: { chars, charKey: sel } });

  ok(selChar({ chars: ['mage', 'ranger'], charKey: 'ranger' }) === 'ranger', '11.6.4: selChar keeps a playable selected char');
  ok(selChar({ chars: ['mage', 'ranger'], charKey: 'warden' }) === starter
    && selChar({ chars: ['mage', 'ranger'], charKey: 'ghost' }) === starter
    && selChar(null) === starter && selChar({}) === starter,
    '11.6.4: selChar — locked/ghost/missing sel → starter (no free unlocks)');

  ok(joinProfile({ upgrades: {} }, ['mage', 'ranger'], 'ranger').charKey === 'ranger',
    '11.6.4: joinProfile carries the selected char (D53)');
  ok(joinProfile({ upgrades: {} }, ['mage', 'ranger'], 'warden').charKey === starter
    && joinProfile({ upgrades: {} }, ['mage', 'ranger']).charKey === starter,
    '11.6.4: joinProfile — locked sel / legacy 2-arg call → starter fallback');

  const r1 = assignChars([seat([starter], starter), seat([starter], starter)]);
  ok(r1[0] === starter && r1[1] === 'ghost',
    '11.6.4: contested pick — earlier seat keeps, exhausted displaced seat ghosts (D56/D59)');
  const r2 = assignChars([seat(['mage', 'ranger'], starter), seat([starter, 'ranger'], starter)]);
  ok(r2[0] === starter && r2[1] === 'ranger', '11.6.4: displaced seat falls back to its next unlocked char');
  const r3 = assignChars([seat(['mage', 'warden'], 'warden'), seat(['mage', 'ranger'], 'ranger'), seat([starter], starter), seat(['mage', 'warden', 'ranger'], 'swash')]);
  ok(r3.join() === 'warden,ranger,mage,ghost',
    '11.6.4: 4P — seat order wins every contested pick; fully-exhausted seat ghosts');
  const r4 = assignChars([seat(['mage', 'swash'], null), seat(['mage', 'swash'], starter)]);
  ok(r4[0] === starter && r4[1] === 'swash', '11.6.4: missing sel → starter; displaced seat keeps its unlocked swash');
  ok(assignChars(null).length === 0 && assignChars([null])[0] === starter,
    '11.6.4: null roster / legacy profileless seat normalize (starter)');

  ok(resolveChars([seat([starter], starter), seat([starter], starter)]).join() === 'ghost,ghost',
    '11.6.4: all-starter lobby → EVERY seat ghosts (D59 wins over the unique assignment)');
  ok(resolveChars([seat(['mage', 'ranger'], starter), seat(['mage', 'warden'], 'warden')]).join() === 'mage,warden',
    '11.6.4: mixed lobby → the D56 assignment stands (no D59)');
}

// --- 11.8 per-char UI theming: charAccent (D62 channel) + roster accent data ---
{
  const acc = CFG.characters;
  ok(acc.order.every((k) => /^#[0-9a-f]{6}$/.test(acc[k].accent)),
    '11.8: every playable character has a hex accent');
  ok(new Set(acc.order.map((k) => acc[k].accent)).size === acc.order.length,
    '11.8: roster accents are pairwise distinct (quick visual tracking)');
  ok(acc.ghost.accent === null, '11.8: ghost accent = null (per-seat tint instead, D62)');
  ok(charAccent('mage') === acc.mage.accent && charAccent('warden', 3) === acc.warden.accent
    && charAccent('ranger') === acc.ranger.accent && charAccent('swash') === acc.swash.accent,
    '11.8: roster char → its CFG accent (seat irrelevant for roster chars)');
  ok(CFG.ghostColors.every((c, s) => charAccent('ghost', s) === c),
    '11.8: ghost → the per-seat Pac-Man tint (D62)');
  ok(charAccent('ghost', 7) === CFG.ghostColors[7 % CFG.ghostColors.length],
    '11.8: ghost tint wraps past seat 3');
  ok(charAccent('nope') === acc[acc.order[0]].accent && charAccent(null) === acc[acc.order[0]].accent,
    '11.8: unknown/missing key → starter accent fallback');
}

// --- 16.2 projectile spawn origin: shared mid-torso offset (config scalar) ---
{
  const f = CFG.combat.spawnOriginFrac;
  ok(Number.isFinite(f) && f > 0.4 && f < 0.7, '16.2: spawnOriginFrac in the mid-torso band (0.4–0.7)');
  const pA = new Player({ w: 56, h: 64 });
  pA.reset(100, 200);
  ok(pA._spawnY() === 200 - 64 * f, '16.2: _spawnY = feet − frac × sprite height (mage 64)');
  ok(pA._spawnY() < 200, '16.2: spawn origin is above the feet');
  const pB = new Player({ w: 58, h: 66 });
  pB.reset(100, 200);
  ok(pB._spawnY() === 200 - 66 * f && pB._spawnY() < pA._spawnY(), '16.2: taller sprite (warden 66) → higher origin');
}

console.log(`test-logic: ${pass} checks passed, ${fails.length} failed`);
for (const f of fails) console.error(`  FAIL ${f}`);
process.exit(fails.length ? 1 : 0);
