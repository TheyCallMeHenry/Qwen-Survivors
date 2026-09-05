// Combat: player projectiles (Moonbolt bolts, Spectral Axe boomerangs),
// Aegis Blades orbiters, Wraith Garlic aura, and the damage/knockback/kill
// pipeline shared by all damage sources. Enemy queries come from Enemies.grid
// (HashGrid, cell 96 — near() covers all hit radii except the garlic aura,
// which uses range()). Node-safe: no canvas at top level.
import { CFG } from '../config.js';
import { TAU, approach, rand } from '../utils/math.js';

export class Combat {
  constructor() {
    this.bolts = [];
    this.axes = [];
    this.bullets = [];
    this.bombs = [];
    this.flames = [];
    this.arrows = [];
    this.snowballs = []; // 12.3: lobbed snowballs (bomb-style flight, burst ON impact)

    this.explosions = [];
    this.t = 0;
    this.enemies = null;
    this.boltImg = null;
    this.axeImg = null;
    this.bladeImg = null;
    this.bulletImg = null;
    this.bombImg = null;
    this.flameImg = null;
    this.arrowImg = null;
    this.snowballImg = null; // 12.3
    this.frostImg = null;    // 12.3: small frost burst for the snowball impact
    this.sparkImg = null;    // 12.4: lightning spark at a bolt's strike point
    this.explosionImg = null;
    this.onKill = null;   // (enemy) — set by game: score/gems/particles/hit-stop
    this.onHurt = null;   // () — set by game: shake/flash
    this.onDeath = null;  // () — set by game: state machine
    this.onBomb = null;   // (x, y) — set by game: bomb shake
    this.pulse = null;    // ('pistol'|'boom'|'fire') — set by game: bus → sfx
    this._orbCd = new Map(); // enemy -> last orbiter hit time
    this._axeCd = new Map(); // enemy -> last axe hit time
    this._flameCd = new Map(); // enemy -> last flame tick time
    this._tempestT = 0; // tempest synergy fire timer
  }

  reset() {
    this.bolts.length = 0;
    this.axes.length = 0;
    this.bullets.length = 0;
    this.bombs.length = 0;
    this.flames.length = 0;
    this.arrows.length = 0;
    this.snowballs.length = 0;
    this.explosions.length = 0;
    this.t = 0;
    this._orbCd.clear();
    this._axeCd.clear();
    this._flameCd.clear();
    this._tempestT = 0;
  }

  // Synergy level tables ride the projectile (the shooter's, at fire time —
  // co-op: each player's shots carry their own synergies, 11.2).
  fireBolt(x, y, ang, dmg, pierce, blight = null, owner = null) {
    const C = CFG.combat;
    this.bolts.push({
      x, y,
      vx: Math.cos(ang) * C.boltSpeed,
      vy: Math.sin(ang) * C.boltSpeed,
      rot: ang, dmg, pierce, blight, owner,
      hit: new Set(),
      life: C.boltLife,
    });
  }

  fireAxe(x, y, ang, dmg, size, count, owner) {
    const C = CFG.combat;
    for (let i = 0; i < count; i++) {
      const a = ang + (TAU / count) * i;
      this.axes.push({
        x, y,
        vx: Math.cos(a) * C.axeSpeed,
        vy: Math.sin(a) * C.axeSpeed,
        dmg, size, spin: rand(0, TAU), owner,
        back: false,
        life: C.axeLife,
      });
    }
  }

  fireBullet(x, y, ang, dmg, inferno = null, owner = null) {
    const C = CFG.combat;
    this.bullets.push({
      x, y,
      vx: Math.cos(ang) * C.bulletSpeed,
      vy: Math.sin(ang) * C.bulletSpeed,
      rot: ang, dmg, inferno, owner,
      hit: new Set(),
      life: C.bulletLife,
    });
  }

  // 12.2: fast single-target arrow (no pierce — Heart-Piercer 12.6 adds that).
  fireArrow(x, y, ang, dmg, owner = null) {
    const C = CFG.combat;
    this.arrows.push({
      x, y,
      vx: Math.cos(ang) * C.arrowSpeed,
      vy: Math.sin(ang) * C.arrowSpeed,
      rot: ang, dmg, owner,
      hit: new Set(),
      life: C.arrowLife,
    });
  }

