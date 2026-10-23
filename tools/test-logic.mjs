#!/usr/bin/env node
// Pure-logic assertions (Node, no browser). Run: node tools/test-logic.mjs
import { mulberry32, hash2, approach, clamp, normAngle, TAU } from '../js/utils/math.js';
import { CFG } from '../js/config.js';
import { generateWorld } from '../js/world/generate.js';
import { LEVELS, LEVEL_ORDER, getLevel } from '../js/world/levels.js';
import { HashGrid } from '../js/utils/grid.js';
import { aliveCap, spawnInterval, batchSize, pickType, spawnPoint, bossTimes } from '../js/entities/spawner.js';
import { Enemies } from '../js/entities/enemies.js';
import { Player, cardOffers, applyCard, recomputeStats, cardEffectText, charDef, skipXp } from '../js/entities/player.js';
import { Combat } from '../js/entities/combat.js';
import { Pickups, escapeFromSpots } from '../js/entities/pickups.js';
import { Particles } from '../js/entities/particles.js';
import { GEM_PAL, HEART_PAL } from '../js/art/items.js';
import { Lighting } from '../js/systems/lighting.js';
import { Camera } from '../js/systems/camera.js';
import { shadowSprite } from '../js/art/base.js';
import { SNAP_V, SNAP_PLEN, WEAPON_KEYS, PASSIVE_KEYS, SYNERGY_KEYS, ENEMY_KEYS, E_FLAG_FLASH, E_FLAG_BURN, E_FLAG_BLIGHT, E_FLAG_BOSS, E_FLAG_FLIP, playerSnap, applyPlayerSnap, enemySnap, applyEnemySnap, pickupSnaps, applyPickupSnaps, stateMsg, unpackState } from '../js/net/sync.js';
import { loadMeta, shardsFor, upgradeCost, applyMeta, loadWins, saveWins, recordWin, isUnlocked, defaultWins, loadSelectedLevel, saveSelectedLevel, defaultZoom, loadZoom, saveZoom, defaultChars, loadChars, saveChars, isCharUnlocked, buyChar, loadSelectedChar, saveSelectedChar, loadDurations, durationFor, saveDurations, actionCost, buyAction } from '../js/core/meta.js';
import { rankScore, loadScores, saveScores, scoreKeyFor, isNewOffer, cardTitleFor } from '../js/ui/screens.js';
import { loadoutRows } from '../js/ui/hud.js';
import { MUSIC, FLAVOR, initMusic } from '../js/audio/music.js';
import { makeBus } from '../js/utils/bus.js';
import { MSG, pack, unpack, profileFromMeta, joinProfile, sanitizeChars, allStarterLobby, ghostColor, charAccent, allocateGhostOffers, createRoom, joinRoom, leaveRoom, closeRoom, coopScale, leashClamp, weaponCap, bossCount, selChar, assignChars, resolveChars, sanitizeShards } from '../js/net/coop.js';
import { encodeFrame, consumeFrames, wsAcceptKey } from './serve.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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
    return c.landmark || Math.hypot(c.x - ps.x, c.y - ps.y) > 70 + rr; // landmarks always solid even near spawn (D92)
  }), 'generateWorld: spawn clearance 70 + collider radius (landmarks exempt, D92)');
  ok(w.colliders.some((c) => c.landmark), 'generateWorld: m01 well landmark retained (D92 — was always stripped before)');
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
    if (b.tick < a.tick || b.dot < a.dot || b.range !== a.range || b.fuel < a.fuel || b.recharge > a.recharge) flaOk = false;
  }
  ok(flaOk, 'weapons.flame: tick↑ dot↑ range FLAT fuel↑ recharge↓');
  let bowOk = true;
  for (let i = 1; i < 5; i++) {
    const a = L('bow')[i - 1], b = L('bow')[i];
    if (b.dmg < a.dmg || b.rate > a.rate) bowOk = false;
  }
  ok(bowOk, 'weapons.bow: dmg non-decreasing, rate non-increasing');
}

// --- Passives / character starting weapons / boss / spawner weights ---
{
  let pasOk = true;
  for (const p of Object.values(CFG.passives)) if (!(p.max > 0 && (p.val > 0 || (p.levels && p.levels.length > 0)))) pasOk = false;
  ok(pasOk, 'passives: max positive + scalar val OR a levels table (P21 D95 items are table-based)');
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
  const legalKeys = new Set(['hp', 'dmg', 'regen', 'shield', 'skates', 'coffee', 'blight', 'tempest']);
  ok(maxed.length === 3 && maxed.every((c) => c.kind === 'passive' || c.kind === 'synergy')
    && maxed.every((c) => legalKeys.has(c.key)), 'cardOffers: exhausted pool → remaining passives + gated synergies only');
  // Phase 9 (11.5: cap 4→5; 12.6 rebaseline): 5 maxed weapons push ownedW to the cap with
  // no garlic (blight stays gated); all passives maxed → the pool is exactly the synergies whose
  // own sources are in hand {inferno, tempest, phoenix, heartMagnet}. cardOffers caps the draw
  // at 3 cards (unchanged), so assert 3 DISTINCT members of that exact set.
  const trio = cardOffers({ pistols: 5, flame: 5, wand: 5, axe: 5, blades: 5 }, { speed: 3, hp: 3, dmg: 5, magnet: 3, regen: 3, shield: 5, skates: 5, coffee: 5 }, {}, mulberry32(4));
  const trioSet = new Set(['inferno', 'tempest', 'phoenix', 'heartMagnet']);
  ok(trio.length === 3 && trio.every((c) => c.kind === 'synergy' && trioSet.has(c.key))
    && new Set(trio.map((c) => c.key)).size === 3, 'cardOffers: gated pool {inferno, tempest, phoenix, heartMagnet} → 3 distinct drawn (12.6)');
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
  // pairs; passives maxed. 12.6 rebaseline: w4 = {wand,axe,pistols,bombs} maxed → the hp+magnet
  // passive pair is complete, so heartMagnet joins phoenix in the gated-synergy pool. Cap 5 pool:
  // {garlic, blades, flame, bow, snowball, ringLightning} new-weapon L1 + {phoenix, heartMagnet}.
  // Cap 4 (2P): new-weapon slots closed → pool = {phoenix, heartMagnet} only.
  const w4 = { wand: 5, axe: 5, pistols: 5, bombs: 5 };
  const NEW_W = Object.keys(CFG.weapons).filter((k) => !(k in w4)); // P21: every unowned weapon is a legal L1 offer
  const GATED_S = ['phoenix', 'heartMagnet'];
  for (let seed = 1; seed <= 3; seed++) {
    const draw = cardOffers(w4, allPassMax, {}, mulberry32(seed), 5);
    ok(draw.length === 3 && draw.every((c) => (c.kind === 'weapon' && c.level === 1 && NEW_W.includes(c.key))
        || (c.kind === 'synergy' && GATED_S.includes(c.key))), `11.5.2: cap 5 → new-weapon slots open (seed ${seed})`);
  }
  const cap4 = cardOffers(w4, allPassMax, {}, mulberry32(1), 4);
  ok(cap4.length === 2 && cap4.every((c) => c.kind === 'synergy' && GATED_S.includes(c.key)),
    '11.5.2: cap 4 (2P) → no new-weapon cards (pool = {phoenix, heartMagnet})');
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
  // Control: the same pool with no owner offers blight. Under the uniform draw (D81) the
  // eligible-synergy pool exceeds 3 slots so a single seed need not surface every card;
  // offerability = it appears in SOME draw across seeds.
  let blightSeen = false;
  for (let seed = 1; seed <= 6 && !blightSeen; seed++) {
    if (cardOffers(blightMax, allPassMax, {}, mulberry32(seed), 5)
      .some((c) => c.kind === 'synergy' && c.key === 'blight')) blightSeen = true;
  }
  ok(blightSeen, '11.6b: control — unowned blight IS offerable');
  // Excluding an (unoffered) synergy key must not perturb the weapon draw (rng parity).
  const base = { wand: 3, garlic: 1 };
  const a = cardOffers(base, {}, {}, mulberry32(11), 5);
  const b = cardOffers(base, {}, {}, mulberry32(11), 5, new Set(['tempest']));
  ok(JSON.stringify(a) === JSON.stringify(b),
    '11.6b: excluding a synergy does not shift the weapon draw (same rng)');
}

