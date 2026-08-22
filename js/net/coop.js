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
