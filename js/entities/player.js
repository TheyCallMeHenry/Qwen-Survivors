// Player: movement feel (exponential approach), dash with i-frames,
// weapon firing, XP/levels, and the pure level-up card logic.
// Node-safe: no canvas at top level (flash frames injected at runtime).
import { CFG } from '../config.js';
import { approach, clamp } from '../utils/math.js';

export class Player {
  constructor(def) {
    this.def = def; // characters.player {w, h, shadowR, idle[2], run[4]}
    this.flashes = null; // [idleFlash[2], runFlash[4]] — injected (browser)
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.r = CFG.player.r;
    this.maxHp = CFG.player.maxHp;
    this.hp = this.maxHp;
    this.iframes = 0;
    this.flash = 0;
    this.dashT = 0; this.dashCd = 0; this.dashAng = 0;
    this.aimAng = 0;
    this.level = 1; this.xp = 0;
    this.weapons = {};   // weaponKey -> level (1..5)
    this.passives = {};  // passiveKey -> level (0..max)
    this.synergies = {}; // synergyKey -> level (0..1) — outside maxWeapons
    this.dmgMul = 1; this.speedMul = 1; this.magnet = 1; this.regen = 0;
    this.xpMul = 1; this.dashCdMul = 1;
    this.metaHp = 0; this.metaDmg = 0; this.metaSpeed = 0;
    this.animT = 0; this.frameIdx = 0; this.moving = false; this.flip = false;
    this.dead = false;
    this._wandCd = 0; this._axeCd = 0;
    this._pistolCd = 0; this._bombCd = 0;
    this._garlicT = 0; this._orbitT = 0; this._tempestT = 0;
    this._flame = { fuel: 0, reloading: false };
    this._flameAng = 0;
  }

  reset(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.maxHp = CFG.player.maxHp;
    this.hp = this.maxHp;
    this.iframes = 0; this.flash = 0;
    this.dashT = 0; this.dashCd = 0; this.dashAng = 0; this.aimAng = 0;
    this.level = 1; this.xp = 0;
    this.weapons = {};
    for (const k of CFG.player.startWeapons) this.weapons[k] = 1;
    this.passives = {};
    this.synergies = {};
    this.dmgMul = 1; this.speedMul = 1; this.magnet = 1; this.regen = 0;
    this.xpMul = 1; this.dashCdMul = 1;
    this.metaHp = 0; this.metaDmg = 0; this.metaSpeed = 0;
    this.animT = 0; this.frameIdx = 0; this.moving = false; this.flip = false;
    this.dead = false;
    this._wandCd = 0; this._axeCd = 0;
    this._pistolCd = 0; this._bombCd = 0;
    this._garlicT = 0; this._orbitT = 0; this._tempestT = 0;
    this._flame = { fuel: 0, reloading: false };
    this._flameAng = 0;
    this._phoenixKills = 0;
  }

  gainXp(n) {
    let ups = 0;
    this.xp += n * this.xpMul;
    while (this.xp >= CFG.xpNeed(this.level)) {
      this.xp -= CFG.xpNeed(this.level);
      this.level++;
      ups++;
    }
    return ups;
  }

  heal(n) {
    if (n > 0) this.hp = Math.min(this.maxHp, this.hp + n);
  }

  tryDash(ax, ay) {
    if (this.dead || this.dashT > 0 || this.dashCd > 0) return false;
    if (Math.hypot(ax, ay) > 0.1) this.dashAng = Math.atan2(ay, ax);
    else if (Math.hypot(this.vx, this.vy) > 30) this.dashAng = Math.atan2(this.vy, this.vx);
    else this.dashAng = this.aimAng;
    this.dashT = CFG.player.dashTime;
    this.dashCd = CFG.player.dashCd * this.dashCdMul;
    this.iframes = Math.max(this.iframes, this.dashT + CFG.player.dashIframeExtra);
    return true;
  }

