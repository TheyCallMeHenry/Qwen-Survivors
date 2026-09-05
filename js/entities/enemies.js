// Enemy types + AI: chase / separate / steer, cultist ranged orbs, wraith boss.
// Enemies only collide with static colliders when not flying.
// Drawn exclusively from pre-rendered buildCharacters() frames (facing RIGHT,
// flipped at draw time; image base = bottom-center). Node-safe: sprites injected.
import { CFG } from '../config.js';
import { HashGrid } from '../utils/grid.js';
import { TAU, approach, clamp, rand } from '../utils/math.js';
import { flashCopy, shadowSprite } from '../art/base.js';

export class Enemies {
  constructor() {
    this.list = [];
    this.orbs = [];
    this.grid = new HashGrid(CFG.ai.gridCell);
    this.seq = 0;          // stable enemy ids (co-op snapshots, 11.2)
    this.defs = null;      // buildCharacters() output (browser)
    this.diff = 1;         // per-level difficulty scalar (A4) — hp/dmg at spawn
    this.coopS = 1;        // co-op difficulty factor (11.3: coopScale(players); 1.0 solo)
    this.orbImg = null;
    this.burnImg = null;
    this.blightImg = null;
    this.shadows = new Map(); // shadowR -> shadow canvas (lazy, browser)
  }

  setDefs(chars) {
    this.defs = chars;
    for (const k of Object.keys(CFG.enemies)) {
      const d = chars[k];
      if (!d) continue;
      d.flash = d.flash || d.frames.map(flashCopy);
    }
  }

  reset() {
    this.list.length = 0;
    this.orbs.length = 0;
    this.grid.clear();
    this.seq = 0;
  }

  spawn(type, x, y) {
    const s = CFG.enemies[type];
    const d = this.diff * this.coopS;
    const hp = s.hp * d, dmg = s.dmg * d;
    const e = {
      type, x, y, vx: 0, vy: 0, sid: ++this.seq,
      hp, maxHp: hp, r: s.r,
      speed: rand(s.speed[0], s.speed[1]),
      dmg, xp: s.xp, score: s.score,
      boss: !!s.boss, fly: !!s.fly, weave: !!s.weave, ranged: !!s.ranged,
      flash: 0, animT: rand(0, 3), phase: rand(0, TAU),
      state: 'chase', stateT: 0, cd: rand(1, 2.5),
      flip: false, frame: 0, dead: false,
      burnT: 0, burnDps: 0, blightT: 0, blightDps: 0,
      // 12.5 status pipeline: slow→freeze + shock→stun (12.4). Each stack entry expires
      // independently after CFG.combat.statusStackTtl.
      slowStacks: [], freezeT: 0, shockStacks: [], stunT: 0,
    };
    if (e.boss) e.cd = CFG.ai.wraithWindup * 2; // first charge comes sooner
    this.list.push(e);
    return e;
  }

  shadow(r) {
    let s = this.shadows.get(r);
    if (!s) { s = shadowSprite(r, r, 0.35); this.shadows.set(r, s); }
    return s;
  }

  // players: live player array (solo = [player]) — each enemy targets the
  // nearest live player (co-op, 11.2).
  update(dt, players, world, combat) {
    this.grid.clear();
    for (const e of this.list) if (!e.dead) this.grid.add(e.x, e.y, e);
    for (const e of this.list) if (!e.dead) this._ai(e, dt, players, world, combat);
    this._orbs(dt, players, combat);
    if (this.list.some((e) => e.dead)) {
      // In-place compaction: the grid above already holds exactly the alive
      // (dead were skipped on add), so no grid rebuild is needed here.
      let w = 0;
      for (let i = 0; i < this.list.length; i++) {
        const e = this.list[i];
        if (!e.dead) this.list[w++] = e;
      }
      this.list.length = w;
    }
  }

