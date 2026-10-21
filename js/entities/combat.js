// Combat: player projectiles (Moonbolt bolts, Spectral Axe boomerangs),
// Aegis Blades orbiters, Wraith Garlic aura, and the damage/knockback/kill
// pipeline shared by all damage sources. Enemy queries come from Enemies.grid
// (HashGrid, cell 96): near() covers every point-hit radius (max foe r 30 +
// projectile r < cell); the garlic aura and the bomb/snowball AoEs use range()
// with CFG.ai.gridCell headroom, so a foe whose centre sits past the exact
// blast+foe-r bbox is still a candidate (the exact radius test follows).
// Node-safe: no canvas at top level.
import { CFG } from '../config.js';
import { TAU, approach, clamp, rand } from '../utils/math.js';

export class Combat {
  constructor() {
    this.bolts = [];
    this.axes = [];
    this.bullets = [];
    this.bombs = [];
    this.flames = [];
    this.arrows = [];
    this.snowballs = []; // 12.3: lobbed snowballs (bomb-style flight, burst ON impact)
    // Phase 21 (D96): Tank Cannon shells, laser beams, Rolling Boulders, web strands.
    // Wolf companion / Mirror Shield state lives ON the owning player (p._companion,
    // p._boulder, p._shieldBank) so the snapshot tail + ownership follow the player.
    this.shells = [];
    this.beams = [];
    this.boulders = [];
    this.webs = [];

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
    this.shellImg = null;    // P21: cannon shell
    this.boulderImg = null;  // P21: rolling boulder
    this.webImg = null;      // P21: web strand
    this.explosionImg = null;
    // 24.2: per-type synergy variant sprite maps ({ variantKey: img }); empty/absent →
    // draw falls back to the base *Img above (base path byte-identical, solo invariance).
    this.boltVar = null;
    this.bulletVar = null;
    this.arrowVar = null;
    this.bombVar = null;
    this.snowballVar = null;
    this.onKill = null;   // (enemy) — set by game: score/gems/particles/hit-stop
    this.onHurt = null;   // () — set by game: shake/flash
    this.onDeath = null;  // () — set by game: state machine
    this.onBomb = null;   // (x, y) — set by game: bomb shake
    this.onFx = null;     // (kind, x, y) — set by game: particles for P21 events
                          // ('homerun' | 'crag' | 'reflect' | 'ball' | 'slide')
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
    this.shells.length = 0;
    this.beams.length = 0;
    this.boulders.length = 0;
    this.webs.length = 0;
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
      v: blight ? 'blight' : '', // 24.2 draw variant (synergy identity)
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

  // `storm` (12.6 Storm Volley level row): this round carries a lightning strike —
  // resolves on its first hit (_strike, at the impact point).
  fireBullet(x, y, ang, dmg, inferno = null, owner = null, storm = null) {
    const C = CFG.combat;
    // storm takes precedence over inferno for the round's look (the lightning round is
    // rarer + more distinctive than the burning one).
    this.bullets.push({
      x, y,
      vx: Math.cos(ang) * C.bulletSpeed,
      vy: Math.sin(ang) * C.bulletSpeed,
      rot: ang, dmg, inferno, owner, storm,
      v: storm ? 'storm' : (inferno ? 'inferno' : ''), // 24.2 draw variant
      hit: new Set(),
      life: C.bulletLife,
    });
  }

  // 12.2: fast single-target arrow. 12.6 rides the synergy level rows on the arrow:
  // `flaming` (Flaming Arrows) applies burn on hit; `piercer` (Heart-Piercer) adds
  // flat damage and an extra-enemies pierce budget (null/null = the plain 12.2 arrow).
  fireArrow(x, y, ang, dmg, owner = null, flaming = null, piercer = null) {
    const C = CFG.combat;
    this.arrows.push({
      x, y,
      vx: Math.cos(ang) * C.arrowSpeed,
      vy: Math.sin(ang) * C.arrowSpeed,
      rot: ang, dmg: dmg + (piercer ? piercer.bonus : 0), owner, flaming,
      pierce: piercer ? piercer.pierce : 0,
      v: flaming ? 'flaming' : (piercer ? 'piercer' : ''), // 24.2 draw variant (flaming wins)
      hit: new Set(),
      life: C.arrowLife,
    });
  }

  // 12.3 Snowball Launcher: lob to a target POINT, burst ON impact (no fuse pause) in a
  // small AoE that damages + slows (12.5 stack pipeline). Flight mirrors fireBomb.
  // `blue` (12.6 Blue Flame synergy level row): the burst also flash-freezes + burns.
  fireSnowball(x, y, tx, ty, dmg, radius, owner = null, blue = null) {
    const C = CFG.combat;
    const dist = Math.hypot(tx - x, ty - y);
    this.snowballs.push({
      x0: x, y0: y, tx, ty, x, y, h: 0,
      t: 0, fly: Math.max(0.15, dist * C.snowballFlyK),
      dmg, radius, owner, blue,
      v: blue ? 'blue' : '', // 24.2 draw variant
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
      v: napalm ? 'napalm' : '', // 24.2 draw variant
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

  // ---- Phase 21 weapon primitives (tables in CFG.weapons, mechanics here) ----

  // Tank Cannon shell: pierces the FIRST foe at full damage, terminates in the
  // SECOND with an AoE blast (dmg × CFG.combat.shellBlastK in blastR). `ignite`
  // (Shells of Perdition synergy row {dps,dur}) makes the blast set the blast radius
  // burning; lifetime = the weapon's aim range at shell speed (range knob reuse).
  fireShell(x, y, ang, dmg, blastR, ignite = null, owner = null) {
    const C = CFG.combat;
    this.shells.push({
      x, y,
      vx: Math.cos(ang) * C.shellSpeed,
      vy: Math.sin(ang) * C.shellSpeed,
      rot: ang, dmg, blastR, ignite, owner,
      hit: new Set(),
      life: C.wandRange / C.shellSpeed + 0.1,
    });
  }

  // Continuous Laser: one sustained beam along the owner's aim (fixed at fire time);
  // the ORIGIN follows the owner while the beam lasts. Damage flows through D21
  // dpsTick every frame for `dur` (no flash/knockback — a sear, not a hit).
  fireBeam(owner, S) {
    this.beams.push({
      owner, ang: owner.aimAng, t: 0, dur: S.dur,
      len: S.len, w: S.w, dps: S.dps * owner.dmgMul,
    });
  }

  // Rolling Boulder: cardinal roll at fixed speed, ONE per owner (`owner._boulder`,
  // spec). Damage decays boulderDecay^hits per hit; `av` (Avalanche row
  // {stacks,bonus}) adds slow stacks + flat damage; foe-size squish kill and
  // crumble are handled in _boulders.
  fireBoulder(owner, x, y, sx, sy, dmg, av = null) {
    const C = CFG.combat;
    const b = {
      x, y, vx: sx * C.boulderSpeed, vy: sy * C.boulderSpeed,
      dmg, av, owner, hits: 0, rot: rand(0, TAU), hit: new Set(),
    };
    this.boulders.push(b);
    owner._boulder = b;
  }

  // Web-slingers: straight strand to the target POINT; bursts in AoE r on arrival,
  // damaging + HOLDING (freeze-like e.holdT) everything caught.
  fireWeb(x, y, tx, ty, dmg, r, hold, owner = null) {
    const C = CFG.combat;
    const dist = Math.hypot(tx - x, ty - y);
    this.webs.push({
      x, y, x0: x, y0: y, tx, ty, dmg, r, hold, owner,
      t: 0, fly: dist / C.webSpeed,
    });
  }

  // Baseball Bat melee arc: everything within batRange inside ±arc/2 of the owner's
  // aim gets hit once per swing, with very high knockback (batKbImpulse × level kb,
  // spec identity). HOMERUN = one-hit KO of a NON-BOSS at 1-in-homerun odds
  // (weapon def; homerKing synergy level row overrides) + fireworks over the player
  // (cosmetic — onFx). S = the level row {cd, dmg, kb, arc(deg)}.
  batSwing(owner, S) {
    const C = CFG.combat;
    if (!this.enemies) return;
    const hk = owner.synergies && owner.synergies.homerKing;
    const odds = hk ? CFG.synergies.homerKing.levels[hk - 1].odds : CFG.weapons.bat.homerun;
    const oy = owner._spawnY();
    const half = (S.arc * Math.PI) / 360;
    for (const e of this.enemies.grid.range(owner.x, oy, C.batRange + CFG.ai.gridCell)) {
      if (e.dead) continue;
      const dx = e.x - owner.x, dy = e.y - oy;
      const d = Math.hypot(dx, dy) || 1;
      if (d > C.batRange + e.r) continue;
      let a = Math.atan2(dy, dx) - owner.aimAng;
      while (a > Math.PI) a -= TAU;
      while (a < -Math.PI) a += TAU;
      if (Math.abs(a) > half) continue;
      const homer = !e.boss && rand(0, odds) < 1;
      const dmg = homer ? e.hp + 1 : S.dmg * owner.dmgMul;
      this.damageEnemy(e, dmg, Math.cos(owner.aimAng), Math.sin(owner.aimAng), C.batKbImpulse * S.kb, owner);
      if (homer && this.onFx) this.onFx('homerun', owner.x, oy - owner.def.h - 6);
    }
  }

  // Frog Tongue: instant lash — initial damage, poison DoT (D21 channel), then a
  // tonguePULL that drags the foe to the owner over tonguePullDur. If the initial
  // damage killed a NON-BOSS the owner eats it: heal min(cap, 2 + K×maxHp) × eatMul
  // (Gut Feast synergy) — size/HP-determined per spec.
  fireTongue(owner, e, dmg, poison, poisonDur, eatMul = 1) {
    const C = CFG.combat;
    owner._tongueFx = { t: 0.18, e };
    this.damageEnemy(e, dmg, 0, 0, 0, owner);
    if (e.dead) {
      if (!e.boss) owner.heal(Math.min(C.tongueHealCap, 2 + C.tongueHealK * e.maxHp) * eatMul);
      return;
    }
    e.poisonT = Math.max(e.poisonT || 0, poisonDur);
    e.poisonDps = Math.max(e.poisonDps || 0, poison);
    e.drag = { owner, t: C.tonguePullDur };
    e.holdT = Math.max(e.holdT || 0, C.tonguePullDur);
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
    this._shells(dt, enemies);
    this._beams(dt, enemies);
    this._boulders(dt, enemies);
    this._webs(dt, enemies);
    this._tonguePull(dt);
    this._shieldStep(dt, players, enemies);
    this._dot(dt);
    for (const p of players) {
      if (p.weapons.garlic) this._garlic(dt, p, enemies);
      if (p.weapons.blades) this._orbiters(dt, p, enemies);
      if (p.weapons.wolf && !p.dead) this._companion(dt, p, enemies);
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
          if (a.flaming) {
            e.burnT = Math.max(e.burnT || 0, a.flaming.dur);
            e.burnDps = Math.max(e.burnDps || 0, a.flaming.dps);
          }
          // 12.6 Heart-Piercer: keep flying until the pierce budget is spent
          if (a.hit.size > a.pierce) { gone = true; break; }
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
    // The bound lives here (not in _orbiters): an axe-only runner never enters
    // _orbiters, and every spawn is a fresh object → the Map would grow all run.
    if (this._axeCd.size > 512) this._axeCd.clear();
  }

  _garlic(dt, player, enemies) {
    const C = CFG.combat;
    player._garlicT += dt; // per-player pulse timer (co-op)
    if (player._garlicT < C.garlicTick) return;
    player._garlicT = 0;
    const S = CFG.weapons.garlic.levels[player.weapons.garlic - 1];
    const R = S.r + player.r + CFG.ai.gridCell; // superset must reach the largest foe r (≤ cell)
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
      if (fireT) this.fireBolt(bx, by, a + TAU / 4, tempestS.dmg * player.dmgMul, 0, null, player);
    }
    if (this._orbCd.size > 512) this._orbCd.clear();
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
          if (b.storm) this._strike(e, b.storm, b.owner); // 12.6 Storm Volley
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
    for (const e of enemies.grid.range(b.tx, b.ty, b.radius + CFG.ai.gridCell)) {
      if (e.dead) continue;
      const dx = e.x - b.tx, dy = e.y - b.ty;
      const d = Math.hypot(dx, dy) || 1;
      if (d > b.radius + e.r) continue;
      this.damageEnemy(e, b.dmg, dx / d, dy / d, C.snowballKb, b.owner);
      if (!e.dead) this.applySlow(e, b.blue);
    }
    if (this.pulse) this.pulse('boom');
  }

  // P21 Tank Cannon: straight flight; full damage through the first foe, and the
  // SECOND terminates it in the blast (explode-style: radial kb + optional ignite).
  _shells(dt, enemies) {
    const C = CFG.combat;
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const b = this.shells[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let gone = b.life <= 0 || b.x < 0 || b.x > CFG.world.w || b.y < 0 || b.y > CFG.world.h;
      if (!gone) {
        for (const e of enemies.grid.near(b.x, b.y)) {
          if (e.dead || b.hit.has(e)) continue;
          const rr = e.r + C.shellR;
          const dx = e.x - b.x, dy = e.y - b.y;
          if (dx * dx + dy * dy >= rr * rr) continue;
          b.hit.add(e);
          this.damageEnemy(e, b.dmg, b.vx / C.shellSpeed, b.vy / C.shellSpeed, 0, b.owner);
          if (b.hit.size >= 2) {
            this._shellBlast(b, enemies); // spec: the SECOND foe takes direct dmg + terminates in the blast
            gone = true;
            break;
          }
        }
      }
      if (gone) this.shells.splice(i, 1);
    }
  }

  // Blast at the shell's terminal impact: shellBlastK × direct dmg in blastR, plus
  // the Shells of Perdition burn when the shooter had it.
  _shellBlast(b, enemies) {
    const C = CFG.combat;
    this.explosions.push({ x: b.x, y: b.y, t: 0, dur: C.bombFlash, r: b.blastR });
    for (const e of enemies.grid.range(b.x, b.y, b.blastR + CFG.ai.gridCell)) {
      if (e.dead) continue;
      const dx = e.x - b.x, dy = e.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > b.blastR + e.r) continue;
      this.damageEnemy(e, b.dmg * C.shellBlastK, dx / d, dy / d, C.bombKb, b.owner);
      if (b.ignite) {
        e.burnT = Math.max(e.burnT || 0, b.ignite.dur);
        e.burnDps = Math.max(e.burnDps || 0, b.ignite.dps);
      }
    }
    if (this.pulse) this.pulse('boom');
  }

  // P21 laser beam: every live enemy within `w` px of the segment gets its dps
  // every frame (dpsTick = no flash/knockback, D21 kill-credit via _killer).
  _beams(dt, enemies) {
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.t += dt;
      if (b.t >= b.dur || b.owner.dead) { this.beams.splice(i, 1); continue; }
      const ox = b.owner.x, oy = b.owner._spawnY();
      const ex = ox + Math.cos(b.ang) * b.len, ey = oy + Math.sin(b.ang) * b.len;
      const segx = ex - ox, segy = ey - oy;
      const l2 = segx * segx + segy * segy || 1;
      for (const e of enemies.grid.range(ox, oy, b.len + CFG.ai.gridCell)) {
        if (e.dead) continue;
        const dx = e.x - ox, dy = e.y - oy;
        const u = Math.max(0, Math.min(1, (dx * segx + dy * segy) / l2));
        const cx = ox + segx * u, cy = oy + segy * u;
        const rr = e.r + b.w;
        const ex2 = e.x - cx, ey2 = e.y - cy;
        if (ex2 * ex2 + ey2 * ey2 >= rr * rr) continue;
        e._killer = b.owner;
        this.dpsTick(e, b.dps * dt);
      }
    }
  }

  // P21 Rolling Boulder: one straight line, one hit per foe, decay^hits damage,
  // squish-kills the small size class (r ≤ squishR, non-boss — rat + bat, D96),
  // Avalanche adds slow stacks + flat bonus, and it crumbles at maxHits or when
  // it rolls off the map. Sets/clears owner._boulder (the one-at-a-time rule the
  // fire-site in player.js checks).
  _boulders(dt, enemies) {
    const C = CFG.combat;
    for (let i = this.boulders.length - 1; i >= 0; i--) {
      const b = this.boulders[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += (C.boulderSpeed / C.boulderR) * dt;
      let gone = b.x < -C.boulderR || b.x > CFG.world.w + C.boulderR ||
        b.y < -C.boulderR || b.y > CFG.world.h + C.boulderR;
      if (!gone) {
        for (const e of enemies.grid.near(b.x, b.y)) {
          if (e.dead || b.hit.has(e)) continue;
          const rr = e.r + C.boulderR;
          const dx = e.x - b.x, dy = e.y - b.y;
          if (dx * dx + dy * dy >= rr * rr) continue;
          b.hit.add(e);
          b.hits++;
          const bonus = b.av ? b.av.bonus : 0;
          const dmg = (b.dmg + bonus) * Math.pow(C.boulderDecay, b.hits - 1);
          const squish = !e.boss && e.r <= C.boulderSquishR;
          this.damageEnemy(e, squish ? e.hp + 1 : dmg, b.vx / C.boulderSpeed, b.vy / C.boulderSpeed, 0, b.owner);
          if (!e.dead && b.av) for (let k = 0; k < b.av.stacks; k++) this.applySlow(e);
          if (b.hits >= C.boulderMaxHits) { gone = true; break; }
        }
      }
      if (gone) {
        this.boulders.splice(i, 1);
        if (b.owner._boulder === b) b.owner._boulder = null;
        if (this.onFx) this.onFx('crag', b.x, b.y);
      }
    }
  }

  // P21 web strand: straight flight to the stored point, burst ON arrival.
  _webs(dt, enemies) {
    const C = CFG.combat;
    for (let i = this.webs.length - 1; i >= 0; i--) {
      const w = this.webs[i];
      w.t += dt;
      if (w.t < w.fly) {
        const k = w.t / w.fly;
        w.x = w.x0 + (w.tx - w.x0) * k;
        w.y = w.y0 + (w.ty - w.y0) * k;
      } else {
        w.x = w.tx; w.y = w.ty;
        this.explosions.push({ x: w.tx, y: w.ty, t: 0, dur: C.bombFlash, r: w.r, frost: true });
        for (const e of enemies.grid.range(w.tx, w.ty, w.r + CFG.ai.gridCell)) {
          if (e.dead) continue;
          const dx = e.x - w.tx, dy = e.y - w.ty;
          const d = Math.hypot(dx, dy) || 1;
          if (d > w.r + e.r) continue;
          this.damageEnemy(e, w.dmg, dx / d, dy / d, 0, w.owner);
          if (!e.dead) e.holdT = Math.max(e.holdT || 0, w.hold);
        }
        if (this.pulse) this.pulse('boom');
        this.webs.splice(i, 1);
      }
    }
  }

  // P21 tongue drag: pull the latched foe to the owner's CURRENT position on a
  // linear schedule (move = distance ÷ remaining time, so it lands exactly when
  // the pull ends). AI movement is pinned meanwhile via e.holdT (set at lash).
  _tonguePull(dt) {
    for (const e of this.enemies.list) {
      if (e.dead || !e.drag) continue;
      const o = e.drag.owner;
      if (!o || o.dead) { e.drag = null; continue; }
      e.drag.t -= dt;
      if (e.drag.t <= 0) {
        e.x = o.x; e.y = o.y;
        e.drag = null;
        continue;
      }
      e.x += (o.x - e.x) * (dt / e.drag.t);
      e.y += (o.y - 6 - e.y) * (dt / e.drag.t);
    }
  }

  // P21 Mirror Shield: enemy orbs entering the shield radius reverse outward and
  // become ally-side (marked `reflected`; enemies.js skips them for player hits,
  // _reflectedOrbs below spends them against foes). Charge bank: 3 per window
  // (window shrinks with level, charges spec-fixed).
  _shieldStep(dt, players, enemies) {
    const C = CFG.combat;
    for (const p of players) {
      const lvl = p.passives.shield;
      if (!lvl || p.dead) continue;
      const row = CFG.passives.shield.levels[lvl - 1];
      let bank = p._shieldBank;
      if (!bank) bank = p._shieldBank = { n: C.shieldCharges, t: row.window };
      bank.t -= dt;
      if (bank.t <= 0) { bank.n = C.shieldCharges; bank.t = row.window; }
      if (bank.n <= 0) continue;
      const oy = p.y - p.def.h * 0.5;
      for (const o of enemies.orbs || []) {
        if (o.reflected) continue;
        const dx = p.x - o.x, dy = oy - o.y;
        const rr = row.r + o.r;
        if (dx * dx + dy * dy >= rr * rr) continue;
        o.vx = -o.vx; o.vy = -o.vy;
        o.reflected = true;
        o.by = p;
        bank.n--;
        if (this.onFx) this.onFx('reflect', o.x, o.y);
        if (bank.n <= 0) break;
      }
    }
    // Reflected orbs hurt the first foe they touch (shooter's damage value rides
    // the orb) and are consumed. Checked here (host-sim side) so orb motion that
    // already happened in enemies.update lands a frame later at worst.
    const orbs = enemies.orbs;
    if (!orbs || !orbs.length) return;
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i];
      if (!o.reflected) continue;
      let spent = false;
      for (const e of enemies.grid.near(o.x, o.y)) {
        if (e.dead) continue;
        const rr = e.r + o.r;
        const dx = e.x - o.x, dy = e.y - o.y;
        if (dx * dx + dy * dy >= rr * rr) continue;
        const d = Math.hypot(o.vx, o.vy) || 1;
        this.damageEnemy(e, o.dmg, o.vx / d, o.vy / d, 0, o.by || null);
        spent = true;
        break;
      }
      if (spent) orbs.splice(i, 1);
    }
  }

  // P21 Wolf companion (host-sim only; clients render the snapshot tail). Never
  // dies; hovers beside the owner inside companionLeash and autonomously pounces
  // the nearest foe (pounce cd 2.0 s spec-fixed, growth lives in dmg/bleed only).
  // staticPelt synergy row {jumps}: the bite adds one shock stack + a chain burst.
  _companion(dt, p, enemies) {
    const C = CFG.combat;
    const S = CFG.weapons.wolf.levels[p.weapons.wolf - 1];
    let c = p._companion;
    if (!c) c = p._companion = { x: p.x, y: p.y - 12, state: 'follow', target: null, cd: 0, flip: false, animT: rand(0, 3) };
    c.animT += dt;
    if (c.state === 'pounce') {
      const e = c.target;
      // abandon: foe died OR left the leash circle (e.g. knocked away by a bat swing)
      if (!e || e.dead || Math.hypot(e.x - p.x, e.y - p.y) > C.companionLeash + e.r) {
        c.state = 'follow'; c.cd = C.companionPounceCd; c.target = null;
      }
      else {
        const oy = e.y - e.r * 0.4;
        const dx = e.x - c.x, dy = oy - c.y;
        const d = Math.hypot(dx, dy) || 1;
        const step = C.companionSpeed * dt;
        c.x += (dx / d) * step;
        c.y += (dy / d) * step;
        c.flip = dx < 0;
        if (d <= step + e.r * 0.7) {
          this.damageEnemy(e, S.dmg * p.dmgMul, dx / d, dy / d, 0, p);
          if (!e.dead) {
            e.bleedT = Math.max(e.bleedT || 0, S.bleedDur);
            e.bleedDps = Math.max(e.bleedDps || 0, S.bleed * p.dmgMul);
            const st = p.synergies && p.synergies.staticPelt;
            if (st) {
              this.applyShock(e);
              this._chainArc(e, CFG.synergies.staticPelt.levels[st - 1].jumps, p);
            }
          }
          c.state = 'follow';
          c.cd = C.companionPounceCd;
          c.target = null;
        }
      }
    } else {
      c.cd -= dt;
      if (c.cd <= 0) {
        const e = this._nearestTo(p, enemies, C.companionLeash);
        if (e) { c.state = 'pounce'; c.target = e; }
      }
      // hover near the owner: only walk when drifting too far
      const ax = p.x, ay = p.y - 12;
      const dx = ax - c.x, dy = ay - c.y;
      const d = Math.hypot(dx, dy);
      if (d > 26) {
        const step = Math.min(d, C.companionSpeed * dt);
        c.x += (dx / d) * step;
        c.y += (dy / d) * step;
        c.flip = dx < 0;
      }
    }
    // leash clamp applies in BOTH states ("stays ≤192 px of owner" — spec)
    const od = Math.hypot(c.x - p.x, c.y - p.y);
    if (od > C.companionLeash) {
      c.x = p.x + ((c.x - p.x) / od) * C.companionLeash;
      c.y = p.y + ((c.y - p.y) / od) * C.companionLeash;
    }
    c.x = clamp(c.x, CFG.world.margin, CFG.world.w - CFG.world.margin);
    c.y = clamp(c.y, CFG.world.margin, CFG.world.h - CFG.world.margin);
  }

  // Nearest live enemy to (owner) within `range` (wolf pounce pick).
  _nearestTo(p, enemies, range) {
    let best = null, bd = range * range;
    for (const e of enemies.list) {
      if (e.dead) continue;
      const dx = e.x - p.x, dy = e.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bd) { bd = d2; best = e; }
    }
    return best;
  }