  update(dt, axes, combat, enemies, world) {
    const P = CFG.player;
    if (this.iframes > 0) this.iframes -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.flash > 0) this.flash -= dt;

    let ax = axes.x, ay = axes.y;
    const am = Math.hypot(ax, ay);
    if (am > 1) { ax /= am; ay /= am; }
    if (am > 0.1) this.aimAng = Math.atan2(ay, ax);

    if (this.dashT > 0) {
      this.dashT -= dt;
      this.iframes = Math.max(this.iframes, this.dashT + P.dashIframeExtra);
      this.vx = Math.cos(this.dashAng) * P.dashSpeed;
      this.vy = Math.sin(this.dashAng) * P.dashSpeed;
    } else if (am > 0.1) {
      const sp = P.speed * this.speedMul;
      this.vx = approach(this.vx, ax * sp, P.accel, dt);
      this.vy = approach(this.vy, ay * sp, P.accel, dt);
    } else {
      this.vx = approach(this.vx, 0, P.accel, dt);
      this.vy = approach(this.vy, 0, P.accel, dt);
    }

    if (this.regen > 0 && this.hp > 0) this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // static collider push-out (circles + ellipse in unit space)
    for (const c of world.collidersNear(this.x, this.y)) {
      if (c.ellipse) {
        const qx = (this.x - c.x) / c.rx, qy = (this.y - c.y) / c.ry;
        const d = Math.hypot(qx, qy) || 1;
        if (d < 1) { this.x = c.x + qx / d * c.rx; this.y = c.y + qy / d * c.ry; }
      } else {
        const ox = this.x - c.x, oy = this.y - c.y;
        const d = Math.hypot(ox, oy) || 1;
        const min = this.r + c.r;
        if (d < min) { this.x = c.x + ox / d * min; this.y = c.y + oy / d * min; }
      }
    }
    this.x = clamp(this.x, CFG.world.margin, CFG.world.w - CFG.world.margin);
    this.y = clamp(this.y, CFG.world.margin, CFG.world.h - CFG.world.margin);

    this.moving = Math.hypot(this.vx, this.vy) > 30;
    this.animT += dt * (this.moving ? 1 : 0.25);
    const setN = this.moving ? this.def.run.length : this.def.idle.length;
    this.frameIdx = ((this.animT * P.animFps) | 0) % setN;
    if (Math.abs(this.vx) > 12) this.flip = this.vx < 0;