  _ai(e, dt, players, world, combat) {
    const A = CFG.ai;
    if (e.flash > 0) e.flash -= dt;
    // 12.5: slow-stack expiry (independent per-stack TTL) + freeze lock tick.
    if (e.slowStacks.length) {
      for (let i = e.slowStacks.length - 1; i >= 0; i--) {
        e.slowStacks[i].t -= dt;
        if (e.slowStacks[i].t <= 0) e.slowStacks.splice(i, 1);
      }
    }
    if (e.freezeT > 0) e.freezeT -= dt;
    // 12.4: shock-stack expiry + stun lock tick
    if (e.shockStacks.length) {
      for (let i = e.shockStacks.length - 1; i >= 0; i--) {
        e.shockStacks[i].t -= dt;
        if (e.shockStacks[i].t <= 0) e.shockStacks.splice(i, 1);
      }
    }
    if (e.stunT > 0) e.stunT -= dt;
    const player = nearestPlayer(e, players); // nearest LIVE player (solo: the only one)
    const dx = player.x - e.x, dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    let tvx = ux * e.speed, tvy = uy * e.speed;
    // 12.3/12.5: slow stacks cut movement (capped so 4+ stacks can't fully stop before
    // the freeze lands); a frozen enemy does not move at all.
    if (e.slowStacks.length) {
      const C = CFG.combat;
      tvx *= 1 - Math.min(e.slowStacks.length, C.slowMaxStacks) * C.slowPct;
      tvy *= 1 - Math.min(e.slowStacks.length, C.slowMaxStacks) * C.slowPct;
    }
    if (e.freezeT > 0 || e.stunT > 0) { tvx = 0; tvy = 0; }

    // Stunned/frozen foes hold pattern: no weave, and ranged firing is suppressed too.
    const locked = e.freezeT > 0 || e.stunT > 0;

    if (e.weave && !locked) {
      const w = Math.sin(e.phase + e.animT * A.weaveFreq) * A.weaveAmp;
      tvx += -uy * w;
      tvy += ux * w;
    }

    if (e.ranged && !locked) {
      e.cd -= dt;
      const inRange = d >= A.cultistRange[0] && d <= A.cultistRange[1];
      if (inRange) {
        // hold range: strafe the player and fire orbs
        const s = Math.sin(e.phase + e.animT * 0.7) * e.speed * 0.45;
        tvx = -uy * s;
        tvy = ux * s;
        if (e.cd <= 0) {
          e.cd = rand(A.cultistShotCd[0], A.cultistShotCd[1]);
          this.orbs.push({ x: e.x, y: e.y, vx: ux * A.orbSpeed, vy: uy * A.orbSpeed, life: CFG.combat.orbLife, r: CFG.combat.orbR });
        }
      }
    }

    if (e.boss && !locked) {
      // wraith: slow chase → windup → charge through the crowd
      e.cd -= dt;
      if (e.state === 'chase') {
        if (e.cd <= 0) { e.state = 'windup'; e.stateT = A.wraithWindup; }
      } else if (e.state === 'windup') {
        e.stateT -= dt;
        tvx = 0; tvy = 0;
        if (e.stateT <= 0) {
          e.state = 'charge';
          e.stateT = A.wraithCharge;
          e.cdx = ux; e.cdy = uy;
          e.cd = rand(A.wraithChargeCd[0], A.wraithChargeCd[1]);
        }
      } else if (e.state === 'charge') {
        e.stateT -= dt;
        tvx = e.cdx * A.wraithChargeSpeed;
        tvy = e.cdy * A.wraithChargeSpeed;
        if (e.stateT <= 0) e.state = 'chase';
      }
    }

    e.vx = approach(e.vx, tvx, A.steer, dt);
    e.vy = approach(e.vy, tvy, A.steer, dt);

    // separation from nearby enemies (grid covers r ≤ cell)
    let sx = 0, sy = 0;
    for (const n of this.grid.near(e.x, e.y)) {
      if (n === e || n.dead) continue;
      const ox = e.x - n.x, oy = e.y - n.y;
      const dd = Math.hypot(ox, oy) || 1;
      const min = e.r + n.r + A.sepPad;
      if (dd < min) {
        const f = (min - dd) / dd;
        sx += ox * f;
        sy += oy * f;
      }
    }
    e.vx += sx * A.sepPush * dt;
    e.vy += sy * A.sepPush * dt;

    e.x += e.vx * dt;
    e.y += e.vy * dt;

    // steer around static colliders (fliers hop over)
    if (!e.fly) for (const c of world.collidersNear(e.x, e.y)) {
      if (c.ellipse) {
        const qxx = (e.x - c.x) / c.rx, qyy = (e.y - c.y) / c.ry;
        const dd = Math.hypot(qxx, qyy) || 1;
        if (dd < 1) { e.x = c.x + qxx / dd * c.rx; e.y = c.y + qyy / dd * c.ry; }
      } else {
        const ox = e.x - c.x, oy = e.y - c.y;
        const dd = Math.hypot(ox, oy) || 1;
        const min = e.r + c.r;
        if (dd < min) { e.x = c.x + ox / dd * min; e.y = c.y + oy / dd * min; }
      }
    }
    e.x = clamp(e.x, CFG.world.margin, CFG.world.w - CFG.world.margin);
    e.y = clamp(e.y, CFG.world.margin, CFG.world.h - CFG.world.margin);

    // contact damage (any live player)
    for (const p of players) {
      if (p.dead) continue;
      const ddx = p.x - e.x, ddy = p.y - e.y;
      const rr = e.r + p.r;
      if (ddx * ddx + ddy * ddy < rr * rr) combat.damagePlayer(p, e.dmg, e.x, e.y);
    }

    // animation (frame index only; draw picks the canvas)
    const sp = Math.hypot(e.vx, e.vy);
    if (sp > 18) e.animT += dt * (e.boss ? 0.6 : 1);
    if (this.defs) {
      const def = this.defs[e.type];
      const n = def.frames.length;
      e.frame = n > 1 ? ((e.animT * CFG.enemies[e.type].fps) | 0) % n : 0;
    }
    if (Math.abs(e.vx) > 12) e.flip = e.vx < 0;
  }

