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
    this.dmgMul = 1; this.speedMul = 1; this.magnet = 1; this.regen = 0;
    this.animT = 0; this.frameIdx = 0; this.moving = false; this.flip = false;
    this.dead = false;
    this._wandCd = 0; this._axeCd = 0;
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
    this.dmgMul = 1; this.speedMul = 1; this.magnet = 1; this.regen = 0;
    this.animT = 0; this.frameIdx = 0; this.moving = false; this.flip = false;
    this.dead = false;
    this._wandCd = 0; this._axeCd = 0;
  }

  gainXp(n) {
    let ups = 0;
    this.xp += n;
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
    this.dashCd = CFG.player.dashCd;
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
            combat.fireBolt(this.x, this.y, a2, S.dmg * this.dmgMul, S.pierce);
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
        combat.fireAxe(this.x, this.y, ang, S.dmg * this.dmgMul, S.size, S.count);
        this._axeCd = S.cd;
      }
    }
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
  }
}

// --- Pure level-up card logic (Node-testable) ---

// Rebuild derived stats from the passive table. target = Player or plain object.
export function recomputeStats(p) {
  p.dmgMul = 1 + CFG.passives.dmg.val * (p.passives.dmg || 0);
  p.speedMul = 1 + CFG.passives.speed.val * (p.passives.speed || 0);
  p.magnet = 1 + CFG.passives.magnet.val * (p.passives.magnet || 0);
  p.regen = CFG.passives.regen.val * (p.passives.regen || 0);
  p.maxHp = CFG.player.maxHp + CFG.passives.hp.val * (p.passives.hp || 0);
}

// Up to 3 distinct upgrade candidates: weapon upgrades, new weapons (≤ maxWeapons), passives.
export function cardOffers(weapons, passives, rng) {
  const pool = [];
  const ownedW = Object.keys(weapons).length;
  for (const k of Object.keys(CFG.weapons)) {
    const lvl = weapons[k] || 0;
    const wpn = CFG.weapons[k];
    if (lvl > 0 && lvl < wpn.levels.length) pool.push({ kind: 'weapon', key: k, level: lvl + 1 });
    else if (lvl === 0 && ownedW < CFG.run.maxWeapons) pool.push({ kind: 'weapon', key: k, level: 1 });
  }
  for (const k of Object.keys(CFG.passives)) {
    const lvl = passives[k] || 0;
    if (lvl < CFG.passives[k].max) pool.push({ kind: 'passive', key: k, level: lvl + 1 });
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

export function applyCard(target, card) {
  if (card.kind === 'weapon') {
    target.weapons[card.key] = Math.max(target.weapons[card.key] || 0, card.level);
  } else {
    const p = CFG.passives[card.key];
    target.passives[card.key] = Math.min(p.max, (target.passives[card.key] || 0) + 1);
  }
  recomputeStats(target);
  if (card.kind === 'passive' && card.key === 'hp') {
    target.hp = Math.min(target.maxHp, target.hp + CFG.passives.hp.val);
  }
}
