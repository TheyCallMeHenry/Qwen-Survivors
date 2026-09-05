// Player: movement feel (exponential approach), dash with i-frames,
// weapon firing, XP/levels, and the pure level-up card logic.
// Node-safe: no canvas at top level (flash frames injected at runtime).
import { CFG } from '../config.js';
import { approach, clamp } from '../utils/math.js';

// 11.6: playable-character stat lookup (D57). `key` = character key; falls back to the
// starter (mage) so plain test objects without charKey behave as the solo default.
export function charDef(key) {
  return CFG.characters[key] || CFG.characters.mage;
}

export class Player {
  constructor(def) {
    this.def = def; // characters.player {w, h, shadowR, idle[2], run[4]}
    this.flashes = null; // [idleFlash[2], runFlash[4]] — injected (browser)
    this.charKey = 'mage'; // 11.6: selected playable (solo default = starter, D58)
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
    this._pistolCd = 0; this._bombCd = 0; this._bowCd = 0; this._snowCd = 0;
    this._bowCharge = 0; // 23.1: >0 while the string is drawing (charge-up wind-up)
    this._ringCd = 0; this._ringBeams = []; // 12.4: Ring of Chain Lightning tick + live arcs
    this._bulletShots = 0; // 12.6 Storm Volley: rounds fired since the last strike (every 4th)
    this._garlicT = 0; this._orbitT = 0; this._tempestT = 0;
    this._flame = { fuel: 0, reloading: false };
    this._flameAng = 0;
    this.overHeal = 0; // 23.3: Phoenix Heart over-health pool (hp above maxHp, decays to 0)
  }

  // 11.6: select the playable character (D56: unique per co-op player; solo: menu pick).
  // Unknown keys are ignored (solo default stays mage).
  setCharacter(key) {
    if (CFG.characters[key]) this.charKey = key;
    return this.charKey;
  }

  reset(x, y) {
    const c = charDef(this.charKey);
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.maxHp = c.hp;
    this.hp = this.maxHp;
    this.iframes = 0; this.flash = 0;
    this.dashT = 0; this.dashCd = 0; this.dashAng = 0; this.aimAng = 0;
    this.level = 1; this.xp = 0;
    if (c.weapon) this.weapons[c.weapon] = 1; // 11.6/D34: per-character starting weapon (ghost: none)
    this.passives = {};
    this.synergies = {};
    this.dmgMul = 1; this.speedMul = 1; this.magnet = 1; this.regen = 0;
    this.xpMul = 1; this.dashCdMul = 1;
    this.metaHp = 0; this.metaDmg = 0; this.metaSpeed = 0;
    this.animT = 0; this.frameIdx = 0; this.moving = false; this.flip = false;
    this.dead = false;
    this._wandCd = 0; this._axeCd = 0;
    this._pistolCd = 0; this._bombCd = 0; this._bowCd = 0; this._snowCd = 0;
    this._bowCharge = 0;
    this._ringCd = 0; this._ringBeams = [];
    this._bulletShots = 0; // 12.6 Storm Volley shot counter
    this._garlicT = 0; this._orbitT = 0; this._tempestT = 0;
    this._flame = { fuel: 0, reloading: false };
    this._flameAng = 0;
    this.overHeal = 0;
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

  // Effective HP ceiling incl. the Phoenix Heart over-health pool (23.3): a fraction of
  // CURRENT max HP, re-evaluated on every call (Heart of Oak raises max mid-run).
  ohCap() {
    return this.maxHp * CFG.synergies.phoenix.levels[0].ceiling;
  }

  // 23.3: heart collected AT FULL HP with the synergy → over-health past max, capped at
  // ohCap(). The bonus sits on hp (so damage eats it first) and decays via _overHeal.
  applyOverHeal(n) {
    if (!(this.synergies && this.synergies.phoenix) || n <= 0) return false;
    if (this.hp < this.maxHp) return false; // injured → the caller routes to heal()
    const cap = this.ohCap();
    const before = Math.max(this.hp, this.maxHp);
    this.hp = Math.min(cap, before + n);
    this.overHeal = Math.max(0, Math.min(this.hp - this.maxHp, cap - this.maxHp));
    return true;
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
      const sp = charDef(this.charKey).speed * this.speedMul; // 11.6: per-character base speed
      this.vx = approach(this.vx, ax * sp, P.accel, dt);
      this.vy = approach(this.vy, ay * sp, P.accel, dt);
    } else {
      this.vx = approach(this.vx, 0, P.accel, dt);
      this.vy = approach(this.vy, 0, P.accel, dt);
    }

    if (this.regen > 0 && this.hp > 0) this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);
    this._overHeal(dt);

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

