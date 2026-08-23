// Co-op protocol + room state (Phase 11). Pure/Node-safe — raw WebSocket
// plumbing (upgrade + framing) lives in tools/serve.mjs; browser clients use
// the native WebSocket API and only this module's message/room helpers.
import { CFG } from '../config.js';

// Wire messages (JSON text frames). Host = seat 0 (first to join the room).
export const MSG = {
  hello: 'hello',      // C→S join: {t, levelKey, profile}
  joined: 'joined',    // S→C join ack: {t, id, seat, n, levelKey}
  full: 'full',        // S→C join rejected — room full
  roster: 'roster',    // S→C lobby: {t, ids, levelKey} (who is seated where)
  runstart: 'runstart', // H→C: {t, seed} — shared world seed; run begins
  input: 'input',      // C→S relay: {t, id, mx, my, dash} (host applies to sim)
  state: 'state',      // H→S relay: {t, step, tick, players, score, kills}
  left: 'left',        // S→C: {t, id}
  closed: 'closed',    // S→C: {t, reason}
};

export function pack(obj) { return JSON.stringify(obj); }

export function unpack(str) {
  try {
    const o = JSON.parse(str);
    return o && typeof o === 'object' && !Array.isArray(o) ? o : null;
  } catch { return null; }
}

// D53: join-handshake uploads each player's own meta-derived stat profile —
// sim input only. Meta itself (shards/upgrades/LS) is never synced.
export function profileFromMeta(meta) {
  const u = meta.upgrades || {};
  const g = CFG.meta.upgrades;
  return {
    maxHpBonus: (u.maxHp || 0) * g.maxHp.val,
    dmgMult: 1 + (u.dmg || 0) * g.dmg.val,
    speedMult: 1 + (u.speed || 0) * g.speed.val,
    xpMult: 1 + (u.xp || 0) * g.xp.val,
    dashCdMult: 1 + (u.dash || 0) * g.dash.val,
  };
}

// Room: 1 room = 1 run. Plain object so tests/servers can own the lifecycle.
export function createRoom(levelKey) {
  return { levelKey, status: 'open', hostId: null, reason: null, players: [] };
}

export function joinRoom(room, client) {
  if (!room || room.status !== 'open') return { ok: false, reason: 'closed' };
  if (room.players.length >= CFG.coop.maxPlayers) return { ok: false, reason: 'full' };
  const p = { id: client.id, seat: room.players.length, profile: client.profile || null };
  room.players.push(p);
  if (room.hostId === null) room.hostId = client.id;
  return { ok: true, seat: p.seat, n: room.players.length, levelKey: room.levelKey };
}

export function leaveRoom(room, id) {
  if (!room) return { closed: false };
  const i = room.players.findIndex((p) => p.id === id);
  if (i === -1) return { closed: false };
  room.players.splice(i, 1);
  room.players.forEach((p, k) => { p.seat = k; }); // re-seat in join order (A5)
  if (id === room.hostId) {
    room.hostId = null;
    room.status = 'closed';
    room.reason = 'host-leave';
    return { closed: true };
  }
  return { closed: false };
}

export function closeRoom(room, reason = 'run-end') {
  if (!room || room.status === 'closed') return;
  room.status = 'closed';
  room.hostId = null;
  room.reason = reason;
}

// 11.3 difficulty ramp: ×(1 + 33% × added players) — 2P ×1.33, 3P ×1.66, 4P ~×2.0.
// Applies to enemy HP, damage to players, spawn pressure, and boss stats.
export function coopScale(n) {
  const p = CFG.coop;
  const c = Math.min(p.maxPlayers, Math.max(1, Math.floor(n) || 1));
  return 1 + p.perPlayer * (c - 1);
}

// 11.5 equip cap (A3/D42): max equipable STANDARD weapons per player =
// base maxWeapons − (N−1) — 1P=5, 2P=4, 3P=3, 4P=2 (a 4P player can still
// own 1 weapon pair → paired synergy achievable). Synergies never count.
export function weaponCap(n) {
  const c = Math.min(CFG.coop.maxPlayers, Math.max(1, Math.floor(n) || 1));
  return CFG.run.maxWeapons - (c - 1);
}

// 11.10: N players = N bosses of the current level (1P=1 … 4P=4; solo = 1).
// Boss stat ramp is applied separately (Enemies.spawn × coopS, Q7).
export function bossCount(n) {
  return Math.min(CFG.coop.maxPlayers, Math.max(1, Math.floor(n) || 1));
}

// 11.4 leash (A2): every player stays within R of EVERY other player (all
// pairwise distances ≤ R — every player sees every other). Project (x, y) into
// the intersection of the radius-R disks around `others` (convex — iterative
// projection converges; the host re-clamps to the world margin afterwards).
// 11.6.3 ghost fallback (D59): sanitize a per-seat unlocked-char list. Same
// semantics as meta.loadChars (playable keys only, starter always present)
// but pure — no LS. The join profile carries each seat's own list (D53).
export function sanitizeChars(chars) {
  const order = CFG.characters.order;
  const list = Array.isArray(chars) ? order.filter((k) => chars.includes(k)) : [];
  return list.includes(order[0]) ? list : [order[0], ...list];
}

