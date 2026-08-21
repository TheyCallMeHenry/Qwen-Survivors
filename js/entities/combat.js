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
    this.orbitT = 0;
    this.garlicT = 0;
    this.t = 0;
    this.player = null;
    this.enemies = null;
    this.boltImg = null;
    this.axeImg = null;
    this.bladeImg = null;
    this.onKill = null;   // (enemy) — set by game: score/gems/particles/hit-stop
    this.onHurt = null;   // () — set by game: shake/flash
    this.onDeath = null;  // () — set by game: state machine
    this._orbCd = new Map(); // enemy -> last orbiter hit time
    this._axeCd = new Map(); // enemy -> last axe hit time
  }

  reset() {
    this.bolts.length = 0;
    this.axes.length = 0;
    this.orbitT = 0;
    this.garlicT = 0;
    this.t = 0;
    this._orbCd.clear();
    this._axeCd.clear();
  }

  fireBolt(x, y, ang, dmg, pierce) {
    const C = CFG.combat;
    this.bolts.push({
      x, y,
      vx: Math.cos(ang) * C.boltSpeed,
      vy: Math.sin(ang) * C.boltSpeed,
      rot: ang, dmg, pierce,
      hit: new Set(),
      life: C.boltLife,
    });
  }

  fireAxe(x, y, ang, dmg, size, count) {
    const C = CFG.combat;
    for (let i = 0; i < count; i++) {
      const a = ang + (TAU / count) * i;
      this.axes.push({
        x, y,
        vx: Math.cos(a) * C.axeSpeed,
        vy: Math.sin(a) * C.axeSpeed,
        dmg, size, spin: rand(0, TAU),
        back: false,
        life: C.axeLife,
      });
    }
  }

  update(dt, player, enemies) {
    this.player = player;
    this.enemies = enemies;
    this.t += dt;
    this._bolts(dt, enemies);
    this._axes(dt, player, enemies);
    if (player.weapons.garlic) this._garlic(dt, player, enemies);
    if (player.weapons.blades) this._orbiters(dt, player, enemies);
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
          this.damageEnemy(e, b.dmg, b.vx / C.boltSpeed, b.vy / C.boltSpeed, C.boltKb);
          if (b.hit.size > b.pierce) { gone = true; break; }
        }
      }
      if (gone) this.bolts.splice(i, 1);
    }
  }

  _axes(dt, player, enemies) {
    const C = CFG.combat;
    for (let i = this.axes.length - 1; i >= 0; i--) {
      const a = this.axes[i];
      a.life -= dt;
      a.spin += dt * 9;
      if (!a.back) {
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        if (a.life <= C.axeLife * 0.45 || a.x < 40 || a.x > CFG.world.w - 40 || a.y < 40 || a.y > CFG.world.h - 40) a.back = true;
      } else {
        const dx = player.x - a.x, dy = player.y - a.y;
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
        this.damageEnemy(e, a.dmg, a.vx / sp, a.vy / sp, C.axeKb);
      }
    }
  }

  _garlic(dt, player, enemies) {
    const C = CFG.combat;
    this.garlicT += dt;
    if (this.garlicT < C.garlicTick) return;
    this.garlicT = 0;
    const S = CFG.weapons.garlic.levels[player.weapons.garlic - 1];
    const R = S.r + player.r + 8; // query radius (cell superset)
    for (const e of enemies.grid.range(player.x, player.y, R)) {
      if (e.dead) continue;
      const rr = S.r + e.r;
      const dx = e.x - player.x, dy = e.y - player.y;
      if (dx * dx + dy * dy >= rr * rr) continue;
      this.damageEnemy(e, S.dmg * player.dmgMul, 0, 0, 0);
    }
  }

  _orbiters(dt, player, enemies) {
    const C = CFG.combat;
    this.orbitT += dt * C.orbitSpeed;
    const S = CFG.weapons.blades.levels[player.weapons.blades - 1];
    for (let i = 0; i < S.n; i++) {
      const a = this.orbitT + (TAU / S.n) * i;
      const bx = player.x + Math.cos(a) * S.rad;
      const by = player.y + Math.sin(a) * S.rad;
      for (const e of enemies.grid.near(bx, by)) {
        if (e.dead) continue;
        if (this.t - (this._orbCd.get(e) || -10) < C.orbitTick) continue;
        const rr = e.r + C.orbitR;
        const dx = e.x - bx, dy = e.y - by;
        if (dx * dx + dy * dy >= rr * rr) continue;
        this._orbCd.set(e, this.t);
        const kx = e.x - player.x, ky = e.y - player.y;
        const kd = Math.hypot(kx, ky) || 1;
        this.damageEnemy(e, S.dmg * player.dmgMul, kx / kd, ky / kd, C.orbitKb);
      }
    }
    if (this._orbCd.size > 512) this._orbCd.clear();
    if (this._axeCd.size > 512) this._axeCd.clear();
  }

  // Damage pipeline. kx/ky = unit knockback direction, kb = strength.
  damageEnemy(e, dmg, kx, ky, kb) {
    if (e.dead) return;
    e.hp -= dmg;
    e.flash = 0.14;
    if (kb > 0) { e.vx += kx * kb; e.vy += ky * kb; }
    if (e.hp <= 0) {
      e.dead = true;
      if (this.onKill) this.onKill(e);
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
    if (this.onHurt) this.onHurt(dmg);
    if (player.hp <= 0) {
      player.hp = 0;
      player.dead = true;
      if (this.onDeath) this.onDeath();
    }
    return true;
  }

  draw(ctx, t) {
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
    if (this.bladeImg && this.player && this.player.weapons.blades) {
      const S = CFG.weapons.blades.levels[this.player.weapons.blades - 1];
      for (let i = 0; i < S.n; i++) {
        const a = this.orbitT + (TAU / S.n) * i;
        const bx = this.player.x + Math.cos(a) * S.rad;
        const by = this.player.y + Math.sin(a) * S.rad;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(a + TAU / 4);
        ctx.drawImage(this.bladeImg, -C.orbitSize / 2, -C.orbitSize / 2, C.orbitSize, C.orbitSize);
        ctx.restore();
      }
    }
    if (this.player && this.player.weapons.garlic) {
      // pulsing aura ring
      const S = CFG.weapons.garlic.levels[this.player.weapons.garlic - 1];
      const ph = this.garlicT / C.garlicTick;
      ctx.globalAlpha = 0.10 + 0.05 * Math.sin(ph * TAU);
      ctx.strokeStyle = '#b9f2a0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, S.r * (0.97 + 0.03 * Math.sin(ph * TAU)), 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