  // 23.3: the over-health diminishes CFG.synergies.phoenix.decay of max HP per second
  // back to 100% (hp pinned at maxHp); a fresh heart re-applies and out-runs it.
  _overHeal(dt) {
    if (this.overHeal <= 0) { this.overHeal = 0; return; }
    const drain = this.maxHp * CFG.synergies.phoenix.levels[0].decay * dt;
    const target = Math.max(this.maxHp, this.hp - drain);
    if (target >= this.hp) { // decay would overshoot the remainder — settle at hp = maxHp
      this.overHeal = Math.max(0, this.overHeal - drain);
      this.hp = this.maxHp;
      return;
    }
    this.overHeal = this.hp > this.maxHp ? target - this.maxHp : 0;
    this.hp = target;
  }

  // 16.2: shared projectile spawn origin — (x, y) IS the feet (the sprite is
  // bottom-anchored), so every fired weapon aims + spawns from mid-torso:
  // a fraction (CFG.combat.spawnOriginFrac) of the character sprite height up.
  _spawnY() {
    return this.y - this.def.h * CFG.combat.spawnOriginFrac;
  }

  _weapons(dt, enemies, combat) {
    const W = CFG.weapons;
    if (this.weapons.wand) {
      const S = W.wand.levels[this.weapons.wand - 1];
      this._wandCd -= dt;
      if (this._wandCd <= 0) {
        const e = this._nearest(enemies, CFG.combat.wandRange);
        if (e) {
          const sy = this._spawnY();
          const ang = Math.atan2(e.y - sy, e.x - this.x);
          for (let i = 0; i < S.count; i++) {
            const a2 = ang + (i - (S.count - 1) / 2) * CFG.combat.wandSpread;
            combat.fireBolt(this.x, sy, a2, S.dmg * this.dmgMul, S.pierce,
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
        const sy = this._spawnY();
        const ang = e ? Math.atan2(e.y - sy, e.x - this.x) : this.aimAng;
        combat.fireAxe(this.x, sy, ang, S.dmg * this.dmgMul, S.size, S.count, this);
        this._axeCd = S.cd;
      }
    }
    if (this.weapons.pistols) {
      const S = W.pistols.levels[this.weapons.pistols - 1];
      this._pistolCd -= dt;
      if (this._pistolCd <= 0) {
        const [n1, n2] = this._nearestTwo(enemies, CFG.combat.pistolRange);
        if (n1) {
          const sy = this._spawnY();
          const a1 = Math.atan2(n1.y - sy, n1.x - this.x);
          const a2 = n2 ? Math.atan2(n2.y - sy, n2.x - this.x) : a1 + S.spread;
          const inf = this.synergies.inferno ? CFG.synergies.inferno.levels[0] : null;
          // 12.6 Storm Volley: every 4th ROUND carries the lightning strike — so the
          // counter advances once per volley (the pair), not once per round: a lone
          // second round aimed at nothing must still spend its slot, or the cadence
          // drifts to "every 4th trigger" (26 rounds) instead of every 8.
          const svLvl = this.synergies.stormVolley || 0;
          let storm1 = null, storm2 = null;
          if (svLvl > 0) {
            const SV = CFG.synergies.stormVolley.levels[svLvl - 1];
            this._bulletShots++;
            if (this._bulletShots % 4 === 0) { storm1 = SV; storm2 = SV; }
          }
          combat.fireBullet(this.x, sy, a1, S.dmg * this.dmgMul, inf, this, storm1);
          combat.fireBullet(this.x, sy, a2, S.dmg * this.dmgMul, inf, this, storm2);
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
        const sy = this._spawnY();
        let ang = this.aimAng, dist = C.bombDist;
        if (e) {
          ang = Math.atan2(e.y - sy, e.x - this.x);
          dist = Math.min(Math.hypot(e.x - this.x, e.y - sy), C.bombDist);
        }
        dist = Math.max(dist, C.bombMin);
        const nap = this.synergies.napalm ? CFG.synergies.napalm.levels[0] : null;
        combat.fireBomb(this.x, sy, ang, dist, S.dmg * this.dmgMul, S.r, S.fuse, nap, this);
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
          const sy = this._spawnY();
          this._flameAng = Math.atan2(e.y - sy, e.x - this.x);
          const n = 2 + ((combat.t * 60) | 0) % 2; // flow: 2–3 sprites per frame
          for (let i = 0; i < n; i++) {
            combat.emitFlame(this.x, sy, this._flameAng, S.tick * this.dmgMul, S.dot * this.dmgMul, S.dotDur, this);
          }
          if (combat.pulse) combat.pulse('fire');
          f.fuel -= dt;
          if (f.fuel <= 0) { f.fuel = 0; f.reloading = true; }
        }
      }
    }
    if (this.weapons.snowball) {
      // 12.3: lob at the nearest enemy — the burst lands on it (target point tracked at
      // fire time; impact AoE + slow stacks resolve in combat._snowBurst).
      const S = W.snowball.levels[this.weapons.snowball - 1];
      this._snowCd -= dt;
      if (this._snowCd <= 0) {
        const e = this._nearest(enemies, CFG.combat.wandRange);
        if (e) {
          const sy = this._spawnY();
          // 12.6 Blue Flame: the burst also flash-freezes + burns (blue-flame state, 12.5).
          const bfLvl = this.synergies.blueFlame || 0;
          combat.fireSnowball(this.x, sy, e.x, e.y, S.dmg * this.dmgMul, S.r, this,
            bfLvl > 0 ? CFG.synergies.blueFlame.levels[bfLvl - 1] : null);
          this._snowCd = S.cd;
        }
      }
    }
    if (this.weapons.ringLightning) {
      // 12.4: periodic shock bolt at the nearest foe (mid-torso origin, 16.2). Each bolt
      // adds one shock stack; the 3rd stacks → stun + chain burst (combat.applyShock).
      const S = W.ringLightning.levels[this.weapons.ringLightning - 1];
      this._ringCd -= dt;
      if (this._ringCd <= 0) {
        const e = this._nearest(enemies, CFG.combat.wandRange);
        if (e) {
          const sy = this._spawnY();
          combat.fireShockBolt(this.x, sy, e, S.dmg * this.dmgMul, S.jumps, this);
          this._ringCd = CFG.combat.ringCd;
        }
      }
    }
    if (this.weapons.bow) {
      const S = W.bow.levels[this.weapons.bow - 1];
      // 23.1 charge-up: full interval → drawn string holds for CFG.weapons.bow.charge
      // (visible draw/telegraph, see draw()) → arrow looses → back to interval.
      this._bowCd -= dt;
      if (this._bowCharge > 0) {
        this._bowCharge -= dt;
        if (this._bowCharge <= 0) {
          const e = this._nearest(enemies, CFG.combat.wandRange);
          if (e) {
            const sy = this._spawnY();
            // 12.6 synergies: Flaming Arrows (burn on hit) + Heart-Piercer (bonus dmg + pierce).
            const faLvl = this.synergies.flamingArrows || 0;
            const hpLvl = this.synergies.heartPiercer || 0;
            combat.fireArrow(this.x, sy, Math.atan2(e.y - sy, e.x - this.x), S.dmg * this.dmgMul, this,
              faLvl > 0 ? CFG.synergies.flamingArrows.levels[faLvl - 1] : null,
              hpLvl > 0 ? CFG.synergies.heartPiercer.levels[hpLvl - 1] : null);
          }
          this._bowCd = S.rate;
        }
      } else if (this._bowCd <= 0) {
        const e = this._nearest(enemies, CFG.combat.wandRange);
        if (e) this._bowCharge = W.bow.charge;
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
    // 23.1 charge-up telegraph: the arrow nocks at mid-torso and slides from full draw
    // (tail on the body, opposite the aim) to the muzzle as _bowCharge drains.
    if (this.weapons.bow && this._bowCharge > 0) {
      const sy = this._spawnY();
      const t = Math.max(0, Math.min(1, 1 - this._bowCharge / CFG.weapons.bow.charge));
      const len = 22;
      const bx = this.x - Math.cos(this.aimAng) * (len - 14 * t);
      const by = sy - Math.sin(this.aimAng) * (len - 14 * t);
      ctx.save();
      ctx.strokeStyle = 'rgba(230,240,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(this.x + Math.cos(this.aimAng) * 6, sy + Math.sin(this.aimAng) * 6);
      ctx.stroke();
      ctx.restore();
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
  if (kind === 'synergy') return _synergyEffect(key, level);
  if (kind === 'meta') return _metaEffect(key, level);
  return '';
}

// seconds formatting: 0.45 → "0.45", 3 → "3.0", 2.5 → "2.5" (never round a value up).
// 12.6 trap: String(v) is NOT the same as v.toFixed(2) — it drops trailing zeros, so
// 0.8 rendered "0.80" but 0.6 rendered "0.6" (same table, different shape). Pad to two
// decimals first, then only ever strip down to one decimal (3 → "3.0", never "3").
const fmtS = (v) => {
  let s = v.toFixed(2);
  if (s.endsWith('0')) s = s.slice(0, -1); // "3.00"→"3.0", "0.60"→"0.6"
  return s;
};
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
  snowball: [
    ['cd', (v) => `every ${fmtS(v)} s`, (a, b) => `every ${fmtS(a)}→${fmtS(b)} s`],
    ['dmg', (v) => `${v} dmg`, (a, b) => `dmg ${a}→${b}`],
    ['r', (v) => `blast radius ${v}`, (a, b) => `radius ${a}→${b}`],
  ],
  ringLightning: [
    ['cd', (v) => `every ${fmtS(v)} s`, (a, b) => `every ${fmtS(a)}→${fmtS(b)} s`],
    ['dmg', (v) => `${v} dmg`, (a, b) => `dmg ${a}→${b}`],
    ['jumps', (v) => `chain ${v} foe${v > 1 ? 's' : ''}`, (a, b) => `chain ${a}→${b} foes`],
  ],
  bow: [
    ['rate', (v) => `every ${fmtS(v)} s`, (a, b) => `rate ${fmtS(a)}→${fmtS(b)} s`],
    // 23.1: flat-per-weapon scalar (charge lives on the def, not the level row) — L1 card
    // only, never a prev→next delta
    ['charge', (v) => `draw ${fmtS(v)} s`, null],
    ['dmg', (v) => `${v} dmg`, (a, b) => `dmg ${a}→${b}`],
  ],
};

function _weaponEffect(key, level) {
  const def = CFG.weapons[key];
  const fields = WEAPON_FIELDS[key];
  if (!def || !fields) return '';
  const cur = def.levels[level - 1];
  if (!cur) return '';
  // 23.1: flat-per-weapon scalars (bow `charge`) live on the def, not the level row —
  // shown on the L1 full-stat card only, never as a prev→next delta.
  if (level <= 1) {
    const parts = fields.map(([f, abs]) => abs(f in cur ? cur[f] : def[f]));
    return parts.filter((s) => s !== null).join(' · ');
  }
  const prev = def.levels[level - 2];
  const parts = [];
  for (const [f, , delta] of fields) if (delta && prev[f] !== cur[f]) parts.push(delta(prev[f], cur[f]));
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
  // 23.3: over-heal in place of the old kill-heal (machinery deleted, not moved)
  phoenix: (s) => `Hearts at full health grant over-health up to ${Math.round(s.ceiling * 100)}% max HP — diminishes ${pct(s.decay)}/s`,
  // 12.6: five new synergies, 5 levels each — cards state the granted level's numbers
  flamingArrows: (s) => `Arrows ignite foes — ${s.dps} dmg/s burn for ${fmtS(s.dur)} s`,
  heartPiercer: (s) => `+${s.bonus} arrow damage — arrows pierce ${s.pierce} extra foe${s.pierce > 1 ? 's' : ''}`,
  blueFlame: (s) => `Snowball bursts freeze foes for ${fmtS(s.freeze)} s and burn them for ${s.dps} dmg/s over ${fmtS(s.dur)} s`,
  stormVolley: (s) => `Every 4th round strikes for ${s.dmg} lightning damage, arcing to ${s.jumps} nearby foe${s.jumps > 1 ? 's' : ''}`,
  heartMagnet: (s) => `Hearts are pulled toward you from ${pct(s.pull)} of your pickup range`,
};

// 12.6: multi-level synergies — `level` selects the row whose numbers the card states
// (a pick grants level N, so the card shows what that level does). Legacy 1-level
// synergies always show levels[0].
function _synergyEffect(key, level = 1) {
  const def = CFG.synergies[key];
  const fn = SYNERGY_EFFECT[key];
  if (!def || !fn) return '';
  return fn(def.levels[Math.min(Math.max(level, 1), def.levels.length) - 1]);
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
  const c = charDef(p.charKey); // 11.6: per-character base stats (D57)
  p.dmgMul = (1 + CFG.passives.dmg.val * (p.passives.dmg || 0)) * (1 + (p.metaDmg || 0)) * c.dmg;
  p.speedMul = (1 + CFG.passives.speed.val * (p.passives.speed || 0)) * (1 + (p.metaSpeed || 0));
  p.magnet = 1 + CFG.passives.magnet.val * (p.passives.magnet || 0);
  p.regen = CFG.passives.regen.val * (p.passives.regen || 0);
  p.maxHp = c.hp + CFG.passives.hp.val * (p.passives.hp || 0) + (p.metaHp || 0);
}

// Up to 3 distinct upgrade candidates: weapon upgrades, new weapons (≤ cap),
// passives, and synergy cards (only once both synergizing weapons are max level).
// 11.5 co-op: `cap` = this player's standard-weapon slots (base maxWeapons − (N−1));
// `exclude` = Set of weapon AND synergy keys owned by ANOTHER player (first picker
// owns the weapon/synergy + its upgrades for the run — never offered here, new or
// upgrade). Passives are never locked; synergy gating follows the PICKER's own
// weapons/passives (per-player dicts).
// 11.6.3 ghost: `ghostOffers` = the player's UNIQUE starting-weapon pair (D59) —
// while set (the ghost's first level-up only) the offers are exactly that pair;
// it is cleared after the first pick (applyCard) and the flow resumes normally.
export function cardOffers(weapons, passives, synergies, rng, cap = CFG.run.maxWeapons, exclude = null, ghostOffers = null) {
  if (Array.isArray(ghostOffers) && ghostOffers.length) {
    const avail = ghostOffers.filter((k) => CFG.weapons[k] && !(weapons[k] || 0));
    if (avail.length) return avail.map((k) => ({ kind: 'weapon', key: k, level: 1 }));
  }
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
    if (locked && locked.has(k)) continue; // 11.6b: other-owned synergy (first-pick-wins)
    const S = CFG.synergies[k];
    const lvl = (synergies && synergies[k]) || 0;
    if (lvl >= S.levels.length) continue;
    if (!S.requires.every((r) => reqAtMax(weapons, passives, r))) continue;
    pool.push({ kind: 'synergy', key: k, level: lvl + 1 });
  }
  // Weighted draw so an eligible synergy surfaces the moment its pair maxes —
  // it still appears early when the pool is crowded. Weighted by duplication;
  // dedup keeps an offer from showing the same card twice (synergy is duplicated).
  const SYNERGY_DRAW_WEIGHT = 8;
  const weighted = [];
  for (const c of pool) {
    const w = c.kind === 'synergy' ? SYNERGY_DRAW_WEIGHT : 1;
    for (let n = 0; n < w; n++) weighted.push(c);
  }
  const out = [];
  const drawn = new Set();
  const remaining = weighted.slice();
  while (out.length < 3 && remaining.length) {
    const i = (rng() * remaining.length) | 0;
    const card = remaining[i];
    remaining.splice(i, 1);
    const tag = `${card.kind}:${card.key}`;
    if (drawn.has(tag)) continue; // 22.7: skip a duplicate draw from weighting
    drawn.add(tag);
    out.push(card);
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
  if (card.kind === 'weapon' && card.level === 1) target._ghostOffers = null; // 11.6.3: ghost spent its starting pair
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