  // 12.3 Snowball Launcher: lob to a target POINT, burst ON impact (no fuse pause) in a
  // small AoE that damages + slows (12.5 stack pipeline). Flight mirrors fireBomb.
  fireSnowball(x, y, tx, ty, dmg, radius, owner = null) {
    const C = CFG.combat;
    const dist = Math.hypot(tx - x, ty - y);
    this.snowballs.push({
      x0: x, y0: y, tx, ty, x, y, h: 0,
      t: 0, fly: Math.max(0.15, dist * C.snowballFlyK),
      dmg, radius, owner,
    });
  }

  fireBomb(x, y, ang, dist, dmg, radius, fuse, napalm = null, owner = null) {
    const C = CFG.combat;
    const tx = x + Math.cos(ang) * dist;
    const ty = y + Math.sin(ang) * dist;
    this.bombs.push({
      x0: x, y0: y, tx, ty, x, y, h: 0,
      t: 0, fly: C.bombFly, fuse,
      dmg, radius, napalm, owner,
    });
  }

  emitFlame(x, y, ang, tick, dot, dotDur, owner = null) {
    const C = CFG.combat;
    const sp = C.flameSpeed + rand(-C.flameSpeedVar, C.flameSpeedVar);
    const a = ang + rand(-0.22, 0.22);
    // 16.3: directional momentum — the flame inherits a share of the owner's
    // velocity, so while moving the jet LEADS the aim direction instead of
    // trailing behind the player (owner null (tests/tempest) = no momentum).
    const mom = owner && C.flameMomentum ? C.flameMomentum : 0;
    const px = owner ? owner.vx * mom : 0;
    const py = owner ? owner.vy * mom : 0;
    this.flames.push({
      x, y,
      vx: Math.cos(a) * sp + px,
      vy: Math.sin(a) * sp + py,
      tick, dot, dotDur, owner,
      age: 0,
      life: C.flameLife + rand(-C.flameLifeVar, C.flameLifeVar),
      seed: rand(0, 1),
      wob: 0,
    });
  }