    this._weapons(dt, enemies, combat);
  }

  _weapons(dt, enemies, combat) {
    const W = CFG.weapons;
    if (this.weapons.wand) {
      const S = W.wand.levels[this.weapons.wand - 1];
      this._wandCd -= dt;
      if (this._wandCd <= 0) {
        const e = this._nearest(enemies, CFG.combat.wandRange);
        if (e) {
          const ang = Math.atan2(e.y - this.y, e.x - this.x);
          for (let i = 0; i < S.count; i++) {
            const a2 = ang + (i - (S.count - 1) / 2) * CFG.combat.wandSpread;
            combat.fireBolt(this.x, this.y, a2, S.dmg * this.dmgMul, S.pierce,
              this.synergies.blight ? CFG.synergies.blight.levels[0] : null, this);
          }
          this._wandCd = S.rate;
        }
      }
    }
    if (this.weapons.axe) {
      const S = W.axe.levels[this.weapons.axe - 1];
      this._axeCd -= dt;
      if (this._axeCd <= 0) {
        const e = this._nearest(enemies, CFG.combat.wandRange);
        const ang = e ? Math.atan2(e.y - this.y, e.x - this.x) : this.aimAng;
        combat.fireAxe(this.x, this.y, ang, S.dmg * this.dmgMul, S.size, S.count, this);
        this._axeCd = S.cd;
      }
    }
    if (this.weapons.pistols) {
      const S = W.pistols.levels[this.weapons.pistols - 1];
      this._pistolCd -= dt;
      if (this._pistolCd <= 0) {
        const [n1, n2] = this._nearestTwo(enemies, CFG.combat.pistolRange);
        if (n1) {
          const a1 = Math.atan2(n1.y - this.y, n1.x - this.x);
          const a2 = n2 ? Math.atan2(n2.y - this.y, n2.x - this.x) : a1 + S.spread;
          const inf = this.synergies.inferno ? CFG.synergies.inferno.levels[0] : null;
          combat.fireBullet(this.x, this.y, a1, S.dmg * this.dmgMul, inf, this);
          combat.fireBullet(this.x, this.y, a2, S.dmg * this.dmgMul, inf, this);
          if (combat.pulse) combat.pulse('pistol');
          this._pistolCd = S.rate;
        }
      }
    }
    if (this.weapons.bombs) {
      const S = W.bombs.levels[this.weapons.bombs - 1];
      this._bombCd -= dt;
      if (this._bombCd <= 0) {
        const C = CFG.combat;
        const e = this._nearest(enemies, C.wandRange);
        let ang = this.aimAng, dist = C.bombDist;
        if (e) {
          ang = Math.atan2(e.y - this.y, e.x - this.x);
          dist = Math.min(Math.hypot(e.x - this.x, e.y - this.y), C.bombDist);
        }
        dist = Math.max(dist, C.bombMin);
        const nap = this.synergies.napalm ? CFG.synergies.napalm.levels[0] : null;
        combat.fireBomb(this.x, this.y, ang, dist, S.dmg * this.dmgMul, S.r, S.fuse, nap, this);
        this._bombCd = S.cd;
      }
    }
    if (this.weapons.flame) {
      const S = W.flame.levels[this.weapons.flame - 1];
      const f = this._flame;
      if (f.fuel <= 0 && !f.reloading) f.fuel = S.fuel; // not fired yet — start full
      if (f.fuel > S.fuel) f.fuel = S.fuel;
      if (f.reloading) {
        f.fuel += (S.fuel / S.recharge) * dt;
        if (f.fuel >= S.fuel) { f.fuel = S.fuel; f.reloading = false; }
      } else {
        const e = this._nearest(enemies, S.range);
        if (e) {
          this._flameAng = Math.atan2(e.y - this.y, e.x - this.x);
          const n = 2 + ((combat.t * 60) | 0) % 2; // flow: 2–3 sprites per frame
          for (let i = 0; i < n; i++) {
            combat.emitFlame(this.x, this.y, this._flameAng, S.tick * this.dmgMul, S.dot * this.dmgMul, S.dotDur, this);
          }
          if (combat.pulse) combat.pulse('fire');
          f.fuel -= dt;
          if (f.fuel <= 0) { f.fuel = 0; f.reloading = true; }
        }
      }
    }
  }

  // The two closest live enemies within range (for the twin pistols' 2-direction shot).
  _nearestTwo(enemies, range) {
    let b1 = null, b2 = null, d1 = range * range, d2 = range * range;
    for (const e of enemies.list) {
      if (e.dead) continue;
      const dx = e.x - this.x, dy = e.y - this.y;
      const d = dx * dx + dy * dy;
      if (d > d2) continue;
      if (d < d1) { b2 = b1; d2 = d1; b1 = e; d1 = d; }
      else if (d < d2) { b2 = e; d2 = d; }
    }
    return [b1, b2];
  }

  _nearest(enemies, range) {
    let best = null, bd = range * range;
    for (const e of enemies.list) {
      if (e.dead) continue;
      const dx = e.x - this.x, dy = e.y - this.y;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  draw(ctx) {
    const def = this.def;
    const running = this.moving;
    const set = running ? def.run : def.idle;
    const img = this.flash > 0 && this.flashes ? this.flashes[running ? 1 : 0][this.frameIdx] : set[this.frameIdx];
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -def.w / 2, -def.h);
    ctx.restore();
    if (this.weapons.flame) {
      // fuel bar above the player (red = recharging)
      const S = CFG.weapons.flame.levels[this.weapons.flame - 1];
      const w = 26, h = 3;
      const f = Math.max(0, Math.min(1, this._flame.fuel / S.fuel));
      ctx.fillStyle = 'rgba(10,8,14,0.75)';
      ctx.fillRect(this.x - w / 2, this.y - def.h - 12, w, h);
      ctx.fillStyle = this._flame.reloading ? '#ff9a4a' : '#ff6b2e';
      ctx.fillRect(this.x - w / 2 + 0.5, this.y - def.h - 11.5, (w - 1) * f, h - 1);
    }
  }
}