  // 12.5: add one slow stack (refreshed to full TTL) at the enemy; reaching
  // slowMaxStacks triggers a brief freeze and consumes the stacks.
  // blue (12.6 Blue Flame, optional): flash-freeze NOW + apply the fire DoT at the
  // same instant — the frozen-in-place + burning state that defines blue flame.
  applySlow(e, blue = null) {
    const C = CFG.combat;
    e.slowStacks.push({ t: C.statusStackTtl });
    if (blue) {
      e.freezeT = Math.max(e.freezeT, blue.freeze);
      e.burnT = Math.max(e.burnT || 0, blue.dur);
      e.burnDps = Math.max(e.burnDps || 0, blue.dps);
    }
    if (e.slowStacks.length >= C.slowMaxStacks) {
      e.freezeT = Math.max(e.freezeT, C.freezeDur);
      e.slowStacks.length = 0;
    }
  }

  // 12.4 Ring of Chain Lightning: one bolt from (x, y) at a target enemy — damage +
  // one shock stack. The chain count (`jumps`) only matters when the shock proc fires.
  fireShockBolt(x, y, target, dmg, jumps, owner = null) {
    if (!target || target.dead) return;
    if (owner && owner._ringBeams) {
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

  // 12.6 Storm Volley strike: direct damage at the struck foe (no knockback — the
  // stun is the tell), then the ring's chain arc from it (greedy nearest, `jumps`
  // links; each chained foe gains 1 shock stack via _chainArc). Reuses ring visuals.
  _strike(e, S, owner = null) {
    this.damageEnemy(e, S.dmg, 0, 0, 0, owner);
    if (this.enemies) this._chainArc(e, S.jumps, owner);
  }

  _explode(b, enemies) {
    const C = CFG.combat;
    this.explosions.push({ x: b.x, y: b.y, t: 0, dur: C.bombFlash, r: b.radius });
    for (const e of enemies.grid.range(b.x, b.y, b.radius + CFG.ai.gridCell)) {
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

  // burn / blight / bleed / poison DoTs — ticked from status fields set by weapons
  // + synergies (Phase 21 added the wolf's bleed and the tongue's poison channels).
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
      if (e.bleedT > 0) {
        e.bleedT -= dt;
        this.dpsTick(e, e.bleedDps * dt);
      }
      if (e.poisonT > 0) {
        e.poisonT -= dt;
        this.dpsTick(e, e.poisonDps * dt);
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
  // enemies (P21) supplies the shared wolf-sheet frames for companion draws — the
  // client has a real Enemies instance, so companions render on both sides.
  draw(ctx, t, players, enemies) {
    const C = CFG.combat;
    if (this.boltImg) for (const b of this.bolts) {
      const img = (this.boltVar && this.boltVar[b.v]) || this.boltImg; // 24.2 variant
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    }
    // P21 Tank Cannon shells (same rotated-sprite pattern as bolts)
    if (this.shellImg) for (const b of this.shells) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.drawImage(this.shellImg, -this.shellImg.width / 2, -this.shellImg.height / 2);
      ctx.restore();
    }
    // P21 web strands: light silk thread + knot at the traveling end
    if (this.webImg) for (const w of this.webs) {
      ctx.drawImage(this.webImg, w.x - this.webImg.width / 2, w.y - this.webImg.height / 2);
    }
    if (this.axeImg) for (const a of this.axes) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.spin);
      const s = this.axeImg.width * a.size;
      ctx.drawImage(this.axeImg, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
    // P21 Wolf companion: same bottom-anchored sheet contract as enemies — the
    // wolf enemy frames ARE the companion art (host: live sim state; client:
    // snapshot tail written onto p._companion by applyPlayerSnap).
    if (enemies && enemies.defs && enemies.defs.wolf) for (const pl of players || []) {
      const c = pl._companion;
      if (!c || !pl.weapons.wolf) continue;
      const def = enemies.defs.wolf;
      const n = def.frames.length;
      const fr = n > 1 ? ((c.animT * CFG.enemies.wolf.fps) | 0) % n : 0;
      ctx.save();
      ctx.translate(c.x, c.y);
      if (c.flip) ctx.scale(-1, 1);
      ctx.drawImage(def.frames[fr], -def.w / 2, -def.h);
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
      const img = (this.bulletVar && this.bulletVar[b.v]) || this.bulletImg; // 24.2 variant
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    }
    if (this.arrowImg) for (const a of this.arrows) {
      const img = (this.arrowVar && this.arrowVar[a.v]) || this.arrowImg; // 24.2 variant
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    }
    if (this.bombImg) for (const b of this.bombs) {
      // ground shadow stays at the landing point; the ball rides the arc
      ctx.fillStyle = 'rgba(4,6,12,0.35)';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, 8 + b.h * 0.03, 4 + b.h * 0.015, 0, 0, TAU);
      ctx.fill();
      const img = (this.bombVar && this.bombVar[b.v]) || this.bombImg; // 24.2 variant
      const s = img.width;
      ctx.drawImage(img, b.x - s / 2, b.y - b.h - s / 2, s, s);
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
      const img = (this.snowballVar && this.snowballVar[b.v]) || this.snowballImg; // 24.2 variant
      const s = img.width;
      ctx.drawImage(img, b.x - s / 2, b.y - b.h - s / 2, s, s);
    }
    // P21 Rolling Boulder: rotating stone sprite (rot advances with travel).
    if (this.boulderImg) for (const b of this.boulders) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.drawImage(this.boulderImg, -this.boulderImg.width / 2, -this.boulderImg.height / 2);
      ctx.restore();
    }
    // P21 Continuous Laser: additive beam from the owner's mid-torso along the
    // locked aim angle (origin follows the owner; the angle is fixed at fire).
    for (const b of this.beams) {
      if (b.owner.dead) continue;
      const ox = b.owner.x, oy = b.owner._spawnY();
      const ex = ox + Math.cos(b.ang) * b.len, ey = oy + Math.sin(b.ang) * b.len;
      const k = Math.min(1, b.t / 0.08); // quick ramp-in, hold, no fade-out (laser feel)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.85 * k;
      ctx.strokeStyle = 'rgba(255,120,150,0.55)';
      ctx.lineWidth = b.w * 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.strokeStyle = '#ffdde4';
      ctx.lineWidth = b.w * 0.5;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.restore();
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