// --- Phase 9: synergy table shape + gating (12.6 rebaseline: the five NEW synergies are
// 5-level cards per the Phase 12 rule; the legacy five (incl. phoenix) stay single-level) ---
{
  const LEGACY_S = new Set(['blight', 'tempest', 'inferno', 'napalm', 'phoenix']);
  for (const [k, S] of Object.entries(CFG.synergies)) {
    const wantLv = LEGACY_S.has(k) ? 1 : 5;
    ok(S.levels.length === wantLv && S.requires.length >= 2
      && S.requires.every((r) => CFG.weapons[r] || CFG.passives[r]), `synergies.${k}: ${wantLv} level(s), valid requires`);
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
  for (const k of Object.keys(CFG.synergies)) allOwned[k] = CFG.synergies[k].levels.length; // 12.6: max every synergy at its OWN level count
  ok(cardOffers(allW, allP, allOwned, mulberry32(9)).length === 0,
    'cardOffers: all owned → empty pool (first-class case)');
}

// --- Phase 15.4 (D81): uniform offer draw — every card equal odds, scales with roster ---
{
  // Equal-odds guarantee: sample the exported path with a controlled synthetic state (own
  // nothing → pool = all weapons at L1 + passives). Every weapon's offer rate must sit within
  // tight tolerance of the mean — no weapon favored, and it holds regardless of roster size.
  const WEAPONS = Object.keys(CFG.weapons);
  const seen = Object.fromEntries(WEAPONS.map((k) => [k, 0]));
  const M = 4000;
  const r2 = mulberry32(99);
  for (let i = 0; i < M; i++) {
    const d = cardOffers({}, {}, {}, r2, CFG.run.maxWeapons);
    for (const c of d) if (c.kind === 'weapon' && c.level === 1) seen[c.key]++;
  }
  const rates = WEAPONS.map((k) => seen[k] / M);
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  const maxDev = Math.max(...rates.map((r) => Math.abs(r - mean)));
  // P21 rebaseline: expected equal-odds rate = 3 cards ÷ (all weapons + all passives) pool.
  const expMean = 3 / (WEAPONS.length + Object.keys(CFG.passives).length);
  ok(Math.abs(mean - expMean) < 0.02 && maxDev < 0.05,
    `15.4: uniform draw — weapon offer rates equal (mean ${mean.toFixed(3)} vs expected ${expMean.toFixed(3)}, max dev ${maxDev.toFixed(3)})`);
  // Determinism: same seed → identical draw.
  const one = cardOffers({}, {}, {}, mulberry32(7), 5);
  const two = cardOffers({}, {}, {}, mulberry32(7), 5);
  ok(JSON.stringify(one) === JSON.stringify(two), '15.4: seeded draw is deterministic');
}

// --- Phase 10.2: exact-effect card text (pure, player.js) ---
{
  // 30.4/30.5 rebaseline: cards now open with the offered level's stats block (range ·
  // cadence · damage); per-level deltas follow. Values pinned here are literals because
  // this block pins the FORMAT — the 30.4 battery below pins the CFG-derived VALUES.
  ok(cardEffectText('weapon', 'wand', 1) === 'range 560 px · every 0.64 s · 12 dmg · no pierce',
    'cardEffectText: wand L1 = stats block + remaining fields');
  ok(cardEffectText('weapon', 'wand', 2) === 'range 560 px · every 0.54 s · 16 dmg · rate 0.64→0.54 s · dmg 12→16 · pierce 0→1',
    'cardEffectText: wand L2 = stats block + changed-field deltas (count 1→1 skipped)');
  ok(cardEffectText('passive', 'hp', 1) === '+25 max HP + heal 25 now → total +25 max HP',
    'cardEffectText: hp passive L1 increment + total');
  ok(cardEffectText('passive', 'speed', 2) === '+10% movement speed → total +20%',
    'cardEffectText: speed passive L2 float-safe pct (0.1×2 → 20%)');
  ok(cardEffectText('synergy', 'blight', 1) === 'Moonbolts apply Blight — 14 dmg/s for 3.0 s',
    'cardEffectText: blight synergy states numbers');
  // 23.3 rebaseline: phoenix card text = over-heal (old "Heal 10 HP every 8 kills" deleted)
  ok(cardEffectText('synergy', 'phoenix', 1) === 'Hearts at full health grant over-health up to 200% max HP — diminishes 1%/s',
    '23.3: phoenix card text = over-heal effect');
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

// --- 30.4/30.5 (user mandate): every weapon card states the offered level's exact
// range + cadence + damage; every expected fragment is derived FROM CFG (never a
// re-hardcoded gameplay number), for ALL 19 weapons at every level, plus the 3 items. ---
{
  const C = CFG.combat;
  // mirrors fmtS in player.js (formatting, not a gameplay value)
  const f2 = (v) => { let s = v.toFixed(2); if (s.endsWith('0')) s = s.slice(0, -1); return s; };
  const pc = (f) => `${Math.round(f * 1000) / 10}%`;
  const REQ = {
    wand: [() => `range ${C.wandRange} px`, (d, s) => `every ${f2(s.rate)} s`, (d, s) => `${s.dmg} dmg`],
    garlic: [(d, s) => `aura radius ${s.r} px`, () => `ticks every ${f2(C.garlicTick)} s`, (d, s) => `${s.dmg} dmg per tick`],
    axe: [() => `boomerang throw ${Math.round(C.axeSpeed * C.axeLife * (1 - C.axeTurnFrac))} px`, (d, s) => `every ${f2(s.cd)} s`, (d, s) => `${s.dmg} dmg per hit`],
    blades: [(d, s) => `orbit radius ${s.rad} px`, () => `shears every ${f2(C.orbitTick)} s`, (d, s) => `${s.dmg} dmg per hit`],
    pistols: [() => `range ${C.pistolRange} px`, (d, s) => `every ${f2(s.rate)} s`, (d, s) => `${s.dmg} dmg × 2 rounds`],
    bombs: [() => `throw ${C.bombDist} px, blast radius `, (d, s) => `blast radius ${s.r} px`, (d, s) => `every ${f2(s.cd)} s`, (d, s) => `${s.dmg} dmg per blast`],
    flame: [(d, s) => `stream reach ${s.range} px`, (d, s) => `fuel ${f2(s.fuel)} s, recharge ${f2(s.recharge)} s`, (d, s) => `${s.tick} dmg per contact`],
    snowball: [(d, s) => `range ${C.wandRange} px, blast radius ${s.r} px`, (d, s) => `every ${f2(s.cd)} s`, (d, s) => `${s.dmg} dmg per burst`],
    ringLightning: [() => `range ${C.wandRange} px`, () => `every ${C.ringCd} s`, (d, s) => `${s.dmg} dmg per bolt`],
    bow: [() => `arrow range ${Math.round(C.arrowSpeed * C.arrowLife)} px`, (d, s) => `every ${f2(s.rate)} s`, (d, s) => `${s.dmg} dmg per arrow`],
    cannon: [(d, s) => `range ${C.cannonRange} px, blast radius ${s.blastR} px`, (d, s) => `every ${f2(s.cd)} s`, (d, s) => `${s.dmg} dmg per shell`],
    laser: [(d, s) => `beam length ${s.len} px`, (d, s) => `sweeps ${f2(s.dur)} s`, (d, s) => `${s.dps} dmg/s`],
    wolfpack: [() => `pounce range ${C.companionLeash} px`, () => `pounces every ${f2(C.companionPounceCd)} s`, (d, s) => `pounce ${s.dmg} dmg`],
    boulder: [() => `range ${C.wandRange} px`, (d, s) => `every ${f2(s.cd)} s`, (d, s) => `${s.dmg} dmg first hit`],
    webs: [(d, s) => `range ${C.wandRange} px, burst radius ${s.r} px`, (d, s) => `every ${f2(s.cd)} s`, (d, s) => `${s.dmg} dmg per burst`],
    gatling: [() => `bullet range ${Math.round(C.bulletSpeed * C.bulletLife)} px`, (d, s) => `one shot every ${f2(s.cd)} s`, (d) => `mag ${d.burst} → reload ${f2(d.reload)} s`, (d, s) => `${s.dmg} dmg per round`],
    bat: [() => `swing reach ${C.batRange} px`, (d, s) => `every ${f2(s.cd)} s`, (d, s) => `${s.dmg} dmg per swing`],
    tongue: [() => `tongue reach ${C.tongueRange} px`, (d, s) => `every ${f2(s.cd)} s`, (d, s) => `${s.dmg} dmg per bite`],
    ball: [() => `dash range ${C.ballSearchR} px`, (d) => `every ${f2(d.cd)} s`, (d, s) => `${s.dmg} dmg first hit`],
  };
  for (const key of Object.keys(CFG.weapons)) {
    ok(!!REQ[key], `30.4 battery: ${key} has an expected-stats table`);
    const def = CFG.weapons[key];
    for (let L = 1; L <= def.levels.length; L++) {
      const txt = cardEffectText('weapon', key, L);
      for (const frag of REQ[key])
        ok(txt.includes(frag(def, def.levels[L - 1])), `30.4/30.5: ${key} L${L} card states its CFG-derived stat (${txt})`);
    }
  }
  for (let L = 1; L <= CFG.passives.shield.max; L++) {
    const s = CFG.passives.shield.levels[L - 1];
    const t = cardEffectText('passive', 'shield', L);
    ok(t.includes(`radius ${s.r} px`) && t.includes(`every ${f2(s.window)} s`) && t.includes(`Reflects ${C.shieldCharges} enemy projectiles`),
      `30.5: Mirror Shield L${L} states radius/charges/window (${t})`);
  }
  for (let L = 1; L <= CFG.passives.skates.max; L++) {
    const s = CFG.passives.skates.levels[L - 1];
    const t = cardEffectText('passive', 'skates', L);
    ok(t.includes(`+${pc(s.spd)} movement speed`) && t.includes(`glide friction ×${s.glideK}`) && t.includes(`(≥${C.skateSlideMin} px/s) deal ${s.slideDmg} to both`),
      `30.5: Ice Skates L${L} states speed/glide/slide (${t})`);
  }
  for (let L = 1; L <= CFG.passives.coffee.max; L++) {
    const t = cardEffectText('passive', 'coffee', L);
    ok(t.includes(`−${pc(CFG.passives.coffee.val)} weapon cooldowns`) && t.includes(`total −${pc(CFG.passives.coffee.val * L)}`),
      `30.5: Coffee L${L} states the per-level cut + the offered level's total (${t})`);
  }
}

// --- 12.2: Bow & Arrow — fast single-target arrow (Combat, Node-safe) ---
{
  const C = CFG.combat;
  ok(CFG.weapons.bow.levels.length === 5, '12.2: bow has a 5-level table');
  // 30.4/30.5 rebaseline: bow card now opens with its stats block (arrow range =
  // arrowSpeed×arrowLife, draw cadence, per-arrow damage); deltas follow.
  ok(cardEffectText('weapon', 'bow', 1) === 'arrow range 896 px · every 0.68 s, draw 0.25 s · 16 dmg per arrow', '30.4: bow L1 stats-block line');
  // fmtS pads to two decimals then strips ONE trailing zero → 0.6 renders "0.6" (never "0.60").
  ok(cardEffectText('weapon', 'bow', 2) === 'arrow range 896 px · every 0.6 s, draw 0.25 s · 21 dmg per arrow · rate 0.68→0.6 s · dmg 16→21', `30.4: bow L2 stats block + delta line (charge flat — never a delta) (${cardEffectText('weapon', 'bow', 2)})`);
  const c = new Combat();
  const owner = { x: 0, y: 0, vx: 0, vy: 0 };
  const mkEnemy = (x) => ({ x, y: 100, r: 12, hp: 100, maxHp: 100, flash: 0, vx: 0, vy: 0, dead: false });
  const e = mkEnemy(160);
  const e2 = mkEnemy(176); // beyond e on the flight path — reachable only if the arrow PIERCED e (next step, dist 12 < 16)
  c.fireArrow(100, 100, 0, 16, owner);
  ok(c.arrows.length === 1, '12.2: fireArrow pushes one arrow');
  const a0 = c.arrows[0];
  ok(a0.x === 100 && a0.y === 100 && a0.vx === C.arrowSpeed && a0.vy === 0 && a0.dmg === 16 && a0.owner === owner,
    '12.2: arrow spawns at the origin at arrowSpeed along the aim, dmg/owner carried');
  const grid = { grid: { near: () => [e, e2] }, list: [e, e2] };
  let steps = 0;
  while (c.arrows.length && steps < 30) { c.update(1 / 60, [], grid); steps++; }
  ok(steps < 30 && c.arrows.length === 0, '12.2: the arrow is consumed on its first hit');
  ok(e.hp === 84 && e.vx === C.arrowKb && e.vy === 0, '12.2: hit applies dmg + knockback along the flight direction');
  ok(e2.hp === 100 && e2.vx === 0, '12.2: no pierce — the enemy beyond e is untouched (Heart-Piercer 12.6 adds pierce)');
  // empty flight → life expiry (no stray arrows)
  c.fireArrow(100, 100, 0, 16, owner);
  const empty = { grid: { near: () => [] }, list: [] };
  for (let i = 0; i < 90 && c.arrows.length; i++) c.update(1 / 60, [], empty);
  ok(c.arrows.length === 0, '12.2: unhit arrow expires by life');
  // Pitfall invariant (source-level, canvas-free): every CFG icon name must exist in buildIcons()
  // — the card DOM draws icons[def.icon] unguarded (browser crash class).
  const src = readFileSync(new URL('../js/art/items.js', import.meta.url), 'utf8');
  const iconNames = new Set([
    ...Object.values(CFG.weapons).map((w) => w.icon),
    ...Object.values(CFG.synergies).map((s) => s.icon),
    ...Object.values(CFG.passives).map((p) => p.icon),
  ]);
  ok([...iconNames].every((n) => new RegExp(`icons\\.${n}\\s*=`).test(src)),
    '12.2: every CFG icon name (incl. bow) exists in buildIcons()');
}

// --- 29.3: level-up cards present un-owned offers as NEW (no "· Lv" label, no pips) while
// owned upgrades keep their level display. Pure helpers exported by js/ui/screens.js. ---
{
  const defPassive = { name: 'Lodestone', max: 3 };
  const defWeapon = { name: 'Moonbolt Wand', max: 5 };
  const defSynergy = { name: 'Blight Hex' };
  // Un-owned passive offer (the reported defect): name only, no level label, no pips.
  const p = cardTitleFor('passive', defPassive, 1, false);
  ok(p.title === 'Lodestone' && !p.title.includes('Lv'), '29.3: un-owned passive shows no level label');
  ok(p.pips === 0, '29.3: un-owned passive shows no pips');
  // Owned passive upgrade keeps the "· Lv cur/max" label + its pips.
  const pu = cardTitleFor('passive', defPassive, 2, true);
  ok(pu.title === 'Lodestone · Lv 2/3' && pu.pips === 3, '29.3: owned passive keeps its level display');
  // Un-owned weapon offer → NEW; owned weapon keeps "· Lv n" + pips.
  const wNew = cardTitleFor('weapon', defWeapon, 1, false);
  ok(wNew.title === 'Moonbolt Wand' && wNew.pips === 0, '29.3: un-owned weapon shows NEW, no level');
  const wOwn = cardTitleFor('weapon', defWeapon, 3, true);
  ok(wOwn.title === 'Moonbolt Wand · Lv 3' && wOwn.pips === 5, '29.3: owned weapon keeps level + pips');
  // Synergy never shows a level regardless of the owned flag.
  const sy = cardTitleFor('synergy', defSynergy, 1, true);
  ok(sy.title === 'Blight Hex' && sy.pips === 0, '29.3: synergy shows no level label/pips');
  // isNewOffer is the single source for the .new class: un-owned = new, owned = not.
  const pl = { weapons: { wand: 1 }, passives: {}, synergies: {} };
  ok(isNewOffer({ kind: 'passive', key: 'magnet' }, pl) === true, '29.3: un-owned passive = new offer');
  ok(isNewOffer({ kind: 'weapon', key: 'wand' }, pl) === false, '29.3: owned weapon = not a new offer');
  ok(isNewOffer({ kind: 'weapon', key: 'garlic' }, pl) === true, '29.3: un-owned weapon = new offer');
  ok(isNewOffer({ kind: 'synergy', key: 'blight' }, pl) === true, '29.3: synergy = new offer');
  const pl2 = { weapons: {}, passives: { magnet: 1 }, synergies: {} };
  ok(isNewOffer({ kind: 'passive', key: 'magnet' }, pl2) === false, '29.3: owned passive = not a new offer');
  // cardTitleFor agrees with isNewOffer: a real un-owned offer renders as NEW (name only).
  const offer = { kind: 'passive', key: 'magnet', level: 1 };
  ok(cardTitleFor('passive', CFG.passives.magnet, offer.level, !isNewOffer(offer, pl)).title === CFG.passives.magnet.name,
    '29.3: un-owned real passive offer renders as NEW (name only)');
}

// --- 29.5: the HUD equipment area splits weapons into their own row and items/passives into a
// separate row. loadoutRows (exported by js/ui/hud.js) is the pure grouping the row builder
// lays out as two visually separated bands. The flat render order stays weapons → synergies →
// passives so the existing boot E2E that reads a row's children still matches. ---
{
  const wKey = Object.keys(CFG.weapons)[0];
  const wKey2 = Object.keys(CFG.weapons)[1];
  const pKey = Object.keys(CFG.passives)[0];
  const sKey = Object.keys(CFG.synergies)[0];
  const pl = { weapons: { [wKey2]: 1, [wKey]: 3 }, synergies: { [sKey]: 2 }, passives: { [pKey]: 1 } };
  const [weapons, items] = loadoutRows(pl);
  ok(weapons.length === 2 && weapons.every((e) => e.kind === 'weapon'), '29.5: weapon row holds only weapon entries');
  ok(items.length === 2 && items.every((e) => e.kind !== 'weapon'), '29.5: item/passive row holds only non-weapons');
  ok(items.some((e) => e.kind === 'synergy') && items.some((e) => e.kind === 'passive'),
    '29.5: synergy + passive both land in the item/passive row');
  // Group order follows CFG definition order inside each band (not the insertion order).
  ok(weapons.map((e) => e.key).join(',') === [wKey, wKey2].join(','), '29.5: weapon row keeps CFG order');
  // Flat sequence the DOM appends is unchanged → boot parity.
  ok(weapons.concat(items).map((e) => e.kind).join(',') === 'weapon,weapon,synergy,passive',
    '29.5: flat render order stays weapons → synergies → passives (boot parity)');
  ok(weapons[0].level === 3 && items.every((e) => Number.isInteger(e.level) && e.level > 0),
    '29.5: entries carry the current level for owned chips');
  // An empty group produces an empty band (the row builder skips blank bands — no stray row).
  const [onlyW, noItems] = loadoutRows({ weapons: { [wKey]: 1 }, synergies: {}, passives: {} });
  ok(onlyW.length === 1 && noItems.length === 0, '29.5: no items → empty item band (row builder skips it)');
}

// --- 12.3: Snowball Launcher — lobbed AoE + accumulating slow → freeze (Combat/Enemies, Node-safe) ---
{
  const C = CFG.combat;
  const SB = CFG.weapons.snowball;
  ok(SB.levels.length === 5, '12.3: snowball has a 5-level table');
  // Monotonic growth shape: cd↓ dmg↑ r↑ across all levels (matches the weapon-card contract).
  const L = SB.levels;
  let mono = true;
  for (let i = 1; i < L.length; i++) {
    if (!(L[i].cd < L[i - 1].cd && L[i].dmg > L[i - 1].dmg && L[i].r > L[i - 1].r)) mono = false;
  }
  ok(mono, '12.3: snowball per-level scaling shape cd↓ dmg↑ r↑ holds');
  // Exact-effect card lines (10.2 rule): L1 full-stat, L2 delta.
  const l1 = cardEffectText('weapon', 'snowball', 1);
  ok(l1.includes(`every ${L[0].cd}`) && l1.includes(`${L[0].dmg} dmg`) && l1.includes(`blast radius ${L[0].r}`),
    `12.3: snowball L1 line names cd/dmg/r (${l1})`);
  const l2 = cardEffectText('weapon', 'snowball', 2);
  ok(l2.includes(`${L[0].cd}→${L[1].cd}`) && l2.includes(`dmg ${L[0].dmg}→${L[1].dmg}`) && l2.includes(`radius ${L[0].r}→${L[1].r}`),
    `12.3: snowball L2 delta line shows cd/dmg/r deltas (${l2})`);

  // Flight → burst: the snowball arcs to its target point, then bursts ON impact damaging
  // + knocking back + applying one slow stack to enemies in radius.
  const c = new Combat();
  const owner = { x: 0, y: 0, vx: 0, vy: 0 };
  const mkEnemy = (x) => ({ x, y: 100, r: 12, hp: 100, maxHp: 100, flash: 0, vx: 0, vy: 0, dead: false,
    slowStacks: [], freezeT: 0, shockStacks: [], stunT: 0 });
  const e = mkEnemy(150);      // inside the burst radius at the target point (160)
  const eFar = mkEnemy(400);   // outside every burst — never touched
  const grid = { grid: { range: () => [e, eFar] }, list: [e, eFar] };
  c.fireSnowball(100, 100, 160, 100, 26, 95, owner);
  ok(c.snowballs.length === 1, '12.3: fireSnowball pushes one snowball');
  const sb = c.snowballs[0];
  ok(sb.tx === 160 && sb.ty === 100 && sb.dmg === 26 && sb.radius === 95 && sb.owner === owner,
    '12.3: snowball carries target point, dmg, radius and owner');
  ok(sb.fly > 0, '12.3: flight time derived from distance (no fuse pause)');
  // Step until it lands (> fly seconds); the burst resolves at impact.
  let steps = 0;
  while (c.snowballs.length && steps < 60) { c.update(1 / 60, [], grid); steps++; }
  ok(steps < 60 && c.snowballs.length === 0, '12.3: snowball bursts and is removed at its target');
  ok(e.hp === 74, '12.3: burst applies full damage to an enemy in radius');
  // e sits LEFT of the burst centre (dx = -10), so knockback pushes it further left (-x).
  ok(e.vx < 0 && Math.abs(e.vy) < 1e-9, '12.3: knockback is radial from the burst centre');
  ok(Math.abs(-e.vx - C.snowballKb) < 1e-9, '12.3: full snowballKb magnitude lands on a centred-bearing enemy');
  ok(eFar.hp === 100 && eFar.slowStacks.length === 0, '12.3: enemies outside the burst are untouched');
  ok(e.slowStacks.length === 1, '12.3: one slow stack applied to a hit enemy');

  // A frost-tagged explosion is emitted for the impact visual (draw selects frostImg).
  const frost = c.explosions.find((x) => x.frost);
  ok(!!frost && frost.r === 95, '12.3: burst emits a frost-tagged explosion sized to the damage radius');

  // Slow → freeze pipeline (12.5): slowMaxStacks stacks trigger a brief freeze and consume the stacks.
  const e2 = { x: 0, y: 0, r: 12, hp: 100, maxHp: 100, flash: 0, vx: 0, vy: 0, dead: false,
    slowStacks: [], freezeT: 0, shockStacks: [], stunT: 0 };
  c.applySlow(e2);
  c.applySlow(e2);
  ok(e2.slowStacks.length === 2 && e2.freezeT === 0, '12.3/12.5: two stacks accumulate without freezing');
  c.applySlow(e2); // third → freeze
  ok(e2.slowStacks.length === 0 && e2.freezeT === C.freezeDur,
    '12.3/12.5: the Nth stack freezes (freezeT = freezeDur) and consumes the stacks');

  // Per-stack TTL expiry (independent): a lone stack lapses after statusStackTtl via Enemies._ai.
  const es = new Enemies();
  const one = { x: 0, y: 0, r: 12, hp: 999, maxHp: 999, flash: 0, vx: 0, vy: 0, dead: false,
    slowStacks: [{ t: 0.05 }], freezeT: 0, shockStacks: [], stunT: 0, speed: 10, fly: true };
  es.list.push(one);
  const dummyPlayer = { x: -9999, y: -9999, dead: false }; // far away so the enemy drifts straight
  const worldStub = { collidersNear: () => [] };
  for (let i = 0; i < 6 && one.slowStacks.length; i++) es._ai(one, 1 / 60, [dummyPlayer], worldStub, null);
  ok(one.slowStacks.length === 0, '12.5: an expired slow stack is removed on tick');
}

// --- 12.4: Ring of Chain Lightning — shock stacks → stun + branching chain burst ---
{
  const C = CFG.combat;
  const RL = CFG.weapons.ringLightning;
  ok(RL.levels.length === 5, '12.4: ringLightning has a 5-level table');
  // Scaling shape: dmg↑ jumps↑ (levels increase the chain count — the spec's core growth).
  // The per-level cd column was dead config (ring fires at flat CFG.combat.ringCd) — removed.
  const L = RL.levels;
  let mono = true;
  for (let i = 1; i < L.length; i++) {
    if (!(L[i].dmg > L[i - 1].dmg && L[i].jumps > L[i - 1].jumps)) mono = false;
  }
  ok(mono, '12.4: ringLightning per-level scaling shape dmg↑ jumps↑ holds');
  // Exact-effect card lines (10.2 rule): L1 full-stat, L2 delta. 30.4: the cd row was
  // DEAD config — the fire site reuses CFG.combat.ringCd — so the card now states ringCd.
  const l1 = cardEffectText('weapon', 'ringLightning', 1);
  ok(l1.includes(`every ${CFG.combat.ringCd} s`) && l1.includes(`${L[0].dmg} dmg`) && l1.includes(`chain ${L[0].jumps} foes`),
    `30.4: ringLightning L1 line names real cd/dmg/chain (${l1})`);
  const l2 = cardEffectText('weapon', 'ringLightning', 2);
  ok(l2.includes(`dmg ${L[0].dmg}→${L[1].dmg}`) && l2.includes(`chain ${L[0].jumps}→${L[1].jumps} foes`),
    `12.4: ringLightning L2 delta line shows cd/dmg/chain deltas (${l2})`);

  // Shock pipeline (12.5): stacks accumulate; the Nth consumes them → stun + chain burst.
  const c = new Combat();
  const owner = { x: 0, y: 0, vx: 0, vy: 0, _ringBeams: [] };
  const mkE = (x) => ({ x, y: 100, r: 12, hp: 100, maxHp: 100, flash: 0, vx: 0, vy: 0, dead: false,
    slowStacks: [], freezeT: 0, shockStacks: [], stunT: 0 });
  const e1 = mkE(150);   // the proc'd enemy
  const cA = mkE(200);   // chain targets, within ringJumpR of the last link
  const cB = mkE(260);
  const cFar = mkE(150 + C.ringJumpR + 40); // beyond every jump from the proc point
  const en = { list: [e1, cA, cB, cFar] };
  c.enemies = en;
  c.applyShock(e1, 2, owner);
  c.applyShock(e1, 2, owner);
  ok(e1.shockStacks.length === 2 && e1.stunT === 0, '12.4/12.5: two shock stacks accumulate without stunning');
  c.applyShock(e1, 2, owner); // third → stun + chain
  ok(e1.shockStacks.length === 0 && e1.stunT === C.stunDur,
    '12.4/12.5: the Nth shock stack stuns (stunT = stunDur) and consumes the stacks');
  ok(cA.hp < 100 && cB.hp < 100, '12.4: the chain burst damages jumped-to enemies');
  ok(cA.shockStacks.length === 1 && cB.shockStacks.length === 1,
    '12.4: chained enemies gain exactly 1 shock stack (no re-proc)');
  ok(cFar.hp === 100 && cFar.shockStacks.length === 0,
    '12.4: enemies beyond the jump radius are untouched');
  // Chain count = weapon `jumps`: with jumps=2 only the 2 nearest foes are hit.
  const d1 = mkE(0), h1 = mkE(60), h2 = mkE(120), miss = mkE(180);
  c.enemies = { list: [d1, h1, h2, miss] };
  d1.shockStacks.push({ t: C.statusStackTtl }, { t: C.statusStackTtl });
  c.applyShock(d1, 2, owner);
  ok(h1.hp < 100 && h2.hp < 100 && miss.hp === 100,
    '12.4: the chain leaps exactly `jumps` fresh foes (greedy nearest), no more');

  // fireShockBolt: damage + one stack + a drawable arc on the owner player.
  const c2 = new Combat();
  c2.enemies = { list: [] };
  const tgt = mkE(300);
  c2.fireShockBolt(100, 100, tgt, 30, 2, owner);
  ok(tgt.hp === 70 && tgt.shockStacks.length === 1, '12.4: a shock bolt damages + applies one stack');
  const beam = owner._ringBeams[owner._ringBeams.length - 1];
  ok(owner._ringBeams.length > 0 && beam.x === 100 && beam.y === 100 && beam.tx === 300 && beam.ty === 100
    && beam.dur === C.ringBeamDur, '12.4: bolt emits a drawable arc (spawn → target) on its owner');

  // Stun lock (enemies._ai): stunned enemies stop moving and suppress weave/ranged/boss timers.
  const es = new Enemies();
  const st3 = { x: 0, y: 0, r: 12, hp: 999, maxHp: 999, flash: 0, vx: 0, vy: 0, dead: false,
    slowStacks: [], freezeT: 0, shockStacks: [], stunT: 0.5, speed: 100, fly: true,
    weave: true, ranged: true, cd: 0.01, animT: 1, phase: 1 };
  es.list.push(st3);
  es.orbs.length = 0;
  const nearPlayer = { x: 50, y: 0, dead: false };
  const worldStub = { collidersNear: () => [] };
  es._ai(st3, 1 / 60, [nearPlayer], worldStub, null);
  ok(Math.abs(st3.vx) < 1e-9 && Math.abs(st3.vy) < 1e-9, '12.4: a stunned enemy does not move');
  ok(es.orbs.length === 0, '12.4: stun suppresses ranged firing');
  // Per-stack TTL expiry mirrors slow (independent 5 s per stack).
  const one = { x: 0, y: 0, r: 12, hp: 999, maxHp: 999, flash: 0, vx: 0, vy: 0, dead: false,
    slowStacks: [], freezeT: 0, shockStacks: [{ t: 0.05 }], stunT: 0, speed: 10, fly: true };
  es.list.length = 1; es.list[0] = one;
  for (let i = 0; i < 6 && one.shockStacks.length; i++) es._ai(one, 1 / 60, [nearPlayer], worldStub, null);
  ok(one.shockStacks.length === 0, '12.5: an expired shock stack is removed on tick');
}

// --- Phase 9: meta progression (pure) ---
{
  const m0 = loadMeta('no-such-key');
  ok(m0.shards === 0 && Object.values(m0.upgrades).every((v) => v === 0), 'loadMeta: defaults without storage');
  ok(shardsFor({ score: 800, victory: true }) === 27, 'shardsFor: 800 score + victory → 27');
  ok(shardsFor({ score: 399, victory: false }) === 0, 'shardsFor: 399 score, no victory → 0');
  ok(upgradeCost('maxHp', 0) === 50, 'upgradeCost: maxHp L0 → 50 (D84 economy slow-down)');
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
  ok(generateWorld(20260820, 'm01').trees.length === 276 && generateWorld(20260820, 'm01').decor.length === 335 && generateWorld(20260820, 'm01').colliders.length === 329, 'm01 layout: golden counts (seed 20260820) — +1 collider = well landmark retained (D92)');
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
  ok(g.colliders.every((c) => c.landmark || Math.hypot(c.x - g.playerStart.x, c.y - g.playerStart.y) > 70 + (c.r || Math.max(c.rx, c.ry) || 0)), 'm02: spawn clearance (landmarks exempt, D92)');
  ok(g.colliders.some((c) => c.landmark), 'm02: landmark colliders retained (D92)');
  ok(g.well && g.ringShrine && inb(g.well) && inb(g.ringShrine), 'm02: well + ringShrine in bounds');
  ok(g.trees.length === 274 && g.decor.length === 324 && g.colliders.length === 332, 'm02 layout: golden counts (seed 20260822) — +1 collider = well landmark retained (D92)');
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
  ok(g.colliders.every((c) => c.landmark || Math.hypot(c.x - g.playerStart.x, c.y - g.playerStart.y) > 70 + (c.r || Math.max(c.rx, c.ry) || 0)), 'm03: spawn clearance (landmarks exempt, D92)');
  ok(g.colliders.some((c) => c.landmark), 'm03: city-dome landmark retained (D92 — was always stripped before)');
  ok(g.well && g.ringShrine && inb(g.well) && inb(g.ringShrine), 'm03: well (city) + dome (ringShrine) in bounds');
  ok(g.trees.length === 319 && g.decor.length === 370 && g.colliders.length === 372, 'm03 layout: golden counts (seed 20260823) — +2 colliders = city-dome pair retained (D92)');
}

// Slice audit 2026-10-20: every generated object must stay on-map for ANY seed
// (edge-adjacent placements — m01 cluster campfires, m02 pond-ring lanterns —
// could previously park decor + collider + light off-map), and every seed (incl.
// 0/negative/max-u32) must re-generate byte-identical layouts.
{
  const SEEDS = [0, -99, 4294967295, 20260820, 20260822, 20260823, 777];
  for (const key of LEVEL_ORDER) {
    const lv = getLevel(key);
    for (const seed of SEEDS) {
      const d = generateWorld(seed, key);
      const M = lv.margin;
      const inMap = (o) => o.x >= M && o.x <= lv.w - M && o.y >= M && o.y <= lv.h - M;
      // lights carry a small vertical offset (−8…−30) → bounded to the map, not the margin
      const onMap = (o) => o.x >= 0 && o.x <= lv.w && o.y >= 0 && o.y <= lv.h;
      ok(
        d.colliders.every(inMap) && d.decor.every(inMap) && d.lights.every(onMap) &&
        d.campfires.every(inMap) && (d.lanterns || []).every(inMap),
        `${key} seed ${seed}: colliders/decor/campfires/lanterns in margin, lights on-map`
      );
      ok(JSON.stringify(d) === JSON.stringify(generateWorld(seed, key)), `${key} seed ${seed}: deterministic re-generate`);
    }
  }
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
  ok(WEAPON_KEYS.length === 19 && PASSIVE_KEYS.length === 8 && SYNERGY_KEYS.length === 15 && ENEMY_KEYS.length === 9,
    '11.2: key tables follow CFG order/counts (29.14 rebaseline: 19 weapons · 8 passives · 15 synergies)');

  const p = new Player({});
  p.reset(10, 20);
  applyCard(p, { kind: 'weapon', key: 'axe', level: 2 });
  applyCard(p, { kind: 'passive', key: 'dmg', level: 1 });
  applyCard(p, { kind: 'synergy', key: 'blight', level: 1 });
  p.actLeft = { skip: 2, reroll: 1, banish: 5 };
  p.xp = 12.345; p.hp = 55.55; p.dashT = 0.333; p.dashCd = 1.666; p.flip = true;
  const ps = playerSnap(p);
  ok(ps.length === SNAP_PLEN && SNAP_PLEN === 58, '11.2: playerSnap is 58 slots (SNAP_V=8, 29.14 rebaseline: 19+8+15 re-layout + 4-slot companion tail)');
  const p2 = new Player({});
  p2.reset(0, 0);
  applyPlayerSnap(p2, ps);
  ok(near(p2.x, 10) && near(p2.y, 20) && near(p2.hp, 55.6) && p2.maxHp === p.maxHp && near(p2.xp, 12.3)
    && p2.level === p.level && p2.flip === true && near(p2.dashT, 0.3) && near(p2.dashCd, 1.7),
    '11.2: playerSnap/apply round-trip (r1 rounding)');
  ok(Object.keys(p2.weapons).length === Object.keys(p.weapons).length && p2.weapons.axe === p.weapons.axe
    && p2.passives.dmg === 1 && p2.synergies.blight === 1,
    '11.2: applyPlayerSnap rebuilds weapon/passive/synergy maps');
  ok(p2.actLeft.skip === 2 && p2.actLeft.reroll === 1 && p2.actLeft.banish === 5,
    '18.3: actLeft counters ride the snapshot tail (D53: counts are sim state, shop levels never sync)');

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
  ok(unpackState({ ...st, players: [new Array(34).fill(1)] }) === null, '18.3: 34-slot v5-era snap rejected at SNAP_V=6');
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

// --- 24.2 shared projectile-variant seam: fire sites tag a draw variant; base path unchanged ---
{
  const c = new Combat();
  // No synergy → empty variant (base sprite path).
  c.fireBolt(0, 0, 0, 10, 0, null, null);
  ok(c.bolts[0].v === '', '24.2: plain bolt has empty variant (base look)');
  c.fireBullet(0, 0, 0, 5, null, null, null);
  ok(c.bullets[0].v === '', '24.2: plain bullet has empty variant');
  c.fireArrow(0, 0, 0, 16, null, null, null);
  ok(c.arrows[0].v === '', '24.2: plain arrow has empty variant');
  c.fireBomb(0, 0, 0, 30, 8, 20, 0.5, null, null);
  ok(c.bombs[0].v === '', '24.2: plain bomb has empty variant');
  c.fireSnowball(0, 0, 100, 0, 6, 30, null, null);
  ok(c.snowballs[0].v === '', '24.2: plain snowball has empty variant');
  // Synergy present → the synergy key rides as the variant.
  c.fireBolt(0, 0, 0, 10, 0, { dps: 14, dur: 3 }, null);
  ok(c.bolts[1].v === 'blight', '24.2: blight bolt tagged blight');
  c.fireBullet(0, 0, 0, 5, { dps: 12, dur: 2.5 }, null, null);
  ok(c.bullets[1].v === 'inferno', '24.2: inferno bullet tagged inferno');
  c.fireBullet(0, 0, 0, 5, null, null, { dmg: 45, jumps: 2 });
  ok(c.bullets[2].v === 'storm', '24.2: storm bullet tagged storm');
  // Both pistol synergies → storm wins (documented precedence).
  c.fireBullet(0, 0, 0, 5, { dps: 12 }, null, { dmg: 45, jumps: 2 });
  ok(c.bullets[3].v === 'storm', '24.2: storm takes precedence over inferno');
  // Arrow two-synergy precedence → flaming wins over piercer.
  c.fireArrow(0, 0, 0, 16, null, { dps: 8 }, { bonus: 10, pierce: 1 });
  ok(c.arrows[1].v === 'flaming', '24.2: flaming arrow takes precedence over piercer');
  c.fireArrow(0, 0, 0, 16, null, null, { bonus: 10, pierce: 1 });
  ok(c.arrows[2].v === 'piercer', '24.2: piercer-only arrow tagged piercer');
  c.fireBomb(0, 0, 0, 30, 8, 20, 0.5, { dps: 18 }, null);
  ok(c.bombs[1].v === 'napalm', '24.2: napalm bomb tagged napalm');
  c.fireSnowball(0, 0, 100, 0, 6, 30, null, { freeze: 0.3, dps: 8 });
  ok(c.snowballs[1].v === 'blue', '24.2: blue-flame snowball tagged blue');
  // Draw-selection fallback (mirrors combat.draw): variant map present + key → variant;
  // absent map / missing key / empty v → base img (byte-identical solo path).
  const base = { width: 10, height: 4 }, variant = { width: 12, height: 6 };
  const pick = (map, v) => (map && map[v]) || base;
  ok(pick({ blight: variant }, 'blight') === variant, '24.2: draw picks the variant sprite when present');
  ok(pick(null, 'blight') === base && pick({}, 'blight') === base, '24.2: absent map/missing key → base (invariance)');
  ok(pick({ blight: variant }, '') === base, '24.2: empty variant → base even with a map loaded');
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
  ok(C.order.length === 9 && C.order.every((k) => C[k] && C[k].name && C[k].desc), '11.6.1: order defines 9 named chars with select desc (P21)');
  ok(C.mage.cost === 0 && C.ranger.cost === 1500 && C.warden.cost === 3500 && C.swash.cost === 7500,
    '11.6.1: D58 costs — mage 0, ranger 1500, warden 3500, swash 7500');
  ok(C.baseball.cost === 5000 && C.werewolf.cost === 7500 && C.golem.cost === 10000 && C.toad.cost === 12500 && C.gunslinger.cost === 15000,
    '11.6.1: D96 unlock ladder — 5000/7500/10000/12500/15000 after swash');
  ok(C.order.every((k) => CFG.weapons[C[k].weapon]) && C.ghost.weapon === null, '11.6.1: starting weapons in weapons (ghost: none)');
  ok(new Set(C.order.map((k) => C[k].weapon)).size === C.order.length, 'D91: every character has a DISTINCT starting weapon (co-op zero-duplicate law — new roster entries must keep this)');
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
    // 20.1 (D66): runs start with NO passives — empty dicts + baseline multipliers.
    ok(pl.maxHp === C[k].hp && pl.hp === C[k].hp
      && Object.keys(pl.passives).length === 0 && Object.keys(pl.synergies).length === 0
      && pl.dmgMul === 1 && pl.speedMul === 1 && pl.magnet === 1 && pl.regen === 0,
      `20.1: ${k} reset → hp ${C[k].hp} + starting weapon ${w || 'none'} + NO passives (D66)`);
    ok(pl.maxHp === C[k].hp && pl.hp === C[k].hp
      && Object.keys(pl.weapons).length === (w ? 1 : 0)
      && (!w || pl.weapons[w] === 1), `11.6.1: ${k} reset → hp ${C[k].hp} + starting weapon ${w || 'none'}`);
    // 21.2 fix: a stale build from the previous run must die on reset — a solo startRun never
    // passes through _applyChar's weapons-clear (co-op path only); the fresh-player pin above missed this.
    pl.weapons[w || 'axe'] = 5; pl.weapons.bat = 2;
    pl.reset(0, 0);
    ok(Object.keys(pl.weapons).length === (w ? 1 : 0) && (!w || pl.weapons[w] === 1),
      `21.2: ${k} reset kills the old run's weapons (starter only survives)`);
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
  ok(d4.length === 4 && d4[0].length === 2 && d4[1].length === 2 && d4[2].length === 2 && d4[3].length === 2,
    `11.6.3: 4P × 2 = 8 = roster ${nRoster} (12.2: bow) → 2/2/2/2 (exact fill, no remainder)`);
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

// --- 16.3 Pyre Lance flame: +33% stream length, 2x flow/extension, momentum LEAD ---
{
  const C = CFG.combat;
  const reach = (v0, k, L) => (v0 / k) * (1 - Math.exp(-k * L)); // drag-only mean reach
  const BASE = 94.6; // pre-16.3 mean reach (v0 260, drag 2.0, life 0.65) = the "current build" the user measured +33% against
  ok(reach(C.flameSpeed, C.flameDrag, C.flameLife) > BASE * 1.32 && reach(C.flameSpeed, C.flameDrag, C.flameLife) < BASE * 1.34,
    '16.3: mean stream reach ~+33% vs the pre-16.3 build (94.6 px)');
  ok(C.flameSpeed === 520 && C.flameSpeedVar === 160, '16.3: emission speed exactly 2x the pre-16.3 build (260/80) -> flow/extension 2x faster');
  ok(C.flameDrag === 2.0, '16.3: drag unchanged (the 2x front speed IS the flow fix)');
  ok(Math.abs(C.flameSpeedVar / C.flameSpeed - 80 / 260) < 0.005, '16.3: speed spread keeps the pre-16.3 ±ratio');
  ok(Math.abs(C.flameLifeVar / C.flameLife - 0.15 / 0.65) < 0.01, '16.3: life spread keeps the pre-16.3 ±ratio');
  ok(C.flameMomentum > 0 && C.flameMomentum < 1, '16.3: flameMomentum inherits a proper share of the owner velocity (LEAD-while-moving)');

  // Damage reach must track the VISIBLE stream (user report 2026-09-04): the old
  // 300–380 acquisition ramp hit enemies well past where flame sprites render.
  // Replay the engine's own _flames recurrence to get max particle travel, then
  // require every level's range to sit inside the visible envelope.
  {
    const dtF = 1 / 60;
    const travel = (speed, life) => {
      let x = 0, vx = speed, vy = 0, age = 0, far = 0;
      while (age < life) {
        const dr = Math.exp(-C.flameDrag * dtF);
        vx *= dr; vy = vy * dr - C.flameRise * dtF;
        x += vx * dtF; age += dtF;
        const k = age / life, s = C.flameSize * (0.55 + 0.75 * k);
        far = Math.max(far, x + s / 2); // outer edge of the drawn sprite
      }
      return far;
    };
    const visMax = travel(C.flameSpeed + C.flameSpeedVar, C.flameLife + C.flameLifeVar);
    const dmgMax = (C.flameSpeed + C.flameSpeedVar) / C.flameDrag * (1 - Math.exp(-C.flameDrag * (C.flameLife + C.flameLifeVar))) + C.flameR;
    const ranges = CFG.weapons.flame.levels.map((s) => s.range);
    ok(ranges.every((r) => r === 150), 'flame range: flat 150 at all 5 levels (visual alignment, 2026-09-04)');
    ok(Math.max(...ranges) <= visMax, `flame range ≤ max visible sprite reach (${Math.max(...ranges)} ≤ ${visMax.toFixed(1)})`);
    ok(dmgMax <= visMax + 1, `flame particle damage edge ≤ visible edge (${dmgMax.toFixed(1)} ≤ ${visMax.toFixed(1)})`);
    ok(ranges[0] >= travel(C.flameSpeed - C.flameSpeedVar, C.flameLife - C.flameLifeVar), 'flame range ≥ min-case visible reach (no dead zone below the stream start)');
  }
}

// --- 11.9 co-op minimap + buttons (CSS-only change; content asserts on main.css) ---
{
  const css = readFileSync(fileURLToPath(new URL('../css/main.css', import.meta.url)), 'utf8');
  const solo = css.match(/#minimap-frame \{\s*width: clamp\(([\d.]+)px, ([\d.]+)vmin, ([\d.]+)px\)/);
  ok(solo && solo[1] === '137.5' && solo[2] === '25' && solo[3] === '237.5',
    '11.9: solo minimap width unchanged (137.5px/25vmin/237.5px — solo invariance)');
  const mm = css.match(/--coop-mm: clamp\(([\d.]+)px, ([\d.]+)vmin, ([\d.]+)px\)/);
  ok(mm, '11.9: co-op minimap width --coop-mm present');
  ok(!!(solo && mm) && [0, 1, 2].every((i) => Math.abs(+mm[i + 1] / +solo[i + 1] - 0.66) <= 0.01),
    '11.9: co-op minimap = ~66% of the solo size at every clamp stop (req 6a)');
  ok(/#hud\.coop #minimap-frame \{[^}]*bottom: calc\(16px \+ var\(--safe-b\)\)[^}]*width: var\(--coop-mm\)/.test(css),
    '11.9: co-op minimap bottom-center at the --coop-mm width');
  ok(/#hud\.coop #btn-pause \{[^}]*position: fixed[^}]*bottom: calc\(16px \+ var\(--safe-b\)\)[^}]*--coop-mm/.test(css),
    '11.9: PAUSE fixed beside the co-op minimap (offset tracks --coop-mm, req 6a)');
  ok(!/#hud\.coop[^{]*#btn-dash/.test(css) && !/#hud\.coop[^{]*#btn-mute/.test(css),
    '11.9: DASH stays top-right (11.7) and mute is not moved (Pause-menu Settings, 13.8/D72)');
}

// --- 11.10 boss count: N players = N bosses of the current level (pure rule) ---
{
  ok(bossCount(1) === 1 && bossCount(2) === 2 && bossCount(3) === 3 && bossCount(4) === 4,
    '11.10: 1P=1 … 4P=4 bosses (solo = 1 Wraith)');
  ok(bossCount(0) === 1 && bossCount(7) === CFG.coop.maxPlayers,
    '11.10: clamped to [1, maxPlayers]');
  ok(CFG.enemies.wraith.boss && CFG.enemies.ryu.boss && CFG.enemies.shark.boss,
    '11.10: the three per-level bosses are boss-flagged (Phase 13)');
}

// --- 11.12 co-op mobile parity (CSS: touch targets + small-screen corner layout) ---
{
  const css = readFileSync(fileURLToPath(new URL('../css/main.css', import.meta.url)), 'utf8');
  ok(/\.hud-btn \{\s*width: 72px; height: 72px/.test(css),
    '11.12: .hud-btn touch targets ≥72 px (PAUSE/DASH — the co-op pause beside the minimap)');
  ok(/#hud\.coop #btn-pause \{[^}]*\}/.test(css) && !/#hud\.coop #btn-pause \{[^}]*width:/.test(css),
    '11.12: co-op PAUSE keeps the 72×72 .hud-btn size (no smaller override in the co-op rule)');
  const lift = css.match(/@media \(max-width: 520px\) \{\s*#hud\.coop #hud-seat-2, #hud\.coop #hud-seat-3 \{ bottom: calc\((\d+)px \+ var\(--safe-b\)\);? \}\s*\}/);
  ok(lift, '11.12: small-screen corner layout lifts the BL/BR co-op seat panels above the bottom cluster');
  ok(!!lift && +lift[1] >= 112,
    '11.12: lifted seat panels clear the co-op minimap + PAUSE cluster (minimap min 91px wide → 69px tall + 16px inset + margin)');
}

// --- 22.2 XP gem escape from non-traversable spots (pure helper + wiring) ---
{
  const K = (pt, s) => ((pt.x - s.x) / s.rx) ** 2 + ((pt.y - s.y) / s.ry) ** 2;
  const spot = { x: 1000, y: 800, rx: 200, ry: 90, ellipse: true };
  const c = escapeFromSpots(1000, 800, [spot], 6); // dead center
  ok(c.x === 1206 && c.y === 800, '22.2: dead-center point exits to the +x perimeter + pad');
  const p = escapeFromSpots(1100, 845, [spot], 6);
  ok(K(p, spot) > 1.01, '22.2: inside point lands outside the ellipse (k>1, pad beyond the perimeter)');
  ok(Math.abs(Math.atan2(845 - 800, 1100 - 1000) - Math.atan2(p.y - 800, p.x - 1000)) < 1e-9,
    '22.2: escape keeps the radial bearing from the spot center');
  const q = escapeFromSpots(1300, 700, [spot], 6);
  ok(q.x === 1300 && q.y === 700, '22.2: outside point untouched');
  const bnd = escapeFromSpots(1200, 800, [spot], 6); // exactly on the perimeter (k=1)
  ok(bnd.x === 1200 && bnd.y === 800, '22.2: on-perimeter point untouched');
  const s2 = { x: 1150, y: 800, rx: 140, ry: 60, ellipse: true };
  const o = escapeFromSpots(1120, 800, [spot, s2], 6);
  ok(K(o, spot) > 1 && K(o, s2) > 1, '22.2: overlapping spots both cleared (looped)');
  const noS = escapeFromSpots(50, 50, [], 6);
  ok(noS.x === 50 && noS.y === 50, '22.2: empty spot list = identity');
  // Live pipeline (pure class): an unmagnetized gem inside a spot is nudged out
  const pk = new Pickups();
  pk.gem(1000, 800, 1); // dropped dead center of the pond
  pk.update(1 / 60, { x: 2400, y: 2400, r: 12, magnet: 1 }, [spot]);
  const g0 = pk.gems.find((g) => g.on);
  ok(g0 && K(g0, spot) > 1.05 && g0.x === 1206 && g0.y === 800,
    '22.2: Pickups.update nudges an inside gem out to the +x edge + pad');
  // Wiring (source scans — the nudge + drop-site escape must be live in game.js)
  const gsrc = readFileSync(fileURLToPath(new URL('../js/core/game.js', import.meta.url)), 'utf8');
  ok((gsrc.match(/_pickupSpots = this\.world\.colliders\.filter\(\(c\) => c\.ellipse\)/g) || []).length === 2,
    '22.2: _pickupSpots built from ellipse colliders at BOTH run-start sites (host + client)');
  ok(/pickups\.update\(dt, pl, this\._pickupSpots\)/.test(gsrc),
    '22.2: per-step gem nudge wired through pickups.update (host sim)');
  ok(/escapeFromSpots\(e\.x, e\.y, this\._pickupSpots, CFG\.gems\.escapePad\)/.test(gsrc),
    '22.2: kill-drop site escapes spots (gems never spawn inside one)');
  ok(CFG.gems.escapePad > 0 && CFG.gems.escapePad <= 24,
    '22.2: escapePad config scalar present + sane');
}

// --- 22.3 M03 gem vs heart contrast (palette invariant, via the 13.10 seam) ---
{
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  ok(GEM_PAL.m03.stops.every((s) => rgb(s)[2] > rgb(s)[0]),
    '22.3: m03 gem stays cool (every stop blue-dominant)');
  ok(rgb(HEART_PAL.m03.top)[0] > rgb(HEART_PAL.m03.top)[2] && rgb(HEART_PAL.m03.low)[0] > rgb(HEART_PAL.m03.low)[2],
    '22.3: m03 heart is warm (top + low red-dominant — coral, not teal)');
  const gm = rgb(GEM_PAL.m03.stops[1]), ht = rgb(HEART_PAL.m03.top);
  ok(Math.abs(gm[0] - ht[0]) + Math.abs(gm[1] - ht[1]) + Math.abs(gm[2] - ht[2]) >= 150,
    '22.3: m03 gem vs heart channel-distance ≥150 (discernible mid-run)');
  ok(HEART_PAL.m01.top === '#ff7d90' && HEART_PAL.m01.low === '#d42a4c' &&
     HEART_PAL.m02.top === '#ffb3a0' && HEART_PAL.m02.low === '#e0446e',
    '22.3: m01/m02 heart palettes untouched (only m03 retuned)');
}

// --- 23.1 Bow charge-up + projectile cadence ordering (config invariants) ---
{
  const L = (k) => CFG.weapons[k].levels;
  ok(typeof CFG.weapons.bow.charge === 'number' && CFG.weapons.bow.charge > 0 && CFG.weapons.bow.charge <= 0.5,
    '23.1: bow charge scalar present + sane (0 < charge ≤ 0.5 s — a "brief" wind-up)');
  // The reported bug: bow rate was numerically identical to pistols. Ordering invariant:
  // bow > wand > pistols at EVERY level (strict).
  let ordOk = true;
  for (let i = 0; i < 5; i++) {
    if (!(L('bow')[i].rate > L('wand')[i].rate && L('wand')[i].rate > L('pistols')[i].rate)) ordOk = false;
  }
  ok(ordOk, '23.1: cadence ordering pistols < wand < bow at every level');
  // User rule: unnamed weapons leave as-is — pistols/axe/bomb tables are exactly the pre-23 values.
  ok(JSON.stringify(L('pistols').map((s) => s.rate)) === JSON.stringify([0.55, 0.48, 0.42, 0.36, 0.3]),
    '23.1: pistols cadence untouched (user: "feels fine")');
  ok(JSON.stringify(L('axe').map((s) => s.cd)) === JSON.stringify([1.4, 1.25, 1.1, 0.95, 0.8]),
    '23.1: axe cadence untouched');
  ok(JSON.stringify(L('bombs').map((s) => s.cd)) === JSON.stringify([2.2, 2.0, 1.8, 1.6, 1.4]),
    '23.2: bomb cd untouched (only radius/damage changed)');
}

// --- 23.2 Sunder Bombs rework: radius ×1.5, damage ×2, kb magnitude up, visual ≈ damage ---
{
  const R = CFG.weapons.bombs.levels.map((s) => s.r);
  ok(JSON.stringify(R) === JSON.stringify([142, 157, 172, 192, 210]), '23.2: blast radii = old ×1.5 (142/157/172/192/210)');
  ok(CFG.weapons.bombs.levels[0].dmg === 80, '23.2: base damage ×2 (40 → 80)');
  let shapeOk = true;
  for (let i = 1; i < 5; i++) {
    const a = CFG.weapons.bombs.levels[i - 1], b = CFG.weapons.bombs.levels[i];
    if (!(b.dmg > a.dmg && b.r > a.r && b.cd < a.cd && b.fuse < a.fuse)) shapeOk = false;
  }
  ok(shapeOk, '23.2: per-level scaling shape dmg↑ r↑ cd↓ fuse↓ still holds');
  ok(CFG.combat.bombKb > 260, '23.2: bombKb magnitude increased (very strong push-back)');
  // Knockback direction stays radial from the blast centre: an enemy east of the blast
  // must gain +vx only (dx/d, dy/d unchanged pipeline).
  const c = new Combat();
  const eE = { x: 60, y: 0, r: 12, hp: 1e6, maxHp: 1e6, flash: 0, vx: 0, vy: 0, dead: false };
  const grid = { grid: { range: () => [eE] }, list: [eE] };
  c.fireBomb(0, 0, 0, 50, 10, 200, 0.01, null, null);
  const b0 = c.bombs[0];
  c._explode(b0, grid); // blast centre (0,0); eE due east
  ok(eE.vx > 0 && Math.abs(eE.vy) < 1e-9, '23.2: knockback still radial from the blast centre');
  ok(Math.abs(eE.vx - CFG.combat.bombKb) < 1e-9, '23.2: full bombKb magnitude lands on a centred-bearing enemy');
  // Visual-vs-damage radius invariant (draw source): the sprite must never shrink below
  // the damage radius (old ramp started at 0.60× — the reported defect).
  const csrc = readFileSync(fileURLToPath(new URL('../js/entities/combat.js', import.meta.url)), 'utf8');
  const ex = csrc.match(/const s = x\.r \* 2 \* \(([^)]+)\);/);
  ok(!!ex, '23.2: explosion sprite scale driven from x.r (true damage radius)');
  ok(!!ex && parseFloat(ex[1].split('+')[0]) >= 1, '23.2: blast visual starts at ≥1.0× the damage radius');
}

// --- 23.3 Over-heal synergy (replaces Phoenix Heart kill-heal in place) ---
{
  const S = CFG.synergies.phoenix.levels[0];
  ok(S.ceiling === 2 && near(S.decay, 0.01), '23.3: ceiling 200% current max HP + 1%/s decay scalars');
  // Old machinery DELETED, not moved (user instruction) — no _phoenixKills anywhere in js/.
  const gsrc = readFileSync(fileURLToPath(new URL('../js/core/game.js', import.meta.url)), 'utf8');
  const plyr = readFileSync(fileURLToPath(new URL('../js/entities/player.js', import.meta.url)), 'utf8');
  ok(!gsrc.includes('_phoenixKills') && !plyr.includes('_phoenixKills'),
    '23.3: _phoenixKills fully deleted (game.js + player.js)');

  const mk = () => { const p = new Player({}); p.reset(0, 0); return p; };
  // No synergy → applyOverHeal refuses (normal clamped heal path stays).
  const p0 = mk();
  ok(p0.applyOverHeal(20) === false && p0.hp === p0.maxHp && p0.overHeal === 0,
    '23.3: no synergy → over-heal never applies');
  // Below full HP with synergy → still refuses (game routes to pl.heal).
  const p1 = mk(); p1.synergies.phoenix = 1; p1.hp = 50;
  ok(p1.applyOverHeal(20) === false && p1.hp === 50, '23.3: below full HP → normal heal path');
  // At full HP → over-health up to ceiling.
  const p2 = mk(); p2.synergies.phoenix = 1;
  p2.applyOverHeal(CFG.gems.heartHeal);
  ok(p2.hp === p2.maxHp + CFG.gems.heartHeal && p2.overHeal === CFG.gems.heartHeal,
    '23.3: heart at full HP → hp past maxHp by heartHeal');
  // Ceiling: repeated pickups never exceed 200% of CURRENT max HP.
  for (let i = 0; i < 20; i++) p2.applyOverHeal(CFG.gems.heartHeal);
  ok(p2.hp === p2.maxHp * 2 && p2.overHeal === p2.maxHp, '23.3: ceiling = 200% of current max HP');
  // Ceiling follows CURRENT max HP (Heart of Oak mid-run raise → re-evaluated live).
  const p3 = mk(); p3.synergies.phoenix = 1; p3.hp = p3.maxHp;
  applyCard(p3, { kind: 'passive', key: 'hp', level: 1 }); // +25 max (recomputeStats)
  for (let i = 0; i < 40; i++) p3.applyOverHeal(CFG.gems.heartHeal);
  ok(p3.hp === p3.maxHp * 2, '23.3: ceiling re-evaluated after max HP rises mid-run');
  // Decay: ~1% of max HP per second back toward 100%; hp pinned at maxHp when pool drains.
  const p4 = mk(); p4.synergies.phoenix = 1; p4.hp = p4.maxHp; p4.regen = 0;
  p4.applyOverHeal(20);
  const before = p4.hp;
  p4._overHeal(1); // 1 s ≈ −maxHp×0.01
  ok(near(p4.hp, before - p4.maxHp * S.decay, 1e-9) && near(p4.overHeal, 20 - p4.maxHp * S.decay, 1e-9),
    '23.3: decay ≈ 1% of max HP per second');
  for (let i = 0; i < 60 * 60; i++) p4._overHeal(1 / 60);
  ok(p4.hp === p4.maxHp && near(p4.overHeal, 0, 1e-9), '23.3: decay settles at exactly 100% (no undershoot)');
  // Second heart re-applies and out-runs the diminishment.
  const p5 = mk(); p5.synergies.phoenix = 1; p5.hp = p5.maxHp;
  p5.applyOverHeal(20);
  for (let i = 0; i < 60; i++) p5._overHeal(1 / 60); // ~−maxHp×0.01 of decay
  const mid = p5.hp;
  p5.applyOverHeal(CFG.gems.heartHeal);
  ok(p5.hp === mid + CFG.gems.heartHeal && p5.overHeal > 20 - p5.maxHp * S.decay,
    '23.3: second heart re-applies over-health (cancels the diminishment)');
}

// --- 12.6 New synergies (Flaming Arrows / Heart-Piercer / Blue Flame / Storm Volley /
// Heart Compass) — tables + card text + effect pipelines, Node-safe ---
{
  const SY = CFG.synergies;
  const NEW_S = ['flamingArrows', 'heartPiercer', 'blueFlame', 'stormVolley', 'heartMagnet'];
  for (const k of NEW_S) {
    ok(SY[k] && SY[k].levels.length === 5, `12.6: synergies.${k} is a 5-level card`);
    const reqOK = { flamingArrows: ['bow', 'flame'], heartPiercer: ['bow', 'hp'], blueFlame: ['snowball', 'flame'],
      stormVolley: ['pistols', 'ringLightning'], heartMagnet: ['hp', 'magnet'] }[k];
    ok(JSON.stringify(SY[k].requires) === JSON.stringify(reqOK), `12.6: ${k} requires ${reqOK.join('+')}`);
  }
  // Monotonic scaling per synergy (the Phase 12 "levels like a standard weapon" contract).
  ok(SY.flamingArrows.levels.every((s, i) => i === 0 || (s.dps > SY.flamingArrows.levels[i - 1].dps && s.dur >= SY.flamingArrows.levels[i - 1].dur)),
    '12.6: flamingArrows dps↑ dur↑');
  ok(SY.heartPiercer.levels.every((s, i) => i === 0 || (s.bonus > SY.heartPiercer.levels[i - 1].bonus && s.pierce > SY.heartPiercer.levels[i - 1].pierce)),
    '12.6: heartPiercer bonus↑ pierce↑ (pierce scales with the synergy level)');
  ok(SY.blueFlame.levels.every((s, i) => i === 0 || (s.freeze > SY.blueFlame.levels[i - 1].freeze && s.dps > SY.blueFlame.levels[i - 1].dps)),
    '12.6: blueFlame freeze↑ dps↑');
  ok(SY.stormVolley.levels.every((s, i) => i === 0 || (s.dmg > SY.stormVolley.levels[i - 1].dmg && s.jumps > SY.stormVolley.levels[i - 1].jumps)),
    '12.6: stormVolley dmg↑ jumps↑');
  ok(SY.heartMagnet.levels.every((s, i) => i === 0 || s.pull > SY.heartMagnet.levels[i - 1].pull),
    '12.6: heartMagnet pull↑');
  // Exact-effect card text (10.2 rule) at BOTH levels — the granted level's numbers show.
  ok(cardEffectText('synergy', 'flamingArrows', 1) === 'Arrows ignite foes — 8 dmg/s burn for 2.0 s', `12.6: flamingArrows L1 line (${cardEffectText('synergy', 'flamingArrows', 1)})`);
  ok(cardEffectText('synergy', 'flamingArrows', 5) === 'Arrows ignite foes — 22 dmg/s burn for 3.0 s', '12.6: flamingArrows L5 line shows level-5 numbers');
  ok(cardEffectText('synergy', 'heartPiercer', 1) === '+10 arrow damage — arrows pierce 1 extra foe' && cardEffectText('synergy', 'heartPiercer', 3) === '+18 arrow damage — arrows pierce 3 extra foes', '12.6: heartPiercer L1/L3 lines');
  ok(cardEffectText('synergy', 'blueFlame', 5) === 'Snowball bursts freeze foes for 0.8 s and burn them for 22 dmg/s over 3.0 s', `12.6: blueFlame L5 line (${cardEffectText('synergy', 'blueFlame', 5)})`);
  ok(cardEffectText('synergy', 'stormVolley', 1) === 'Every 4th round strikes for 45 lightning damage, arcing to 2 nearby foes' && cardEffectText('synergy', 'stormVolley', 5) === 'Every 4th round strikes for 110 lightning damage, arcing to 6 nearby foes', '12.6: stormVolley L1/L5 lines');
  ok(cardEffectText('synergy', 'heartMagnet', 1) === 'Hearts are pulled toward you from 100% of your pickup range' && cardEffectText('synergy', 'heartMagnet', 5) === 'Hearts are pulled toward you from 200% of your pickup range', '12.6: heartMagnet L1/L5 lines');

  // Gating: each new synergy is offered the moment its OWN two sources max, and not before.
  ok(!cardOffers({ bow: 4, flame: 5 }, {}, {}, mulberry32(7)).some((c) => c.key === 'flamingArrows'),
    '12.6 gating: flamingArrows absent below source max (bow 4/5)');
  // Gating = the synergy is offerable once BOTH sources max. Under the uniform draw (D81)
  // a single level-up need not surface every eligible card, so offerability is measured as
  // "appears in SOME draw across seeds" (the pool at cap=10 holds passives + new weapons too).
  const gateDraw = (weapons, passives, key) => {
    for (let seed = 1; seed <= 12; seed++) {
      if (cardOffers(weapons, passives, {}, mulberry32(seed), 10).some((c) => c.kind === 'synergy' && c.key === key)) return true;
    }
    return false;
  };
  const W5 = (k) => ({ [k]: 5 });
  const P_MAX = {}; for (const k of Object.keys(CFG.passives)) P_MAX[k] = CFG.passives[k].max;
  ok(gateDraw({ ...W5('bow'), ...W5('flame') }, {}, 'flamingArrows'), '12.6 gating: flamingArrows surfaces with bow+flame maxed');
  ok(gateDraw({ ...W5('bow') }, { hp: CFG.passives.hp.max }, 'heartPiercer'), '12.6 gating: heartPiercer surfaces with bow + hp passive maxed');
  ok(gateDraw({ ...W5('snowball'), ...W5('flame') }, {}, 'blueFlame'), '12.6 gating: blueFlame surfaces with snowball+flame maxed');
  ok(gateDraw({ ...W5('pistols'), ...W5('ringLightning') }, {}, 'stormVolley'), '12.6 gating: stormVolley surfaces with pistols+ring maxed');
  ok(gateDraw({}, { hp: CFG.passives.hp.max, magnet: CFG.passives.magnet.max }, 'heartMagnet'), '12.6 gating: heartMagnet surfaces with hp+magnet maxed');

  // Flaming Arrows pipeline: fireArrow carries the burn row; hit applies burnT/burnDps.
  const c = new Combat();
  const owner = { x: 0, y: 0, vx: 0, vy: 0 };
  const mkE = (x) => ({ x, y: 100, r: 12, hp: 500, maxHp: 500, flash: 0, vx: 0, vy: 0, dead: false,
    slowStacks: [], freezeT: 0, shockStacks: [], stunT: 0 });
  const fa = SY.flamingArrows.levels[1];
  c.fireArrow(100, 100, 0, 16, owner, fa);
  ok(c.arrows[0].flaming === fa && c.arrows[0].pierce === 0, '12.6: fireArrow carries the flaming row (no pierce without piercer)');
  let e = mkE(160);
  let grid = { grid: { near: () => [e] }, list: [e] };
  for (let i = 0; i < 30 && c.arrows.length; i++) c.update(1 / 60, [], grid);
  ok(e.burnT > 0 && e.burnDps === fa.dps, '12.6: flaming arrow applies burn on hit');

  // Heart-Piercer pipeline: bonus damage folded in + pierce budget (hits N+1 foes).
  const hpS = SY.heartPiercer.levels[0]; // bonus 10, pierce 1 → hits 2 enemies
  c.fireArrow(100, 100, 0, 16, owner, null, hpS);
  ok(c.arrows[0].dmg === 26 && c.arrows[0].pierce === 1, '12.6: piercer row adds bonus dmg + pierce budget');
  e = mkE(160); const e2 = mkE(176);
  grid = { grid: { near: () => [e, e2] }, list: [e, e2] };
  for (let i = 0; i < 30 && c.arrows.length; i++) c.update(1 / 60, [], grid);
  ok(e.hp === 500 - 26 && e2.hp === 500 - 26, '12.6: pierce 1 → arrow hits BOTH foes on the path');

  // Blue Flame pipeline: applySlow(e, blue) = frozen-in-place + burn simultaneously (12.5).
  const bf = SY.blueFlame.levels[0]; // freeze 0.3 dps 8 dur 2.0
  e = mkE(150);
  c.applySlow(e, bf);
  ok(e.freezeT === bf.freeze && e.burnT === bf.dur && e.burnDps === bf.dps && e.slowStacks.length === 1,
    '12.6: blue-flame applySlow freezes AND burns at the same instant');
  // …and via the snowball burst route (fireSnowball carries `blue`).
  c.reset(); // otherwise the arrow still in flight above hits this fresh foe too
  c.fireSnowball(100, 100, 160, 100, 26, 95, owner, bf);
  e = mkE(150); const eFar = mkE(400);
  grid = { grid: { range: () => [e, eFar] }, list: [e, eFar] };
  for (let i = 0; i < 60 && c.snowballs.length; i++) c.update(1 / 60, [], grid);
  // outside the radius: never touched — burnT stays UNSET (mkE never initialises it), so
  // assert falsy, not === 0.
  ok(e.freezeT > 0 && e.burnDps === bf.dps && eFar.freezeT === 0 && !eFar.burnT,
    '12.6: snowball burst applies blue freeze+burn inside the radius only');

  // Storm Volley pipeline: fireBullet carries `storm`; first hit strikes for S.dmg and chains.
  const sv = SY.stormVolley.levels[0]; // dmg 45 jumps 2
  c.reset();
  e = mkE(160); const eB = mkE(180); const eC = mkE(200);
  grid = { grid: { near: () => [e, eB, eC] }, list: [e, eB, eC] };
  c.enemies = grid;
  c.fireBullet(100, 100, 0, 9, null, owner, sv);
  ok(c.bullets[0].storm === sv, '12.6: fireBullet carries the storm row');
  for (let i = 0; i < 30 && c.bullets.length; i++) c.update(1 / 60, [], grid);
  ok(e.hp <= 500 - 9 - 45, '12.6: struck foe takes bullet dmg + the lightning strike dmg');
  const chained = [eB, eC].filter((x) => x.shockStacks.length === 1);
  ok(chained.length >= 1 && chained.every((x) => x.hp < 500), '12.6: strike chains to nearby foes (shock stack + chain dmg via _chainArc)');

  // Storm Volley shot cadence (player fire site): every 4th round carries the row.
  const p = new Player({}); p.reset(0, 0);
  p.weapons = { pistols: 5 }; p.synergies.stormVolley = 1; // ONLY pistols — a default char
  // start weapon would fire through the same spy and hit an unstubbed method (session-12 trap)
  const fired = []; const cSpy = { fireBullet: (x, y, a, d, inf, own, storm) => fired.push(!!storm), pulse: null };
  const foe = { x: 60, y: 0, r: 10 };
  const foeList = { _nearest: null };
  for (let i = 0; i < 60 * 8; i++) p._weapons(1 / 60, { list: [foe], grid: { near: () => [foe] } }, cSpy);
  // Cadence is per VOLLEY (the twin-round pair, one trigger): counter advances once per
  // volley and on the 4th BOTH rounds carry the strike → storm-flagged rounds = volleys/2.
  ok(fired.length >= 8 && fired.filter(Boolean).length === Math.floor(fired.length / 2 / 4) * 2,
    `12.6: storm cadence = every 4th volley strikes both rounds (${fired.filter(Boolean).length}/${fired.length})`);

  // Heart Compass pipeline (pickups): no synergy → hearts sit still; with it → magnet flight.
  const pk = new Pickups();
  pk.reset();
  pk.heart(300, 0);
  const plNo = { x: 0, y: 0, r: 14, magnet: 1, synergies: {} };
  for (let i = 0; i < 60; i++) pk.update(1 / 60, plNo, null);
  ok(pk.hearts.some((h) => h.on && h.x === 300), '12.6 heartMagnet: without the synergy hearts never move');
  // "Within range" = inside the L1 pull radius (magnetBase × pull 1.0 = 70 px).
  pk.reset();
  pk.heart(60, 0);
  const plHM = { x: 0, y: 0, r: 14, magnet: 1, synergies: { heartMagnet: 1 } }; // pull 1.0 → magR 70…
  let moved = false;
  for (let i = 0; i < 6; i++) { pk.update(1 / 60, plHM, null); const h = pk.hearts.find((hh) => hh.on); if (!h || h.x < 60) moved = true; }
  ok(moved || pk.hearts.every((h) => !h.on), '12.6 heartMagnet L1: within range the heart starts flying to the player');
  // Out of range at L1 (pull 1.0 → magR = magnetBase × 1): stays put.
  pk.reset();
  pk.heart(CFG.gems.magnetBase * 1 + 60, 0);
  for (let i = 0; i < 6; i++) pk.update(1 / 60, plHM, null);
  ok(pk.hearts.some((h) => h.on && h.x === CFG.gems.magnetBase + 60), '12.6 heartMagnet L1: beyond the pull radius the heart waits');
  // L5 (pull 2.0) reaches it.
  const plHM5 = { x: 0, y: 0, r: 14, magnet: 1, synergies: { heartMagnet: 5 } };
  for (let i = 0; i < 6; i++) pk.update(1 / 60, plHM5, null);
  ok(pk.hearts.some((h) => h.on && h.x < CFG.gems.magnetBase + 60), '12.6 heartMagnet L5: doubled pull radius reaches the far heart');

  // Sync wire: synergy LEVELS ride the player snapshot (slot layout derived from key counts).
  const pSnap = new Player({}); pSnap.reset(0, 0);
  pSnap.synergies.heartPiercer = 3;
  const snapSlots = playerSnap(pSnap);
  const S_OFF = 9 + WEAPON_KEYS.length + PASSIVE_KEYS.length; // mirrors sync.js header offsets
  ok(snapSlots.length === SNAP_PLEN && snapSlots[S_OFF + SYNERGY_KEYS.indexOf('heartPiercer')] === 3,
    '12.6 sync: heartPiercer level 3 survives the wire (58-slot snap, 29.14 rebaseline)');
}

// --- 19.1 equipment row (HTML + CSS content asserts; browser render verified on Pages) ---
{
  const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
  ok(/<div id="equip-row" role="list" aria-label="Equipped weapons and items"><\/div>/.test(html),
    '19.1: #equip-row present in HUD (role=list, labelled) inside the run UI');
  const css = readFileSync(fileURLToPath(new URL('../css/main.css', import.meta.url)), 'utf8');
  ok(/#equip-row \{[^}]*flex-wrap: wrap/.test(css),
    '19.1: equipment row wraps so cap-5 weapons + synergies + passives never overflow');
  ok(/\.equip-lvl \{[^}]*background: #0b1220[^}]*color: #ffe9b0/.test(css),
    '19.1: chip level number is high-contrast (bright on solid pill) legible over any tile');
}

// --- 26.1 icon overhaul: category plate system + every icon kind-tagged (source-level) ---
{
  const src = readFileSync(new URL('../js/art/items.js', import.meta.url), 'utf8');
  ok(/const PLATE = \{/.test(src) && /weapon: \{ bgA/.test(src) && /passive: \{ bgA/.test(src) && /synergy: \{ bgA/.test(src),
    '26.1: PLATE category table (weapon/passive/synergy) exists in items.js');
  const kinds = {
    weapon: ['wand', 'garlic', 'axe', 'blades', 'pistols', 'bombs', 'flame', 'snowball', 'ringLightning', 'bow'],
    passive: ['boots', 'heart', 'sword', 'magnet', 'sigil', 'gem', 'dash'],
    synergy: ['blight', 'tempest', 'inferno', 'napalm', 'phoenix', 'flamingArrows', 'heartPiercer', 'blueFlame', 'stormVolley', 'heartMagnet'],
  };
  let badKind = null;
  for (const [kind, names] of Object.entries(kinds))
    for (const n of names)
      if (!new RegExp(`icons\\.${n} = make\\('${kind}'`).test(src)) badKind = `${n}≠${kind}`;
  ok(badKind === null, `26.1: every icon is make()-tagged with its category (${badKind || 'all 22 correct'})`);
  const untagged = (src.match(/icons\.\w+ = make\(\(/g) || []).length;
  ok(untagged === 0, '26.1: no icon left on the old untagged make(fn) signature');
}

// --- 26.2 card DOM + CSS overhaul (content asserts; boot E2E drives the real handler) ---
{
  const src = readFileSync(new URL('../js/ui/screens.js', import.meta.url), 'utf8');
  ok(/card\.className = `card \$\{c\.kind\}/.test(src),
    '26.2: card element carries its kind class (weapon/passive/synergy accent hook)');
  ok(/setProperty\('--i'/.test(src), "26.2: deal-in stagger index (--i) set per card");
  ok(/className = 'card-plaque'/.test(src), '26.2: icon is set into a framed plaque');
  ok(/className = 'card-pips'/.test(src), '26.2: level pips row built for weapon/passive cards');
  const css = readFileSync(new URL('../css/main.css', import.meta.url), 'utf8');
  ok(/\.card\.weapon \{[^}]*#5eead4/.test(css) && /\.card\.passive \{[^}]*accent2/.test(css) && /\.card\.synergy \{[^}]*#be8cff/.test(css),
    '26.2: kind accent rules (teal/amber/violet) present');
  ok(/@keyframes card-deal/.test(css) && /animation-delay: calc\(var\(--i, 0\)/.test(css),
    '26.2: deal-in keyframe animation + per-card stagger delay');
  ok(/\.card-plaque \{[^}]*border: 1px solid var\(--k\)/.test(css),
    '26.2: plaque frame uses the kind accent color');
  ok(/\.card\.synergy \.card-badge/.test(css), '26.2: FUSED badge has its own violet style');
  ok(/@media \(prefers-reduced-motion: reduce\)/.test(css), '26.2: deal-in animation respects reduced-motion');
}

// ============ Phase 17 — selectable run durations & boss schedule (PLAN §3.10, D65) ============
{
  const D = CFG.run.durations;
  ok(D.order.length === 5 && CFG.run.defaultDuration === 'd5', '17.1: 5 durations, default d5');
  ok(D.d5.time === 300 && D.d10.time === 600 && D.d15.time === 900 && D.d20.time === 1200 && D.endless.time === null,
    '17.1: duration times 5/10/15/20 min + ENDLESS (null)');
  ok(D.d5.time === CFG.run.time && D.d5.label === '5:00', '17.1: d5 = the old fixed 5:00 run (solo invariance)');
  ok(CFG.run.bossAt === 240 && CFG.run.bossEvery === 300, '17.1: boss cadence — first 4:00, every 5:00');
  ok(CFG.meta.durKey === 'qsurv.duration.v1', '17.2: per-level duration LS key');
}
{
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  ok(eq(bossTimes(300), [240]), '17.4: 5-min run → bosses [240]');
  ok(eq(bossTimes(600), [240, 540]), '17.4: 10-min run → [240, 540]');
  ok(eq(bossTimes(900), [240, 540, 840]), '17.4: 15-min run → exactly 3 events (user-confirmed example)');
  ok(eq(bossTimes(1200), [240, 540, 840, 1140]), '17.4: 20-min run → 19:00 fires (T < run end)');
  ok(eq(bossTimes(null), []) && eq(bossTimes(undefined), []), '17.4: ENDLESS → no finite table (cadence streams)');
}
{
  ok(durationFor({}, 'm01') === 'd5' && durationFor({ m01: 'nope' }, 'm01') === 'd5' && durationFor(null, 'm03') === 'd5',
    '17.2: durationFor → d5 on empty/unknown/no-map');
  ok(durationFor({ m02: 'd15' }, 'm02') === 'd15' && durationFor({ m02: 'd15' }, 'm03') === 'd5',
    '17.2: durationFor is per-level (m03 unaffected by m02 pick)');
  ok(Object.keys(loadDurations('absent-key.ls')).length === 0, '17.2: loadDurations without storage → {}');
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const m = loadDurations(CFG.meta.durKey);
  m.m02 = 'd15'; m.m03 = 'endless';
  saveDurations(CFG.meta.durKey, m);
  const back = loadDurations(CFG.meta.durKey);
  ok(back.m02 === 'd15' && durationFor(back, 'm02') === 'd15', '17.2: duration localStorage round-trip (m02 → d15)');
  ok(durationFor(back, 'm03') === 'endless', '17.2: ENDLESS persists as a selection');
  ok(durationFor(back, 'm01') === 'd5', '17.2: unset level falls back to d5');
  globalThis.localStorage.setItem(CFG.meta.durKey, '{"m02":"bogus","nolevel":"d10","x":1}');
  ok(Object.keys(loadDurations(CFG.meta.durKey)).length === 0, '17.2: corrupt map entries dropped');
  globalThis.localStorage.setItem(CFG.meta.durKey, 'not json');
  ok(Object.keys(loadDurations(CFG.meta.durKey)).length === 0, '17.2: corrupt JSON → {}');
}
{
  const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
  ok(/<div id="duration-select" class="duration-select" role="radiogroup" aria-label="Select run duration"><\/div>/.test(html),
    '17.2: #duration-select radiogroup beside the level select');
  const css = readFileSync(fileURLToPath(new URL('../css/main.css', import.meta.url)), 'utf8');
  ok(/\.duration-select \{[^}]*flex-wrap: wrap/.test(css), '17.2: duration chips wrap (mobile layout)');
  ok(/\.dur-chip \{[^}]*min-width: 72px[^}]*min-height: 40px/.test(css), '17.2+22.11: duration chips 72 px wide × 40 px tall (user ruling 2026-09-07: half height, still accessible)');
  ok(/\.dur-chip\.sel \{/.test(css), '17.2: selected-chip style present');
  const ssrc = readFileSync(fileURLToPath(new URL('../js/ui/screens.js', import.meta.url)), 'utf8');
  ok(/function renderDurations\(\)/.test(ssrc) && /game\.setDuration\(key\)/.test(ssrc),
    '17.2: renderDurations + game.setDuration wiring live');
  ok(/renderLevels\(\); renderDurations\(\);/.test(ssrc), '17.2: menu screen renders both selects');
}

// --- Phase 18: level-up screen actions SKIP / RE-ROLL / BANISH (D84) ---
{
  // CFG shape: 10 levels each, tier ladder 300→3000; existing curves slowed (D84).
  const A = CFG.meta.actions;
  ok(A.order.length === 3 && A.order.every((k) => A[k]), '18.1: actions order = skip/reroll/banish');
  for (const k of A.order) {
    ok(A[k].max === 10 && A[k].cost.length === 10 && A[k].cost[0] === 300 && A[k].cost[9] === 3000 &&
      A[k].cost.every((c, i) => c === 300 * (i + 1)),
      `18.1: ${k} tiers [300..3000], max 10 (level 1 = unlock, +1 each)`);
  }
  ok(Object.values(CFG.meta.upgrades).every((u) => u.cost.length === 5 &&
    u.cost.every((c, i) => c === [50, 100, 200, 400, 1000][i])),
    '18.1: D84 slow-down — all 5 upgrade curves = [50,100,200,400,1000]');
  ok(skipXp(1) === 2 && skipXp(2) === 4 && skipXp(10) === Math.floor(0.66 * CFG.xpNeed(10)),
    '18.1: skipXp = floor(0.66 × xpNeed(level)) (L1→2, L2→4)');

  // Default locked; legacy saves without the key default locked; clamped on load.
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  ok(Object.values(loadMeta('p18.absent').actions).every((v) => v === 0), '18.2: fresh profile → actions locked (level 0)');
  globalThis.localStorage.setItem(CFG.meta.storageKey, JSON.stringify({ shards: 100, upgrades: { maxHp: 2 } }));
  const legacy = loadMeta(CFG.meta.storageKey);
  ok(legacy.upgrades.maxHp === 2 && Object.values(legacy.actions).every((v) => v === 0),
    '18.2: legacy save (no actions key) → actions default locked, no data loss');
  globalThis.localStorage.setItem(CFG.meta.storageKey, JSON.stringify({ shards: 1, upgrades: {}, actions: { skip: 99, reroll: -3, banish: 4.7 } }));
  const clamped = loadMeta(CFG.meta.storageKey);
  ok(clamped.actions.skip === 10 && clamped.actions.reroll === 0 && clamped.actions.banish === 4,
    '18.2: loadMeta clamps actions to [0, max]');

  // actionCost + buyAction
  ok(actionCost('skip', 0) === 300 && actionCost('skip', 9) === 3000 && actionCost('skip', 10) === null,
    '18.2: actionCost ladder + null at max');
  const m18 = { shards: 300, upgrades: {}, actions: { skip: 0, reroll: 0, banish: 0 } };
  ok(buyAction(m18, 'skip') === true && m18.actions.skip === 1 && m18.shards === 0,
    '18.2: buyAction unlock spends exactly 300');
  ok(buyAction(m18, 'skip') === false && m18.actions.skip === 1, '18.2: buyAction denied when unaffordable');
  ok(buyAction(m18, 'bogus') === false, '18.2: buyAction unknown key → false');
  m18.shards = 9999; m18.actions.skip = 10;
  ok(buyAction(m18, 'skip') === false && m18.actions.skip === 10, '18.2: buyAction denied at max (10)');

  // applyMeta seeds per-run use counters (capped); legacy meta without actions → all locked.
  const pm = { passives: {} };
  applyMeta(pm, { shards: 0, upgrades: {}, actions: { skip: 3, reroll: 20, banish: 0 } });
  ok(pm.actLeft.skip === 3 && pm.actLeft.reroll === 10 && pm.actLeft.banish === 0,
    '18.3: applyMeta seeds actLeft from shop levels, capped at max');
  const pm2 = { passives: {} };
  applyMeta(pm2, { shards: 0, upgrades: {} });
  ok(Object.values(pm2.actLeft).every((v) => v === 0), '18.3: applyMeta legacy meta (no actions) → zero uses');

  // Player fields fresh every run + banished Set.
  const pl = new Player({});
  pl.reset(0, 0);
  ok(pl.actLeft.skip === 0 && pl.actLeft.reroll === 0 && pl.actLeft.banish === 0 &&
    pl.banished instanceof Set && pl.banished.size === 0,
    '18.3: Player.reset → fresh zeroed actLeft + empty banished (per-run reseed)');

  // cardOffers banished param: excludes unowned AND freezes owned (D84).
  const w1 = { wand: 1 }, pa1 = { dmg: 2 }, sy1 = {};
  const seen = (banished, draws = 60) => {
    const keys = new Set();
    for (let i = 0; i < draws; i++) {
      const rng = mulberry32(1000 + i);
      for (const c of cardOffers(w1, pa1, sy1, rng, 5, null, null, banished)) keys.add(`${c.key}@${c.level}`);
    }
    return keys;
  };
  ok(seen(null).has('dmg@3'), '18.4: owned dmg Lv2 is offered at Lv3 when not banished');
  ok(!seen(new Set(['dmg'])).has('dmg@3') && !seen(new Set(['dmg'])).has('dmg@1'),
    '18.4: banished owned passive freezes at rank — no upgrade offers at all');
  ok(!seen(new Set(['bow'])).has('bow@1'), '18.4: banished unowned weapon never appears run-long');
  // Per-picker isolation: the param only touches that picker's pool.
  {
    const rngA = mulberry32(5), rngB = mulberry32(5);
    const banned = cardOffers(w1, pa1, sy1, rngA, 5, null, null, new Set(['wand']));
    const plain = cardOffers(w1, pa1, sy1, rngB, 5, null, null, new Set());
    ok(banned.every((c) => c.key !== 'wand'), '18.4: picker A banishes wand → gone from A offers');
    ok(JSON.stringify(plain) === JSON.stringify(cardOffers(w1, pa1, sy1, mulberry32(5), 5, null, null, null)),
      '18.4: empty banished Set ≡ null (solo invariance — no pool or rng shift)');
  }

  // Reroll (VS shape): exclusion applies to THAT redraw only; same rng re-sees the keys.
  {
    const keys1 = cardOffers(w1, pa1, sy1, mulberry32(9), 5, null, null, null).map((c) => c.key);
    const ex = new Set(keys1);
    const draw2 = cardOffers(w1, pa1, sy1, mulberry32(9), 5, null, null, ex);
    ok(draw2.every((c) => !ex.has(c.key)), '18.4: reroll draw excludes the current offer keys');
    const draw3 = cardOffers(w1, pa1, sy1, mulberry32(9), 5, null, null, null);
    ok(JSON.stringify(draw3.map((c) => c.key)) === JSON.stringify(keys1),
      '18.4: excluded keys are re-seen on later draws (exclusion is per-reroll, not run-long)');
  }

  // Profile carries clamped shop LEVELS (host seeds each seat from it).
  const prof = profileFromMeta({ shards: 5, upgrades: {}, actions: { skip: 12, reroll: -2, banish: 3 } });
  ok(prof.actions.skip === 10 && prof.actions.reroll === 0 && prof.actions.banish === 3,
    '18.3: profileFromMeta carries clamped action levels');
  const prof0 = profileFromMeta({ shards: 0, upgrades: {} });
  ok(Object.values(prof0.actions).every((v) => v === 0), '18.3: legacy profile (no actions) → locked levels');
}

// --- 22.9–22.11 playtest defects r4 (menu scroll trap, dash leak, chip height) ---
{
  const css = readFileSync(fileURLToPath(new URL('../css/main.css', import.meta.url)), 'utf8');
  ok(/\.screen \{[^}]*align-items: safe center/.test(css),
    '22.9: .screen uses safe centering (tall menus top-align + scroll; no unreachable clipped top)');
  ok(/body\.touch #touch-ui\[hidden\] \{ display: none; \}/.test(css),
    '22.10: #touch-ui[hidden] beats the body.touch display rule (outranks specificity 111)');
  const hsrc = readFileSync(new URL('../js/ui/hud.js', import.meta.url), 'utf8');
  ok(/touchUi\.hidden = !show;/.test(hsrc),
    '22.10: hud.update() gates #touch-ui to run states (PLAYING/LEVELUP/PAUSED only)');
  ok(/\.dur-chip \{[^}]*min-width: 72px[^}]*min-height: 40px/.test(css),
    '22.11: duration chips 72 px wide × 40 px tall (user ruling: half height still accessible)');
}

// --- Phase 14: in-run Soulshards counter + unified co-op earnings (D54) ---
{
  // 14.2 sanitizer: positive integer passes (floored), everything else → null (no accrual)
  ok(sanitizeShards(52) === 52 && sanitizeShards(52.9) === 52,
    '14.2: sanitizeShards keeps positive integers (floored)');
  ok(sanitizeShards(0) === null && sanitizeShards(-5) === null && sanitizeShards(Number.NaN) === null &&
     sanitizeShards(Infinity) === null && sanitizeShards('52') === null && sanitizeShards(null) === null &&
     sanitizeShards(undefined) === null,
    '14.2: sanitizeShards rejects 0/negative/NaN/Infinity/non-number → null');
  // 14.1 projected award = the run-end formula on the live score (no economy change, O1=A)
  ok(shardsFor({ score: 400, victory: false }) === 1 && shardsFor({ score: 399, victory: false }) === 0,
    '14.1: live projection floor(score/400) boundary exact');
  ok(shardsFor({ score: 3999, victory: false }) === 9 && shardsFor({ score: 4000, victory: true }) === 35,
    '14.1: projection mid-run + victory bonus (+25) unchanged');
  // HTML + CSS + wiring content asserts
  const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
  ok(/<div id="hud-shards"[^>]*>0 ◆<\/div>/.test(html), '14.1: #hud-shards counter in #hud-top markup');
  const css = readFileSync(fileURLToPath(new URL('../css/main.css', import.meta.url)), 'utf8');
  ok(/#hud-shards \{/.test(css), '14.1: #hud-shards styled');
  const hsrc = readFileSync(new URL('../js/ui/hud.js', import.meta.url), 'utf8');
  ok(/setTxt\(hudShards, `\$\{shardsFor\(\{ score: game\.liveScore\(\), victory: false \}\)} ◆`\);/.test(hsrc),
    '14.1: hud.update() drives #hud-shards change-detected (setTxt) from liveScore');
  const gsrc = readFileSync(new URL('../js/core/game.js', import.meta.url), 'utf8');
  ok(/sendClosed\('run-end', gain\)/.test(gsrc),
    '14.2: host run-end rides the run-level shard total on the room close');
  ok(/case MSG\.closed: this\._netClosed\(m\); break;/.test(gsrc) &&
     /sanitizeShards\(m && m\.shards\)/.test(gsrc),
    '14.2: client _netClosed accrues the sanitized wire total locally');
  const ssrc = readFileSync(new URL('../tools/serve.mjs', import.meta.url), 'utf8');
  ok(/Math\.floor\(num\(m\.shards\)\)/.test(ssrc) && /shards > 0 \? \{ t: MSG\.closed, reason: 'host', shards \}/.test(ssrc),
    '14.2: serve relays a sanitized shards field on host close only');
}

// --- loop slice audit: rAF-chain survival + CFG-bound guardrails ------------
{
  // The Loop schedules the next frame BEFORE running update/render, so a throwing
  // frame costs one bad frame instead of severing the chain (game freezes forever).
  const queue = [];
  globalThis.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
  globalThis.cancelAnimationFrame = () => { queue.length = 0; }; // one frame pending at a time in this test
  const { Loop } = await import('../js/core/loop.js');

  ok(CFG.loop.maxFrameDt > 0 && CFG.loop.maxSteps >= 1,
    'CFG.loop: frame-clamp + backlog-cap knobs live in config (rule 5)');

  let ups = 0, ren = 0, boom = true;
  const loop = new Loop({
    update: () => { ups++; if (boom) { boom = false; throw new Error('update boom'); } },
    render: () => { ren++; },
  });
  loop.start();
  ok(queue.length === 1, 'loop: start() schedules exactly one frame');
  try {
    // In the browser the throw is swallowed by the rAF machinery; calling cb by
    // hand lets it escape, so the harness must absorb it to observe the chain.
    queue.shift()(performance.now() + 1000 / 60);
  } catch { /* intentional 'update boom' */ }
  ok(queue.length === 1, 'loop: chain SURVIVES a throwing update (next frame scheduled first)');
  queue.shift()(performance.now() + 1000 / 60);
  ok(ups >= 2 && ren === 1,
    `loop: the throwing frame skips its own render, the next frame renders again (ups=${ups} ren=${ren})`);
  loop.stop();
  ok(queue.length === 0, 'loop: stop() leaves no orphan frame queued');

  // Hit-stop freezes the sim but the render pass must keep running.
  const hs = new Loop({ update: () => { ups++; }, render: () => { ren++; } });
  hs.start();
  hs.hitStop(0.2);
  const u0 = ups, r0 = ren;
  queue.shift()(performance.now() + 1000 / 60);
  ok(ups === u0 && ren === r0 + 1, 'loop: hit-stop freezes update steps, render still runs');
  hs.stop();

  // Backlog guardrail: a 1 s gap is clamped to maxFrameDt and never catches up
  // more than maxSteps steps in one frame (no death-spiral), debt dropped after.
  const bl = new Loop({ update: () => { ups++; }, render: () => {} });
  bl.start();
  const u1 = ups;
  queue.shift()(performance.now() + 1000);
  ok(ups - u1 === CFG.loop.maxSteps,
    `loop: 1 s gap runs exactly maxSteps (${CFG.loop.maxSteps}) catch-up steps (got ${ups - u1})`);
  ok(bl.acc === 0, 'loop: leftover backlog dropped after the cap (no debt carried)');
  bl.stop();
}

// --- Slice-audit regressions (combat/enemies/player review, 2026-10-20) ---
{
  // Over-heal pool eaten by a hit crossing maxHp: the decay branch must not pull hp
  // back up to maxHp on a stale counter (the free-heal bug).
  const pc = new Player({}); pc.reset(0, 0); pc.synergies.phoenix = 1;
  pc.applyOverHeal(20);
  new Combat().damagePlayer(pc, 30, 10, 0); // hp (maxHp+20) lands below maxHp
  const hpAfterHit = pc.hp;
  pc._overHeal(1 / 60);
  ok(pc.hp === hpAfterHit && pc.overHeal === 0,
    '23.3 fix: a hit through the over-heal pool cannot re-arm it via decay (no free heal)');

  // AoE bbox headroom: a big foe whose centre sits past the raw blast bbox but within
  // blast+foe r is still a grid candidate (the exact radius test decides the hit).
  const g = new HashGrid(CFG.ai.gridCell);
  const big = { x: 104, y: 0, r: 30, hp: 500, maxHp: 500, vx: 0, vy: 0, dead: false, flash: 0,
    burnT: 0, blightT: 0, slowStacks: [], shockStacks: [], freezeT: 0, stunT: 0 };
  g.add(big.x, big.y, big);
  const ca = new Combat();
  ca._explode({ x: 0, y: 0, radius: 95, dmg: 10, napalm: null, owner: null }, { grid: g });
  ok(big.hp === 490, 'AoE fix: a big foe centred just past the raw blast bbox is still hit (bbox carries foe-r headroom)');

  // Tempest bolts ride with their shooter (kill credit / blight routing, co-op 11.2).
  const plT = { x: 300, y: 300, r: 14, dmgMul: 1, def: { h: 40 }, weapons: { blades: 1 },
    synergies: { tempest: 1 }, _orbitT: 0, _tempestT: CFG.synergies.tempest.levels[0].rate };
  const esT = { grid: { near: () => [] }, list: [] };
  const ct = new Combat(); ct.enemies = esT;
  ct._orbiters(0.01, plT, esT);
  ok(ct.bolts.length > 0 && ct.bolts.every((b) => b.owner === plT),
    'tempest fix: bolts fire with an owner (kill credit no longer falls back to the local player)');

  // Cultist orbs carry the spawn-scaled dmg (diff × coopS), like contact damage does.
  const es4 = new Enemies();
  es4.diff = 2; es4.coopS = 1.5;
  const cult = es4.spawn('cultist', 100, 100);
  cult.cd = 0;
  const tgt = { x: 360, y: 100, dead: false, r: 14 };
  es4._ai(cult, 1 / 60, [tgt], { collidersNear: () => [] }, null);
  ok(es4.orbs.length === 1 && es4.orbs[0].dmg === cult.dmg && cult.dmg === CFG.enemies.cultist.dmg * 3,
    'orb fix: projectile carries the spawn-scaled shooter dmg (not the raw config base)');

  // _axeCd stays bounded for axe-only runners (they never enter _orbiters, where the
  // old cap lived — the Map grew every run with fresh spawn objects as keys).
  const cx = new Combat();
  cx.fireAxe(100, 100, 0, 5, 1, 1, { x: 100, y: 100, def: { h: 40 } });
  const mob = [];
  for (let i = 0; i < 513; i++) mob.push({ x: 100, y: 100, r: 12, hp: 999, maxHp: 999, vx: 0, vy: 0,
    dead: false, flash: 0, burnT: 0, blightT: 0, slowStacks: [], shockStacks: [], freezeT: 0, stunT: 0 });
  const esX = { grid: { near: () => mob }, list: mob };
  cx._axes(1 / 60, esX);
  cx._axes(1 / 60, esX);
  ok(cx._axeCd.size <= 512, '_axeCd bound: capped even without blades (axe-only runner cannot leak the Map)');
}

// ——— Slice-audit regressions (pickups/particles/spawner, 2026-10-20) ———
{
  // Particles: draw strings pre-rendered at spawn (perf guardrail: no string
  // concat inside draw()) + live-count saturation short-circuit + steal order.
  const pt = new Particles(8);
  ok(pt.live === 0, 'particle live count: starts empty');
  pt.dot(0, 0, 0, 0, 1, 2, 1, 2, 3);
  ok(pt.live === 1 && pt.pool.every((p) => !p.on || (typeof p.col === 'string' && p.col.startsWith('rgb('))),
    'particle draw strings: dot() pre-renders the fill color at spawn');
  pt.text(0, 0, '-5', [255, 0, 0]);
  ok(pt.live === 2 && pt.pool.some((p) => p.on && p.fnt.startsWith('700 ')),
    'particle draw strings: text() pre-renders the font at spawn');
  for (let i = 0; i < 6; i++) pt.dot(i, 0, 0, 0, 1, 2, 0, 0, 0); // saturate (slots 2..7)
  ok(pt.live === 8, 'particle live count: saturated at cap');
  pt.dot(99, 0, 0, 0, 1, 2, 0, 0, 0); // pool full → steal the ring head (slot 0, oldest)
  ok(pt.live === 8 && pt.pool[0].x === 99 && pt.pool[1].str === '-5',
    'particle saturation: steal recycles the ring head, live unchanged');
  for (let i = 0; i < 100; i++) pt.update(0.02); // 2 s > every life → all expire
  ok(pt.live === 0, 'particle live count: update() expiry zeroes live');
  pt.dot(0, 0, 0, 0, 1, 2, 0, 0, 0);
  pt.reset();
  ok(pt.live === 0 && pt.pool.every((p) => !p.on), 'particle live count: reset zeroes live');

  // escapeFromSpots: optional `out` writes in place (zero-alloc per-step nudge);
  // the 4-arg form keeps returning a fresh point (game.js kill drops).
  const spot = { x: 1000, y: 800, rx: 200, ry: 90, ellipse: true };
  const buf = { x: 0, y: 0 };
  ok(escapeFromSpots(1000, 800, [spot], 6, buf) === buf && buf.x === 1206 && buf.y === 800,
    'pickup escape reuse: out param writes in place (same math, dead-center → +x edge + pad)');
  const fresh = escapeFromSpots(1300, 700, [spot], 6);
  ok(fresh !== buf && fresh.x === 1300 && fresh.y === 700, 'pickup escape reuse: 4-arg call still allocates a fresh point');

  // Twin guards (rule 16): magnet flight + decay each appear exactly once in the module.
  const psrc = readFileSync(fileURLToPath(new URL('../js/entities/pickups.js', import.meta.url)), 'utf8');
  ok((psrc.match(/\(magR - d\) \* 6/g) || []).length === 1,
    'pickup magnet twin guard: the flight speed formula lives in one shared helper');
  ok((psrc.match(/Math\.exp\(-3 \* dt\)/g) || []).length === 1,
    'pickup drag hoist: the decay exp runs once per step, not once per slot');

  // 17.3 boundary (spawner.bossTimes vs game.js `nextT < runDuration`):
  // an event landing EXACTLY at run end never fires (strict <).
  const eq2 = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  ok(eq2(bossTimes(240), []) && eq2(bossTimes(241), [240]),
    'boss boundary: event at exactly run end does not fire (strict <, matches game.js)');
}

// --- net-slice audit regressions (2026-10-20) ---
{
  // conn.js: a send issued while the socket is still CONNECTING must be queued
  // and flushed on open — attachNet calls sendHello synchronously right after
  // connect(), and the old guard dropped it (co-op join never reached the server).
  const { createGameServer, attachCoopRoom } = await import('./serve.mjs');
  const { CoopConn } = await import('../js/net/conn.js');
  const srv = createGameServer();
  attachCoopRoom(srv);
  await new Promise((res) => srv.listen(0, '127.0.0.1', res));
  const url = `ws://127.0.0.1:${srv.address().port}/`;
  const got = [];
  const cc = new CoopConn(url);
  cc.onMessage = (m) => got.push(m);
  cc.connect();
  cc.sendHello('m01', { maxHpBonus: 0 }); // before open — must queue, not drop
  const waitFor = (pred, what, ms = 4000) => new Promise((res, rej) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      const m = got.find(pred);
      if (m) { clearInterval(iv); res(m); }
      else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error('conn audit timeout: ' + what)); }
    }, 5);
  });
  const joined = await waitFor((m) => m.t === 'joined', 'joined after pre-open hello');
  ok(joined.seat === 0 && attachCoopRoom.room().players.length === 1,
    'conn audit: hello queued while CONNECTING flushes on open and seats the client');
  cc.close();
  await new Promise((res) => { srv.closeAllConnections?.(); srv.close(res); });
  await new Promise((res) => setTimeout(res, 120)); // let any close-handshake event land
  ok(!got.some((m) => m.t === 'netclosed'),
    'conn audit: deliberate close() detaches handlers — no late netclosed after leave');

  // sync.js unpackState: value-level sanitization (serve.mjs relays inner arrays
  // unvalidated — it only caps counts; the client gate must catch garbage itself).
  const st0 = stateMsg(1, 1, 1, 1, [new Array(SNAP_PLEN).fill(1)], [[1, 0, 1, 1, 1, 1, 0, 0]], [[0, 0, 1, 1]]);
  ok(unpackState(st0) === st0, 'unpack audit: valid numeric body accepted');
  const badP = (i, v) => { const p = new Array(SNAP_PLEN).fill(1); p[i] = v; return unpackState({ ...st0, players: [p] }); };
  ok(badP(0, '10') === null && badP(2, NaN) === null,
    'unpack audit: non-numeric player slot → null (no NaN/string poisoning)');
  ok(unpackState({ ...st0, enemies: [[1, 99, 1, 1, 1, 1, 0, 0]] }) === null,
    'unpack audit: enemy type index out of ENEMY_KEYS range → null');
  ok(unpackState({ ...st0, enemies: [[1, 0, 'x', 1, 1, 1, 0, 0]] }) === null,
    'unpack audit: non-numeric enemy slot → null');
  ok(unpackState({ ...st0, pickups: [[0, -1, 1, 1]] }) === null && unpackState({ ...st0, pickups: [[2, 0, 1, 1]] }) === null,
    'unpack audit: pickup kind/slot out of domain → null');
  const pk3 = { gems: [{ on: true }, { on: false }], hearts: [] };
  applyPickupSnaps(pk3, [[0, 9, 1, 1]]); // out-of-range pool slot must not throw
  ok(pk3.gems.every((g) => !g.on), 'applyPickupSnaps audit: out-of-range pool slot ignored');
}

// --- systems/art slice audit regressions (2026-10-20) ---
{
  // camera: view-edge clamp under zoom extremes (view far smaller / larger than the world)
  const cam = new Camera();
  cam.setView(100, 100);
  for (let i = 0; i < 600; i++) cam.update(1 / 60, 0, 0, 0, 0);
  ok(cam.x === 50 && cam.y === 50, 'camera: tiny view at world corner clamps to view half-edge');
  cam.setView(9000, 9000); // view wider than the whole world → camera must dead-center
  for (let i = 0; i < 120; i++) cam.update(1 / 60, 4000, 3000, 0, 0);
  ok(cam.x === CFG.world.w / 2 && cam.y === CFG.world.h / 2,
    'camera: view ≥ world size centers on world (no inverted clamp)');
  ok(cam.ox === 0 && cam.oy === 0, 'camera: zero trauma → zero shake offset');

  // lighting: base darkness REPLACES the persistent half-res canvas ('copy'), and the
  // fillStyle is cached per base (same string across frames — no per-frame concat).
  const l = new Lighting();
  const dark = [];
  const mkCtx = () => ({
    globalCompositeOperation: '', globalAlpha: 1, fillStyle: '',
    fillRect() { dark.push([this.globalCompositeOperation, this.fillStyle]); },
    drawImage() {}, save() {}, restore() {},
  });
  const lg2 = mkCtx(), screen = mkCtx();
  l.cv = { width: 1, height: 1 }; l.ctx = lg2; l.w = 8; l.h = 4; // skip the browser resize()
  const view = { x: 0, y: 0, w: 16, h: 8 };
  l.draw(screen, view, [], 0);
  l.draw(screen, view, [], 1);
  ok(dark.length === 2 && dark.every((d) => d[0] === 'copy'),
    'lighting: per-frame base fill uses copy (no cross-frame darkness alpha stacking)');
  ok(dark[0][1] === dark[1][1] && dark[0][1] === `rgba(${CFG.lighting.base},${CFG.lighting.baseAlpha})`,
    'lighting: darkness fillStyle cached per base, honors CFG.lighting');

  // base.shadowSprite: gradient + arc centred in the SQUARE bake canvas (rx,rx), so
  // non-square callers (decorShadow 48×15) squash a whole ellipse, not a clipped top.
  const seen = {};
  const fakeG = () => ({
    createRadialGradient: (x0, y0, r0, x1, y1, r1) => { seen.grad = [x0, y0, r0, x1, y1, r1]; return { addColorStop() {} }; },
    createLinearGradient: () => ({ addColorStop() {} }),
    beginPath() {}, fill() {}, fillRect() {}, drawImage() {},
    arc: (x, y, r) => { seen.arc = [x, y, r]; },
  });
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: fakeG }) };
  shadowSprite(48, 15);
  delete globalThis.document;
  ok(seen.grad[0] === 48 && seen.grad[1] === 48 && seen.grad[4] === 48,
    'shadowSprite: gradient centred at (rx,rx) — no top-clip band for ry < rx');
  ok(seen.arc[0] === 48 && seen.arc[1] === 48 && seen.arc[2] === 48,
    'shadowSprite: fill arc matches the gradient centre');
}

// --- Input: focused UI owns Space; joystick knob follows the most-deflected stick ---
{
  const keyFns = [];
  const prevAdd = globalThis.addEventListener;
  const prevDoc = globalThis.document;
  globalThis.addEventListener = (type, fn) => { if (type === 'keydown') keyFns.push(fn); };
  globalThis.document = { addEventListener() {} };
  globalThis.innerWidth = 800; globalThis.innerHeight = 600;
  const { Input } = await import('../js/core/input.js');
  const canvas = { addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0 }) };
  const knob = { style: {} };
  const inp = new Input(canvas, { joyBase: { style: {} }, joyKnob: knob });
  const fire = (target) => keyFns.forEach((f) => f({ code: 'Space', repeat: false, preventDefault() {}, target }));
  fire({ closest: () => null }); // focus on the game area: Space = dash (desktop quick-dash)
  ok(inp.dashEdge === true, 'input: Space outside focused UI still queues a dash');
  inp.consumeDash();
  fire({ closest: (sel) => (sel.includes('button') ? { tag: 'btn' } : null) }); // focused button/card owns Space
  ok(inp.dashEdge === false, 'input: Space on focused UI never reaches the game hotkeys');
  // Multi-touch: the knob must follow the most-deflected stick, not the first finger
  // (sticks carry no .m — the old comparison was always undefined).
  inp.sticks.set(1, { ox: 0, oy: 0, dx: 3, dy: 0 });
  inp.sticks.set(2, { ox: 0, oy: 0, dx: 40, dy: 0 });
  inp.updateJoyUI();
  ok(/translate\(40px, 0px\)/.test(knob.style.transform), 'input: joystick knob follows the most-deflected stick');
  globalThis.addEventListener = prevAdd;
  if (prevDoc === undefined) delete globalThis.document; else globalThis.document = prevDoc;
  delete globalThis.innerWidth; delete globalThis.innerHeight;
}

// --- Audio/utils slice audit (2026-10-20): normAngle wrap + non-finite guard,
// HashGrid packed keys with scratch reuse (contract), negative coords, Infinity guards ---
{
  ok(Number.isNaN(normAngle(Infinity)) && Number.isNaN(normAngle(-Infinity)) && Number.isNaN(normAngle(NaN)),
    'normAngle: non-finite → NaN (no infinite loop)');
  ok(near(normAngle(TAU * 3 + 1), 1) && near(normAngle(-TAU * 3 - 1), -1), 'normAngle: wraps multiple turns both ways');
  ok(normAngle(Math.PI) === Math.PI && normAngle(3 * Math.PI) === Math.PI && normAngle(-Math.PI) === Math.PI,
    'normAngle: consistent (-PI, PI] seam at +PI');
  const big = normAngle(1e15); // while-loop wrap would crawl; modulo is O(1)
  ok(Number.isFinite(big) && big > -Math.PI && big <= Math.PI, 'normAngle: huge finite angle wraps in O(1)');

  const g = new HashGrid(96);
  const pNeg = { x: -100, y: -100 };
  g.add(pNeg.x, pNeg.y, pNeg); // negative cell index (packed key must handle it)
  ok(g.near(-50, -50).includes(pNeg), 'HashGrid: negative-coord add found by near');
  ok(g.range(0, 0, 150).includes(pNeg), 'HashGrid: negative-coord add found by range');
  const r1 = g.range(0, 0, 150);
  const r1len = r1.length;
  g.near(-50, -50); // near uses its own scratch → range result stays intact
  ok(r1.length === r1len && r1.includes(pNeg), 'HashGrid: near/range scratch buffers do not collide');
  g.near(5000, 5000); // same-kind reuse: previous near result is gone, fresh query correct
  ok(g.near(-50, -50).includes(pNeg), 'HashGrid: reused near buffer refills per query');
  ok(g.range(Infinity, 0, 96).length === 0 && g.range(0, 0, NaN).length === 0,
    'HashGrid.range: non-finite args → empty (no hang)');
  g.clear();
  ok(g.near(-50, -50).length === 0 && g._outRange.length === 0, 'HashGrid.clear: map + scratch released');
}

// --- Phase 21 (D96): nine new weapons + Mirror Shield + Ice Skates — mechanics ---
{
  const C = CFG.combat;
  const mk = (x, y, o = {}) => ({ x, y, vx: 0, vy: 0, r: 13, hp: 300, maxHp: 300, flash: 0, dead: false, boss: false,
    slowStacks: [], freezeT: 0, shockStacks: [], stunT: 0, ...o });
  const stub = (list, extra = {}) => ({ list, grid: { near: () => list, range: () => list }, ...extra });
  const near2 = (a, b, t = 0.6) => Math.abs(a - b) < t;

  // Tank Cannon: pierce + terminal blast (shellBlastK) + heShell ignite on the blast.
  {
    const c = new Combat();
    const owner = { x: 0, y: 0, dmgMul: 1, dead: false };
    const e1 = mk(100, 100), e2 = mk(120, 100), e3 = mk(300, 100);
    c.fireShell(0, 100, 0, 100, 70, { dps: 12, dur: 2.5 }, owner);
    for (let i = 0; i < 120 && c.shells.length; i++) c.update(1 / 60, [], stub([e1, e2, e3]));
    ok(c.shells.length === 0, 'P21 cannon: shell consumed by the terminal blast');
    ok(near2(e1.hp, 150, 0.5) && near2(e2.hp, 150, 0.5),
      `P21 cannon: direct 100 through the first foe; the second takes 100 + blast (×${C.shellBlastK}=50) — both also caught in the blast (${e1.hp}/${e2.hp})`);
    ok(e3.hp === 300, 'P21 cannon: blast radius 70 spares the far foe');
    ok(e1.burnT > 0 && e1.burnDps === 12, 'P21 cannon: heShell ignite rides the blast');
  }

  // Continuous Laser: every frame of `dur`, only foes within `w` of the segment.
  {
    const c = new Combat();
    const pl = new Player({ h: 64 }); pl.reset(0, 0); pl.aimAng = 0;
    const sy = pl._spawnY();
    const e1 = mk(150, sy + 4), e2 = mk(150, sy + 40);
    c.fireBeam(pl, { dur: 0.2, dps: 60, len: 240, w: 12 });
    for (let i = 0; i < 12; i++) c.update(1 / 60, [pl], stub([e1, e2]));
    ok(near2(e1.hp, 300 - 60 * 0.2), `P21 laser: dps×dur over the beam window (${e1.hp})`);
    ok(e2.hp === 300, 'P21 laser: 40 px off the segment stays clean (w 12 + r 13 < 40)');
    c.update(1 / 60, [pl], stub([e1, e2]));
    ok(c.beams.length === 0, 'P21 laser: beam ends after dur');
  }

  // Rolling Boulder: one-per-owner, decay^hits, squish class, avalanche stacks, crumble.
  {
    const c = new Combat();
    const pl = new Player({ h: 64 }); pl.reset(0, 0);
    const e1 = mk(112, 100), e2 = mk(160, 100, { r: 11 }), e3 = mk(208, 100);
    c.fireBoulder(pl, 100, 100, 1, 0, 100, { stacks: 2, bonus: 10 });
    ok(pl._boulder === c.boulders[0] && c.boulders.length === 1, 'P21 boulder: one on screen + owner slot set');
    for (let i = 0; i < 90; i++) c.update(1 / 60, [pl], stub([e1, e2, e3]));
    ok(e1.hp === 300 - 110 && e3.hp === 300 - 110 * Math.pow(C.boulderDecay, 2),
      `P21 boulder: (dmg+bonus)×decay^hits (${e1.hp}/${e3.hp})`);
    ok(e2.dead, 'P21 boulder: squish-kills the r≤12 size class regardless of HP');
    ok(e1.slowStacks.length === 2, 'P21 boulder: avalanche adds its slow stacks per hit');
    // max-hits crumble: six foes on the line → the sixth hit kills the boulder mid-path
    const c2 = new Combat(); const pl2 = new Player({ h: 64 }); pl2.reset(0, 0);
    const six = [150, 200, 250, 300, 350, 400, 450].map((x) => mk(x, 60));
    c2.fireBoulder(pl2, 100, 60, 1, 0, 100, null);
    for (let i = 0; i < 240; i++) c2.update(1 / 60, [pl2], stub(six));
    ok(c2.boulders.length === 0 && pl2._boulder === null, 'P21 boulder: crumbles at maxHits + owner slot cleared');
    ok(six[6].hp === 300, `P21 boulder: the 7th foe never gets hit (budget ${C.boulderMaxHits})`);
    // off-map exit clears the slot too
    const c3 = new Combat(); const pl3 = new Player({ h: 64 }); pl3.reset(60, 60);
    c3.fireBoulder(pl3, 40, 60, -1, 0, 100, null);
    for (let i = 0; i < 30; i++) c3.update(1 / 60, [pl3], stub([]));
    ok(c3.boulders.length === 0 && pl3._boulder === null, 'P21 boulder: rolling off the map clears the one-at-a-time rule');
  }

  // Web-slingers: burst on arrival + HOLD (freeze-like status on the enemy fields).
  {
    const c = new Combat();
    const owner = { x: 0, y: 0, dmgMul: 1, dead: false };
    const e1 = mk(90, 105), e2 = mk(300, 100);
    c.fireWeb(0, 100, 100, 100, 20, 90, 0.8, owner);
    for (let i = 0; i < 30 && c.webs.length; i++) c.update(1 / 60, [], stub([e1, e2]));
    ok(c.webs.length === 0 && e1.hp === 280 && e1.holdT === 0.8, 'P21 web: burst damages + holds the caught foe');
    ok(e2.holdT === undefined && e2.hp === 300, 'P21 web: far foe untouched');
  }

  // Baseball Bat: arc gate + huge knockback + deterministic HOMERUN (Math.random=0 → always).
  {
    const c = new Combat();
    const pl = new Player({ h: 64 }); pl.reset(0, 100); pl.aimAng = 0;
    const oy = pl._spawnY();
    const e1 = mk(50, oy), e2 = mk(0, oy + 50); // e2: 90° off a 100° arc → outside
    c.enemies = stub([e1, e2]); // combat reads this.enemies (host always has it after the first step)
    const S = CFG.weapons.bat.levels[0];
    c.batSwing(pl, S);
    ok(e1.hp === 300 - S.dmg && e1.vx === C.batKbImpulse * S.kb && e2.hp === 300,
      `P21 bat: in-arc hit with ×${S.kb} knockback impulse (${e1.vx}); 90° foe outside the ${S.arc}° arc`);
    const e3 = mk(50, oy, { hp: 100000 });
    const R0 = Math.random;
    Math.random = () => 0; // the documented spread-MINIMUM pin → HOMERUN fires for sure
    c.enemies = stub([e3]);
    c.batSwing(pl, S);
    ok(e3.dead, 'P21 bat: HOMERUN one-hit-KOs a non-boss at rand 0');
    const e4 = mk(50, oy, { hp: 100000, boss: true });
    c.enemies = stub([e4]);
    c.batSwing(pl, S);
    ok(!e4.dead, 'P21 bat: HOMERUN never fires on a boss (rand 0 does not cheat the boss gate)');
    Math.random = R0;
    // homerKing synergy swaps the odds row (1-in-50 → rand 0.005 still under 1)
    const e5 = mk(50, oy, { hp: 100000 });
    pl.synergies.homerKing = 5; Math.random = () => 0.0005; // ×50 = 0.025 < 50 ✓, ×500 = 25 > 1 ✗
    c.enemies = stub([e5]);
    c.batSwing(pl, S);
    ok(e5.dead, 'P21 bat: homerKing L5 odds (1-in-50) make the same roll a HOMERUN');
    Math.random = R0;
  }

  // Frog Tongue: latch + poison DoT + drag to the player + eat-on-kill heal (non-boss).
  {
    const c = new Combat();
    const pl = new Player({ h: 64 }); pl.reset(0, 0); pl.maxHp = 200; pl.hp = 50; // tall pool so the heal math, not the player cap, is under test
    const e1 = mk(100, 0, { hp: 300 });
    c.fireTongue(pl, e1, 34, 6, 3.2, 1);
    ok(e1.poisonT === 3.2 && e1.poisonDps === 6 && e1.drag !== null, 'P21 tongue: poison channel + drag armed');
    for (let i = 0; i < 30; i++) c.update(1 / 60, [], stub([e1]));
    ok(e1.drag === null && near2(e1.x, 0, 0.01) && near2(e1.y, 0, 0.01), `P21 tongue: foe dragged onto the player (${e1.x.toFixed(1)},${e1.y.toFixed(1)})`);
    ok(e1.hp < 300 - 34, 'P21 tongue: poison keeps ticking after the drag');
    const e2 = mk(100, 0, { hp: 10, maxHp: 100 });
    c.fireTongue(pl, e2, 34, 6, 3.2, 1);
    ok(e2.dead && near2(pl.hp, 50 + 8), `P21 tongue: lash-killed non-boss is eaten → min(15, 2+0.06×100)=8 heal (${pl.hp})`);
    pl.hp = 50;
    const e3 = mk(100, 0, { hp: 10, maxHp: 100 });
    c.fireTongue(pl, e3, 34, 6, 3.2, 2.5); // gutFeast multiplies the heal granted (base cap applies to the base heal)
    ok(near2(pl.hp, 70), `P21 tongue: gutFeast ×2.5 on the 8-heal → 20 (${pl.hp})`);
    pl.hp = 50;
    const e4 = mk(100, 0, { hp: 10, maxHp: 100, boss: true });
    c.fireTongue(pl, e4, 34, 6, 3.2, 1);
    ok(pl.hp === 50, 'P21 tongue: bosses are never eaten (no heal)');
  }

  // Cannonball: player-ball ricochet — impact-point positioning + 0.9^ decay + budget.
  {
    const c = new Combat();
    const pl = new Player({ h: 64 }); pl.reset(0, 0);
    const e1 = mk(40, 0, { hp: 100000 }), e2 = mk(90, 0, { hp: 100000 });
    pl._ball = { t: 0, target: e1, hits: 0, hitsMax: 2, hit: new Set(), dmg: 60 };
    for (let i = 0; i < 300 && pl._ball; i++) pl._ballStep(1 / 60, stub([e1, e2]), c);
    ok(e1.hp === 100000 - 60 && e2.hp === 100000 - 60 * 0.9, `P21 ball: ×0.9^ ricochet decay (${e1.hp}/${e2.hp})`);
    ok(!pl._ball && near2(pl.x, 90, 0.5) && pl.vx === 0, `P21 ball: ends at the impact point with the budget spent (x=${pl.x.toFixed(1)})`);
  }

  // Wolf companion: spawn + pounce + bleed + fixed 2.0 s cd + leash clamp + staticPelt.
  {
    const c = new Combat();
    const pl = new Player({ h: 64 }); pl.reset(200, 200); pl.weapons.wolfpack = 1;
    const e1 = mk(300, 200, { hp: 100000 });
    let leashed = true;
    for (let i = 0; i < 600; i++) {
      c.update(1 / 60, [pl], stub([e1]));
      if (pl._companion && Math.hypot(pl._companion.x - pl.x, pl._companion.y - pl.y) > C.companionLeash + C.companionSpeed / 60 + 1) leashed = false;
    }
    ok(pl._companion !== null, 'P21 wolf: companion spawns for a wolf owner');
    ok(leashed, 'P21 wolf: companion never drifts past companionLeash');
    ok(e1.hp < 100000 - 30, 'P21 wolf: pounce deals L1 dmg + bleed DoT accumulates');
    ok(e1.bleedT > 0 && e1.bleedDps === 8, 'P21 wolf: bleed channel armed on the bite');
    // bites are ≥ 2.0 s apart (spec-fixed cd): count bleeds re-arming across time
    const t0 = c.t; const bites = [];
    for (let i = 0; i < 60 * 10; i++) {
      const armed = e1.bleedT; e1.bleedT = 0;
      c.update(1 / 60, [pl], stub([e1]));
      if (e1.bleedT > 0 && !armed) bites.push(c.t);
    }
    ok(bites.length >= 2 && bites.every((t, i) => i === 0 || t - bites[i - 1] >= 1.9),
      `P21 wolf: pounce cd never below the fixed 2.0 s (${bites.map((b) => (b - t0).toFixed(1)).join(', ')})`);
    // staticPelt: the bite adds a shock stack
    const pl2 = new Player({ h: 64 }); pl2.reset(300, 300); pl2.weapons.wolfpack = 1; pl2.synergies.staticPelt = 1;
    const c2 = new Combat();
    const e2 = mk(400, 300, { hp: 100000 });
    for (let i = 0; i < 600; i++) c2.update(1 / 60, [pl2], stub([e2]));
    ok(e2.shockStacks.length >= 1, 'P21 wolf: staticPelt puts a shock stack on the pounce');
  }

  // Gatling Gun (player-side): 40-round mag at the shot cadence → 3.0 s reload → fresh mag.
  {
    const c = new Combat();
    const pl = new Player({ h: 64, run: [0], idle: [0] }); pl.reset(300, 300); pl.weapons = { gatling: 1 };
    const e = mk(340, 300);
    const world = { collidersNear: () => [] };
    const G = CFG.weapons.gatling;
    pl.update(1 / 60, { x: 0, y: 0 }, c, stub([e]), world); // _gatMag starts 0 → arms the first mag
    for (let i = 0; i < 30; i++) pl.update(1 / 60, { x: 0, y: 0 }, c, stub([e]), world);
    ok(pl._gatMag > 0 && pl._gatMag < G.burst && pl._gatReload <= 0,
      `P21 gatling: mag drains at the shot cadence without reloading early (${pl._gatMag})`);
    let reloadSeen = false;
    let magAfterReload = 0;
    for (let i = 0; i < 60 * 7; i++) {
      pl.update(1 / 60, { x: 0, y: 0 }, c, stub([e]), world);
      if (pl._gatReload > 0) reloadSeen = true;
      else if (reloadSeen && pl._gatMag > magAfterReload) magAfterReload = pl._gatMag;
    }
    ok(reloadSeen && magAfterReload >= G.burst - 1,
      `P21 gatling: empty mag → the fixed ${G.reload} s reload → fresh ${G.burst}-round mag (${magAfterReload})`);
  }

  // 29.8: the gatling reload is observable as a monotonically-decreasing remaining time — this is
  // what the HUD reload ring (js/ui/hud.js syncGat) reads, so pin it here: the countdown starts at
  // the spec reload duration, drops strictly every tick while reloading, and hits 0 exactly as the
  // mag refills (the instant the indicator must clear).
  {
    const c = new Combat();
    const pl = new Player({ h: 64, run: [0], idle: [0] }); pl.reset(300, 300); pl.weapons = { gatling: 1 };
    const e = mk(340, 300);
    const world = { collidersNear: () => [] };
    const G = CFG.weapons.gatling;
    let total = 0, prev = -1, mono = true, sawReload = false, refilled = false;
    for (let i = 0; i < 60 * 12; i++) {
      pl.update(1 / 60, { x: 0, y: 0 }, c, stub([e]), world);
      const r = pl._gatReload;
      if (r > 0) {
        if (!sawReload) { sawReload = true; total = pl._gatReloadTotal; prev = r; }
        else if (r >= prev) mono = false; // must fall strictly on every tick of the reload
        else prev = r;
      } else if (sawReload) { refilled = pl._gatMag >= G.burst && pl._gatReloadTotal === 0; if (refilled) break; }
    }
    ok(sawReload && total > 0, `P29.8 gatling: reload start publishes a positive remaining-total (${total})`);
    ok(Math.abs(total - G.reload * pl.cdMul) < 1e-9,
      `P29.8 gatling: remaining-total equals the spec reload × cdMul (${total} vs ${G.reload * pl.cdMul})`);
    ok(mono, 'P29.8 gatling: remaining reload time strictly decreases each tick until refill');
    ok(refilled, 'P29.8 gatling: remaining time reaches 0 and total clears exactly as the mag refills');
  }

  // Mirror Shield: reflect orbs (3/window), reflected orbs hit foes, never players.
  {
    const c = new Combat();
    const pl = new Player({ h: 64 }); pl.reset(300, 300); pl.passives.shield = 1;
    const foe = mk(331, 268, { hp: 100 });
    const o0 = { x: 330, y: 270, vx: -60, vy: 0, r: 6, dmg: 12, life: 4 };
    c.update(1 / 60, [pl], stub([foe], { orbs: [o0] }));
    ok(o0.reflected === true && o0.vx === 60, 'P21 shield: in-radius orb reverses outward + marks ally-side');
    ok(pl._shieldBank.n === 2, 'P21 shield: charge bank spends per reflect (3 → 2)');
    ok(foe.hp === 88, 'P21 shield: the reflected orb spends itself on the nearest foe');
    // bank cap: five orbs in radius, only the two remaining charges reflect
    const orbs5 = [1, 2, 3, 4, 5].map((i) => ({ x: 330 + i, y: 268, vx: -1, vy: 0, r: 6, dmg: 1, life: 4 }));
    c.update(1 / 60, [pl], stub([], { orbs: orbs5 }));
    ok(orbs5.filter((o) => o.reflected).length === 2, `P21 shield: only the 2 banked charges fire this window (${orbs5.filter((o) => o.reflected).length})`);
    for (let i = 0; i < 60 * 5.1; i++) c.update(1 / 60, [pl], stub([], { orbs: [] }));
    ok(pl._shieldBank.n === 3, 'P21 shield: window expiry re-arms all 3 charges');
  }

  // Ice Skates: speedMul in recomputeStats + glide deceleration + slide-damage BOTH.
  {
    const t = { charKey: 'mage', passives: { skates: 2 }, metaSpeed: 0 };
    recomputeStats(t);
    ok(Math.abs(t.speedMul - 1.075) < 1e-9, `P21 skates: L2 spd rides speedMul (${t.speedMul})`);
    const mkP = (sk) => {
      const p = new Player({ h: 64, run: [0], idle: [0] }); p.reset(400, 400); p.passives = sk ? { skates: 1 } : {}; p.vx = 400; p.vy = 0;
      return p;
    };
    const world = { collidersNear: () => [] };
    const c = new Combat(); const empty = stub([]);
    const pS = mkP(true), pN = mkP(false);
    pS.update(1 / 60, { x: 0, y: 0 }, c, empty, world);
    pN.update(1 / 60, { x: 0, y: 0 }, c, empty, world);
    const dS = 400 - pS.vx, dN = 400 - pN.vx;
    ok(dN > 0 && dS > 0 && dS < dN * 0.6, `P21 skates: glide deceleration shrinks on release (${dS.toFixed(1)} vs ${dN.toFixed(1)})`);
    // slide: brushing a foe while gliding hurts BOTH (once per 0.5 s lock)
    const p2 = mkP(true); p2.x = 400; p2.y = 400; p2.vx = 300; p2.hp = p2.maxHp;
    const foe = mk(415, 400, { hp: 300 });
    p2.update(1 / 60, { x: 0, y: 0 }, c, stub([foe]), world);
    ok(foe.hp === 300 - 2 && p2.hp === p2.maxHp - 2, `P21 skates: slide hits both for L1 slideDmg (foe ${foe.hp}, self ${p2.hp})`);
    p2.update(1 / 60, { x: 0, y: 0 }, c, stub([foe]), world);
    ok(foe.hp === 298, 'P21 skates: per-foe 0.5 s re-hit lock holds');
  }
}

// --- 29.x (user playtest 2026-10-22): Boulder cd curve, Tank Cannon ×1.5 range, Skate glide ---
{
  const C = CFG.combat;
  const mk = (x, y, o = {}) => ({ x, y, vx: 0, vy: 0, r: 13, hp: 300, maxHp: 300, flash: 0, dead: false, boss: false,
    slowStacks: [], freezeT: 0, shockStacks: [], stunT: 0, ...o });
  const stub = (list) => ({ list, grid: { near: () => list, range: () => list } });
  const world = { collidersNear: () => [] };
  const mkPl = () => { const p = new Player({ h: 64, run: [0], idle: [0] }); p.reset(400, 400); return p; };

  // 29.6 Boulder: initial cd 4.0 s, −0.3 s per level-up (L1=4.0 … L5=2.8). The fire-site
  // arms the cooldown from the level-indexed row, so one firing player per level proves the
  // level-up mechanic applies the subtraction (reset() already zeroes every weapon timer).
  const bcd = CFG.weapons.boulder.levels.map((s) => s.cd);
  ok(JSON.stringify(bcd) === JSON.stringify([4.0, 3.7, 3.4, 3.1, 2.8]),
    `29.6 boulder: per-level cd curve 4.0 −0.3×level (${bcd.join(',')})`);
  for (let lvl = 1; lvl <= 5; lvl++) {
    const p = mkPl(); p.weapons.boulder = lvl;
    const c = new Combat();
    p.update(1 / 60, { x: 0, y: 0 }, c, stub([mk(600, 400)]), world);
    ok(p._boulderCd === bcd[lvl - 1],
      `29.6 boulder: L${lvl} first shot arms exactly ${bcd[lvl - 1]} s cooldown (${p._boulderCd})`);
  }

  // 29.12 Tank Cannon: dedicated range knob = 1.5× the old shared wandRange (560 → 840),
  // used by BOTH target acquisition and shell flight; card text states the real behaviour.
  ok(C.cannonRange === C.wandRange * 1.5, `29.12 cannon: cannonRange = 1.5× the old range (${C.cannonRange})`);
  ok(CFG.weapons.cannon.desc === 'Fires a heavy shell that punches through one foe, then detonates on the next.',
    '29.12 cannon: card description = punch-through + terminal detonation (user wording 2026-10-22)');
  const cA = new Combat(); const plA = mkPl(); plA.weapons.cannon = 1;
  plA.update(1 / 60, { x: 0, y: 0 }, cA, stub([mk(1100, 400)]), world); // ~700 px away
  ok(cA.shells.length === 1, '29.12 cannon: a foe ~700 px away (beyond the old 560) is acquired and fired at');
  const cB = new Combat(); const plB = mkPl(); plB.weapons.cannon = 1;
  plB.update(1 / 60, { x: 0, y: 0 }, cB, stub([mk(1300, 400)]), world); // ~900 px away
  ok(cB.shells.length === 0, '29.12 cannon: a foe ~900 px away (beyond 840) is not fired at');
  const cS = new Combat();
  cS.fireShell(400, 400, 0, 10, 70);
  ok(Math.abs(cS.shells[0].life - (C.cannonRange / C.shellSpeed + 0.1)) < 1e-12,
    `29.12 cannon: shell life = cannonRange / shellSpeed (${cS.shells[0].life.toFixed(3)} s)`);
  let ticks = 0;
  for (; ticks < 600 && cS.shells.length; ticks++) cS.update(1 / 60, [], stub([]));
  const travel = (ticks * C.shellSpeed) / 60;
  ok(travel > 840 && travel <= 900,
    `29.12 cannon: empty-field shell flies the extended range (${travel.toFixed(0)} px, far past the old ~606 px)`);

  // 29.13 Ice Skates: glideK cut at every level — after input stops the glide lasts
  // much longer (1 s at 400 px/s: bare player stops dead, L1 skates still slide ≈24 px/s;
  // the old L1 glideK 0.35 would already have stopped too).
  const gk = CFG.passives.skates.levels.map((s) => s.glideK);
  ok(JSON.stringify(gk) === JSON.stringify([0.2, 0.17, 0.14, 0.11, 0.08]),
    `29.13 skates: glideK cut at every level (${gk.join(',')})`);
  const mkSk = (sk) => { const p = mkPl(); p.passives = sk ? { skates: 1 } : {}; p.vx = 400; p.vy = 0; return p; };
  const cG = new Combat(); const pSk = mkSk(true), pBare = mkSk(false);
  for (let i = 0; i < 60; i++) {
    pSk.update(1 / 60, { x: 0, y: 0 }, cG, stub([]), world);
    pBare.update(1 / 60, { x: 0, y: 0 }, cG, stub([]), world);
  }
  ok(pSk.vx > 15 && pBare.vx < 1,
    `29.13 skates: still sliding fast 1.0 s after input release (skates ${pSk.vx.toFixed(1)} px/s vs bare ${pBare.vx.toFixed(3)})`);
}

// --- 29.7 (D99): Continuous Laser orbit rework — continuous rotation while active
// AND inactive; per-level rot↑/cd↓; equidistant beams at L3 (180°) and L5 (120°). ---
{
  const mk = (x, y, o = {}) => ({ x, y, vx: 0, vy: 0, r: 13, hp: 300, maxHp: 300, flash: 0, dead: false, boss: false,
    slowStacks: [], freezeT: 0, shockStacks: [], stunT: 0, ...o });
  const stub = (list) => ({ list, grid: { near: () => list, range: () => list } });
  const world = { collidersNear: () => [] };
  const mkPl = () => { const p = new Player({ h: 64, run: [0], idle: [0] }); p.reset(400, 400); return p; };
  const LL = CFG.weapons.laser.levels;

  // Config shape (D99): every level-up raises orbit speed AND shortens downtime;
  // beam count grows 1→2 at L3 (opposite) and →3 at L5 (equidistant).
  ok(LL.every((s) => s.rot > 0 && s.count >= 1), '29.7 laser: every level row carries rot + count');
  let mono = true;
  for (let i = 1; i < LL.length; i++) if (!(LL[i].rot > LL[i - 1].rot && LL[i].cd < LL[i - 1].cd)) mono = false;
  ok(mono, `29.7 laser: rot↑ AND cd↓ at every level-up (${LL.map((s) => `${s.rot}/${s.cd}`).join(' ')})`);
  ok(JSON.stringify(LL.map((s) => s.count)) === '[1,1,2,2,3]', '29.7 laser: beam count 1/1/2/2/3 (2nd at L3, 3rd at L5)');

  // INVARIANT (explicit, per task): the orbit advances EVERY tick even while the
  // beam is INACTIVE — a parked probe with no reachable foe never fires, yet the
  // angle moves continuously through all 120 idle ticks.
  const p = mkPl(); p.weapons.laser = 1;
  const c = new Combat();
  let aPrev = p._laserAng, advancedAll = true;
  for (let i = 0; i < 120; i++) {
    p.update(1 / 60, { x: 0, y: 0 }, c, stub([mk(4000, 4000)]), world); // never in range
    if (!(p._laserAng > aPrev)) advancedAll = false;
    aPrev = p._laserAng;
  }
  ok(advancedAll && c.beams.length === 0 && p._laserAng >= LL[0].rot * 1.99,
    `29.7 laser: orbit runs while inactive (${p._laserAng.toFixed(3)} rad advanced over 2 s idle, zero beams)`);

  // Reactivation happens at the REACHED angle, not a reset/aim angle.
  p.update(1 / 60, { x: 0, y: 0 }, c, stub([mk(500, p._spawnY())]), world);
  ok(c.beams.length === 1 && Math.abs(c.beams[0].off - p._laserAng) < 1e-12,
    `29.7 laser: first volley fires at the angle the orbit reached (${c.beams[0].off.toFixed(3)} rad)`);
  const a1 = c.beams[0].off;

  // Full cycle: the angle keeps advancing through the active window AND the whole
  // downtime; the next volley's angle = a1 + rot × elapsed ticks (no pause, no reset).
  let a2 = null, t = 0;
  while (a2 === null && t < 900) {
    p.update(1 / 60, { x: 0, y: 0 }, c, stub([mk(500, p._spawnY())]), world);
    c.update(1 / 60, [p], stub([mk(500, p._spawnY())]));
    t++;
    if (c.beams.length && Math.abs(normAngle(c.beams[0].off - a1)) > 1e-9) a2 = c.beams[0].off;
  }
  ok(a2 !== null && Math.abs(normAngle(a2 - a1) - normAngle((LL[0].rot * t) / 60)) < 1e-6,
    `29.7 laser: orbit never stopped across dur+cd — 2nd volley at reached angle (Δ=${a2 === null ? 'no refire' : normAngle(a2 - a1).toFixed(3)} rad over ${t} ticks)`);

  // Beam geometry per level: L3 exactly opposite (180°), L5 three at 120° — one
  // shared cycle (same dur), every beam searing along its own ray.
  for (const lvl of [3, 5]) {
    const p3 = mkPl(); p3.weapons.laser = lvl;
    const c3 = new Combat();
    const S = LL[lvl - 1];
    p3.update(1 / 60, { x: 0, y: 0 }, c3, stub([mk(p3.x + 150, p3._spawnY())]), world);
    const offs = c3.beams.map((b) => b.off);
    ok(offs.length === S.count, `29.7 laser L${lvl}: ${S.count} beams emitted by ONE cycle`);
    const rel = offs.map((o) => normAngle(o - offs[0])).sort((a, b) => a - b);
    const want = Array.from({ length: S.count }, (_, i) => normAngle((i * TAU) / S.count)).sort((a, b) => a - b);
    ok(rel.every((v, i) => Math.abs(v - want[i]) < 1e-9), `29.7 laser L${lvl}: beams equidistant (${S.count === 2 ? 'exactly opposite, 180°' : '120° apart'})`);
    ok(c3.beams.every((b) => b.dur === S.dur && b.len === S.len), `29.7 laser L${lvl}: identical active timings/geometry on every beam`);
    const foes = offs.map((o) => mk(p3.x + Math.cos(o) * 150, p3._spawnY() + Math.sin(o) * 150));
    for (let i = 0; i < 30; i++) { c3.update(1 / 60, [p3], stub(foes)); }
    ok(foes.every((f) => f.hp < 300), `29.7 laser L${lvl}: every beam damages along its own ray`);
  }
}

// --- 29.9 Wolfpack: rename (config key / name / card copy / code ids — grep-proven)
// + pack level rules: L2 stat-up, L3 2nd wolf no stat-up, L4 stat-up ALL wolves,
// L5 3rd wolf no stat-up. Targeting keeps the existing pounce pick (NOT the grid). ---
{
  const stub = (list) => ({ list, grid: { near: () => list, range: () => list } });
  const mkPl = () => { const p = new Player({ h: 64, run: [0], idle: [0] }); p.reset(400, 400); return p; };
  const WK = CFG.weapons.wolfpack;
  ok(!!WK && CFG.weapons.wolf === undefined, '29.9: weapon key renamed wolf → wolfpack');
  ok(WK.name === 'Wolfpack', '29.9: display name = Wolfpack');

  // Zero user-visible "Wolf" strings remain (only "Wolfpack"/"Werewolf" may contain it).
  const visible = [...Object.values(CFG.weapons), ...Object.values(CFG.synergies),
    ...Object.values(CFG.passives), ...Object.values(CFG.characters)]
    .flatMap((d) => [d.name || '', d.desc || '']);
  ok(visible.every((s) => !s.replace(/Wolfpack/g, '').replace(/Werewolf/g, '').includes('Wolf')),
    '29.9 grep-proof: no user-visible "Wolf" string left in config copy');
  const csrc = readFileSync(new URL('../js/entities/combat.js', import.meta.url), 'utf8');
  const psrc = readFileSync(new URL('../js/entities/player.js', import.meta.url), 'utf8');
  ok(!/weapons\.wolf\b/.test(csrc) && !/weapons\.wolf\b/.test(psrc) && !/W\.wolf\b/.test(psrc),
    '29.9: code ids renamed (no weapons.wolf references in combat/player)');

  // Level rules (config side): L3/L5 rows are pure spawn levels.
  const LV = WK.levels;
  ok(JSON.stringify(LV.map((s) => s.count)) === '[1,1,2,2,3]', '29.9 wolfpack: count table 1/1/2/2/3');
  ok(LV[1].dmg > LV[0].dmg && LV[3].dmg > LV[2].dmg, '29.9 wolfpack: stat-up at L2 and L4');
  ok(LV[2].dmg === LV[1].dmg && LV[2].bleed === LV[1].bleed && LV[2].bleedDur === LV[1].bleedDur,
    '29.9 wolfpack: L3 NO stat-up (dmg/bleed rows identical to L2)');
  ok(LV[4].dmg === LV[3].dmg && LV[4].bleed === LV[3].bleed && LV[4].bleedDur === LV[3].bleedDur,
    '29.9 wolfpack: L5 NO stat-up (dmg/bleed rows identical to L4)');

  // Sim side — wolf count per level (fresh owner at each level):
  for (const [lvl, want] of [[1, 1], [2, 1], [3, 2], [4, 2], [5, 3]]) {
    const p = mkPl(); p.weapons.wolfpack = lvl;
    const c = new Combat();
    c.update(1 / 60, [p], stub([]));
    const ws = p._wolves || [];
    ok(ws.length === want, `29.9 wolfpack L${lvl}: exactly ${want} live wolves`);
    ok(!!p._companion && p._companion === ws[0], `29.9 wolfpack L${lvl}: _companion stays the leader ref (4-slot co-op tail unchanged)`);
  }
  // Mid-run level-up grows the EXISTING pack (no replacement, no stat snapshots).
  const pg = mkPl(); pg.weapons.wolfpack = 2;
  const cg = new Combat();
  cg.update(1 / 60, [pg], stub([]));
  const leader0 = pg._wolves[0];
  pg.weapons.wolfpack = 5;
  cg.update(1 / 60, [pg], stub([]));
  ok(pg._wolves.length === 3 && pg._wolves[0] === leader0, '29.9 wolfpack: L2→L5 mid-run spawns wolves 2+3 alongside the original');

  // L4 stat-up applies to ALL wolves: start at L3 (2 wolves), upgrade mid-fight —
  // after the upgrade BOTH wolves must land L4-value bites (60 dmg each), never
  // their old L3 value (38). Wolves trail at formation slots, so bites are counted
  // per event (single-tick instant-damage drops; bleed DoT ≈0.2/tick never counts).
  const p4 = mkPl(); p4.weapons.wolfpack = 3; // dmgMul stays 1 (reset default) — exact bite math
  const c4 = new Combat();
  const prey = { x: 500, y: 400, vx: 0, vy: 0, r: 13, hp: 1e6, maxHp: 1e6, flash: 0, dead: false,
    slowStacks: [], freezeT: 0, shockStacks: [], stunT: 0 };
  let t = 0, l3Bites = 0, l4Bites = 0, last = prey.hp, upgraded = false;
  while (t < 900 && !(l3Bites >= 2 && l4Bites >= 2)) {
    t++;
    c4.update(1 / 60, [p4], stub([prey]));
    const drop = last - prey.hp; last = prey.hp;
    if (t === 120) { p4.weapons.wolfpack = 4; upgraded = true; }
    if (drop >= 30) { if (drop < 59.5) l3Bites++; else if (upgraded) l4Bites++; }
  }
  ok(l3Bites >= 2 && l4Bites >= 2,
    `29.9 wolfpack: every wolf bites at CURRENT stats — L3 bites (38) before upgrade, L4 bites (60) after both land (t=${t} l3=${l3Bites} l4=${l4Bites})`);

  // User directive: targeting stays the existing pick — the pack sim must NOT use the spatial grid.
  const wfn = csrc.match(/_wolfpack\(dt, p, enemies\) \{[\s\S]*?\n  \}/);
  ok(!!wfn && /_nearestTo\(p, enemies, C\.companionLeash/.test(wfn[0]) && !/\.grid\./.test(wfn[0]),
    '29.9 wolfpack: target-pick still _nearestTo scan (not the spatial grid); 30.1 adds the taken-args exclusion');

  // Card copy: spawn-only levels state the wolf count delta; 30.4 adds the (unchanged)
  // stats block, so "no stat-up" now means: no dmg/bleed PREV→NEXT delta anywhere.
  ok(cardEffectText('weapon', 'wolfpack', 3).includes('wolves 1→2') && !cardEffectText('weapon', 'wolfpack', 3).includes('30→') && !cardEffectText('weapon', 'wolfpack', 3).includes('8→'),
    `29.9 wolfpack: L3 card states 2nd wolf with no stat-up (${cardEffectText('weapon', 'wolfpack', 3)})`);
  ok(!cardEffectText('synergy', 'staticPelt', 1).includes('Wolf'),
    `29.9: synergy card copy carries no "Wolf" string (${cardEffectText('synergy', 'staticPelt', 1)})`);
}

// --- 29.14 Coffee: new passive — cooldowns of ALL equipped weapons reduced by one
// additive per-level multiplier (cdMul), registered through the existing pool/lock ---
{
  const mk = (x, y, o = {}) => ({ x, y, vx: 0, vy: 0, r: 13, hp: 300, maxHp: 300, flash: 0, dead: false, boss: false,
    slowStacks: [], freezeT: 0, shockStacks: [], stunT: 0, ...o });
  const stub = (list) => ({ list, grid: { near: () => list, range: () => list } });
  const world = { collidersNear: () => [] };
  const nearF = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

  // D91 registration: offered from the pool like every passive; locked out when
  // another player owns it (first picker owns).
  let seen = 0, locked = 0;
  for (let s = 0; s < 24; s++) {
    if (cardOffers({}, {}, {}, mulberry32(s), 99).some((cd) => cd.kind === 'passive' && cd.key === 'coffee')) seen++;
    if (cardOffers({}, {}, {}, mulberry32(s), 99, new Set(['coffee'])).some((cd) => cd.key === 'coffee')) locked++;
  }
  ok(seen > 0, '29.14 Coffee: surfaces in the level-up pool (control — the assert can fire)');
  ok(locked === 0, '29.14 D91: Coffee owned by another player is never offered (24 seeds)');
  ok(CFG.passives.coffee.max === 5, '29.14 Coffee: 5 levels, capped by the existing pool machinery');

  // Exact multiplier: additive like speed/dmg (no clamping surprises at max).
  const pl = new Player({ h: 64 }); pl.reset(0, 0);
  for (let i = 0; i < 3; i++) applyCard(pl, { kind: 'passive', key: 'coffee', level: i + 1 });
  ok(pl.passives.coffee === 3 && nearF(pl.cdMul, 1 - CFG.passives.coffee.val * 3),
    `29.14 Coffee: cdMul = 1 − val×levels exactly (got ${pl.cdMul})`);
  for (let i = 0; i < 9; i++) applyCard(pl, { kind: 'passive', key: 'coffee', level: 1 });
  ok(pl.passives.coffee === 5 && nearF(pl.cdMul, 1 - CFG.passives.coffee.val * 5),
    '29.14 Coffee: pool caps at 5 → cdMul floors at 0.40 (−60% cooldowns)');
  ok(cardEffectText('passive', 'coffee', 3) === '−12% weapon cooldowns → total −36%',
    `29.14 Coffee: card states the additive per-level cut + total (${cardEffectText('passive', 'coffee', 3)})`);

  // Cooldown reduction across MULTIPLE weapon types: each arms its downtime × cdMul
  // exactly on the fire tick (probe style per the 29.6 established pattern).
  const COFFEE = 3;
  const cdProbe = (key, field, expected) => {
    const p = new Player({ h: 64, run: [0], idle: [0] }); p.reset(400, 400);
    p.weapons[key] = 1; p.passives = { coffee: COFFEE }; recomputeStats(p);
    const foe = mk(500, p._spawnY());
    p.update(1 / 60, { x: 0, y: 0 }, new Combat(), stub([foe]), world);
    ok(nearF(p[field], expected, 1e-9), `29.14 Coffee: ${key} arms its cooldown × cdMul (${p[field]} vs expected ${expected})`);
  };
  const k = 1 - CFG.passives.coffee.val * COFFEE;
  cdProbe('wand', '_wandCd', CFG.weapons.wand.levels[0].rate * k);
  cdProbe('axe', '_axeCd', CFG.weapons.axe.levels[0].cd * k);
  cdProbe('ringLightning', '_ringCd', CFG.combat.ringCd * k);
  cdProbe('gatling', '_gatCd', CFG.weapons.gatling.levels[0].cd * k);
  cdProbe('boulder', '_boulderCd', CFG.weapons.boulder.levels[0].cd * k);
  cdProbe('ball', '_ballCd', CFG.weapons.ball.cd * k);

  // Laser downtime (29.7 interaction): armed when the active window ends, also × cdMul.
  {
    const p = new Player({ h: 64, run: [0], idle: [0] }); p.reset(400, 400);
    p.weapons.laser = 1; p.passives = { coffee: COFFEE }; recomputeStats(p);
    const foe = mk(500, p._spawnY());
    const c = new Combat();
    p.update(1 / 60, { x: 0, y: 0 }, c, stub([foe]), world); // fires
    let t = 0;
    while (p._laserT > 0 && t < 200) { p.update(1 / 60, { x: 0, y: 0 }, c, stub([foe]), world); t++; }
    ok(nearF(p._laserCd, CFG.weapons.laser.levels[0].cd * k, 1e-9),
      `29.14 Coffee: laser downtime armed × cdMul (${p._laserCd} vs ${CFG.weapons.laser.levels[0].cd * k})`);
  }

  // Functional proof: more shots in the same window with Coffee maxed.
  const countShots = (coffee) => {
    const p = new Player({ h: 64, run: [0], idle: [0] }); p.reset(400, 400);
    p.weapons.wand = 1;
    if (coffee) { p.passives = { coffee: 5 }; recomputeStats(p); }
    const c = new Combat();
    const foe = mk(500, p._spawnY(), { hp: 1e6, maxHp: 1e6 });
    let fired = 0;
    for (let i = 0; i < 600; i++) {
      const before = c.bolts.length;
      p.update(1 / 60, { x: 0, y: 0 }, c, stub([foe]), world);
      if (c.bolts.length > before) fired++;
    }
    return fired;
  };
  const bare = countShots(0), caffeinated = countShots(5);
  ok(caffeinated > bare + 5, `29.14 Coffee: real fire-rate gain across a window (${caffeinated} shots vs bare ${bare} in 10 s)`);
}

// D91 (user law 2026-10-20): ZERO shared/duplicate items in co-op — weapons, synergies AND passives.
{
  const excl = new Set(['dmg', 'speed', 'blades']);
  let hitsExcl = 0;
  let hitsCtrl = 0;
  for (let s = 0; s < 48; s++) {
    const o1 = cardOffers({}, {}, {}, mulberry32(s), 99, excl);
    if (o1.some((c) => (c.kind === 'passive' && (c.key === 'dmg' || c.key === 'speed')) || (c.kind === 'weapon' && c.key === 'blades'))) hitsExcl++;
    if (cardOffers({}, {}, {}, mulberry32(s), 99).some((c) => c.kind === 'passive' && c.key === 'dmg')) hitsCtrl++;
  }
  ok(hitsExcl === 0, 'D91: other-owned passive/weapon keys never appear in offers (48 seeds)');
  ok(hitsCtrl > 0, 'D91: control — the unowned passive DOES appear when not excluded (assert can fire)');
}

// --- 29.1 early-run lag: star-band crop + Loop frame counter + ?fps gate ---
{
  // Star-band crop (world.js): band height must cover the whole star field
  // (top 90% of the horizon + star radius) yet stay well under the viewport.
  // Pre-fix, four full-viewport alpha blits cost 8.3 of 20.1 Mpx/frame at
  // 1080p (real-browser profile, docs/lag-research-2026-10-22.md).
  const { starBandH } = await import('../js/world/world.js');
  for (const vh of [569, 874, 1080, 2160]) {
    const horizon = vh * 0.3 + 8; // world.js horizon incl. max camera-drift term
    const h = starBandH(horizon, 3);
    ok(h >= horizon * 0.9 + 3 && h < vh * 0.5,
      `29.1: star band covers the full star field at vh=${vh} (${h}px, < half viewport)`);
  }
  const wsrc1 = readFileSync(new URL('../js/world/world.js', import.meta.url), 'utf8');
  ok(/makeCanvas\(vw, bandH\)/.test(wsrc1) && /sky\._bandH = bandH/.test(wsrc1),
    '29.1: band bake + rebake key use the cropped height (no full-screen star blits)');
  ok(/ctx\.drawImage\(band, 0, 0\)/.test(wsrc1),
    '29.1: band blit keeps implicit size, so the crop also cuts the drawn fill area');

  // Loop.frames counts rAF ticks — the ?fps=1 readout's only data source.
  const fq = [];
  globalThis.requestAnimationFrame = (cb) => { fq.push(cb); return fq.length; };
  globalThis.cancelAnimationFrame = () => { fq.length = 0; };
  const { Loop: Loop291 } = await import('../js/core/loop.js');
  const fl = new Loop291({ update: () => {}, render: () => {} });
  fl.start();
  const ft = performance.now();
  for (let i = 1; i <= 4; i++) fq.shift()(ft + i * (1000 / 60));
  ok(fl.frames === 4, `29.1: Loop.frames increments once per rAF tick (${fl.frames}/4)`);
  fl.hitStop(0.2); // what the user perceives is displayed frames, not sim steps → hit-stop frames count too
  fq.shift()(ft + 5 * (1000 / 60));
  ok(fl.frames === 5, '29.1: hit-stop frames still counted (readout = displayed frame rate)');
  fl.stop();

  const msrc1 = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  ok(/URLSearchParams\(location\.search\)\.get\('fps'\) === '1'/.test(msrc1) && /loop\.frames/.test(msrc1),
    '29.1: ?fps=1 readout is URL-gated and reads Loop.frames (render pipeline untouched)');
}

// --- Phase 29 art half (29.9/29.10/29.11/29.12/29.14): visual wiring, no mechanics ---
{
  const isrc = readFileSync(new URL('../js/art/items.js', import.meta.url), 'utf8');
  const chsrc = readFileSync(new URL('../js/art/characters.js', import.meta.url), 'utf8');
  const csrc = readFileSync(new URL('../js/entities/combat.js', import.meta.url), 'utf8');
  const mk = (x, y, o = {}) => ({ x, y, vx: 0, vy: 0, r: 13, hp: 300, maxHp: 300, flash: 0, dead: false, boss: false, slowStacks: [], freezeT: 0, shockStacks: [], stunT: 0, ...o });
  const stub = (list, extra = {}) => ({ list, grid: { near: () => list, range: () => list }, ...extra });

  // 29.14 Coffee icon: a dedicated mug slot shipped and config points at it.
  // (The 12.2 icon-registration invariant above now covers CFG.passives.coffee.icon
  // automatically — this pins the switch itself + the mug's passive-plate category.)
  ok(CFG.passives.coffee.icon === 'coffee', '29.14: Coffee points at the new mug icon (not the borrowed sigil)');
  ok(/icons\.coffee = make\('passive'/.test(isrc), '29.14: icons.coffee registered on the passive plate');

  // 29.10: the reflect event spawns a mirror-burst; the reflect MATH is unchanged.
  const c = new Combat();
  const pl = new Player({ h: 64 }); pl.reset(300, 300); pl.passives.shield = 1;
  const o0 = { x: 330, y: 270, vx: -60, vy: 0, r: 6, dmg: 12, life: 4 };
  c.update(1 / 60, [pl], stub([], { orbs: [o0] }));
  ok(o0.reflected === true && o0.vx === 60 && pl._shieldBank.n === 2,
    '29.10: reflect math unchanged (orb reverses outward, charge spent 3 → 2)');
  ok(c.reflectFx.length === 1 && c.reflectFx[0].x === o0.x && c.reflectFx[0].y === o0.y,
    '29.10: reflect event spawns a mirror-burst flash at the reflect point');
  for (let i = 0; i < 30; i++) c.update(1 / 60, [pl], stub([], { orbs: [] }));
  ok(c.reflectFx.length === 0, '29.10: reflect flash self-expires (purely cosmetic lifecycle)');
  // ACTIVE-state indicator hooks in combat.draw: ring at the true reflect radius, pips from the bank.
  ok(/passives && pl\.passives\.shield[\s\S]{0,700}?arc\(pl\.x, oy, row\.r, 0, TAU\)/.test(csrc),
    '29.10: combat.draw paints the ACTIVE mirror ring at the shield radius (torso-centered like _shieldStep)');
  ok(/i < C\.shieldCharges[\s\S]{0,300}?i < bank\.n/.test(csrc),
    '29.10: banked-charge pips draw from the live bank (active-state read)');

  // 29.12: terminal blast tagged for its distinct sprite/rhythm; base 23.2 line intact.
  const c2 = new Combat();
  const owner = { x: 0, y: 0, dmgMul: 1, dead: false };
  const e1 = mk(100, 100), e2 = mk(120, 100);
  c2.fireShell(0, 100, 0, 100, 70, null, owner);
  for (let i = 0; i < 120 && c2.shells.length; i++) c2.update(1 / 60, [], stub([e1, e2]));
  ok(c2.explosions.some((x) => x.tank === true), '29.12: shell terminal blast tagged for its own sprite + rhythm');
  ok(/const s = x\.r \* 2 \* \(1 \+ 0\.25 \* k\);/.test(csrc),
    '29.12: the 23.2 base blast-scale line is intact for non-tank explosions');
  ok(/export function tankBlastSprite\(\)/.test(isrc) && /this\._fx\.tank/.test(csrc),
    '29.12: hard-edged shock star baked in art + drawn for tank-tagged blasts only');
  ok(/function shellSprite\(\)[\s\S]{0,600}makeCanvas\(36, 14\)/.test(isrc) && /const tr = g\.createLinearGradient\(1, 7, 20, 7\)/.test(isrc),
    '29.12: shell sprite reworked — larger body + baked fading tracer tail');

  // 29.9: the pack draws its OWN sheet, coats keyed by wolf index, never the enemy skin.
  ok(/export function buildPackWolves\(\)/.test(chsrc), '29.9: pack-wolf sheet builder exported from art');
  ok(((chsrc.match(/export const PACK_PALS = \[[\s\S]*?\];/) || [''])[0].match(/\{ body: '#/g) || []).length === 3,
    '29.9: three distinct per-wolf coats (light brown / dark grey / dark brown)');
  ok(/this\._fx\.wolves[\s\S]{0,400}?frames\[Math\.min\(wi, sh\.frames\.length - 1\)\]/.test(csrc),
    '29.9: companion draw keyed by wolf index (1st/2nd/3rd colors)');
  ok(!/enemies\.defs\.wolf/.test(csrc),
    '29.9: pack no longer reuses the enemy wolf sheet (host AND client draw the pack art)');
  ok(/icons\.wolf = make\('weapon'/.test(isrc) && /icons\.axe = make\('weapon'/.test(isrc),
    '29.9/29.11: reworked Wolfpack (three-pack) and Spectral Axe card icons registered');

  // 29.10: the reflect flash art is pre-rendered — draw only ever blits it.
  ok(/export function reflectFlashSprite\(\)/.test(isrc) && /this\._fx\.flash/.test(csrc),
    '29.10: baked mirror-burst sprite drawn at reflect points');
}

// --- 30.1 Wolfpack targeting: pack-uniqueness (no two wolves ever share a live
// target across a pounce), wait-if-claimed (a ready wolf with every in-leash foe
// owned holds ready — no steal, no stack), and per-wolf independent timers (a ready
// wolf bites a foe that entered the leash while another is still mid-pounce). The
// pick still scans enemies.list via _nearestTo (never the spatial grid, user directive). ---
{
  const mk = (x, y, o = {}) => ({ x, y, vx: 0, vy: 0, r: 13, hp: 300, maxHp: 300, flash: 0, dead: false, boss: false,
    slowStacks: [], freezeT: 0, shockStacks: [], stunT: 0, bleedT: 0, bleedDps: 0, ...o });
  const stub = (list) => ({ list, grid: { near: () => list, range: () => list } });
  const mkPl = (lvl) => { const p = new Player({ h: 64, run: [0], idle: [0] }); p.reset(400, 400); p.weapons.wolfpack = lvl; return p; };

  // (A) Same-target overlap is impossible: 3 wolves + 3 in-leash foes claim 3 distinct targets.
  {
    const p = mkPl(5); // count 3
    const c = new Combat();
    const fA = mk(460, 400, { hp: 1e6, maxHp: 1e6 }); // nearest
    const fB = mk(520, 400, { hp: 1e6, maxHp: 1e6 });
    const fC = mk(570, 400, { hp: 1e6, maxHp: 1e6 }); // 170 px, inside the 192 leash
    const foes = [fA, fB, fC];
    c.update(1 / 60, [p], stub(foes)); // tick 1: spawn + assign
    const ws = p._wolves;
    const pouncers = ws.filter((w) => w.state === 'pounce' && w.target);
    ok(pouncers.length === 3, `30.1: all 3 wolves enter pounce once a foe is claimable (${pouncers.length})`);
    ok(new Set(pouncers.map((w) => w.target)).size === 3, '30.1: the 3 claims are pairwise distinct (no same-target pile-on)');
    let overlap = false, sawMulti = false;
    for (let t = 0; t < 15; t++) {
      c.update(1 / 60, [p], stub(foes));
      const live = ws.filter((w) => w.state === 'pounce' && w.target).map((w) => w.target);
      if (new Set(live).size !== live.length) overlap = true;
      if (live.length >= 2) sawMulti = true;
    }
    ok(!overlap, '30.1: no two wolves share a live target on any tick');
    ok(sawMulti, '30.1 control: ≥2 claims do coexist at some tick (the overlap check can actually fire)');
  }

  // (B) Wait-if-claimed: 3 wolves + 1 far in-leash foe → exactly one claims it; the
  // other two stay ready and never steal it while that claim holds (pounce still travelling).
  {
    const p = mkPl(5); // count 3
    const c = new Combat();
    const foe = mk(588, 400, { hp: 1e6, maxHp: 1e6 }); // ~188 px → long pounce (never lands in the window)
    let maxHolders = 0, holders = 0, waiting = 0, claimAlive = false;
    for (let t = 0; t < 14; t++) {
      c.update(1 / 60, [p], stub([foe]));
      holders = p._wolves.filter((w) => w.state === 'pounce' && w.target === foe).length;
      waiting = p._wolves.filter((w) => w.state === 'follow' && w.target === null).length;
      maxHolders = Math.max(maxHolders, holders);
      claimAlive = holders === 1;
    }
    ok(maxHolders === 1, `30.1: only one wolf ever claims a lone foe (${maxHolders})`);
    ok(claimAlive && waiting === 2, `30.1: the other 2 hold ready/waiting, never re-claim (holders=${holders} waiting=${waiting})`);
  }

  // (C) Independent timers: wolf A is still mid-pounce on a far foe when a second foe
  // enters the leash — wolf B (cd already complete) claims and bites it on its own.
  {
    const p = mkPl(3); // count 2
    const c = new Combat();
    const fA = mk(590, 400, { hp: 1e6, maxHp: 1e6 }); // far → A keeps travelling for ~30 ticks
    for (let t = 0; t < 12; t++) c.update(1 / 60, [p], stub([fA])); // only fA exists
    const wA = p._wolves.find((w) => w.state === 'pounce' && w.target === fA);
    const wB = p._wolves.find((w) => w !== wA);
    ok(!!wA && !!wB, '30.1(C): one wolf locked the far foe while the other stayed ready');
    ok(wB.state === 'follow' && wB.cd <= 0 && fA.hp === 1e6, '30.1(C): the 2nd wolf holds a COMPLETED timer, far foe still untouched (mid-pounce)');
    const fB = mk(450, 400, { hp: 1e6, maxHp: 1e6 }); // a new foe enters the leash at 50 px
    let bBite = 0, aStillMidPounce = false;
    for (let t = 1; t <= 20; t++) {
      c.update(1 / 60, [p], stub([fA, fB]));
      if (!bBite && fB.hp < 1e6) { bBite = t; aStillMidPounce = wA.state === 'pounce' && fA.hp === 1e6; }
    }
    ok(bBite > 0, `30.1(C): wolf B landed an independent hit on the newly-leashed foe (tick ${bBite})`);
    ok(aStillMidPounce, '30.1(C): wolf A was still mid-pounce on the far foe when B landed (cds/targets independent)');
  }
}

// --- 30.3 Frog Tongue range: CFG.combat.tongueRange 240 → 660 (user-approved 2.75×).
// The fire gate reads the config value (player._weapons); the pull is a distance-normalised
// linear schedule with NO travel-time or max-range cap, so a 650-px latch drags fully home. ---
{
  const mk = (x, y, o = {}) => ({ x, y, vx: 0, vy: 0, r: 13, hp: 300, maxHp: 300, flash: 0, dead: false, boss: false,
    slowStacks: [], freezeT: 0, shockStacks: [], stunT: 0, bleedT: 0, bleedDps: 0, poisonT: 0, poisonDps: 0, holdT: 0, ...o });
  const stub = (list) => ({ list, grid: { near: () => list, range: () => list } });
  const world = { collidersNear: () => [] };
  ok(CFG.combat.tongueRange === 660, '30.3: CFG.combat.tongueRange = 660 (was 240)');

  // Fires at 650 (inside the new reach) and the full-distance pull lands the foe on the toad.
  {
    const p = new Player({ h: 64, run: [0], idle: [0] }); p.reset(400, 400); p.weapons.tongue = 1;
    const c = new Combat();
    const foe = mk(1050, 400, { hp: 1e6, maxHp: 1e6 }); // 650 px from the player centre
    p.update(1 / 60, { x: 0, y: 0 }, c, stub([foe]), world);
    ok(foe.drag !== null && foe.hp < 1e6, `30.3: tongue fires at 650 (latched, hp=${foe.hp})`);
    for (let i = 0; i < 30; i++) c.update(1 / 60, [p], stub([foe]));
    ok(foe.drag === null && near(foe.x, p.x, 0.5) && near(foe.y, p.y, 0.5),
      `30.3: the 650-px pull completes over tonguePullDur and lands on the owner (${foe.x.toFixed(1)},${foe.y.toFixed(1)})`);
  }
  // No fire at 700 (past the new reach) — the gate follows the new value, not the old 240.
  {
    const p = new Player({ h: 64, run: [0], idle: [0] }); p.reset(400, 400); p.weapons.tongue = 1;
    const c = new Combat();
    const foe = mk(1100, 400, { hp: 1e6, maxHp: 1e6 }); // 700 px — out of range
    p.update(1 / 60, { x: 0, y: 0 }, c, stub([foe]), world);
    ok(!foe.drag && foe.hp === 1e6, '30.3: tongue does NOT fire at 700 (past the 660 reach)');
  }
}

// --- 30.2 Continuous Laser: damage lands along the whole beam (probe-as-asserts), the orbit
// angle is no longer double-counted (29.7 defect), and the sear's feedback is scorch sparks
// only — rate-limited per foe, hard-capped, never a hit-flash (D21 stands, dps unchanged). ---
{
  const mk = (x, y, o = {}) => ({ x, y, vx: 0, vy: 0, r: 13, hp: 300, maxHp: 300, flash: 0, dead: false, boss: false,
    slowStacks: [], freezeT: 0, shockStacks: [], stunT: 0, ...o });
  const stub = (list) => ({ list, grid: { near: () => list, range: () => list } });
  const world = { collidersNear: () => [] };
  const mkPl = () => { const p = new Player({ h: 64, run: [0], idle: [0] }); p.reset(500, 400); return p; };
  const L = CFG.weapons.laser.levels[0];

  // (1) Damage ticks at every point along the segment: near-origin / mid / near-tip each
  // receive dps × 1.0 s exactly; a foe 6 px past the (r + w) boundary receives none.
  {
    const c = new Combat();
    const pl = mkPl();
    const sy = pl._spawnY();
    const ds = [30, Math.round(L.len / 2), L.len - 10];
    const foes = ds.map((d) => mk(pl.x + d, sy, { hp: 1e6, maxHp: 1e6 }));
    const edge = mk(pl.x + ds[1], sy + (L.w + 13 + 6), { hp: 1e6, maxHp: 1e6 });
    foes.push(edge);
    c.fireBeam(pl, { ...L, dur: 1.2 }); // off = 0, _laserAng = 0 → the beam rides +x
    for (let i = 0; i < 60; i++) c.update(1 / 60, [pl], stub(foes));
    ok(ds.every((d, i) => near(1e6 - foes[i].hp, L.dps, 1e-9)),
      `30.2: damage lands at 30/${ds[1]}/${ds[2]} px along the beam = dps×1 s exactly (${ds.map((d, i) => `${d}px:${(1e6 - foes[i].hp).toFixed(3)}`).join(' ')})`);
    ok(edge.hp === 1e6, `30.2: a foe 6 px past (r + w) is NOT seared (${edge.hp})`);
    ok(foes.every((f) => f.flash === 0 && f.vx === 0 && f.vy === 0), '30.2: the sear stays flash-free and knockback-free (D21 unchanged)');
  }

  // (2) DEFECT TEST (29.7 double-count): the fire site passes the ABSOLUTE reached angle as
  // `off`; _beams must not add the owner's live orbit on top of it again. Pin: the beam points
  // at the reached angle, sweeps at exactly S.rot, and a foe sitting on that ray is seared.
  {
    const c = new Combat();
    const pl = mkPl();
    pl.weapons.laser = 1;
    for (let i = 0; i < 120; i++) pl.update(1 / 60, { x: 0, y: 0 }, c, stub([mk(4000, 4000)]), world); // idle: orbit runs, nothing fires
    const sy = pl._spawnY();
    const aim = pl._laserAng;
    const bait = mk(pl.x + Math.cos(aim) * 150, sy + Math.sin(aim) * 150, { hp: 1e6, maxHp: 1e6 });
    pl.update(1 / 60, { x: 0, y: 0 }, c, stub([bait]), world); // this tick is the one that fires
    ok(c.beams.length === 1, '30.2: reactivation fires one beam');
    const b = c.beams[0];
    const reached = pl._laserAng;
    ok(near(c.beamAngle(b), reached, 1e-12),
      `30.2: the beam starts AT the reached orbit angle, not twice it (beamAngle=${c.beamAngle(b).toFixed(4)} want ${reached.toFixed(4)} — pre-fix: ${(2 * reached).toFixed(4)})`);
    const a0 = c.beamAngle(b);
    for (let i = 0; i < 30; i++) { pl.update(1 / 60, { x: 0, y: 0 }, c, stub([bait]), world); c.update(1 / 60, [pl], stub([bait])); }
    const swept = c.beamAngle(b) - a0;
    ok(near(swept, L.rot * 0.5, 1e-9), `30.2: the beam sweeps at the configured rot (Δ=${swept.toFixed(4)} rad over 0.5 s, want ${(L.rot * 0.5).toFixed(4)} — pre-fix 2×)`);
    ok(1e6 - bait.hp > 0, `30.2: a foe on the ray the orbit points at IS seared (${(1e6 - bait.hp).toFixed(2)} HP — pre-fix: 0)`);
  }

  // (3) Multi-beam geometry is what the card states: every rendered ray sears. At L5 the three
  // beams sit 120° apart and each damages along its own ray from the first tick.
  {
    const c = new Combat();
    const pl = mkPl();
    const S5 = CFG.weapons.laser.levels[4];
    pl.weapons.laser = 5;
    const sy = pl._spawnY();
    pl.update(1 / 60, { x: 0, y: 0 }, c, stub([mk(pl.x + 100, sy)]), world);
    const rays = c.beams.map((b) => c.beamAngle(b));
    ok(rays.length === S5.count, `30.2 L5: ${S5.count} beams`);
    const rel = rays.map((a) => (((a - rays[0]) % TAU) + TAU) % TAU).sort((x, y) => x - y);
    const want = [0, 1, 2].map((i) => (i * TAU) / S5.count);
    ok(rel.every((v, i) => near(v, want[i], 1e-9)), `30.2 L5: the RENDERED rays are 120° apart (${rel.map((v) => v.toFixed(3))})`);
    const onRays = rays.map((a) => mk(pl.x + Math.cos(a) * 150, sy + Math.sin(a) * 150, { hp: 1e6, maxHp: 1e6 }));
    c.update(1 / 60, [pl], stub(onRays));
    ok(onRays.every((f) => f.hp < 1e6), '30.2 L5: every drawn ray sears from the first tick');
  }

  // (4) Scorch sparks exist for beam contacts ONLY — no other damage source emits them — and
  // they sit at the contact point (within the beam's half-width of the foe's centre).
  {
    const c = new Combat();
    const pl = mkPl();
    const sy = pl._spawnY();
    const hitByBolt = mk(pl.x + 120, sy, { hp: 1e6, maxHp: 1e6 });
    const hitByBurn = mk(pl.x + 200, sy, { hp: 1e6, maxHp: 1e6 });
    hitByBurn.burnT = 3; hitByBurn.burnDps = 12;
    c.fireBolt(pl.x, sy, 0, 40, 4, null, pl);
    for (let i = 0; i < 20; i++) c.update(1 / 60, [], stub([hitByBolt, hitByBurn]));
    ok(hitByBolt.hp < 1e6 && hitByBurn.hp < 1e6 && c.scorchFx.length === 0,
      `30.2: a bolt hit and a burn DoT emit NO scorch sparks (${c.scorchFx.length})`);
    c.fireBeam(pl, { ...L, dur: 0.4 });
    const seared = mk(pl.x + 120, sy + 4, { hp: 1e6, maxHp: 1e6 });
    c.update(1 / 60, [pl], stub([seared]));
    ok(c.scorchFx.length === 1, `30.2: a beam contact emits exactly one scorch spark (${c.scorchFx.length})`);
    const f = c.scorchFx[0];
    ok(near(f.x, pl.x + 120, 1e-9) && near(f.y, sy, 1e-9),
      `30.2: the spark spawns on the beam at the foe's side (contact point), not at its centre (${f.x.toFixed(2)},${f.y.toFixed(2)})`);
    ok(seared.flash === 0, '30.2: sparks never bring a hit-flash with them');
  }

  // (5) Rate limit + cap: one foe held on the beam for 1.2 s gets ≈1 spark per scorchTick
  // (never one per frame), a crowd stays at or below CFG.perf.scorchCap, and every spark is
  // gone scorchLife after the beam dies.
  {
    const c = new Combat();
    const pl = mkPl();
    const sy = pl._spawnY();
    const one = mk(pl.x + 120, sy, { hp: 1e5, maxHp: 1e5 });
    c.fireBeam(pl, { ...L, dur: 1.2 });
    const seen = new Set(); // identity-counted: expiries can mask a length change in the same tick
    let maxLive = 0;
    for (let i = 0; i < 72; i++) {
      c.update(1 / 60, [pl], stub([one]));
      for (const f of c.scorchFx) seen.add(f);
      maxLive = Math.max(maxLive, c.scorchFx.length);
    }
    const wantMax = Math.ceil(1.2 / CFG.combat.scorchTick);
    ok(seen.size > 0 && seen.size <= wantMax, `30.2: one foe over 1.2 s gets ≤${wantMax} sparks, not one per frame (got ${seen.size})`);
    ok(maxLive <= Math.ceil(CFG.combat.scorchLife / CFG.combat.scorchTick) + 1,
      `30.2: concurrent sparks on a single foe stay bounded (maxLive=${maxLive})`);
    // dps integral over exactly the ticks the beam was live (removed on the tick where
    // t reaches dur → 71 damaging ticks), proving the feedback path changed no mechanics.
    ok(near(1e5 - one.hp, L.dps * (71 / 60), 1e-7),
      `30.2: the sparks changed nothing — dps integral intact (${(1e5 - one.hp).toFixed(4)} = ${L.dps}×71 ticks)`);
    const crowd = Array.from({ length: 120 }, (_, i) => mk(pl.x + 20 + i * 1.5, sy, { hp: 1e9, maxHp: 1e9 }));
    const c2 = new Combat();
    c2.fireBeam(pl, { ...L, dur: 1.2 });
    let cap = 0;
    for (let i = 0; i < 72; i++) { c2.update(1 / 60, [pl], stub(crowd)); cap = Math.max(cap, c2.scorchFx.length); }
    ok(cap <= CFG.perf.scorchCap && cap === CFG.perf.scorchCap, `30.2: 120 foes on one beam stay capped at CFG.perf.scorchCap (peak=${cap})`);
    ok(crowd.every((f) => f.flash === 0), '30.2: no foe in a capped crowd flashed');
    c.beams.length = 0;
    for (let i = 0; i < Math.ceil(CFG.combat.scorchLife * 60) + 2; i++) c.update(1 / 60, [pl], stub([one]));
    ok(c.scorchFx.length === 0, `30.2: scorch sparks expire within scorchLife (${c.scorchFx.length} left)`);
  }

  // (6) Config law (rule 5): the feedback knobs live in config; the 29.5-era dead laser keys
  // are gone (the orbit is CFG.weapons.laser.rot; the damage is per-frame, never a 0.1 s tick).
  ok(CFG.combat.scorchTick > 0 && CFG.combat.scorchLife > 0 && CFG.combat.scorchSize > 0 && CFG.perf.scorchCap > 0,
    `30.2: scorch knobs in config (tick=${CFG.combat.scorchTick} life=${CFG.combat.scorchLife} size=${CFG.combat.scorchSize} cap=${CFG.perf.scorchCap})`);
  ok(CFG.combat.laserSpeed === undefined && CFG.combat.laserTick === undefined,
    '30.2: dead 29.5 keys laserSpeed/laserTick removed (grep-proven unread by any code)');
}

console.log(`test-logic: ${pass} checks passed, ${fails.length} failed`);
for (const f of fails) console.error(`  FAIL ${f}`);
process.exit(fails.length ? 1 : 0);
