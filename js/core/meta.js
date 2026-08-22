// Meta progression: persistent Soulshards + between-run upgrades.
// Pure/Node-safe: localStorage only inside try/catch (degrades to defaults).
import { CFG } from '../config.js';
import { LEVELS, LEVEL_ORDER } from '../world/levels.js';

function num(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0;
}

export function defaultMeta() {
  const upgrades = {};
  for (const k of Object.keys(CFG.meta.upgrades)) upgrades[k] = 0;
  return { shards: 0, upgrades };
}

export function loadMeta(key) {
  const def = defaultMeta();
  try {
    const raw = JSON.parse(localStorage.getItem(key) || 'null');
    if (!raw || typeof raw !== 'object') return def;
    const upgrades = {};
    for (const k of Object.keys(CFG.meta.upgrades)) {
      const v = raw.upgrades && typeof raw.upgrades[k] === 'number' ? raw.upgrades[k] : 0;
      upgrades[k] = Math.min(CFG.meta.upgrades[k].max, Math.max(0, Math.floor(v)));
    }
    return { shards: Math.floor(num(raw.shards)), upgrades };
  } catch { return def; }
}

export function saveMeta(key, meta) {
  try { localStorage.setItem(key, JSON.stringify(meta)); } catch { /* private mode */ }
}

// Per-level cumulative victory counts (13.6) — victory-only; level unlocks key off this.
export function defaultWins() {
  const wins = {};
  for (const k of LEVEL_ORDER) wins[k] = 0;
  return wins;
}

export function loadWins(key) {
  const def = defaultWins();
  try {
    const raw = JSON.parse(localStorage.getItem(key) || 'null');
    if (!raw || typeof raw !== 'object') return def;
    for (const k of LEVEL_ORDER) def[k] = Math.floor(num(raw[k]));
    return def;
  } catch { return def; }
}

export function saveWins(key, wins) {
  try { localStorage.setItem(key, JSON.stringify(wins)); } catch { /* private mode */ }
}

// Counts a victory (caller gates on victory — deaths don't count).
export function recordWin(wins, levelKey) {
  if (!LEVELS[levelKey]) return wins;
  wins[levelKey] = (wins[levelKey] || 0) + 1;
  return wins;
}

// Unlock rule (13.6): open once the prerequisite level has `unlock.wins` cumulative victories.
export function isUnlocked(wins, levelKey) {
  const lvl = LEVELS[levelKey];
  if (!lvl || !lvl.unlock.level) return true;
  return (wins[lvl.unlock.level] || 0) >= lvl.unlock.wins;
}

// Last-selected level (13.7) — persist/restore the level-select choice.
// Invalid/absent storage falls back to the first level (always unlocked).
export function loadSelectedLevel(key) {
  let saved = null;
  try { saved = localStorage.getItem(key); } catch { return LEVEL_ORDER[0]; }
  return LEVELS[saved] ? saved : LEVEL_ORDER[0];
}

export function saveSelectedLevel(key, levelKey) {
  try { if (LEVELS[levelKey]) localStorage.setItem(key, levelKey); } catch { /* private mode */ }
}

// View zoom (13.8): camera-view factor (CFG.zoom.touch | CFG.zoom.full), persisted as raw string.
// Invalid/absent storage falls back to the device default (touch 0.80 / desktop 1.0).
export function defaultZoom(isTouch) {
  return isTouch ? CFG.zoom.touch : CFG.zoom.full;
}

export function loadZoom(key, isTouch) {
  const d = defaultZoom(isTouch);
  try {
    const v = Number(localStorage.getItem(key));
    if (v === CFG.zoom.touch || v === CFG.zoom.full) return v;
  } catch { /* private mode */ }
  return d;
}

export function saveZoom(key, z) {
  try { localStorage.setItem(key, String(z)); } catch { /* private mode */ }
}

// Shards earned from a finished run's stats ({score, victory}).
export function shardsFor(stats) {
  const M = CFG.meta;
  return Math.floor((stats.score || 0) / M.shardPerScore) + (stats.victory ? M.victoryBonus : 0);
}

// Cost of the next level of upgrade `key` at `level`; null = maxed.
export function upgradeCost(key, level) {
  const upg = CFG.meta.upgrades[key];
  if (!upg) return null;
  if (level >= upg.max) return null;
  return upg.cost[level];
}

// Apply a meta profile onto a player (or plain stats object). Called after
// player.reset() at the start of every run.
export function applyMeta(p, meta) {
  const M = CFG.meta.upgrades;
  const u = meta.upgrades || {};
  p.xpMul = 1 + M.xp.val * (u.xp || 0);
  p.dashCdMul = 1 + M.dash.val * (u.dash || 0);
  p.metaHp = M.maxHp.val * (u.maxHp || 0);
  p.metaDmg = M.dmg.val * (u.dmg || 0);
  p.metaSpeed = M.speed.val * (u.speed || 0);
  return p;
}