  _orbs(dt, players, combat) {
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.life -= dt;
      let gone = o.life <= 0 || o.x < 0 || o.x > CFG.world.w || o.y < 0 || o.y > CFG.world.h;
      if (!gone) {
        for (const p of players) {
          if (p.dead) continue;
          const dx = p.x - o.x, dy = p.y - o.y;
          const rr = p.r + o.r;
          if (dx * dx + dy * dy < rr * rr) {
            combat.damagePlayer(p, CFG.enemies.cultist.dmg, o.x, o.y);
            gone = true;
            break;
          }
        }
      }
      if (gone) this.orbs.splice(i, 1);
    }
  }

  drawShadows(ctx, x0, y0, x1, y1) {
    if (!this.defs) return;
    for (const e of this.list) {
      if (e.dead || e.x < x0 || e.x > x1 || e.y < y0 || e.y > y1) continue;
      const r = this.defs[e.type].shadowR;
      const s = this.shadow(r);
      ctx.drawImage(s, e.x - r, e.y - r * 0.5, r * 2, r);
    }
  }

  drawOne(ctx, e, t) {
    const def = this.defs[e.type];
    const img = e.flash > 0 ? def.flash[e.frame] : def.frames[e.frame];
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -def.w / 2, -def.h);
    ctx.restore();
    // status effects: flickering flame (burn) / green wisp (blight) over the foe
    if (e.burnT > 0 && this.burnImg) {
      const s = 16 * (1 + 0.12 * Math.sin(t * 26 + e.phase * 4));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(this.burnImg, e.x - s / 2, e.y - def.h - 6 - s / 2, s, s);
      ctx.restore();
    }
    if (e.blightT > 0 && this.blightImg) {
      const s = 12 * (1 + 0.12 * Math.sin(t * 18 + e.phase * 3));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(this.blightImg, e.x + 7 - s / 2, e.y - def.h - 6 - s / 2, s, s);
      ctx.restore();
    }
    // 12.3/12.5 status tells: frozen = solid ice cap over the foe; else slow stacks =
    // one frost pip above the HP bar each (≤ slowMaxStacks).
    if (e.freezeT > 0) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#bfe8ff';
      ctx.beginPath();
      ctx.arc(e.x, e.y - def.h * 0.55, def.w * 0.42, 0, TAU);
      ctx.fill();
      ctx.restore();
    } else if (e.slowStacks.length) {
      ctx.save();
      ctx.fillStyle = '#8fd4ff';
      for (let i = 0; i < e.slowStacks.length; i++) {
        ctx.beginPath();
        ctx.arc(e.x - 8 + i * 8, e.y - def.h - 16, 2.4, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    // 12.4/12.5 shock tell: yellow spark pips above the HP bar (right of frost pips);
    // stunned = a crackling arc over the head
    if (e.shockStacks.length) {
      ctx.save();
      ctx.fillStyle = '#ffe06a';
      for (let i = 0; i < e.shockStacks.length; i++) {
        ctx.beginPath();
        ctx.arc(e.x + 4 + i * 8, e.y - def.h - 16, 2.4, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    if (e.stunT > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,236,140,0.85)';
      ctx.lineWidth = 1.6;
      const a0 = t * 9 + e.phase;
      ctx.beginPath();
      ctx.moveTo(e.x - 10, e.y - def.h - 4);
      ctx.lineTo(e.x - 3 + Math.sin(a0) * 2, e.y - def.h - 10);
      ctx.lineTo(e.x + 2, e.y - def.h - 5);
      ctx.lineTo(e.x + 10, e.y - def.h - 11 + Math.cos(a0) * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (e.hp < e.maxHp) {
      const w = e.boss ? 46 : 22, h = e.boss ? 5 : 3;
      const f = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = 'rgba(10,8,14,0.75)';
      ctx.fillRect(e.x - w / 2, e.y - def.h - 10, w, h);
      ctx.fillStyle = e.boss ? '#c77bff' : '#ff6b5e';
      ctx.fillRect(e.x - w / 2 + 1, e.y - def.h - 9, (w - 2) * f, h - 2);
    }
  }

  drawOrbs(ctx) {
    if (!this.orbImg) return;
    for (const o of this.orbs) {
      const s = 18 * (1 + 0.15 * Math.sin(o.life * 14));
      ctx.drawImage(this.orbImg, o.x - s / 2, o.y - s / 2, s, s);
    }
  }
}

// Nearest LIVE player for enemy targeting (solo passes a 1-element array).
function nearestPlayer(e, players) {
  let best = null, bd = Infinity;
  for (const p of players) {
    if (p.dead) continue;
    const dx = p.x - e.x, dy = p.y - e.y;
    const d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = p; }
  }
  return best || players[0];
}
