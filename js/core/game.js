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
import { Player, cardOffers, applyCard, recomputeStats } from '../entities/player.js';
import { loadMeta, saveMeta, shardsFor, upgradeCost, applyMeta, loadWins, saveWins, recordWin, loadSelectedLevel, isUnlocked, loadZoom, saveZoom } from './meta.js';
import { aliveCap, spawnInterval, batchSize, pickType, spawnPoint } from '../entities/spawner.js';
import { getLevel } from '../world/levels.js';
import { buildCharacters } from '../art/characters.js';
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
    this.combat.bulletImg = items.bullet;
    this.combat.bombImg = items.bomb;
    this.combat.flameImg = items.flame;
    this.combat.explosionImg = items.explosion;
    this.enemies.burnImg = items.burn;
    this.enemies.blightImg = items.blight;
    this.combat.pulse = (n) => this.bus.emit(n);
    this.combat.onBomb = () => this.camera.addShake(0.6);

    this.meta = loadMeta(CFG.meta.storageKey);
    this.wins = loadWins(CFG.meta.winsKey); // per-level cumulative victories (13.6)
    // Level-select choice (13.7) — clamp to unlocked (unlocks are monotonic, so this is a safety net).
    this.selectedLevelKey = loadSelectedLevel(CFG.meta.levelKey);
    if (!isUnlocked(this.wins, this.selectedLevelKey)) this.selectedLevelKey = 'm01';
    this.level = getLevel(this.selectedLevelKey); // backdrop + Start honor the persisted selection
    this.levelKey = this.selectedLevelKey;
    // View zoom (13.8): touch default 0.80 / desktop 1.0, persisted (qsurv.zoom.v1).
    this.zoom = loadZoom(CFG.zoom.key, document.body.classList.contains('touch'));
    this.cw = 0;
    this.ch = 0;
    this._phoenixKills = 0;

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
    this.cw = w;
    this.ch = h;
    this._applyZoom();
  }

  // Zoom (13.8): the camera view rect grows by 1/zoom (HUD DOM + minimap stay 1×).
  _applyZoom() {
    const vw = this.cw / this.zoom, vh = this.ch / this.zoom;
    this.camera.setView(vw, vh);
    this.lighting.resize(vw, vh); // half-res darkness tracks the view, not the canvas
    this.vignette = buildVignette(this.cw, this.ch);
  }

  setZoom(z) {
    this.zoom = z;
    saveZoom(CFG.zoom.key, z);
    this._applyZoom();
  }

  // --- public surface (wired to UI buttons by Phase 4/6) ---

  startRun(levelKey) {
    // levelKey omitted → keep the last level (retry / game-over Again)
    this.level = getLevel(levelKey || this.levelKey || 'm01');
    this.levelKey = this.level.key;
    const seed = (Math.random() * 4294967296) | 0;
    this.rng = mulberry32(seed ^ 0x9e3779b9);
    this.world.generate(seed, this.levelKey);
    this.minimapBase = buildMinimapBase(this.world);
    const s = this.world.playerStart;
    this.player.reset(s.x, s.y);
    applyMeta(this.player, this.meta);
    recomputeStats(this.player);
    this.player.hp = this.player.maxHp;
    this.enemies.reset();
    this.enemies.setDefs(buildCharacters(this.levelKey)); // per-level skins (13.3)
    this.enemies.diff = this.level.diff;                  // per-level stat tables (A4)
    this.combat.reset();
    this.pickups.reset();
    this.particles.reset();
    this.snow.reset(undefined, this.level.foreground);
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
    this._phoenixKills = 0;
    this.loop.timescale = 1;
    this.state = 'PLAYING';
    this.input.gesture = true; // menu Start is a DOM tap: count it as the audio-unlock gesture
    this.input.clearTransient();
    this.bus.emit('runstart', seed);
  }

  // Regenerate the menu backdrop for the current level (fixed menuSeed — A5 preview).
  _genMenuBackdrop() {
    const lvl = this.level || getLevel('m01');
    this.world.generate(lvl.menuSeed, lvl.key);
    this.minimapBase = buildMinimapBase(this.world);
    this.snow.reset(undefined, lvl.foreground);
  }

  toMenu() {
    if (this.state === 'MENU') return;
    if (!this.world.data) this._genMenuBackdrop();
    this.camera.snap(this.world.W / 2, this.world.H / 2);
    this.menuT = 0;
    this.loop.timescale = 1;
    this.state = 'MENU';
    this.input.clearTransient();
  }

  // Level-select preview (13.7): switch the menu backdrop to the selected level
  // without starting a run. Called from the level-select cards.
  previewLevel(key) {
    const lvl = getLevel(key);
    this.level = lvl;
    this.levelKey = key;
    this.world.data = null;
    this._genMenuBackdrop();
    this.camera.snap(this.world.W / 2, this.world.H / 2);
    this.menuT = 0;
    if (this.state !== 'MENU') {
      this.loop.timescale = 1;
      this.state = 'MENU';
    }
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
      this.cards = cardOffers(this.player.weapons, this.player.passives, this.player.synergies, this.rng);
      if (this.cards.length) {
        this.bus.emit('cards', this.cards);
      } else {
        this.levelupQueue = 0; // pool exhausted mid-queue — grant the rest silently
      }
    }
    if (this.levelupQueue === 0) {
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
      this.bus.emit('gem');
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
    const L = this.level || getLevel('m01');
    const B = L.boss || { key: 'wraith', at: R.bossAt, name: 'THE WRAITH' };
    if (!this.bossSpawned && this.t >= B.at) {
      const pt = this._spawnPt();
      this.enemies.spawn(B.key, pt.x, pt.y);
      this.bossSpawned = true;
      this.bus.emit('banner', { text: `${B.name} AWAKENS` });
    }
    if (this.t < CFG.spawner.firstSpawn) return;
    if (this.enemies.list.length >= aliveCap(this.t, L)) {
      this.spawnT = Math.min(this.spawnT, spawnInterval(this.t, L));
      return;
    }
    this.spawnT += dt;
    let n = 0;
    while (this.spawnT >= spawnInterval(this.t, L) && n < 4) {
      this.spawnT -= spawnInterval(this.t, L);
      const type = pickType(this.t, this.rng, L);
      if (type) {
        const n2 = batchSize(this.t, L);
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
    const offers = cardOffers(this.player.weapons, this.player.passives, this.player.synergies, this.rng);
    if (!offers.length) { this.levelupQueue = 0; return; } // every card owned — grant silently
    this.state = 'LEVELUP';
    this.cards = offers;
    this.bus.emit('cards', offers);
  }

  // Meta upgrades (Soulshards) — buy one level of `key`; no-op when maxed/unaffordable.
  buyMeta(key) {
    const upg = CFG.meta.upgrades[key];
    if (!upg) return;
    const level = this.meta.upgrades[key] || 0;
    const cost = upgradeCost(key, level);
    if (cost === null || this.meta.shards < cost) return;
    this.meta.shards -= cost;
    this.meta.upgrades[key] = level + 1;
    saveMeta(CFG.meta.storageKey, this.meta);
    this.bus.emit('meta', this.meta);
  }

  // --- combat callbacks (wired in constructor) ---

  _onKill(e) {
    this.kills++;
    this.score += e.score;
    const p = this.player;
    this.pickups.gem(e.x, e.y, e.xp);
    if (p.synergies && p.synergies.phoenix) {
      this._phoenixKills++;
      const S = CFG.synergies.phoenix.levels[0];
      if (this._phoenixKills % S.every === 0) p.heal(S.heal);
    }
    const lowHp = p.hp / p.maxHp < CFG.gems.lowHpFrac;
    if (Math.random() < (lowHp ? CFG.gems.heartChanceLowHp : CFG.gems.heartChance)) this.pickups.heart(e.x, e.y);
    this.particles.soul(e.x, e.y, e.boss ? 14 : 5);
    this.loop.hitStop(e.boss ? CFG.combat.hitStopBoss : CFG.combat.hitStopKill);
    if (e.boss) {
      this.camera.addShake(0.8);
      this.bus.emit('banner', { text: `${(this.level && this.level.boss && this.level.boss.name) || 'THE WRAITH'} FALLS` });
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
    const st = this.stats();
    const gain = shardsFor(st);
    this.meta.shards += gain;
    saveMeta(CFG.meta.storageKey, this.meta);
    if (victory) {
      recordWin(this.wins, this.levelKey || 'm01'); // victory-only (deaths don't count)
      saveWins(CFG.meta.winsKey, this.wins);
    }
    this.bus.emit('meta', this.meta);
    this.bus.emit('gameover', { ...st, shards: gain });
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
    // Zoom (13.8): the enlarged view rect is centered on the canvas (no-op at zoom 1);
    // the vignette is a 1× canvas overlay, so it stays outside this transform.
    ctx.save();
    ctx.translate((this.cw - vw) / 2, (this.ch - vh) / 2);

    if (this.state === 'MENU') {
      this.world.drawBackground(ctx, view, this.menuT);
      this.snow.draw(ctx, view, vw, vh, this.menuT);
      ctx.restore();
      if (this.vignette) ctx.drawImage(this.vignette, 0, 0, this.cw, this.ch);
      return;
    }

    const t = this.t;
    this.world.drawBackground(ctx, view, t);

    // world space: pickups → shadows → Y-sorted (culled decor + enemies + player)
    ctx.save();
    ctx.translate(vw / 2 - view.x, vh / 2 - view.y);
    const pad = CFG.world.cullPad;
    const x0 = view.x - vw / 2 - pad, x1 = view.x + vw / 2 + pad;
    const y0 = view.y - vh / 2 - pad, y1 = view.y + vh / 2 + pad;
    this.pickups.draw(ctx, t, x0, y0, x1, y1);
    const p = this.player;
    const sr = p.def.shadowR;
    ctx.drawImage(this.playerShadow, p.x - sr, p.y - sr * 0.5, sr * 2, sr);
    this.enemies.drawShadows(ctx, x0, y0, x1, y1);
    const items = [];
    for (const d of this.world.decor) {
      if (d.x < x0 || d.x > x1 || d.y < y0 || d.y > y1) continue;
      items.push(d);
    }
    for (const e of this.enemies.list) {
      if (e.dead || e.x < x0 || e.x > x1 || e.y < y0 || e.y > y1) continue;
      items.push(e);
    }
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
    this.particles.draw(ctx, x0, y0, x1, y1);
    ctx.restore();

    // screen space: lighting → snow (still inside the view transform)
    this.lighting.draw(ctx, view, this._lights(), t, this.level.palette.light);
    this.snow.draw(ctx, view, vw, vh, t);
    ctx.restore();
    if (this.vignette) ctx.drawImage(this.vignette, 0, 0, this.cw, this.ch);
    if (this.mctx && this.minimapBase) {
      drawMinimapLive(this.mctx, this.minimapBase, p, this.enemies.list, cam, vw, vh);
    }
  }
}
