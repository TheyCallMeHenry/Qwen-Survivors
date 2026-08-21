// Game: state machine + run orchestration + render pipeline.
// States: MENU / PLAYING / LEVELUP / PAUSED / DYING / GAMEOVER.
// Browser-only instantiation (constructor touches canvas APIs via art modules).
// Update order (PLAYING): input edges → player → spawns → enemies → combat →
// pickups → level-up gate → ambience/camera → victory check.
import { CFG } from '../config.js';
import { makeBus } from '../utils/bus.js';
import { mulberry32 } from '../utils/math.js';
import { World } from '../world/world.js';
import { Camera } from '../systems/camera.js';
import { Lighting } from '../systems/lighting.js';
import { Particles, Snow } from '../entities/particles.js';
import { Pickups } from '../entities/pickups.js';
import { Enemies } from '../entities/enemies.js';
import { Combat } from '../entities/combat.js';
import { Player, cardOffers, applyCard } from '../entities/player.js';
import { aliveCap, spawnInterval, batchSize, pickType, spawnPoint } from '../entities/spawner.js';
import { buildVignette } from '../art/terrain.js';
import { flashCopy, shadowSprite } from '../art/base.js';
import { buildMinimapBase, drawMinimapLive } from '../world/minimap.js';

export class Game {
  constructor({ input, loop, ctx, mctx, characters, items }) {
    this.input = input;
    this.loop = loop;
    this.ctx = ctx;
    this.mctx = mctx;
    this.bus = makeBus();

    this.world = new World();
    this.camera = new Camera();
    this.lighting = new Lighting();
    this.snow = new Snow();
    this.particles = new Particles();
    this.pickups = new Pickups({ gem: items.gem, heart: items.heart });
    this.enemies = new Enemies();
    this.enemies.setDefs(characters);
    this.enemies.orbImg = items.orb;
    this.combat = new Combat();
    this.combat.boltImg = items.bolt;
    this.combat.axeImg = items.boomerang;
    this.combat.bladeImg = items.blade;
    this.player = new Player(characters.player);
    this.player.flashes = [characters.player.idle.map(flashCopy), characters.player.run.map(flashCopy)];
    this.playerShadow = shadowSprite(characters.player.shadowR, characters.player.shadowR, 0.35);

    this.combat.onKill = (e) => this._onKill(e);
    this.combat.onHurt = () => this._onHurt();
    this.combat.onDeath = () => this._onDeath();

    this.minimapBase = null;
    this.vignette = null;
    this.rng = mulberry32(1); // placeholder; startRun re-seeds
    this.state = null;
    this.menuT = 0;
    this.t = 0;
    this.score = 0;
    this.kills = 0;
    this.spawnT = 0;
    this.levelupQueue = 0;
    this.cards = null;
    this.victory = false;
    this.deathT = 0;
    this.bossSpawned = false;
    this._ghostT = 0;

    this._onBlur = () => this.pause();
    this._onVis = () => { if (document.hidden) this.pause(); };
    addEventListener('blur', this._onBlur);
    document.addEventListener('visibilitychange', this._onVis);

    this.toMenu();
  }

  resize(w, h) {
    this.camera.setView(w, h);
    this.lighting.resize(w, h);
    this.vignette = buildVignette(w, h);
  }

  // --- public surface (wired to UI buttons by Phase 4/6) ---

  startRun() {
    const seed = (Math.random() * 4294967296) | 0;
    this.rng = mulberry32(seed ^ 0x9e3779b9);
    this.world.generate(seed);
    this.minimapBase = buildMinimapBase(this.world);
    const s = this.world.playerStart;
    this.player.reset(s.x, s.y);
    this.enemies.reset();
    this.combat.reset();
    this.pickups.reset();
    this.particles.reset();
    this.snow.reset();
    this.camera.snap(s.x, s.y);
    this.t = 0;
    this.score = 0;
    this.kills = 0;
    this.spawnT = 0;
    this.levelupQueue = 0;
    this.cards = null;
    this.victory = false;
    this.deathT = 0;
    this.bossSpawned = false;
    this._ghostT = 0;
    this.loop.timescale = 1;
    this.state = 'PLAYING';
    this.input.gesture = true; // menu Start is a DOM tap: count it as the audio-unlock gesture
    this.input.clearTransient();
    this.bus.emit('runstart', seed);
  }

