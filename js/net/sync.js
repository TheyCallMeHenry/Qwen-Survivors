// Co-op state snapshots (Phase 11, 11.2). Pure/Node-safe wire format for the
// host-authoritative sync: the host packs per-step state (players, enemies,
// alive pickups) and clients unpack + interpolate. Meta NEVER appears here —
// only sim outputs (D53). Keys follow CFG order (stable across clients).
import { CFG } from '../config.js';

export const SNAP_V = 5; // v5 (12.6): playerSnap 29 → 34 slots (five 5-level synergies join the table; levels ride the same slot per key)

export const WEAPON_KEYS = Object.keys(CFG.weapons);    // 10
export const PASSIVE_KEYS = Object.keys(CFG.passives);  // 5
export const SYNERGY_KEYS = Object.keys(CFG.synergies); // 10
export const ENEMY_KEYS = Object.keys(CFG.enemies);     // 9

export const E_FLAG_FLASH = 1, E_FLAG_BURN = 2, E_FLAG_BLIGHT = 4, E_FLAG_BOSS = 8, E_FLAG_FLIP = 16;

const r1 = (n) => Math.round(n * 10) / 10;

// Player snapshot (34 slots, SNAP_V=5):
// [0] x  [1] y  [2] hp  [3] maxHp  [4] xp  [5] level
// [6] dashT  [7] dashCd  [8] flip(0/1)
// [9..18] weapons (CFG order, 0..5)  [19..23] passives  [24..33] synergies (level 0..5)
// Offsets are derived from key-table lengths so a roster change can't desync them.
const W_OFF = 9;
const P_OFF = W_OFF + WEAPON_KEYS.length;
const S_OFF = P_OFF + PASSIVE_KEYS.length;
export function playerSnap(p) {
  const s = [r1(p.x), r1(p.y), r1(p.hp), r1(p.maxHp), r1(p.xp), p.level | 0,
    r1(p.dashT), r1(p.dashCd), p.flip ? 1 : 0];
  for (const k of WEAPON_KEYS) s.push(p.weapons[k] || 0);
  for (const k of PASSIVE_KEYS) s.push(p.passives[k] || 0);
  for (const k of SYNERGY_KEYS) s.push(p.synergies[k] || 0);
  return s;
}

// Client-side: write a player snapshot into a Player instance (render state
// only — the client never simulates). Rebuilds the owned-card maps.
export function applyPlayerSnap(p, s) {
  p.x = s[0]; p.y = s[1]; p.hp = s[2]; p.maxHp = s[3]; p.xp = s[4]; p.level = s[5];
  p.dashT = s[6]; p.dashCd = s[7]; p.flip = s[8] !== 0;
  p.weapons = {}; p.passives = {}; p.synergies = {};
  for (let i = 0; i < WEAPON_KEYS.length; i++) { const v = s[W_OFF + i]; if (v) p.weapons[WEAPON_KEYS[i]] = v; }
  for (let i = 0; i < PASSIVE_KEYS.length; i++) { const v = s[P_OFF + i]; if (v) p.passives[PASSIVE_KEYS[i]] = v; }
  for (let i = 0; i < SYNERGY_KEYS.length; i++) { const v = s[S_OFF + i]; if (v) p.synergies[SYNERGY_KEYS[i]] = v; }
}

// Enemy snapshot: [sid, typeIdx, x, y, hp, maxHp, frame, flags]
export function enemySnap(e) {
  let f = 0;
  if (e.flash > 0) f |= E_FLAG_FLASH;
  if (e.burnT > 0) f |= E_FLAG_BURN;
  if (e.blightT > 0) f |= E_FLAG_BLIGHT;
  if (e.boss) f |= E_FLAG_BOSS;
  if (e.flip) f |= E_FLAG_FLIP;
  return [e.sid, ENEMY_KEYS.indexOf(e.type), r1(e.x), r1(e.y), Math.round(e.hp), Math.round(e.maxHp), e.frame | 0, f];
}

export function applyEnemySnap(e, s) {
  e.x = s[2]; e.y = s[3]; e.hp = s[4]; e.maxHp = s[5]; e.frame = s[6];
  e.flash = (s[7] & E_FLAG_FLASH) ? 0.14 : 0;
  e.burnT = (s[7] & E_FLAG_BURN) ? 1 : 0;
  e.blightT = (s[7] & E_FLAG_BLIGHT) ? 1 : 0;
  e.flip = (s[7] & E_FLAG_FLIP) !== 0;
}

// Pickup snapshot: [kind (0 gem / 1 heart), pool slot, x, y] — pool slots are
// stable ids (gems[] / hearts[] are never reordered, only toggled).
export function pickupSnaps(pickups) {
  const out = [];
  for (let i = 0; i < pickups.gems.length; i++) {
    const g = pickups.gems[i];
    if (g.on) out.push([0, i, r1(g.x), r1(g.y)]);
  }
  for (let i = 0; i < pickups.hearts.length; i++) {
    const h = pickups.hearts[i];
    if (h.on) out.push([1, i, r1(h.x), r1(h.y)]);
  }
  return out;
}

export function applyPickupSnaps(pickups, arr) {
  for (const g of pickups.gems) g.on = false;
  for (const h of pickups.hearts) h.on = false;
  for (const s of arr) {
    const x = s[2], y = s[3];
    if (s[0] === 0) {
      const g = pickups.gems[s[1]];
      g.on = true; g.x = x; g.y = y; g.vx = 0; g.vy = 0; g.val = 1; g.mag = false;
      g.ph = (x * 0.13 + y * 0.07) % (Math.PI * 2);
    } else {
      const h = pickups.hearts[s[1]];
      h.on = true; h.x = x; h.y = y; h.ph = (x * 0.11 + y * 0.09) % (Math.PI * 2);
    }
  }
}

// Full per-step state body (no t/id — the relay stamps those).
export function stateMsg(step, time, score, kills, players, enemies, pickups) {
  return {
    v: SNAP_V, step, time: r1(time * 10) / 10, score, kills,
    players, enemies, pickups,
  };
}

const num = (v) => typeof v === 'number' && Number.isFinite(v);
const arr = (v) => Array.isArray(v);

// Client-side validation: returns the message or null (malformed = ignored).
export function unpackState(m) {
  if (!m || m.v !== SNAP_V) return null;
  if (!Number.isInteger(m.step) || !num(m.time) || !num(m.score) || !num(m.kills)) return null;
  if (!arr(m.players) || !arr(m.enemies) || !arr(m.pickups)) return null;
  for (const s of m.players) if (!arr(s) || s.length !== 9 + WEAPON_KEYS.length + PASSIVE_KEYS.length + SYNERGY_KEYS.length) return null;
  for (const s of m.enemies) if (!arr(s) || s.length !== 8) return null;
  for (const s of m.pickups) if (!arr(s) || s.length !== 4) return null;
  return m;
}