  // players: live player array (solo = [player]) — garlic/blades run per
  // player with per-player timers (co-op, 11.2).
  update(dt, players, enemies) {
    this.enemies = enemies;
    this.t += dt;
    this._bolts(dt, enemies);
    this._bullets(dt, enemies);
    this._arrows(dt, enemies);
    this._axes(dt, enemies);
    this._bombs(dt, enemies);
    this._snowballs(dt, enemies);
    this._flames(dt, enemies);
    this._dot(dt);
    for (const p of players) {
      if (p.weapons.garlic) this._garlic(dt, p, enemies);
      if (p.weapons.blades) this._orbiters(dt, p, enemies);
    }
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const x = this.explosions[i];
      x.t += dt;
      if (x.t >= x.dur) this.explosions.splice(i, 1);
    }
    // 12.4: lightning arcs are short-lived visuals living on their owner player
    for (const p of players) {
      if (!p._ringBeams) continue;
      for (let i = p._ringBeams.length - 1; i >= 0; i--) {
        p._ringBeams[i].t += dt;
        if (p._ringBeams[i].t >= p._ringBeams[i].dur) p._ringBeams.splice(i, 1);
      }
    }
  }

  _bolts(dt, enemies) {
    const C = CFG.combat;
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let gone = b.life <= 0 || b.x < 0 || b.x > CFG.world.w || b.y < 0 || b.y > CFG.world.h;
      if (!gone) {
        for (const e of enemies.grid.near(b.x, b.y)) {
          if (e.dead || b.hit.has(e)) continue;
          const rr = e.r + C.boltR;
          const dx = e.x - b.x, dy = e.y - b.y;
          if (dx * dx + dy * dy >= rr * rr) continue;
          b.hit.add(e);
          this.damageEnemy(e, b.dmg, b.vx / C.boltSpeed, b.vy / C.boltSpeed, C.boltKb, b.owner);
          if (b.blight) {
            e.blightT = Math.max(e.blightT || 0, b.blight.dur);
            e.blightDps = Math.max(e.blightDps || 0, b.blight.dps);
          }
          if (b.hit.size > b.pierce) { gone = true; break; }
        }
      }
      if (gone) this.bolts.splice(i, 1);
    }
  }

  // 12.2: straight flight, first hit ends it (no pierce). Knockback along the
  // arrow's own velocity (constant speed → unit direction).
  _arrows(dt, enemies) {
    const C = CFG.combat;
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.life -= dt;
      let gone = a.life <= 0 || a.x < 0 || a.x > CFG.world.w || a.y < 0 || a.y > CFG.world.h;
      if (!gone) {
        for (const e of enemies.grid.near(a.x, a.y)) {
          if (e.dead || a.hit.has(e)) continue;
          const rr = e.r + C.arrowR;
          const dx = e.x - a.x, dy = e.y - a.y;
          if (dx * dx + dy * dy >= rr * rr) continue;
          a.hit.add(e);
          this.damageEnemy(e, a.dmg, a.vx / C.arrowSpeed, a.vy / C.arrowSpeed, C.arrowKb, a.owner);
          gone = true;
          break;
        }
      }
      if (gone) this.arrows.splice(i, 1);
    }
  }

  _axes(dt, enemies) {
    const C = CFG.combat;
    for (let i = this.axes.length - 1; i >= 0; i--) {
      const a = this.axes[i];
      const player = a.owner; // return target (co-op: the thrower)
      a.life -= dt;
      a.spin += dt * 9;
      if (!a.back) {
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        if (a.life <= C.axeLife * 0.45 || a.x < 40 || a.x > CFG.world.w - 40 || a.y < 40 || a.y > CFG.world.h - 40) a.back = true;
      } else {
        const oy = player.y - player.def.h * C.spawnOriginFrac; // 16.2: returns to the mid-torso spawn origin
        const dx = player.x - a.x, dy = oy - a.y;
        const d = Math.hypot(dx, dy) || 1;
        a.vx = approach(a.vx, (dx / d) * 760, 10, dt);
        a.vy = approach(a.vy, (dy / d) * 760, 10, dt);
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        if (d < 26 || a.life <= 0) { this.axes.splice(i, 1); continue; }
      }
      for (const e of enemies.grid.near(a.x, a.y)) {
        if (e.dead) continue;
        if (this.t - (this._axeCd.get(e) || -10) < C.axeTick) continue;
        const rr = e.r + C.axeR * a.size;
        const dx = e.x - a.x, dy = e.y - a.y;
        if (dx * dx + dy * dy >= rr * rr) continue;
        this._axeCd.set(e, this.t);
        const sp = Math.hypot(a.vx, a.vy) || 1;
        this.damageEnemy(e, a.dmg, a.vx / sp, a.vy / sp, C.axeKb, a.owner);
      }
    }
  }

  _garlic(dt, player, enemies) {
    const C = CFG.combat;
    player._garlicT += dt; // per-player pulse timer (co-op)
    if (player._garlicT < C.garlicTick) return;
    player._garlicT = 0;
    const S = CFG.weapons.garlic.levels[player.weapons.garlic - 1];
    const R = S.r + player.r + 8; // query radius (cell superset)
    for (const e of enemies.grid.range(player.x, player.y, R)) {
      if (e.dead) continue;
      const rr = S.r + e.r;
      const dx = e.x - player.x, dy = e.y - player.y;
      if (dx * dx + dy * dy >= rr * rr) continue;
      this.damageEnemy(e, S.dmg * player.dmgMul, 0, 0, 0, player);
    }
  }

  _orbiters(dt, player, enemies) {
    const C = CFG.combat;
    player._orbitT += dt * C.orbitSpeed; // per-player orbit angle (co-op)
    const S = CFG.weapons.blades.levels[player.weapons.blades - 1];
    const oy = player.y - player.def.h * C.spawnOriginFrac; // 16.2: orbit around the mid-torso origin
    let tempestS = null, fireT = false;
    if ((player.synergies.tempest || 0) > 0) {
      tempestS = CFG.synergies.tempest.levels[0];
      player._tempestT += dt;
      if (player._tempestT >= tempestS.rate) { player._tempestT = 0; fireT = true; }
    }
    for (let i = 0; i < S.n; i++) {
      const a = player._orbitT + (TAU / S.n) * i;
      const bx = player.x + Math.cos(a) * S.rad;
      const by = oy + Math.sin(a) * S.rad;
      for (const e of enemies.grid.near(bx, by)) {
        if (e.dead) continue;
        if (this.t - (this._orbCd.get(e) || -10) < C.orbitTick) continue;
        const rr = e.r + C.orbitR;
        const dx = e.x - bx, dy = e.y - by;
        if (dx * dx + dy * dy >= rr * rr) continue;
        this._orbCd.set(e, this.t);
        const kx = e.x - player.x, ky = e.y - oy;
        const kd = Math.hypot(kx, ky) || 1;
        this.damageEnemy(e, S.dmg * player.dmgMul, kx / kd, ky / kd, C.orbitKb, player);
      }
      if (fireT) this.fireBolt(bx, by, a + TAU / 4, tempestS.dmg * player.dmgMul, 0);
    }
    if (this._orbCd.size > 512) this._orbCd.clear();
    if (this._axeCd.size > 512) this._axeCd.clear();
  }

  _bullets(dt, enemies) {
    const C = CFG.combat;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let gone = b.life <= 0 || b.x < 0 || b.x > CFG.world.w || b.y < 0 || b.y > CFG.world.h;
      if (!gone) {
        for (const e of enemies.grid.near(b.x, b.y)) {
          if (e.dead || b.hit.has(e)) continue;
          const rr = e.r + C.bulletR;
          const dx = e.x - b.x, dy = e.y - b.y;
          if (dx * dx + dy * dy >= rr * rr) continue;
          b.hit.add(e);
          this.damageEnemy(e, b.dmg, b.vx / C.bulletSpeed, b.vy / C.bulletSpeed, C.bulletKb, b.owner);
          if (b.inferno) {
            e.burnT = Math.max(e.burnT || 0, b.inferno.dur);
            e.burnDps = Math.max(e.burnDps || 0, b.inferno.dps);
          }
          gone = true; // rounds do not pierce
          break;
        }
      }
      if (gone) this.bullets.splice(i, 1);
    }
  }

  _bombs(dt, enemies) {
    const C = CFG.combat;
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      b.t += dt;
      if (b.t < b.fly) {
        const k = b.t / b.fly;
        b.x = b.x0 + (b.tx - b.x0) * k;
        b.y = b.y0 + (b.ty - b.y0) * k;
        b.h = 4 * C.bombH * k * (1 - k); // parabolic arc
      } else {
        b.x = b.tx; b.y = b.ty; b.h = 0;
        if (b.t >= b.fly + b.fuse) {
          this._explode(b, enemies);
          this.bombs.splice(i, 1);
        }
      }
    }
  }

  // 12.3: snowball flight = bomb parabola; on landing it bursts immediately (_snowBurst).
  _snowballs(dt, enemies) {
    const C = CFG.combat;
    for (let i = this.snowballs.length - 1; i >= 0; i--) {
      const b = this.snowballs[i];
      b.t += dt;
      if (b.t < b.fly) {
        const k = b.t / b.fly;
        b.x = b.x0 + (b.tx - b.x0) * k;
        b.y = b.y0 + (b.ty - b.y0) * k;
        b.h = 4 * C.snowballH * k * (1 - k);
      } else {
        this._snowBurst(b, enemies);
        this.snowballs.splice(i, 1);
      }
    }
  }

  // Small impact AoE: damage + knockback (gentle — the slow is the point) + one slow
  // stack per hit enemy. Stacks expire independently (enemies._ai); SLOW_FREEZE stacks
  // → brief freeze (12.5).
  _snowBurst(b, enemies) {
    const C = CFG.combat;
    this.explosions.push({ x: b.tx, y: b.ty, t: 0, dur: C.bombFlash, r: b.radius, frost: true });
    for (const e of enemies.grid.range(b.tx, b.ty, b.radius)) {
      if (e.dead) continue;
      const dx = e.x - b.tx, dy = e.y - b.ty;
      const d = Math.hypot(dx, dy) || 1;
      if (d > b.radius + e.r) continue;
      this.damageEnemy(e, b.dmg, dx / d, dy / d, C.snowballKb, b.owner);
      if (!e.dead) this.applySlow(e);
    }
    if (this.pulse) this.pulse('boom');
  }

  // 12.5: add one slow stack (refreshed to full TTL) at the enemy; reaching
  // slowMaxStacks triggers a brief freeze and consumes the stacks.
  applySlow(e) {
    const C = CFG.combat;
    e.slowStacks.push({ t: C.statusStackTtl });
    if (e.slowStacks.length >= C.slowMaxStacks) {
      e.freezeT = Math.max(e.freezeT, C.freezeDur);
      e.slowStacks.length = 0;
    }
  }

  // 12.4 Ring of Chain Lightning: one bolt from (x, y) at a target enemy — damage +
  // one shock stack. The chain count (`jumps`) only matters when the shock proc fires.
  fireShockBolt(x, y, target, dmg, jumps, owner = null) {
    if (!target || target.dead) return;
    if (owner._ringBeams) {
      owner._ringBeams.push({ x, y, tx: target.x, ty: target.y, t: 0, dur: CFG.combat.ringBeamDur, seed: Math.random() });
      if (owner._ringBeams.length > 48) owner._ringBeams.splice(0, owner._ringBeams.length - 48);
    }
    const dx = target.x - x, dy = target.y - y;
    const d = Math.hypot(dx, dy) || 1;
    this.damageEnemy(target, dmg, dx / d, dy / d, CFG.combat.ringKb, owner);
    if (!target.dead) this.applyShock(target, jumps, owner);
  }

  // 12.5 shock half: add one shock stack (per-stack TTL expiry in enemies._ai); reaching
  // shockMaxStacks consumes them → brief stun + branching chain burst (moderate AoE).
  applyShock(e, jumps = 0, owner = null) {
    const C = CFG.combat;
    e.shockStacks.push({ t: C.statusStackTtl });
    if (e.shockStacks.length >= C.shockMaxStacks) {
      e.stunT = Math.max(e.stunT, C.stunDur);
      e.shockStacks.length = 0;
      this._chainArc(e, jumps, owner);
    }
  }

  // 12.4 chain burst: branching lightning from the proc'd enemy to `jumps` fresh foes
  // within ringJumpR of the last link (greedy nearest — moderate AoE). Chained foes take
  // a bolt and gain 1 shock stack; they do NOT re-proc (a proc is always chain-outward).
  _chainArc(from, jumps, owner = null) {
    const C = CFG.combat;
    if (!this.enemies || jumps <= 0) return;
    const hit = [from];
    let head = from;
    for (let n = 0; n < jumps; n++) {
      let best = null, bd = C.ringJumpR * C.ringJumpR;
      for (const e of this.enemies.list) {
        if (e.dead || hit.includes(e)) continue;
        const dx = e.x - head.x, dy = e.y - head.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bd) { bd = d2; best = e; }
      }
      if (!best) break;
      if (owner && owner._ringBeams) {
        owner._ringBeams.push({ x: head.x, y: head.y, tx: best.x, ty: best.y, t: 0, dur: C.ringBeamDur, seed: Math.random() });
        if (owner._ringBeams.length > 48) owner._ringBeams.splice(0, owner._ringBeams.length - 48);
      }
      const d = Math.sqrt(bd) || 1;
      this.damageEnemy(best, C.ringDmg, (best.x - head.x) / d, (best.y - head.y) / d, C.ringKb, owner);
      if (!best.dead) best.shockStacks.push({ t: C.statusStackTtl });
      hit.push(best);
      head = best;
    }
    if (hit.length > 1 && this.pulse) this.pulse('zap');
  }

  _explode(b, enemies) {
    const C = CFG.combat;
    this.explosions.push({ x: b.x, y: b.y, t: 0, dur: C.bombFlash, r: b.radius });
    for (const e of enemies.grid.range(b.x, b.y, b.radius)) {
      if (e.dead) continue;
      const dx = e.x - b.x, dy = e.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > b.radius + e.r) continue;
      this.damageEnemy(e, b.dmg, dx / d, dy / d, C.bombKb, b.owner);
      if (b.napalm) {
        e.burnT = Math.max(e.burnT || 0, b.napalm.dur);
        e.burnDps = Math.max(e.burnDps || 0, b.napalm.dps);
      }
    }
    if (this.pulse) this.pulse('boom');
    if (this.onBomb) this.onBomb(b.x, b.y);
  }

  _flames(dt, enemies) {
    const C = CFG.combat;
    for (let i = this.flames.length - 1; i >= 0; i--) {
      const f = this.flames[i];
      f.age += dt;
      if (f.age >= f.life) { this.flames.splice(i, 1); continue; }
      // flow: drag bleeds velocity, flame rises, wobble grows with age
      const dr = Math.exp(-C.flameDrag * dt);
      f.vx *= dr;
      f.vy = f.vy * dr - C.flameRise * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.wob = Math.sin(f.age * C.flameWobFreq + f.seed * TAU) * C.flameWobAmp * (f.age / f.life);
      for (const e of enemies.grid.near(f.x, f.y)) {
        if (e.dead) continue;
        if (this.t - (this._flameCd.get(e) || -10) < C.flameHit) continue;
        const rr = e.r + C.flameR;
        const dx = e.x - f.x, dy = e.y - f.y;
        if (dx * dx + dy * dy >= rr * rr) continue;
        this._flameCd.set(e, this.t);
        this.damageEnemy(e, f.tick, 0, 0, 0, f.owner);
        e.burnT = Math.max(e.burnT || 0, f.dotDur);
        e.burnDps = Math.max(e.burnDps || 0, f.dot);
      }
    }
    if (this._flameCd.size > 512) this._flameCd.clear();
  }

  // burn / blight DoT — ticked from status fields set by weapons + synergies.
  _dot(dt) {
    for (const e of this.enemies.list) {
      if (e.dead) continue;
      if (e.burnT > 0) {
        e.burnT -= dt;
        this.dpsTick(e, e.burnDps * dt);
      }
      if (e.blightT > 0) {
        e.blightT -= dt;
        this.dpsTick(e, e.blightDps * dt);
      }
    }
  }

  // DoT damage: no hit-flash, no knockback (a per-frame white flicker is wrong).
  // Killer = last direct attacker (e._killer) — DoT inherits their credit.
  dpsTick(e, dmg) {
    if (e.dead) return;
    e.hp -= dmg;
    if (e.hp <= 0) {
      e.dead = true;
      if (this.onKill) this.onKill(e, e._killer);
    }
  }

  // Damage pipeline. kx/ky = unit knockback direction, kb = strength.
  // owner = the player who dealt this hit (co-op kill credit, 11.2).
  damageEnemy(e, dmg, kx, ky, kb, owner = null) {
    if (e.dead) return;
    e._killer = owner || e._killer;
    e.hp -= dmg;
    e.flash = 0.14;
    if (kb > 0) { e.vx += kx * kb; e.vy += ky * kb; }
    if (e.hp <= 0) {
      e.dead = true;
      if (this.onKill) this.onKill(e, owner);
    }
  }

  damagePlayer(player, dmg, fx, fy) {
    if (player.iframes > 0 || player.dead) return false;
    player.hp -= dmg;
    player.flash = 0.18;
    player.iframes = CFG.player.hurtIframes;
    const dx = player.x - fx, dy = player.y - fy;
    const d = Math.hypot(dx, dy) || 1;
    player.vx += (dx / d) * CFG.player.knockback;
    player.vy += (dy / d) * CFG.player.knockback;
    if (this.onHurt) this.onHurt(dmg, player);
    if (player.hp <= 0) {
      player.hp = 0;
      player.dead = true;
      if (this.onDeath) this.onDeath(player);
    }
    return true;
  }

  // players = live players (host: all seats; client: the local player — its orbit/
  // garlic clocks are advanced cosmetically in _clientUpdate). Remote players have
  // no _orbitT/_garlicT in the snapshot (projectiles never cross the wire, 16.2
  // snapshot-neutral) → their blades/ring are not drawn on the client.
  draw(ctx, t, players) {
    const C = CFG.combat;
    if (this.boltImg) for (const b of this.bolts) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.drawImage(this.boltImg, -this.boltImg.width / 2, -this.boltImg.height / 2);
      ctx.restore();
    }
    if (this.axeImg) for (const a of this.axes) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.spin);
      const s = this.axeImg.width * a.size;
      ctx.drawImage(this.axeImg, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
    // 16.2 latent-fix: this.player was never assigned (constructor/ctor sites), so the
    // blades (and the garlic ring below) were NEVER drawn — the block below now loops the
    // live players, using each player's sim orbit angle (damage position == drawn position).
    if (this.bladeImg) for (const pl of players || []) {
      if (!pl.weapons.blades || typeof pl._orbitT !== 'number') continue;
      const S = CFG.weapons.blades.levels[pl.weapons.blades - 1];
      const oy = pl.y - pl.def.h * C.spawnOriginFrac; // 16.2: mid-torso orbit center
      for (let i = 0; i < S.n; i++) {
        const a = pl._orbitT + (TAU / S.n) * i;
        const bx = pl.x + Math.cos(a) * S.rad;
        const by = oy + Math.sin(a) * S.rad;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(a + TAU / 4);
        ctx.drawImage(this.bladeImg, -C.orbitSize / 2, -C.orbitSize / 2, C.orbitSize, C.orbitSize);
        ctx.restore();
      }
    }
    if (this.bulletImg) for (const b of this.bullets) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.drawImage(this.bulletImg, -this.bulletImg.width / 2, -this.bulletImg.height / 2);
      ctx.restore();
    }
    if (this.arrowImg) for (const a of this.arrows) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.drawImage(this.arrowImg, -this.arrowImg.width / 2, -this.arrowImg.height / 2);
      ctx.restore();
    }
    if (this.bombImg) for (const b of this.bombs) {
      // ground shadow stays at the landing point; the ball rides the arc
      ctx.fillStyle = 'rgba(4,6,12,0.35)';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, 8 + b.h * 0.03, 4 + b.h * 0.015, 0, 0, TAU);
      ctx.fill();
      const s = this.bombImg.width;
      ctx.drawImage(this.bombImg, b.x - s / 2, b.y - b.h - s / 2, s, s);
    }
    if (this.flameImg && this.flames.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const f of this.flames) {
        const k = f.age / f.life;
        const s = C.flameSize * (0.55 + 0.75 * k); // grow…
        ctx.globalAlpha = Math.max(0, 1 - k);      // …then fade
        ctx.drawImage(this.flameImg, f.x + f.wob - s / 2, f.y - s / 2, s, s);
      }
      ctx.restore();
    }
    if (this.explosionImg && this.explosions.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const x of this.explosions) {
        const k = x.t / x.dur;
        // 23.2 visual-vs-damage fix: the old ramp started at 0.60× the damage radius,
        // so the blast read smaller than what it hurt for its first third. Now the
        // flash starts AT the true radius and only expands while fading out (≥1.0× floor).
        const s = x.r * 2 * (1 + 0.25 * k);
        ctx.globalAlpha = 0.85 * (1 - k);
        ctx.drawImage(x.frost && this.frostImg ? this.frostImg : this.explosionImg, x.x - s / 2, x.y - s / 2, s, s);
      }
      ctx.restore();
    }
    // 12.3: the snowball itself (ground shadow + ball riding the arc, bomb-style)
    if (this.snowballImg) for (const b of this.snowballs) {
      ctx.fillStyle = 'rgba(4,6,12,0.30)';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, 7 + b.h * 0.03, 3.5 + b.h * 0.015, 0, 0, TAU);
      ctx.fill();
      const s = this.snowballImg.width;
      ctx.drawImage(this.snowballImg, b.x - s / 2, b.y - b.h - s / 2, s, s);
    }
    // 12.4: Ring of Chain Lightning arcs (jagged bolt from spawn/last-link to target +
    // a strike spark), drawn additively and fading over ringBeamDur
    if (this.sparkImg) for (const pl of players || []) {
      if (!pl._ringBeams || !pl._ringBeams.length) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(210,230,255,0.9)';
      ctx.lineWidth = 2;
      for (const b of pl._ringBeams) {
        const k = b.t / b.dur;
        ctx.globalAlpha = 1 - k;
        const dx = b.tx - b.x, dy = b.ty - b.y;
        const d = Math.hypot(dx, dy) || 1;
        const nx = -dy / d, ny = dx / d; // perpendicular jag offsets
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        for (let s2 = 1; s2 <= 3; s2++) {
          const p = s2 / 4;
          const off = Math.sin((b.seed + s2) * 12.9898) * 9 * (1 - k);
          ctx.lineTo(b.x + dx * p + nx * off, b.y + dy * p + ny * off);
        }
        ctx.lineTo(b.tx, b.ty);
        ctx.stroke();
        const s = 14 * (1 - 0.5 * k);
        ctx.drawImage(this.sparkImg, b.tx - s / 2, b.ty - s / 2, s, s);
      }
      ctx.restore();
    }
    // Pulsing ground ring — intentionally centered on the FEET (the aura is a ground
    // pulse, not a fired projectile; 16.2 keeps the damage field feet-centered too).
    // Phase = the player's own garlic pulse timer (this.garlicT was never assigned —
    // it would have been NaN, and the ring would have thrown on the NaN radius).
    for (const pl of players || []) {
      if (!pl.weapons.garlic || typeof pl._garlicT !== 'number') continue;
      const S = CFG.weapons.garlic.levels[pl.weapons.garlic - 1];
      const ph = pl._garlicT / C.garlicTick;
      ctx.globalAlpha = 0.10 + 0.05 * Math.sin(ph * TAU);
      ctx.strokeStyle = '#b9f2a0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pl.x, pl.y, S.r * (0.97 + 0.03 * Math.sin(ph * TAU)), 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