  toMenu() {
    if (this.state === 'MENU') return;
    if (!this.world.data) {
      this.world.generate(CFG.menu.worldSeed);
      this.minimapBase = buildMinimapBase(this.world);
    }
    this.camera.snap(this.world.W / 2, this.world.H / 2);
    this.menuT = 0;
    this.loop.timescale = 1;
    this.state = 'MENU';
    this.input.clearTransient();
  }

  pause() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.input.clearTransient();
    this.bus.emit('pause', true);
  }

  resume() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.input.clearTransient();
    this.bus.emit('pause', false);
  }

  pickCard(i) {
    if (this.state !== 'LEVELUP' || !this.cards || !this.cards[i]) return;
    const card = this.cards[i];
    applyCard(this.player, card);
    this.levelupQueue--;
    this.bus.emit('card', card, i);
    if (this.levelupQueue > 0) {
      this.cards = cardOffers(this.player.weapons, this.player.passives, this.rng);
      this.bus.emit('cards', this.cards);
    } else {
      this.cards = null;
      this.state = 'PLAYING';
    }
  }

  liveScore() {
    return this.score + Math.floor(this.t) * CFG.run.timeScorePerSec;
  }

  stats() {
    return {
      victory: this.victory,
      score: this.score + Math.floor(this.t) * CFG.run.timeScorePerSec + (this.victory ? CFG.run.victoryBonus : 0),
      time: this.t,
      kills: this.kills,
      level: this.player.level,
    };
  }

  // --- update (fixed 60Hz dt, called by Loop) ---

  update(dt) {
    if (this.input.consumeMute()) this.bus.emit('mute');
    switch (this.state) {
      case 'MENU':
        this._menuUpdate(dt);
        break;
      case 'PAUSED':
        if (this.input.consumePause()) this.resume();
        else { this.input.consumeDash(); this.input.takeCardEdges(); }
        break;
      case 'LEVELUP':
        this._levelUpInput();
        break;
      case 'GAMEOVER':
        this.input.consumeDash();
        this.input.takeCardEdges();
        break;
      case 'DYING':
        this._dyingUpdate(dt);
        break;
      default:
        this._playingUpdate(dt);
    }
  }

  _menuUpdate(dt) {
    this.menuT += dt;
    const M = CFG.menu, c = this.camera;
    c.x = this.world.W / 2 + Math.cos(this.menuT * M.speed) * this.world.W * M.amp;
    c.y = this.world.H / 2 + Math.sin(this.menuT * M.speed * 0.8) * this.world.H * M.amp;
    c.ox = 0; c.oy = 0;
    this.snow.update(dt);
    this.particles.update(dt);
    const ce = this.input.takeCardEdges();
    const start = this.input.consumeDash() || ce[0] || ce[1] || ce[2] || this.input.sticks.size > 0;
    this.input.consumePause();
    if (start) this.startRun();
  }

  _playingUpdate(dt) {
    const inp = this.input;
    if (inp.consumePause()) { this.pause(); return; }
    const p = this.player;
    const ax = inp.axes();
    if (inp.consumeDash() && p.tryDash(ax.x, ax.y)) this.bus.emit('dash');
    this.t += dt;
    p.update(dt, ax, this.combat, this.enemies, this.world);

    // dash ghost trail
    if (p.dashT > 0) {
      this._ghostT -= dt;
      if (this._ghostT <= 0) {
        this._ghostT = CFG.player.ghostEvery;
        const def = p.def;
        this.particles.ghost((p.moving ? def.run : def.idle)[p.frameIdx], p.x, p.y, p.flip);
      }
    } else this._ghostT = 0;

    this._spawns(dt);
    this.enemies.update(dt, p, this.world, this.combat);
    if (this.state !== 'PLAYING') return; // died to contact
    this.combat.update(dt, p, this.enemies);
    const got = this.pickups.update(dt, p);
    if (got.heal > 0) p.heal(got.heal);
    if (got.xp > 0) {
      this.levelupQueue += p.gainXp(got.xp);
      if (this.levelupQueue > 0) this.bus.emit('levelup');
    }
    if (!p.dead && this.levelupQueue > 0) { this._startLevelUp(); return; }
    this.particles.update(dt);
    this.snow.update(dt);
    this.camera.update(dt, p.x, p.y, p.vx, p.vy);
    if (this.t >= CFG.run.time) this._gameOver(true);
  }

  _levelUpInput() {
    this.input.consumeDash();
    this.input.consumePause();
    const edges = this.input.takeCardEdges();
    const i = edges.findIndex(Boolean);
    if (i >= 0) this.pickCard(i);
  }

  _dyingUpdate(dt) {
    this.deathT += dt;
    const p = this.player;
    this.enemies.update(dt, p, this.world, this.combat);
    this.combat.update(dt, p, this.enemies);
    this.particles.update(dt);
    this.snow.update(dt);
    this.camera.update(dt, p.x, p.y, p.vx, p.vy);
    if (this.deathT >= CFG.run.deathDelay) this._gameOver(false);
  }

  _spawns(dt) {
    const R = CFG.run;
    if (!this.bossSpawned && this.t >= R.bossAt) {
      const pt = this._spawnPt();
      this.enemies.spawn('wraith', pt.x, pt.y);
      this.bossSpawned = true;
      this.bus.emit('banner', { text: 'THE WRAITH AWAKENS' });
    }
    if (this.t < CFG.spawner.firstSpawn) return;
    if (this.enemies.list.length >= aliveCap(this.t)) {
      this.spawnT = Math.min(this.spawnT, spawnInterval(this.t));
      return;
    }
    this.spawnT += dt;
    let n = 0;
    while (this.spawnT >= spawnInterval(this.t) && n < 4) {
      this.spawnT -= spawnInterval(this.t);
      const type = pickType(this.t, this.rng);
      if (type) {
        const n2 = batchSize(this.t);
        for (let i = 0; i < n2; i++) {
          const pt = this._spawnPt();
          this.enemies.spawn(type, pt.x, pt.y);
        }
      }
      n++;
    }
    if (n >= 4) this.spawnT = Math.min(this.spawnT, spawnInterval(this.t));
  }

  _spawnPt() {
    const c = this.camera;
    return spawnPoint(this.world.W, this.world.H, CFG.world.margin, c.x, c.y, c.w, c.h, this.rng);
  }

  _startLevelUp() {
    this.state = 'LEVELUP';
    this.cards = cardOffers(this.player.weapons, this.player.passives, this.rng);
    this.bus.emit('cards', this.cards);
  }

  // --- combat callbacks (wired in constructor) ---

  _onKill(e) {
    this.kills++;
    this.score += e.score;
    const p = this.player;
    this.pickups.gem(e.x, e.y, e.xp);
    const lowHp = p.hp / p.maxHp < CFG.gems.lowHpFrac;
    if (Math.random() < (lowHp ? CFG.gems.heartChanceLowHp : CFG.gems.heartChance)) this.pickups.heart(e.x, e.y);
    this.particles.soul(e.x, e.y, e.boss ? 14 : 5);
    this.loop.hitStop(e.boss ? CFG.combat.hitStopBoss : CFG.combat.hitStopKill);
    if (e.boss) {
      this.camera.addShake(0.8);
      this.bus.emit('banner', { text: 'THE WRAITH FALLS' });
    }
    this.bus.emit('kill');
  }

  _onHurt() {
    this.camera.addShake(0.45);
    this.loop.hitStop(CFG.combat.hitStopHurt);
    this.bus.emit('hurt');
  }

  _onDeath() {
    if (this.state !== 'PLAYING') return;
    this.state = 'DYING';
    this.deathT = 0;
    this.loop.timescale = CFG.run.deathTimescale;
    this.camera.addShake(1);
    this.bus.emit('death');
  }

  _gameOver(victory) {
    if (this.state === 'GAMEOVER') return;
    this.state = 'GAMEOVER';
    this.victory = victory;
    this.loop.timescale = 1;
    this.input.clearTransient();
    if (victory) this.bus.emit('banner', { text: 'DAWN BREAKS' });
    this.bus.emit('gameover', this.stats());
  }

  // --- render (every rAF; raw dt, camera shake offsets included in view) ---

  _lights() {
    const L = CFG.lighting;
    const p = this.player;
    const lights = this.world.lights.slice();
    lights.push({ x: p.x, y: p.y, r: L.playerR, rgb: L.playerRgb, flicker: L.playerFlicker });
    for (const e of this.enemies.list) {
      if (e.boss && !e.dead) {
        lights.push({ x: e.x, y: e.y, r: L.bossR, rgb: L.bossRgb, flicker: L.bossFlicker });
        break;
      }
    }
    return lights;
  }

  render(rdt) {
    const ctx = this.ctx;
    const cam = this.camera;
    const vw = cam.w, vh = cam.h;
    const view = { x: cam.x + cam.ox, y: cam.y + cam.oy, w: vw, h: vh };

    if (this.state === 'MENU') {
      this.world.drawBackground(ctx, view, this.menuT);
      this.snow.draw(ctx, view, vw, vh, this.menuT);
      if (this.vignette) ctx.drawImage(this.vignette, 0, 0, vw, vh);
      return;
    }

    const t = this.t;
    this.world.drawBackground(ctx, view, t);

    // world space: pickups → shadows → Y-sorted (culled decor + enemies + player)
    ctx.save();
    ctx.translate(vw / 2 - view.x, vh / 2 - view.y);
    this.pickups.draw(ctx, t);
    const p = this.player;
    const sr = p.def.shadowR;
    ctx.drawImage(this.playerShadow, p.x - sr, p.y - sr * 0.5, sr * 2, sr);
    this.enemies.drawShadows(ctx);
    const pad = CFG.world.cullPad;
    const x0 = view.x - vw / 2 - pad, x1 = view.x + vw / 2 + pad;
    const y0 = view.y - vh / 2 - pad, y1 = view.y + vh / 2 + pad;
    const items = [];
    for (const d of this.world.decor) {
      if (d.x < x0 || d.x > x1 || d.y < y0 || d.y > y1) continue;
      items.push(d);
    }
    for (const e of this.enemies.list) if (!e.dead) items.push(e);
    items.push(p);
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      if (it === p) p.draw(ctx);
      else if (it.img) ctx.drawImage(it.img, it.x - (it.w * it.s) / 2, it.y - it.h * it.s);
      else this.enemies.drawOne(ctx, it, t);
    }
    ctx.restore();

    // world space: projectiles → orbs → particles
    ctx.save();
    ctx.translate(vw / 2 - view.x, vh / 2 - view.y);
    this.combat.draw(ctx, t);
    this.enemies.drawOrbs(ctx);
    this.particles.draw(ctx);
    ctx.restore();

    // screen space: lighting → snow → vignette → minimap
    this.lighting.draw(ctx, view, this._lights(), t);
    this.snow.draw(ctx, view, vw, vh, t);
    if (this.vignette) ctx.drawImage(this.vignette, 0, 0, vw, vh);
    if (this.mctx && this.minimapBase) {
      drawMinimapLive(this.mctx, this.minimapBase, p, this.enemies.list, cam, vw, vh);
    }
  }
}