// --- Pure level-up card logic (Node-testable) ---

// --- Exact-effect card text (user rule: every card states the EXACT effect of
// selecting it). `level` = the level the pick/buy grants. Pure + Node-tested.
//   weapons:  per-stat deltas prev→next from the level table (Lv 1 = full stats)
//   passives: this level's increment + running total
//   synergies: full single-level effect with numbers
//   meta:     this level's increment + running total
export function cardEffectText(kind, key, level) {
  if (kind === 'weapon') return _weaponEffect(key, level);
  if (kind === 'passive') return _passiveEffect(key, level);
  if (kind === 'synergy') return _synergyEffect(key);
  if (kind === 'meta') return _metaEffect(key, level);
  return '';
}

// seconds formatting: 0.45 → "0.45", 3 → "3.0", 2.5 → "2.5" (never round a value up)
const fmtS = (v) => (v < 1 ? v.toFixed(2) : v % 1 === 0 ? v.toFixed(1) : String(v));
const round3 = (x) => Math.round(x * 1000) / 1000; // float totals (0.8*3 = 2.4000000000000004)
const pct = (f) => `${Math.round(f * 1000) / 10}%`; // 0.1 → "10%", 0.30000000000000004 → "30%"

// per-weapon ordered stat fields: [field, abs(v) → string, delta(a, b) → string]
const WEAPON_FIELDS = {
  wand: [
    ['count', (v) => `${v} bolt${v > 1 ? 's' : ''}`, (a, b) => `bolts ${a}→${b}`],
    ['rate', (v) => `every ${fmtS(v)} s`, (a, b) => `rate ${fmtS(a)}→${fmtS(b)} s`],
    ['dmg', (v) => `${v} dmg`, (a, b) => `dmg ${a}→${b}`],
    ['pierce', (v) => (v > 0 ? `pierce ${v}` : 'no pierce'), (a, b) => `pierce ${a}→${b}`],
  ],
  garlic: [
    ['dmg', (v) => `${v} dmg per tick`, (a, b) => `dmg ${a}→${b} per tick`],
    ['r', (v) => `radius ${v}`, (a, b) => `radius ${a}→${b}`],
  ],
  axe: [
    ['cd', (v) => `every ${fmtS(v)} s`, (a, b) => `every ${fmtS(a)}→${fmtS(b)} s`],
    ['count', (v) => `${v} axe${v > 1 ? 's' : ''}`, (a, b) => `axes ${a}→${b}`],
    ['dmg', (v) => `${v} dmg`, (a, b) => `dmg ${a}→${b}`],
  ],
  blades: [
    ['n', (v) => `${v} blade${v > 1 ? 's' : ''}`, (a, b) => `blades ${a}→${b}`],
    ['dmg', (v) => `${v} dmg`, (a, b) => `dmg ${a}→${b}`],
    ['rad', (v) => `radius ${v}`, (a, b) => `radius ${a}→${b}`],
  ],
  pistols: [
    ['rate', (v) => `every ${fmtS(v)} s`, (a, b) => `rate ${fmtS(a)}→${fmtS(b)} s`],
    ['dmg', (v) => `${v} dmg per round`, (a, b) => `dmg ${a}→${b} per round`],
    ['spread', (v) => `spread ${v}`, (a, b) => `spread ${a}→${b}`],
  ],
  bombs: [
    ['cd', (v) => `every ${fmtS(v)} s`, (a, b) => `every ${fmtS(a)}→${fmtS(b)} s`],
    ['dmg', (v) => `${v} dmg`, (a, b) => `dmg ${a}→${b}`],
    ['r', (v) => `radius ${v}`, (a, b) => `radius ${a}→${b}`],
    ['fuse', (v) => `fuse ${fmtS(v)} s`, (a, b) => `fuse ${fmtS(a)}→${fmtS(b)} s`],
  ],
  flame: [
    ['tick', (v) => `${v} dmg tick`, (a, b) => `tick ${a}→${b}`],
    ['dot', (v) => `burn ${v} dmg/s`, (a, b) => `burn ${a}→${b} dmg/s`],
    ['dotDur', (v) => `burn ${fmtS(v)} s`, (a, b) => `burn ${fmtS(a)}→${fmtS(b)} s`],
    ['range', (v) => `range ${v}`, (a, b) => `range ${a}→${b}`],
    ['fuel', (v) => `fuel ${fmtS(v)} s`, (a, b) => `fuel ${fmtS(a)}→${fmtS(b)} s`],
    ['recharge', (v) => `recharge ${fmtS(v)} s`, (a, b) => `recharge ${fmtS(a)}→${fmtS(b)} s`],
  ],
};

