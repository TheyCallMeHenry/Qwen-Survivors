// Meta progression: persistent Soulshards + between-run upgrades.
// Pure/Node-safe: localStorage only inside try/catch (degrades to defaults).
import { CFG } from '../config.js';

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
