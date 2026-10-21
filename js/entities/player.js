// Player: movement feel (exponential approach), dash with i-frames,
// weapon firing, XP/levels, and the pure level-up card logic.
// Node-safe: no canvas at top level (flash frames injected at runtime).
import { CFG } from '../config.js';
import { approach, clamp, rand } from '../utils/math.js';

// 11.6: playable-character stat lookup (D57). `key` = character key; falls back to the
// starter (mage) so plain test objects without charKey behave as the solo default.
export function charDef(key) {
  return CFG.characters[key] || CFG.characters.mage;
}

export class Player {
  constructor(def) {
    this.def = def; // roster sheet {w, h, shadowR, idle[2], run[4]} — art/heroes.js (Phase 27)
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
    // Phase 21 (D96) per-weapon timers/state (never synced — clients never simulate;
    // companion state rides the snapshot companions array, not these fields).
    this._cannonCd = 0; this._laserCd = 0; this._laserT = 0; this._webCd = 0;
    this._gatCd = 0; this._gatMag = CFG.weapons.gatling.burst; this._gatReload = 0;
    this._batCd = 0; this._batSwing = 0; this._boulderCd = 0; this._boulder = null;
    this._tongueCd = 0; this._tongueFx = null; this._ballCd = 0; this._ball = null;
    this._companion = null; this._shieldBank = null; this._skateCd = new Map();
    this._bulletShots = 0; // 12.6 Storm Volley: rounds fired since the last strike (every 4th)
    this._garlicT = 0; this._orbitT = 0; this._tempestT = 0;
    this._flame = { fuel: 0, reloading: false };
    this._flameAng = 0;
    this.overHeal = 0; // 23.3: Phoenix Heart over-health pool (hp above maxHp, decays to 0)
    // 18.3: level-up screen actions (Phase 18, D84) — per-run use counters (seeded by
    // applyMeta from the shop level) + this run's banished card keys (per-picker).
    this.actLeft = { skip: 0, reroll: 0, banish: 0 };
    this.banished = new Set();
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
    this.weapons = {}; // run start = the STARTER ONLY (D34/D66 family): a solo startRun never
    // passes through _applyChar's clear (that's the co-op path), so an old build must die here.
    if (c.weapon) this.weapons[c.weapon] = 1; // 11.6/D34: per-character starting weapon (ghost: none)
    this.passives = {}; // Phase 20 / D66: runs start with NO passives — level-up picks only
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
    this._cannonCd = 0; this._laserCd = 0; this._laserT = 0; this._webCd = 0;
    this._gatCd = 0; this._gatMag = CFG.weapons.gatling.burst; this._gatReload = 0; // runs/mid-picks start with a full mag
    this._batCd = 0; this._batSwing = 0; this._boulderCd = 0; this._boulder = null;
    this._tongueCd = 0; this._tongueFx = null; this._ballCd = 0; this._ball = null;
    this._companion = null; this._shieldBank = null; this._skateCd.clear();
    this._bulletShots = 0; // 12.6 Storm Volley shot counter
    this._garlicT = 0; this._orbitT = 0; this._tempestT = 0;
    this._flame = { fuel: 0, reloading: false };
    this._flameAng = 0;
    this.overHeal = 0;
    this.actLeft = { skip: 0, reroll: 0, banish: 0 }; // re-seeded by applyMeta per run
    this.banished = new Set(); // run-long, per-picker (D84)
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

    if (this._ball) {
      this._ballStep(dt, enemies, combat); // Cannonball (D96): player propels itself
    } else if (this.dashT > 0) {
      this.dashT -= dt;
      this.iframes = Math.max(this.iframes, this.dashT + P.dashIframeExtra);
      this.vx = Math.cos(this.dashAng) * P.dashSpeed;
      this.vy = Math.sin(this.dashAng) * P.dashSpeed;
    } else if (am > 0.1) {
      const sp = charDef(this.charKey).speed * this.speedMul; // 11.6: per-character base speed
      this.vx = approach(this.vx, ax * sp, P.accel, dt);
      this.vy = approach(this.vy, ay * sp, P.accel, dt);
    } else {
      // Ice Skates (D95): on release the deceleration shrinks to glideK× — the DOOM-style
      // slide that keeps the character drifting after input stops.
      const gk = this.passives.skates ? CFG.passives.skates.levels[this.passives.skates - 1].glideK : 1;
      this.vx = approach(this.vx, 0, P.accel * gk, dt);
      this.vy = approach(this.vy, 0, P.accel * gk, dt);
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

    if (!this._ball) this._skateSlide(dt, enemies, combat, am);

    this.moving = this._ball || Math.hypot(this.vx, this.vy) > 30;
    this.animT += dt * (this.moving ? 1 : 0.25);
    const setN = this.moving ? this.def.run.length : this.def.idle.length;
    this.frameIdx = ((this.animT * P.animFps) | 0) % setN;
    if (Math.abs(this.vx) > 12) this.flip = this.vx < 0;

    this._weapons(dt, enemies, combat);
  }

  // 23.3: the over-health diminishes CFG.synergies.phoenix.decay of max HP per second
  // back to 100% (hp pinned at maxHp); a fresh heart re-applies and out-runs it.
  _overHeal(dt) {
    // A hit can eat through the pool (hp falls to/below maxHp while the counter is
    // untouched); re-clamp it to the real surplus, else the decay branch below would
    // pull hp back up to maxHp for free.
    if (this.overHeal > this.hp - this.maxHp) this.overHeal = Math.max(0, this.hp - this.maxHp);
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

  // Cannonball (D96): the character tucks into a ball and rockets at foes. (x, y) ends
  // at each impact point (spec); invulnerable for the whole dash; bounces to fresh foes
  // until the level's hit budget. Co-op needs no special handling — this runs in the
  // host sim and _coopLeash clamps afterward (D96 ruling).
  _ballStep(dt, enemies, combat) {
    const C = CFG.combat;
    const b = this._ball;
    b.t += dt;
    this.iframes = Math.max(this.iframes, 0.1);
    if (!b.target || b.target.dead) b.target = this._nearestUntouched(enemies, b.hit, C.ballSearchR);
    if (!b.target || b.hits >= b.hitsMax || b.t > 3.2) { this._endBall(); return; }
    const dx = b.target.x - this.x, dy = b.target.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const step = C.ballSpeed * dt;
    if (d <= step + b.target.r) {
      this.x = b.target.x; this.y = b.target.y; // position = impact point (spec)
      b.hits++;
      b.hit.add(b.target);
      combat.damageEnemy(b.target, b.dmg * Math.pow(C.ballDecay, b.hits - 1) * this.dmgMul, dx / d, dy / d, 0, this);
      if (combat.onFx) combat.onFx('ball', this.x, this.y);
      b.target = null; // re-acquire next step
      if (b.hits >= b.hitsMax) this._endBall();
    } else {
      this.x += dx / d * step;
      this.y += dy / d * step;
    }
  }

  _endBall() { this._ball = null; this.vx = 0; this.vy = 0; }

  // Nearest live enemy not in `hit` (Cannonball ricochet target pick).
  _nearestUntouched(enemies, hit, range) {
    let best = null, bd = range * range;
    for (const e of enemies.list) {
      if (e.dead || hit.has(e)) continue;
      const dx = e.x - this.x, dy = e.y - this.y;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // Ice Skates slide-damage (D95/D96): gliding with no input, brushing a foe hurts
  // BOTH (spec, ≤ slideDmg per level, max 6 at max level). Per-foe 0.5 s re-hit lock;
  // the player's own share passes through damagePlayer (i-frames may shield it right
  // after another hit — intended, slide damage must never stack with contact damage).
  _skateSlide(dt, enemies, combat, am) {
    const lvl = this.passives.skates;
    if (!lvl || am > 0.1 || this.dashT > 0) return;
    if (Math.hypot(this.vx, this.vy) < CFG.combat.skateSlideMin) return;
    const row = CFG.passives.skates.levels[lvl - 1];
    for (const e of enemies.list) {
      if (e.dead) continue;
      const dx = e.x - this.x, dy = e.y - this.y;
      const rr = e.r + this.r + 2;
      if (dx * dx + dy * dy >= rr * rr) continue;
      if ((this._skateCd.get(e) || 0) > this.animT) continue;
      this._skateCd.set(e, this.animT + CFG.combat.skateSlideLock);
      const d = Math.hypot(dx, dy) || 1;
      combat.damageEnemy(e, row.slideDmg, dx / d, dy / d, 120, this);
      combat.damagePlayer(this, row.slideDmg, e.x, e.y);
      if (combat.onFx) combat.onFx('slide', e.x, e.y);
    }
    if (this._skateCd.size > 256) this._skateCd.clear();
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
      // 23.1 charge-up: full interval → drawn-string holds for CFG.weapons.bow.charge
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
    // ---- Phase 21 (D96) fire-sites — tables in CFG.weapons, mechanics in combat ----
    if (this.weapons.cannon) {
      const S = W.cannon.levels[this.weapons.cannon - 1];
      this._cannonCd -= dt;
      if (this._cannonCd <= 0) {
        const e = this._nearest(enemies, CFG.combat.wandRange);
        if (e) {
          const sy = this._spawnY();
          const hs = this.synergies.heShell || 0;
          combat.fireShell(this.x, sy, Math.atan2(e.y - sy, e.x - this.x), S.dmg * this.dmgMul, S.blastR,
            hs > 0 ? CFG.synergies.heShell.levels[hs - 1] : null, this);
          this._cannonCd = S.cd;
        }
      }
    }
    if (this.weapons.laser) {
      const S = W.laser.levels[this.weapons.laser - 1];
      if (this._laserT > 0) {
        this._laserT -= dt;
        if (this._laserT <= 0) this._laserCd = S.cd; // long cooldown between shots (spec)
      } else if ((this._laserCd -= dt) <= 0 && this._nearest(enemies, S.len)) {
        this._laserT = S.dur;
        combat.fireBeam(this, S);
        if (combat.pulse) combat.pulse('laser');
      }
    }
    if (this.weapons.boulder) {
      const S = W.boulder.levels[this.weapons.boulder - 1];
      this._boulderCd -= dt;
      // one boulder on screen, ever — even after cd ends (spec)
      if (this._boulderCd <= 0 && !this._boulder) {
        const e = this._nearest(enemies, CFG.combat.wandRange);
        if (e) {
          const dx = e.x - this.x, dy = e.y - this.y;
          // cardinal-only roll (spec): dominant axis of the target at release
          const sx = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) || 1 : 0;
          const sy = sx ? 0 : (Math.sign(dy) || 1);
          const av = this.synergies.avalanche || 0;
          combat.fireBoulder(this, this.x + sx * CFG.combat.boulderR, this.y + sy * CFG.combat.boulderR,
            sx, sy, S.dmg * this.dmgMul, av > 0 ? CFG.synergies.avalanche.levels[av - 1] : null);
          this._boulderCd = S.cd;
        }
      }
    }
    if (this.weapons.webs) {
      const S = W.webs.levels[this.weapons.webs - 1];
      this._webCd -= dt;
      if (this._webCd <= 0) {
        const e = this._nearest(enemies, CFG.combat.wandRange);
        if (e) {
          const sy = this._spawnY();
          combat.fireWeb(this.x, sy, e.x, e.y, S.dmg * this.dmgMul, S.r, S.hold, this);
          this._webCd = S.cd;
        }
      }
    }
    if (this.weapons.gatling) {
      const G = W.gatling;
      const S = G.levels[this.weapons.gatling - 1];
      if (this._gatReload > 0) {
        this._gatReload -= dt; // the 3 s reload (spec) — firing resumes with a fresh mag
        if (this._gatReload <= 0) this._gatMag = G.burst;
      } else {
        if (this._gatMag <= 0) { this._gatReload = G.reload; }
        else if ((this._gatCd -= dt) <= 0) {
          const e = this._nearest(enemies, CFG.combat.wandRange);
          if (e) {
            const sy = this._spawnY();
            const a = Math.atan2(e.y - sy, e.x - this.x) + rand(-S.spread, S.spread);
            combat.fireBullet(this.x, sy, a, S.dmg * this.dmgMul, null, this, null);
            this._gatMag--;
            this._gatCd = S.cd;
            if (combat.pulse && this._gatMag % 8 === 0) combat.pulse('pistol'); // crack, not 40 chirps
          }
        }
      }
    }
    if (this.weapons.bat) {
      const S = W.bat.levels[this.weapons.bat - 1];
      this._batCd -= dt;
      if (this._batSwing > 0) this._batSwing -= dt;
      if (this._batCd <= 0 && this._nearest(enemies, CFG.combat.batRange + 30)) {
        this._batCd = S.cd;
        this._batSwing = 0.18; // draw() telegraph arc
        combat.batSwing(this, S);
      }
    }
    if (this.weapons.tongue) {
      const S = W.tongue.levels[this.weapons.tongue - 1];
      this._tongueCd -= dt;
      if (this._tongueFx) { this._tongueFx.t -= dt; if (this._tongueFx.t <= 0) this._tongueFx = null; }
      if (this._tongueCd <= 0) {
        const e = this._nearest(enemies, CFG.combat.tongueRange);
        if (e) {
          const gf = this.synergies.gutFeast || 0;
          combat.fireTongue(this, e, S.dmg * this.dmgMul, S.poison * this.dmgMul, S.poisonDur,
            gf > 0 ? CFG.synergies.gutFeast.levels[gf - 1].mul : 1);
          this._tongueCd = S.cd;
        }
      }
    }
    if (this.weapons.ball && !this._ball && this.dashT <= 0) {
      const S = W.ball.levels[this.weapons.ball - 1];
      this._ballCd -= dt;
      if (this._ballCd <= 0) {
        const e = this._nearest(enemies, CFG.combat.ballSearchR);
        if (e) {
          this._ball = { t: 0, target: e, hits: 0, hitsMax: S.hits, hit: new Set(), dmg: S.dmg };
          this._ballCd = W.ball.cd; // 10 s at every level (spec)
          if (combat.pulse) combat.pulse('ball');
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
    if (this._ball) {
      // Cannonball (D96): the character reads as a rolling ball in their accent color.
      const r = def.h * 0.34;
      const acc = (CFG.characters[this.charKey] || {}).accent || '#cfd6e6';
      ctx.save();
      ctx.fillStyle = 'rgba(4,6,12,0.35)';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, r, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = acc;
      ctx.beginPath();
      ctx.arc(this.x, this.y - r, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(10,8,14,0.85)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // spin marks (phase from travel time) sell the roll
      ctx.strokeStyle = 'rgba(10,8,14,0.55)';
      ctx.lineWidth = 2;
      const sp = this._ball.t * 14;
      for (let i = 0; i < 3; i++) {
        const a = sp + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.moveTo(this.x + Math.cos(a) * r * 0.25, this.y - r + Math.sin(a) * r * 0.25);
        ctx.lineTo(this.x + Math.cos(a) * r * 0.8, this.y - r + Math.sin(a) * r * 0.8);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    const running = this.moving;
    const set = running ? def.run : def.idle;
    const img = this.flash > 0 && this.flashes ? this.flashes[running ? 1 : 0][this.frameIdx] : set[this.frameIdx];
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -def.w / 2, -def.h);
    ctx.restore();
    if (this.weapons.flame) {
      // 19.2 (D68): fuel bar beneath the player at foot level (red = recharging)
      const S = CFG.weapons.flame.levels[this.weapons.flame - 1];
      const w = 26, h = 3;
      const f = Math.max(0, Math.min(1, this._flame.fuel / S.fuel));
      ctx.fillStyle = 'rgba(10,8,14,0.75)';
      ctx.fillRect(this.x - w / 2, this.y + 5, w, h);
      ctx.fillStyle = this._flame.reloading ? '#ff9a4a' : '#ff6b2e';
      ctx.fillRect(this.x - w / 2 + 0.5, this.y + 5.5, (w - 1) * f, h - 1);
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
    // Bat swing arc (Phase 21): a quick wedge in the swing direction, fading with _batSwing.
    if (this._batSwing > 0) {
      const S = CFG.weapons.bat.levels[this.weapons.bat - 1];
      const k = this._batSwing / 0.18;
      const oy = this._spawnY();
      const half = (S.arc * Math.PI) / 360;
      ctx.save();
      ctx.globalAlpha = 0.5 * k;
      ctx.strokeStyle = '#f5d9a8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, oy, CFG.combat.batRange * (1.05 - 0.25 * k), this.aimAng - half, this.aimAng + half);
      ctx.stroke();
      ctx.restore();
    }
    // Frog tongue lash (Phase 21): the tongue line snaps toward the latched foe.
    if (this._tongueFx && this._tongueFx.e && !this._tongueFx.e.dead) {
      const e = this._tongueFx.e;
      const sy = this._spawnY();
      ctx.save();
      ctx.strokeStyle = '#8fd97a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.x, sy);
      ctx.lineTo(e.x, e.y - e.r * 0.4);
      ctx.stroke();
      ctx.fillStyle = '#6fbf5c';
      ctx.beginPath();
      ctx.arc(e.x, e.y - e.r * 0.4, 3.5, 0, Math.PI * 2);
      ctx.fill();
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
  // Phase 21 (D96) — nine new weapons
  cannon: [
    ['cd', (v) => `every ${fmtS(v)} s`, (a, b) => `every ${fmtS(a)}→${fmtS(b)} s`],
    ['dmg', (v) => `${v} dmg`, (a, b) => `dmg ${a}→${b}`],
    ['blastR', (v) => `blast radius ${v}`, (a, b) => `blast radius ${a}→${b}`],
  ],
  laser: [
    ['cd', (v) => `every ${fmtS(v)} s`, (a, b) => `every ${fmtS(a)}→${fmtS(b)} s`],
    ['dur', (v) => `${fmtS(v)} s beam`, (a, b) => `beam ${fmtS(a)}→${fmtS(b)} s`],
    ['dps', (v) => `${v} dmg/s`, (a, b) => `dmg ${a}→${b} dmg/s`],
    ['len', (v) => `length ${v}`, (a, b) => `length ${a}→${b}`],
    ['w', (v) => `width ${v}`, (a, b) => `width ${a}→${b}`],
  ],
  wolf: [
    ['dmg', (v) => `pounce ${v} dmg`, (a, b) => `pounce ${a}→${b} dmg`],
    ['bleed', (v) => `bleed ${v} dmg/s`, (a, b) => `bleed ${a}→${b} dmg/s`],
    ['bleedDur', (v) => `bleed ${fmtS(v)} s`, (a, b) => `bleed ${fmtS(a)}→${fmtS(b)} s`],
  ],
  boulder: [
    ['cd', (v) => `every ${fmtS(v)} s`, (a, b) => `every ${fmtS(a)}→${fmtS(b)} s`],
    ['dmg', (v) => `${v} dmg first hit`, (a, b) => `dmg ${a}→${b} first hit`],
  ],
  webs: [
    ['cd', (v) => `every ${fmtS(v)} s`, (a, b) => `every ${fmtS(a)}→${fmtS(b)} s`],
    ['dmg', (v) => `${v} dmg`, (a, b) => `dmg ${a}→${b}`],
    ['r', (v) => `burst radius ${v}`, (a, b) => `burst radius ${a}→${b}`],
    ['hold', (v) => `hold ${fmtS(v)} s`, (a, b) => `hold ${fmtS(a)}→${fmtS(b)} s`],
  ],
  gatling: [
    ['cd', (v) => `one shot every ${fmtS(v)} s`, (a, b) => `shot rate ${fmtS(a)}→${fmtS(b)} s`],
    ['dmg', (v) => `${v} dmg per round`, (a, b) => `dmg ${a}→${b} per round`],
    ['spread', (v) => `spread ${v}`, (a, b) => `spread ${a}→${b}`],
    ['burst', (v) => `${v}-round magazine`, null],
    ['reload', (v) => `reload ${fmtS(v)} s`, null],
  ],
  bat: [
    ['cd', (v) => `every ${fmtS(v)} s`, (a, b) => `every ${fmtS(a)}→${fmtS(b)} s`],
    ['dmg', (v) => `${v} dmg`, (a, b) => `dmg ${a}→${b}`],
    ['kb', (v) => `knockback ×${v}`, (a, b) => `knockback ×${a}→×${b}`],
    ['arc', (v) => `arc ${v}°`, (a, b) => `arc ${a}°→${b}°`],
    ['homerun', (v) => `1-in-${v} HOMERUN`, null],
  ],
  tongue: [
    ['cd', (v) => `every ${fmtS(v)} s`, (a, b) => `every ${fmtS(a)}→${fmtS(b)} s`],
    ['dmg', (v) => `${v} dmg`, (a, b) => `dmg ${a}→${b}`],
    ['poison', (v) => `poison ${v} dmg/s`, (a, b) => `poison ${a}→${b} dmg/s`],
    ['poisonDur', (v) => `poison ${fmtS(v)} s`, (a, b) => `poison ${fmtS(a)}→${fmtS(b)} s`],
  ],
  ball: [
    ['cd', (v) => `every ${fmtS(v)} s`, null],
    ['dmg', (v) => `${v} dmg`, (a, b) => `dmg ${a}→${b}`],
    ['hits', (v) => `${v} bounces`, (a, b) => `bounces ${a}→${b}`],
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

// Phase 21 run-items (D95): `levels`-table passives — the card states the granted
// level's behavior numbers (there is no scalar increment to total up).
const PASSIVE_ROW_EFFECT = {
  shield: (s) => `Reflects 3 enemy projectiles every ${fmtS(s.window)} s within radius ${s.r}`,
  skates: (s) => `+${pct(s.spd)} movement — slide hits deal ${s.slideDmg} to both`,
};

function _passiveEffect(key, level) {
  const def = CFG.passives[key];
  if (!def) return '';
  if (def.levels) {
    const fn = PASSIVE_ROW_EFFECT[key];
    if (!fn) return '';
    return fn(def.levels[Math.min(Math.max(level, 1), def.levels.length) - 1]);
  }
  const fn = PASSIVE_EFFECT[key];
  if (!fn) return '';
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
  // Phase 21 (D96) — five new synergies
  heShell: (s) => `Cannon blasts ignite foes — ${s.dps} dmg/s burn for ${fmtS(s.dur)} s`,
  staticPelt: (s) => `Wolf pounces add a shock stack + chain burst to ${s.jumps} foe${s.jumps > 1 ? 's' : ''}`,
  homerKing: (s) => `HOMERUN odds improve to 1-in-${s.odds}`,
  gutFeast: (s) => `Eaten foes restore ×${s.mul} more HP`,
  avalanche: (s) => `Boulder hits add ${s.stacks} slow stack${s.stacks > 1 ? 's' : ''}${s.bonus > 0 ? ` and +${s.bonus} dmg` : ''}`,
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
  // Ice Skates (D95): level-scaled speed bonus rides the same multiplier.
  if (p.passives.skates) p.speedMul *= 1 + CFG.passives.skates.levels[p.passives.skates - 1].spd;
  p.magnet = 1 + CFG.passives.magnet.val * (p.passives.magnet || 0);
  p.regen = CFG.passives.regen.val * (p.passives.regen || 0);
  p.maxHp = c.hp + CFG.passives.hp.val * (p.passives.hp || 0) + (p.metaHp || 0);
}

// Up to 3 distinct upgrade candidates: weapon upgrades, new weapons (≤ cap),
// passives, and synergy cards (only once both synergizing weapons are max level).
// 11.5 co-op: `cap` = this player's standard-weapon slots (base maxWeapons − (N−1));
// `exclude` = Set of weapon, synergy AND passive keys owned by ANOTHER player (first
// picker owns the item + its upgrades for the run — never offered here, new or
// upgrade). Zero shared/duplicate items across co-op players is an immutable design
// law covering weapons, synergies AND passives (D91, user law 2026-10-20); synergy
// gating follows the PICKER's own weapons/passives (per-player dicts).
// 11.6.3 ghost: `ghostOffers` = the player's UNIQUE starting-weapon pair (D59) —
// while set (the ghost's first level-up only) the offers are exactly that pair;
// it is cleared after the first pick (applyCard) and the flow resumes normally.
// 18.4 banish (D84): `banished` = this picker's run-long banished keys — excluded from
// the pool whether owned or not, so an OWNED banished card freezes at its current rank
// (no upgrade offers) while other players' pools are untouched. `exclude` (11.5,
// other-player ownership) stays separate. Reroll redraw-exclusion (D84/VS) reuses the
// same param: pass banished ∪ current-offer keys for that one draw only.
export function cardOffers(weapons, passives, synergies, rng, cap = CFG.run.maxWeapons, exclude = null, ghostOffers = null, banished = null) {
  if (Array.isArray(ghostOffers) && ghostOffers.length) {
    const avail = ghostOffers.filter((k) => CFG.weapons[k] && !(weapons[k] || 0));
    if (avail.length) return avail.map((k) => ({ kind: 'weapon', key: k, level: 1 }));
  }
  const pool = [];
  const ownedW = Object.keys(weapons).length;
  const locked = exclude instanceof Set ? exclude : null;
  const ban = banished instanceof Set ? banished : null;
  for (const k of Object.keys(CFG.weapons)) {
    if (locked && locked.has(k)) continue;
    if (ban && ban.has(k)) continue; // 18.4: banished (owned = frozen)
    const lvl = weapons[k] || 0;
    const wpn = CFG.weapons[k];
    if (lvl > 0 && lvl < wpn.levels.length) pool.push({ kind: 'weapon', key: k, level: lvl + 1 });
    else if (lvl === 0 && ownedW < cap) pool.push({ kind: 'weapon', key: k, level: 1 });
  }
  for (const k of Object.keys(CFG.passives)) {
    if (locked && locked.has(k)) continue; // D91: another player owns this passive — zero duplicates
    if (ban && ban.has(k)) continue;
    const lvl = passives[k] || 0;
    if (lvl < CFG.passives[k].max) pool.push({ kind: 'passive', key: k, level: lvl + 1 });
  }
  for (const k of Object.keys(CFG.synergies)) {
    if (locked && locked.has(k)) continue; // 11.6b: other-owned synergy (first-pick-wins)
    if (ban && ban.has(k)) continue; // 18.4
    const S = CFG.synergies[k];
    const lvl = (synergies && synergies[k]) || 0;
    if (lvl >= S.levels.length) continue;
    if (!S.requires.every((r) => reqAtMax(weapons, passives, r))) continue;
    pool.push({ kind: 'synergy', key: k, level: lvl + 1 });
  }
  return drawOffers(pool, rng);
}

// Phase 15 offer-draw rework (D81): UNIFORM sample-without-replacement.
// Every legal card in the pool has EQUAL odds of appearing; no category is favored
// (user directive 2026-09-05: "all weapons/items near-equal odds, not weighted any
// particular way"). The old weight-by-duplication coupled each card's odds to OTHER
// cards' counts, so passives/upgrades crowded the scarce pre-cap window unevenly per
// seed and specific weapons starved. A flat Fisher-Yates partial shuffle makes each
// card's odds depend only on total pool size, which grows evenly as the roster expands
// (Phase 21) — so equal odds hold regardless of how many weapons/items exist.
function drawOffers(pool, rng) {
  const { slots } = CFG.offer;
  const bag = pool.slice();
  // Partial Fisher-Yates: only the first `slots` positions need to be randomized.
  const n = Math.min(slots, bag.length);
  for (let i = 0; i < n; i++) {
    const j = i + ((rng() * (bag.length - i)) | 0);
    const tmp = bag[i];
    bag[i] = bag[j];
    bag[j] = tmp;
  }
  return bag.slice(0, n);
}

// 18.4 SKIP XP grant (D84, pure): 66% of the NEXT level's requirement, floored.
export function skipXp(level) {
  return Math.floor(CFG.meta.actions.skip.xpRatio * CFG.xpNeed(level));
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