function _weaponEffect(key, level) {
  const def = CFG.weapons[key];
  const fields = WEAPON_FIELDS[key];
  if (!def || !fields) return '';
  const cur = def.levels[level - 1];
  if (!cur) return '';
  if (level <= 1) return fields.map(([f, abs]) => abs(cur[f])).join(' · ');
  const prev = def.levels[level - 2];
  const parts = [];
  for (const [f, , delta] of fields) if (prev[f] !== cur[f]) parts.push(delta(prev[f], cur[f]));
  return parts.length ? parts.join(' · ') : fields.map(([f, abs]) => abs(cur[f])).join(' · ');
}

const PASSIVE_EFFECT = {
  speed: (v, L) => `+${pct(v)} movement speed → total +${pct(v * L)}`,
  hp: (v, L) => `+${v} max HP + heal ${v} now → total +${v * L} max HP`,
  dmg: (v, L) => `+${pct(v)} weapon damage → total +${pct(v * L)}`,
  magnet: (v, L) => `+${pct(v)} pickup range → total +${pct(v * L)}`,
  regen: (v, L) => `+${round3(v)} HP/s → total ${round3(v * L)} HP/s`,
};

function _passiveEffect(key, level) {
  const def = CFG.passives[key];
  const fn = PASSIVE_EFFECT[key];
  if (!def || !fn) return '';
  return fn(def.val, level);
}

const SYNERGY_EFFECT = {
  blight: (s) => `Moonbolts apply Blight — ${s.dps} dmg/s for ${fmtS(s.dur)} s`,
  tempest: (s) => `Orbiting blades hurl tangential bolts — ${s.dmg} dmg every ${fmtS(s.rate)} s`,
  inferno: (s) => `Twin rounds ignite foes — ${s.dps} dmg/s burn for ${fmtS(s.dur)} s`,
  napalm: (s) => `Bomb blasts ignite foes — ${s.dps} dmg/s burn for ${fmtS(s.dur)} s`,
  phoenix: (s) => `Heal ${s.heal} HP every ${s.every} kills`,
};

function _synergyEffect(key) {
  const def = CFG.synergies[key];
  const fn = SYNERGY_EFFECT[key];
  if (!def || !fn) return '';
  return fn(def.levels[0]);
}

const META_EFFECT = {
  maxHp: (v, L) => `+${v} max HP → total +${v * L} max HP`,
  dmg: (v, L) => `+${pct(v)} weapon damage → total +${pct(v * L)}`,
  speed: (v, L) => `+${pct(v)} movement speed → total +${pct(v * L)}`,
  xp: (v, L) => `+${pct(v)} XP gain → total +${pct(v * L)}`,
  dash: (v, L) => `−${pct(Math.abs(v))} dash cooldown → total −${pct(Math.abs(v * L))}`,
};