// D59 (binding): ALL co-op players become the ghost when EVERY lobby member has
// ONLY the starter character unlocked. `seats` = per-seat entries in seat order
// (roster entries {profile:{chars}} or raw char lists); solo (1 seat) never ghosts.
export function allStarterLobby(seats) {
  if (!Array.isArray(seats) || seats.length < 2) return false;
  const starter = CFG.characters.order[0];
  return seats.every((s) => {
    const raw = Array.isArray(s) ? s : s && s.profile && Array.isArray(s.profile.chars) ? s.profile.chars : null;
    const c = sanitizeChars(raw);
    return c.length === 1 && c[0] === starter;
  });
}

// D62: per-seat Pac-Man ghost tint (seat 0→3 = Blinky/Pinky/Inky/Clyde).
export function ghostColor(seat) {
  const G = CFG.ghostColors;
  return G[Math.max(0, Math.floor(seat) || 0) % G.length];
}

// 11.8 — per-player UI theming color (D62 channel): roster characters use their
// CFG accent, ghosts use the per-seat Pac-Man tint. Unknown key → starter accent.
export function charAccent(key, seat = 0) {
  const def = CFG.characters[key];
  if (!def) return CFG.characters[CFG.characters.order[0]].accent;
  return def.accent || ghostColor(seat);
}

// D59: 2 UNIQUE starting-weapon offers per ghosted player, never duplicated
// across players. Seeded shuffle of the weapon roster, dealt 2 per seat in seat
// order. Roster 7 < 4P×2 → the last seat gets the remainder (1); Phase 12's
// roster 10 restores 2 per seat for all N ≤ 4 (D37).
export function allocateGhostOffers(n, rng) {
  const pool = Object.keys(CFG.weapons).slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
  }
  const out = [];
  const c = Math.min(Math.max(0, Math.floor(n) || 0), CFG.coop.maxPlayers);
  for (let s = 0; s < c; s++) out.push(pool.slice(s * 2, s * 2 + 2));
  return out;
}

// D53 (11.6.4): the seat's SELECTED character, sanitized — a playable key from
// the seat's own unlocked list; missing/unknown/locked → the starter.
export function selChar(profile) {
  const order = CFG.characters.order;
  const starter = order[0];
  const p = profile && typeof profile === 'object' ? profile : null;
  const sel = p && typeof p.charKey === 'string' ? p.charKey : null;
  if (sel && order.includes(sel) && sanitizeChars(p ? p.chars : null).includes(sel)) return sel;
  return starter;
}

// D56 (11.6.4): per-seat character assignment — UNIQUE per player, seat order
// (an earlier seat wins a contested pick; the host = seat 0 always keeps its
// own). A seat keeps its selected char if playable+unlocked+unclaimed;
// otherwise the first unclaimed playable char it has unlocked; otherwise
// 'ghost' (D59 fallback — no playable char left for that seat).
export function assignChars(roster) {
  const order = CFG.characters.order;
  const taken = new Set();
  const out = [];
  for (const e of Array.isArray(roster) ? roster : []) {
    const prof = e && e.profile ? e.profile : null;
    const unlocked = sanitizeChars(prof ? prof.chars : null);
    const sel = selChar(prof);
    let key = !taken.has(sel) && unlocked.includes(sel) ? sel : null;
    if (!key) key = order.find((k) => unlocked.includes(k) && !taken.has(k)) || null;
    if (!key) key = 'ghost';
    taken.add(key);
    out.push(key);
  }
  return out;
}

// D53 (11.6.3/11.6.4): join profile = the meta stat profile + this seat's
// unlocked characters + its selected character (player-specific sim input —
// ghost-fallback detection D59, per-char spawn D56/D57).
export function joinProfile(meta, chars, sel) {
  const p = profileFromMeta(meta);
  p.chars = sanitizeChars(chars);
  p.charKey = selChar({ chars: p.chars, charKey: sel });
  return p;
}

// D56/D59 (11.6.4): final per-seat char resolution — D59 wins: an all-starter
// lobby ghosts EVERY seat (incl. the host); otherwise the D56 unique assignment
// stands (a seat with no playable char left still ghosts).
export function resolveChars(roster) {
  const a = assignChars(roster);
  return allStarterLobby(roster) ? a.map(() => 'ghost') : a;
}

// 11.4 leash (A2): every player stays within R of EVERY other player (all
// pairwise distances ≤ R — every player sees every other). Project (x, y) into
// the intersection of the radius-R disks around `others` (convex — iterative
// projection converges; the host re-clamps to the world margin afterwards).
export function leashClamp(x, y, others, R) {
  for (let i = 0; i < 8; i++) {
    let moved = false;
    for (const o of others) {
      const dx = x - o.x, dy = y - o.y;
      const d = Math.hypot(dx, dy);
      if (d > R && d > 0) {
        const k = R / d;
        x = o.x + dx * k;
        y = o.y + dy * k;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return [x, y];
}