function _metaEffect(key, level) {
  const def = CFG.meta.upgrades[key];
  const fn = META_EFFECT[key];
  if (!def || !fn) return '';
  return fn(def.val, level);
}

// Rebuild derived stats from the passive table. target = Player or plain object.
export function recomputeStats(p) {
  p.dmgMul = (1 + CFG.passives.dmg.val * (p.passives.dmg || 0)) * (1 + (p.metaDmg || 0));
  p.speedMul = (1 + CFG.passives.speed.val * (p.passives.speed || 0)) * (1 + (p.metaSpeed || 0));
  p.magnet = 1 + CFG.passives.magnet.val * (p.passives.magnet || 0);
  p.regen = CFG.passives.regen.val * (p.passives.regen || 0);
  p.maxHp = CFG.player.maxHp + CFG.passives.hp.val * (p.passives.hp || 0) + (p.metaHp || 0);
}

// Up to 3 distinct upgrade candidates: weapon upgrades, new weapons (≤ cap),
// passives, and synergy cards (only once both synergizing weapons are max level).
// 11.5 co-op: `cap` = this player's standard-weapon slots (base maxWeapons − (N−1));
// `exclude` = Set of weapon keys owned by ANOTHER player (first picker owns the
// weapon + its upgrades for the run — never offered here). Passives are never
// locked; synergy gating follows the PICKER's own weapons/passives (per-player dicts).
export function cardOffers(weapons, passives, synergies, rng, cap = CFG.run.maxWeapons, exclude = null) {
  const pool = [];
  const ownedW = Object.keys(weapons).length;
  const locked = exclude instanceof Set ? exclude : null;
  for (const k of Object.keys(CFG.weapons)) {
    if (locked && locked.has(k)) continue;
    const lvl = weapons[k] || 0;
    const wpn = CFG.weapons[k];
    if (lvl > 0 && lvl < wpn.levels.length) pool.push({ kind: 'weapon', key: k, level: lvl + 1 });
    else if (lvl === 0 && ownedW < cap) pool.push({ kind: 'weapon', key: k, level: 1 });
  }
  for (const k of Object.keys(CFG.passives)) {
    const lvl = passives[k] || 0;
    if (lvl < CFG.passives[k].max) pool.push({ kind: 'passive', key: k, level: lvl + 1 });
  }
  for (const k of Object.keys(CFG.synergies)) {
    const S = CFG.synergies[k];
    const lvl = (synergies && synergies[k]) || 0;
    if (lvl >= S.levels.length) continue;
    if (!S.requires.every((r) => reqAtMax(weapons, passives, r))) continue;
    pool.push({ kind: 'synergy', key: k, level: lvl + 1 });
  }
  const out = [];
  const arr = pool.slice();
  while (out.length < 3 && arr.length) {
    const i = (rng() * arr.length) | 0;
    out.push(arr[i]);
    arr.splice(i, 1);
  }
  return out;
}

// Is the synergy requirement `key` (a weapon or passive key) at max level?
function reqAtMax(weapons, passives, key) {
  if (CFG.weapons[key]) return (weapons[key] || 0) >= CFG.weapons[key].levels.length;
  if (CFG.passives[key]) return (passives[key] || 0) >= CFG.passives[key].max;
  return false;
}

export function applyCard(target, card) {
  if (card.kind === 'weapon') {
    target.weapons[card.key] = Math.max(target.weapons[card.key] || 0, card.level);
  } else if (card.kind === 'synergy') {
    target.synergies = target.synergies || {};
    target.synergies[card.key] = Math.max(target.synergies[card.key] || 0, card.level);
  } else {
    const p = CFG.passives[card.key];
    target.passives[card.key] = Math.min(p.max, (target.passives[card.key] || 0) + 1);
  }
  recomputeStats(target);
  if (card.kind === 'passive' && card.key === 'hp') {
    target.hp = Math.min(target.maxHp, target.hp + CFG.passives.hp.val);
  }
}
