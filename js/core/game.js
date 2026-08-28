// Game: state machine + run orchestration + render pipeline.
// States: MENU / PLAYING / LEVELUP / PAUSED / DYING / GAMEOVER.
// Browser-only instantiation (constructor touches canvas APIs via art modules).
// Update order (PLAYING): input edges → player → spawns → enemies → combat →
// pickups → level-up gate → ambience/camera → victory check.
import { CFG } from '../config.js';
import { makeBus } from '../utils/bus.js';
import { mulberry32, clamp } from '../utils/math.js';
import { World } from '../world/world.js';
import { Camera } from '../systems/camera.js';
import { Lighting } from '../systems/lighting.js';
import { Particles, Snow } from '../entities/particles.js';
import { Pickups } from '../entities/pickups.js';
import { Enemies } from '../entities/enemies.js';
import { Combat } from '../entities/combat.js';
import { Player, cardOffers, applyCard, recomputeStats, charDef } from '../entities/player.js';
import { loadMeta, saveMeta, shardsFor, upgradeCost, applyMeta, loadWins, saveWins, recordWin, loadSelectedLevel, isUnlocked, loadZoom, saveZoom, loadChars, saveChars, isCharUnlocked, buyChar, loadSelectedChar, saveSelectedChar } from './meta.js';
import { aliveCap, spawnInterval, batchSize, pickType, spawnPoint } from '../entities/spawner.js';
import { getLevel, LEVEL_ORDER } from '../world/levels.js';
import { buildCharacters, buildRoster, buildGhost } from '../art/characters.js';
import { gemHeartFor } from '../art/items.js';
import { buildVignette } from '../art/terrain.js';
import { flashCopy, shadowSprite } from '../art/base.js';
import { buildMinimapBase, drawMinimapLive } from '../world/minimap.js';
import { playerSnap, applyPlayerSnap, enemySnap, applyEnemySnap, pickupSnaps, applyPickupSnaps, stateMsg, unpackState, ENEMY_KEYS } from '../net/sync.js';
import { MSG, profileFromMeta, joinProfile, ghostColor, allocateGhostOffers, coopScale, leashClamp, weaponCap, bossCount, resolveChars, selChar } from '../net/coop.js';
import { CoopConn } from '../net/conn.js';

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
    this.pickups = new Pickups({}); // gem/heart reskin per level (13.10)
    this.enemies = new Enemies();
    this.enemies.setDefs(characters);
    this.enemies.orbImg = items.orb;
    this.combat = new Combat();
    this.combat.boltImg = items.bolt;
    this.combat.axeImg = items.boomerang;
    this.combat.bladeImg = items.blade;
    // Character roster (11.6.2, D58/D62): local ghost tint = seat 0; solo default =
    // starter; the select screen (screens.js) drives setCharacter/buyCharacter.
    this.roster = buildRoster(CFG.ghostColors[0]);
    this.chars = loadChars(CFG.meta.charListKey);
    this.charKey = loadSelectedChar(CFG.meta.charKey);
    if (!isCharUnlocked(this.chars, this.charKey)) this.charKey = CFG.characters.order[0];
    const sheet = this.roster[this.charKey];
    this.player = new Player(sheet);
    this.player.setCharacter(this.charKey);
    this.player.flashes = [sheet.idle.map(flashCopy), sheet.run.map(flashCopy)];
    this.playerShadow = shadowSprite(sheet.shadowR, sheet.shadowR, 0.35);
    this.players = [this.player]; // live player array (co-op: host sim + remote inputs, 11.2)
    this.remote = [];             // remote Player instances (host sim / client render)
    this.net = null;              // CoopConn (solo: never set → all co-op paths skip)
    this.netRole = 'solo';        // 'solo' | 'host' | 'client'
    this.netRoster = [];          // [{id, seat, profile}] seat order
    this.netMyId = null;
    this._enemySid = new Map();   // stable sid → enemy object (client render set)
    this._snapBuf = [];           // last 2 host states (client interpolation)
    this._step = 0;               // host snapshot step counter
    this._coopSeed = null;        // seed of the run the host is simulating
    this._ghost = false;          // 11.6.3: this run ghosted the local seat (D59 fallback)
    this.weaponOwner = {};        // 11.5: weaponKey → first picker (player object) — excludes the weapon from others' offers

    this.combat.onKill = (e, killer) => this._onKill(e, killer);
    this.combat.onHurt = (dmg, pl) => this._onHurt(dmg, pl);
    this.combat.onDeath = (pl) => this._onDeath(pl);
    this.combat.bulletImg = items.bullet;
    this.combat.arrowImg = items.arrow;
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
    this._reskinPickups();
    // View zoom (13.8): touch default 0.80 / desktop 1.0, persisted (qsurv.zoom.v1).
    this.zoom = loadZoom(CFG.zoom.key, document.body.classList.contains('touch'));
    this.cw = 0;
    this.ch = 0;

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

  // Per-level pickup tint (13.10): gem/heart follow the level.
  _reskinPickups() {
    const gh = gemHeartFor(this.levelKey);
    this.pickups.gemImg = gh.gem;
    this.pickups.heartImg = gh.heart;
  }

  // --- public surface (wired to UI buttons by Phase 4/6) ---

  startRun(levelKey) {
    // levelKey omitted → keep the last level (retry / game-over Again)
    this.level = getLevel(levelKey || this.levelKey || 'm01');
    this.levelKey = this.level.key;
    this._reskinPickups();
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
    this._ghost = false; // 11.6.3: co-op startRun re-arms it via the ghost flow (D59)
    this.loop.timescale = 1;
    this.state = 'PLAYING';
    this.input.gesture = true; // menu Start is a DOM tap: count it as the audio-unlock gesture
    this.input.clearTransient();
    this._coopSeed = seed;
    this.bus.emit('runstart', seed);
    if (this.net && this.netRole === 'host') this._coopStartRun(seed); // 11.2
    this.enemies.coopS = coopScale(this.players.length); // 11.3: ramp enemy HP/dmg/spawn/boss by player count (solo = 1.0)
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
    this._reskinPickups();
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
    if (this.state !== 'PLAYING' || this.netRole === 'client') return; // co-op: the host owns the sim
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
    if (card.level === 1 && (card.kind === 'weapon' || card.kind === 'synergy')) this.weaponOwner[card.key] = this.player; // 11.5/11.6b: first picker owns
    this.levelupQueue--;
    this.bus.emit('card', card, i);
    if (this.levelupQueue > 0) {
      this.cards = cardOffers(this.player.weapons, this.player.passives, this.player.synergies, this.rng, weaponCap(this.players.length), this._ownerExclusion(this.player));
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
    if (this.netRole === 'client' && this.state === 'PLAYING') { this._clientUpdate(dt); return; } // co-op: render path only
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
    if (p.dead) {
      // co-op: local death is a spectator state while the run continues (11.2)
      inp.consumeDash();
    } else {
      if (inp.consumeDash() && p.tryDash(ax.x, ax.y)) this.bus.emit('dash');
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
    }
    this.t += dt;
    for (const r of this.remote) if (!r.dead) this._remoteStep(dt, r); // co-op host
    this._coopLeash(); // 11.4: pairwise vision leash (no-op when players.length === 1)

    this._spawns(dt);
    this.enemies.update(dt, this.players, this.world, this.combat);
    if (this.state !== 'PLAYING') return; // died to contact
    this.combat.update(dt, this.players, this.enemies);
    for (const pl of this.players) {
      const got = this.pickups.update(dt, pl);
      if (got.heal > 0) pl.heal(got.heal);
      if (got.xp > 0) {
        this.bus.emit('gem');
        const ups = pl.gainXp(got.xp);
        if (pl === p) {
          this.levelupQueue += ups;
          if (this.levelupQueue > 0) this.bus.emit('levelup');
        } else this._remoteLevelUps(pl, ups); // host: auto-pick for the remote
      }
    }
    if (!p.dead && this.levelupQueue > 0) { this._startLevelUp(); return; }
    this.particles.update(dt);
    this.snow.update(dt);
    this.camera.update(dt, p.x, p.y, p.vx, p.vy);
    if (this.t >= CFG.run.time) this._gameOver(true);
    if (this.state === 'PLAYING') this._coopBroadcast(); // host: per-step snapshot
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
    this.enemies.update(dt, this.players, this.world, this.combat);
    this.combat.update(dt, this.players, this.enemies);
    this.particles.update(dt);
    this.snow.update(dt);
    this.camera.update(dt, p.x, p.y, p.vx, p.vy);
    if (this.deathT >= CFG.run.deathDelay) this._gameOver(false);
  }

  _spawns(dt) {
    const R = CFG.run;
    const L = this.level || getLevel('m01');
    const B = L.boss || { key: 'wraith', at: R.bossAt, name: 'THE WRAITH' };
    const S = this.enemies.coopS; // 11.3 co-op difficulty factor (1.0 solo)
    if (!this.bossSpawned && this.t >= B.at) {
      // 11.10: N players = N bosses of the current level (count fixed at the
      // spawn moment — mid-run joiners before B.at add bosses; after it, the
      // wave is done). Solo: exactly 1, bit-identical to the pre-11.10 path.
      const n = bossCount(this.players.length);
      for (let i = 0; i < n; i++) {
        const pt = this._spawnPt();
        this.enemies.spawn(B.key, pt.x, pt.y);
      }
      this.bossSpawned = true;
      this.bus.emit('banner', { text: n > 1 ? `${B.name} AWAKENS ×${n}` : `${B.name} AWAKENS` });
    }
    if (this.t < CFG.spawner.firstSpawn) return;
    if (this.enemies.list.length >= aliveCap(this.t, L, S)) {
      this.spawnT = Math.min(this.spawnT, spawnInterval(this.t, L, S));
      return;
    }
    this.spawnT += dt;
    let n = 0;
    while (this.spawnT >= spawnInterval(this.t, L, S) && n < 4) {
      this.spawnT -= spawnInterval(this.t, L, S);
      const type = pickType(this.t, this.rng, L);
      if (type) {
        const n2 = batchSize(this.t, L, S);
        for (let i = 0; i < n2; i++) {
          const pt = this._spawnPt();
          this.enemies.spawn(type, pt.x, pt.y);
        }
      }
      n++;
    }
    if (n >= 4) this.spawnT = Math.min(this.spawnT, spawnInterval(this.t, L, S));
  }

  _spawnPt() {
    const c = this.camera;
    return spawnPoint(this.world.W, this.world.H, CFG.world.margin, c.x, c.y, c.w, c.h, this.rng);
  }

  _startLevelUp() {
    const offers = cardOffers(this.player.weapons, this.player.passives, this.player.synergies, this.rng, weaponCap(this.players.length), this._ownerExclusion(this.player), this.player._ghostOffers);
    if (!offers.length) { this.levelupQueue = 0; return; } // every card owned — grant silently
    this.state = 'LEVELUP';
    this.cards = offers;
    this.bus.emit('cards', offers);
  }

  // 11.5/11.6b: weapon + synergy keys owned by ANOTHER player (first picker owns
  // the card + its upgrades for the run; starting weapons are pre-owned). Solo:
  // always empty — the only owner is the local player.
  _ownerExclusion(pl) {
    const s = new Set();
    for (const [k, owner] of Object.entries(this.weaponOwner)) {
      if (owner !== pl && !pl.weapons[k] && !(pl.synergies || {})[k]) s.add(k);
    }
    return s;
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

  // 11.6.2: select the playable character (persisted; co-op unique-per-player lands 11.6.4).
  setCharacter(key) {
    if (!CFG.characters[key] || !isCharUnlocked(this.chars, key)) return this.charKey;
    this.player.setCharacter(key);
    this.charKey = key;
    saveSelectedChar(CFG.meta.charKey, key);
    const sheet = this.roster[key]; // roster art/flash/shadow swap (D62)
    this.player.def = sheet;
    this.player.flashes = [sheet.idle.map(flashCopy), sheet.run.map(flashCopy)];
    this.playerShadow = shadowSprite(sheet.shadowR, sheet.shadowR, 0.35);
    // 11.6.4 (D56): keep the host's own roster entry current — the assignment
    // resolves from roster profiles, seat 0 (host) always wins its pick.
    const me = this.netRoster.find((e) => e.id === this.netMyId);
    if (me && me.profile) me.profile.charKey = key;
    this.bus.emit('char', key);
    return key;
  }

  // 11.6.2: Soulshard character shop (D58) — same economy as Upgrades, own persisted list.
  buyCharacter(key) {
    const res = buyChar(this.chars, this.meta.shards, key);
    if (!res.ok) return res;
    this.chars = res.chars;
    this.meta.shards = res.shards;
    saveChars(CFG.meta.charListKey, this.chars);
    saveMeta(CFG.meta.storageKey, this.meta);
    this.bus.emit('meta', this.meta);
    return res;
  }

  // --- combat callbacks (wired in constructor) ---

  _onKill(e, killer) {
    this.kills++;
    this.score += e.score;
    const p = killer || this.player; // solo: killer always falls back to the local player
    this.pickups.gem(e.x, e.y, e.xp);
    if (p.synergies && p.synergies.phoenix) {
      p._phoenixKills = (p._phoenixKills || 0) + 1;
      const S = CFG.synergies.phoenix.levels[0];
      if (p._phoenixKills % S.every === 0) p.heal(S.heal);
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

  _onHurt(dmg, pl) {
    if (pl && pl !== this.player) return; // co-op: the local client only shakes for itself
    this.camera.addShake(0.45);
    this.loop.hitStop(CFG.combat.hitStopHurt);
    this.bus.emit('hurt');
  }

  _onDeath(pl) {
    if (this.state !== 'PLAYING') return;
    if (this.netRole === 'host' && pl !== this.player) {
      // co-op: the run continues while any player is alive (11.2)
      if (this.players.some((q) => !q.dead)) return;
    }
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
      const wasUnlocked = LEVEL_ORDER.map((k) => isUnlocked(this.wins, k));
      recordWin(this.wins, this.levelKey || 'm01'); // victory-only (deaths don't count)
      saveWins(CFG.meta.winsKey, this.wins);
      // 13.10: fired after DAWN BREAKS — the screens banner queue holds it until that finishes.
      if (LEVEL_ORDER.some((k, i) => !wasUnlocked[i] && isUnlocked(this.wins, k)))
        this.bus.emit('banner', { text: 'NEW MAP UNLOCKED' });
    }
    this.bus.emit('meta', this.meta);
    this.bus.emit('gameover', { ...st, shards: gain });
    if (this.net && this.netRole === 'host') this.net.sendClosed('run-end'); // co-op: end the room
  }

  // --- co-op (11.2): host-authoritative sync ---
  // Solo invariance (11.11): every path below is inert when this.net is null.

  attachNet() {
    if (this.net) return;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.net = new CoopConn(`${proto}://${location.host}/`);
    this.net.onMessage = (m) => this._netMsg(m);
    this.net.connect();
    this.net.sendHello(this.levelKey, joinProfile(this.meta, this.chars, this.charKey)); // D53/D59/D56: unlocks + selected char
  }

  detachNet() {
    if (!this.net) return;
    this.net.sendClosed('leave');
    this.net.close();
    this.net = null;
    this.netRole = 'solo';
    this.netRoster = [];
    this.netMyId = null;
    this.remote.length = 0;
    this.players = [this.player];
    this._ghost = false; // 11.6.3: ghost is a co-op-run state — restore the selected character
    if (this.player.charKey === 'ghost') this.setCharacter(this.charKey);
    if (this.state === 'PLAYING') this.toMenu();
  }

  _netMsg(m) {
    if (!m || typeof m.t !== 'string') return;
    switch (m.t) {
      case MSG.joined:
        this.netMyId = m.id;
        this.netRole = m.seat === 0 ? 'host' : 'client';
        break;
      case MSG.full: // room full — back to solo
        this.net = null;
        break;
      case MSG.roster: this._netRoster(m); break;
      case MSG.runstart: if (this.netRole !== 'host') this._startClientRun(m.seed, m.levelKey); break;
      case MSG.input: this._netInput(m); break;
      case MSG.state: if (this.netRole === 'client') this._netState(m); break;
      case MSG.left: break; // roster covers it
      case MSG.closed: this._netClosed(); break;
      case 'netclosed': this._netClosed(); break; // WS dropped
    }
  }

  _netRoster(m) {
    if (!Array.isArray(m.players)) return;
    this.netRoster = m.players;
    this.bus.emit('roster'); // 11.6.4: select screen re-renders its taken set (D56)
    if (this.netRole !== 'host' || this.state !== 'PLAYING') return;
    const seen = new Set(this.remote.map((r) => r.id));
    let grew = false;
    for (const e of m.players) {
      if (e.id === this.netMyId || seen.has(e.id)) continue;
      const pl = this._remotePlayer(e.profile, selChar(e.profile)); // provisional — _applyAssign resolves D56
      pl.id = e.id; // join-order seat identity (mirrors _coopStartRun — input reachability)
      this.remote.push(pl);
      grew = true;
    }
    for (let i = this.remote.length - 1; i >= 0; i--) {
      if (!m.players.some((q) => q.id === this.remote[i].id)) {
        this.remote[i].dead = true;
        this.remote.splice(i, 1);
      }
    }
    this.players = [this.player, ...this.remote];
    this.enemies.coopS = coopScale(this.players.length); // 11.3: live ramp on mid-run join/leave
    if (grew) this.net.sendRunStart(this.netMyId, this._coopSeed, this.levelKey); // mid-run joiner gets the seed
    if (this.state === 'PLAYING') this._applyAssign(); // 11.6.4: roster changed mid-run — (re)resolve per-seat chars
  }

  // 11.6.4 (D56/D57/D59, host-authoritative): resolve per-seat characters from
  // the roster profiles and apply each to its live remote. Seat order wins a
  // contested pick (the host = seat 0 always keeps its own — setCharacter keeps
  // its roster entry current). A displaced seat gets its next unlocked char;
  // a seat with no playable char left plays the ghost (D59) with its UNIQUE
  // 2-offer starting-weapon deal, never duplicated across players. Re-evaluated
  // on every mid-run roster change (a leave re-frees its char — a displaced
  // seat is restored; a re-ghosted seat gets a fresh deal).
  _applyAssign() {
    if (!this.net || this.netRole !== 'host') return;
    const roster = this.netRoster;
    const hostSeat = roster.findIndex((e) => e.id === this.netMyId);
    const eff = roster.map((e, i) => (i === hostSeat
      ? { ...e, profile: { ...e.profile, charKey: this.player.charKey } }
      : e));
    const assigned = resolveChars(eff);
    const prevGhost = this._ghost;
    const ghosting = assigned.includes('ghost');
    this._ghost = ghosting;
    const offers = ghosting ? allocateGhostOffers(roster.length, mulberry32((this._coopSeed ^ 0x51ed2701) | 0)) : null;
    roster.forEach((e, i) => {
      if (i === hostSeat) return; // host's local seat: applied below
      const pl = this.remote.find((r) => r.id === e.id);
      if (!pl) return;
      const key = assigned[i];
      if (pl._assign === key) return; // steady state — keep the (possibly spent) pair
      if (key !== 'ghost') {
        this._applyChar(pl, key, i); // restored/reassigned playable char (D56/D57)
        pl._ghostOffers = null;
      } else if (pl._assign !== 'ghost') {
        // first ghost this run: per-seat tint (D62), no starting weapon,
        // baseline stats, the unique 2-offer deal (D59)
        this._applyChar(pl, 'ghost', i);
        pl._ghostOffers = offers[i];
        applyCard(pl, { kind: 'weapon', key: offers[i][0], level: 1 }); // auto-pick: the starting weapon
        pl._ghostOffers = offers[i]; // re-arm: the pair is the contract — the next level-up offers the held remainder
        pl.hp = pl.maxHp; // ghost base changed maxHp after _setRemoteChar refilled
        if (!this.weaponOwner[offers[i][0]]) this.weaponOwner[offers[i][0]] = pl;
      } else {
        pl._ghostOffers = offers[i]; // re-ghosted: fresh deal for the re-armed pair
      }
      pl._assign = key;
    });
    const me = this.players[0];
    if (assigned[hostSeat] === 'ghost' && me.charKey !== 'ghost') {
      // first-time ghosting this run — arm the entry pair (a consumed pair stays
      // spent: charKey 'ghost' + _ghostOffers null)
      this._applyChar(me, 'ghost', hostSeat);
      me._ghostOffers = offers[hostSeat];
    }
    if (!prevGhost && assigned[hostSeat] === 'ghost') {
      this.levelupQueue = 1;
      this.cards = null;
      this.state = 'LEVELUP';
      this._startLevelUp(); // D59 entry pick: exactly the local seat's starting pair
    }
  }

  _remotePlayer(profile, key, seat) {
    const def = this.player.def;
    const pl = new Player(def);
    pl.flashes = [def.idle.map(flashCopy), def.run.map(flashCopy)];
    pl.reset(this.world.playerStart.x, this.world.playerStart.y);
    if (profile && typeof profile === 'object') {
      // D53 stat profile → the player's meta fields (exact inverse of profileFromMeta).
      pl.metaHp = profile.maxHpBonus || 0;
      pl.metaDmg = (profile.dmgMult || 1) - 1;
      pl.metaSpeed = (profile.speedMult || 1) - 1;
      pl.xpMul = profile.xpMult || 1;
      pl.dashCdMul = profile.dashCdMult || 1;
    }
    this._applyChar(pl, key, seat); // 11.6.4: the seat's ASSIGNED char (D56/D57) — base stats + starting weapon + sheet
    pl._mx = 0; pl._my = 0; pl._dash = false;
    pl._phoenixKills = 0;
    // _assign stays unset — _applyAssign applies/deals this seat (ghost pair included).
    return pl;
  }

  // 11.6.4 (D56/D57): (re)apply a character to a Player — per-char base stats
  // (recomputeStats reads charKey), starting weapon (ghost: none), sheet/flash
  // swap (ghost = per-seat Pac-Man tint, D62). No LS persistence (host-assigned).
  _applyChar(pl, key, seat) {
    pl.setCharacter(key);
    const sheet = key === 'ghost' ? buildGhost(ghostColor(seat)) : this.roster[key];
    pl.def = sheet;
    pl.flashes = [sheet.idle.map(flashCopy), sheet.run.map(flashCopy)];
    pl.weapons = {};
    const c = charDef(key);
    if (c.weapon) {
      pl.weapons[c.weapon] = 1;
      if (!this.weaponOwner[c.weapon]) this.weaponOwner[c.weapon] = pl; // 11.6b: starting weapon pre-owned (excluded from others' offers)
    }
    recomputeStats(pl);
    pl.hp = pl.maxHp;
  }

  _netInput(m) {
    if (this.netRole !== 'host') return;
    const r = this.remote.find((q) => q.id === m.id);
    if (!r) return;
    r._mx = typeof m.mx === 'number' ? m.mx : 0;
    r._my = typeof m.my === 'number' ? m.my : 0;
    if (m.dash) r._dash = true;
  }

  _coopStartRun(seed) {
    const s = this.world.playerStart;
    const hostSeat = this.netRoster.findIndex((e) => e.id === this.netMyId);
    const eff = this.netRoster.map((e, i) => (i === hostSeat
      ? { ...e, profile: { ...e.profile, charKey: this.player.charKey } }
      : e));
    const assigned = resolveChars(eff); // 11.6.4 (D56/D59): unique per-seat chars, seat order
    const remotes = [];
    this.netRoster.forEach((e, i) => {
      if (e.id === this.netMyId) return;
      const pl = this._remotePlayer(e.profile, assigned[i], i); pl.id = e.id; remotes.push(pl);
    });
    this.remote = remotes;
    this.players = [this.player, ...this.remote];
    this._snapBuf = [];
    this._step = 0;
    this._coopSeed = seed;
    this.weaponOwner = {}; // 11.5: ownership resets each run
    this.net.sendRunStart(this.netMyId, seed, this.levelKey);
    this._applyAssign(); // 11.6.4 (D56/D59): per-seat chars + ghost 2-offer deal
    const hw = charDef(this.player.charKey).weapon; // 11.6b: the host's own starting weapon is pre-owned too
    if (hw && !this.weaponOwner[hw]) this.weaponOwner[hw] = this.player;
  }

  _remoteStep(dt, r) {
    const ax = { x: r._mx || 0, y: r._my || 0 };
    if (r._dash) { r._dash = false; if (r.tryDash(ax.x, ax.y)) this.bus.emit('dash'); }
    r.update(dt, ax, this.combat, this.enemies, this.world);
  }

  // 11.4 leash (A2): host-side only (clients never sim) — every live player
  // held within CFG.coop.leashR of every other live player. Projection can
  // overshoot the world edge near a wall, so re-clamp to the world margin.
  _coopLeash() {
    if (this.players.length < 2) return; // solo invariance (11.11)
    const R = CFG.coop.leashR, M = CFG.world.margin;
    const live = this.players.filter((pl) => !pl.dead);
    for (const pl of live) {
      const [x, y] = leashClamp(pl.x, pl.y, live.filter((q) => q !== pl), R);
      pl.x = clamp(x, M, CFG.world.w - M);
      pl.y = clamp(y, M, CFG.world.h - M);
    }
  }

  _remoteLevelUps(pl, ups) {
    for (let i = 0; i < ups; i++) {
      const offers = cardOffers(pl.weapons, pl.passives, pl.synergies, this.rng, weaponCap(this.players.length), this._ownerExclusion(pl), pl._ghostOffers);
      if (!offers.length) break;
      applyCard(pl, offers[0]); // host auto-picks; the client sees it via snapshots
      if (offers[0].level === 1 && (offers[0].kind === 'weapon' || offers[0].kind === 'synergy')) this.weaponOwner[offers[0].key] = pl; // 11.5/11.6b: first picker owns
    }
    this.bus.emit('levelup');
  }

  _coopBroadcast() {
    if (!this.net || this.netRole !== 'host' || this.state !== 'PLAYING') return;
    const body = stateMsg(
      this._step++, this.t, this.score, this.kills,
      this.players.map(playerSnap),
      this.enemies.list.map(enemySnap),
      pickupSnaps(this.pickups),
    );
    this.net.sendState(this.netMyId, body);
  }

  // --- co-op client: no local sim — apply host snapshots + interpolate ---

  _startClientRun(seed, levelKey) {
    this.levelKey = levelKey || this.levelKey || 'm01';
    this.level = getLevel(this.levelKey);
    this._reskinPickups();
    this.rng = mulberry32(seed ^ 0x9e3779b9); // same world-seed mix as the host
    this.world.generate(seed, this.levelKey);
    this.minimapBase = buildMinimapBase(this.world);
    const s = this.world.playerStart;
    this.player.reset(s.x, s.y);
    applyMeta(this.player, this.meta);
    recomputeStats(this.player);
    this.player.hp = this.player.maxHp;
    this.enemies.reset();
    this.enemies.setDefs(buildCharacters(this.levelKey));
    this.enemies.diff = this.level.diff;
    this.combat.reset();
    this.pickups.reset();
    this.particles.reset();
    this.snow.reset(undefined, this.level.foreground);
    this.camera.snap(s.x, s.y);
    this.t = 0; this.score = 0; this.kills = 0;
    this.bossSpawned = false;
    this.victory = false;
    this.levelupQueue = 0;
    this.cards = null;
    this.deathT = 0;
    this._ghostT = 0;
    this._snapBuf = [];
    this._enemySid = new Map();
    this.remote.length = 0;
    this.players = [this.player];
    this.netRole = 'client';
    // 11.6.4: the client renders its HOST-ASSIGNED char (same pure helper as
    // the host — the roster profiles are the shared truth; D56/D57/D59). No LS
    // persistence — the user's selection is untouched.
    const seat = this._seat();
    const key = seat >= 0 ? resolveChars(this.netRoster)[seat] : this.charKey;
    this._ghost = key === 'ghost';
    if (key !== this.player.charKey) this._applyChar(this.player, key, seat);
    this.input.gesture = true;
    this.input.clearTransient();
    this.state = 'PLAYING';
    this.bus.emit('runstart', seed);
  }

  _clientUpdate(dt) {
    // Local controller → host (the client never simulates; the host applies
    // this to the remote Player each step).
    const ax = this.input.axes();
    if (this.net) this.net.sendInput(ax.x, ax.y, this.input.consumeDash());
    this._interp();
    this.camera.update(dt, this.player.x, this.player.y, this.player.vx, this.player.vy);
    this.snow.update(dt);
    // 16.2 visual: the client never simulates, so advance the LOCAL player's orbit +
    // garlic clocks cosmetically at the host sim rates (combat.draw reads these for the
    // blade/garlic visuals; remote blades have no angle in the snapshot → not drawn).
    this.player._orbitT += dt * CFG.combat.orbitSpeed;
    this.player._garlicT = (this.player._garlicT + dt) % CFG.combat.garlicTick;
  }

  _interp() {
    const buf = this._snapBuf;
    const a = buf[0], b = buf[1];
    const now = performance.now();
    const lerpP = (i, j) => {
      if (a && b && j < a.players.length && j < b.players.length && b.arr - a.arr > 1) {
        const t = (now - CFG.coop.interpLag - a.arr) / (b.arr - a.arr);
        if (t > 0 && t < 1) {
          const A = a.players[j], B = b.players[j];
          return { x: A[0] + (B[0] - A[0]) * t, y: A[1] + (B[1] - A[1]) * t };
        }
      }
      const p = b ? b.players[j] : a ? a.players[j] : null;
      return p ? { x: p[0], y: p[1] } : null;
    };
    const seat = this._seat();
    for (let j = 0; j < this.players.length; j++) {
      const pl = j === seat ? this.player : this.remote[j < seat ? j : j - 1];
      const pos = lerpP(j);
      if (pos) { pl.x = pos.x; pl.y = pos.y; }
    }
    const lb = b ? b.enemies : a ? a.enemies : [];
    const la = a ? a.enemies : [];
    for (const s of lb) {
      const e = this._enemySid.get(s[0]);
      if (!e) continue;
      const pa = la.find((q) => q[0] === s[0]);
      if (pa && b.arr - a.arr > 1) {
        const t = (now - CFG.coop.interpLag - a.arr) / (b.arr - a.arr);
        if (t > 0 && t < 1) { e.x = pa[2] + (s[2] - pa[2]) * t; e.y = pa[3] + (s[3] - pa[3]) * t; continue; }
      }
      e.x = s[2]; e.y = s[3];
    }
  }

  _reconcileRemote(n) {
    for (let i = this.remote.length; i < n - 1; i++) {
      const def = this.player.def;
      const pl = new Player(def);
      pl.flashes = [def.idle.map(flashCopy), def.run.map(flashCopy)];
      pl.reset(this.world.playerStart.x, this.world.playerStart.y);
      this.remote.push(pl);
    }
    if (this.remote.length > n - 1) this.remote.length = n - 1;
    this.players = [this.player, ...this.remote];
  }

  _netState(m) {
    const st = unpackState(m);
    if (!st) return;
    const seat = this._seat();
    if (seat < 0) return; // roster not arrived yet; next per-step state overwrites
    this.t = st.time; this.score = st.score; this.kills = st.kills;
    this._reconcileRemote(st.players.length);
    const now = performance.now();
    this._snapBuf.push({ arr: now, players: st.players, enemies: st.enemies });
    if (this._snapBuf.length > 2) this._snapBuf.shift();
    for (let j = 0; j < st.players.length; j++) {
      applyPlayerSnap(j === seat ? this.player : this.remote[j < seat ? j : j - 1], st.players[j]);
    }
    const live = new Set();
    for (const s of st.enemies) {
      live.add(s[0]);
      let e = this._enemySid.get(s[0]);
      if (!e) {
        e = this.enemies.spawn(ENEMY_KEYS[s[1]], s[2], s[3]);
        e.sid = s[0];
        this._enemySid.set(s[0], e);
      }
      applyEnemySnap(e, s);
    }
    if (this._enemySid.size !== live.size) {
      for (const [sid, e] of this._enemySid) {
        if (!live.has(sid)) { e.dead = true; this._enemySid.delete(sid); }
      }
      let w = 0;
      for (let i = 0; i < this.enemies.list.length; i++) {
        const e = this.enemies.list[i];
        if (!e.dead) this.enemies.list[w++] = e;
      }
      this.enemies.list.length = w;
    }
    applyPickupSnaps(this.pickups, st.pickups);
    this._interp();
  }

  _seat() {
    return this.netRoster.findIndex((e) => e.id === this.netMyId);
  }

  _netClosed() {
    // Run over (host) or transport gone: back to the menu, solo again.
    if (this.net) { this.net.close(); }
    this.net = null;
    this.netRole = 'solo';
    this.netRoster = [];
    this.netMyId = null;
    this.remote.length = 0;
    this.players = [this.player];
    this._ghost = false; // 11.6.3: ghost is a co-op-run state — restore the selected character
    if (this.player.charKey === 'ghost') this.setCharacter(this.charKey);
    if (this.state === 'GAMEOVER') return; // host: keep the results screen
    this.toMenu();
  }

  // --- render (every rAF; raw dt, camera shake offsets included in view) ---

  _lights() {
    const L = CFG.lighting;
    const p = this.player;
    const pr = this.players.length > 1 ? CFG.coop.leashR : L.playerR; // 11.4: expanded co-op vision
    const lights = this.world.lights.slice();
    lights.push({ x: p.x, y: p.y, r: pr, rgb: L.playerRgb, flicker: L.playerFlicker });
    for (const r of this.remote) if (!r.dead) lights.push({ x: r.x, y: r.y, r: pr, rgb: L.playerRgb, flicker: L.playerFlicker });
    for (const e of this.enemies.list) {
      if (e.boss && !e.dead) lights.push({ x: e.x, y: e.y, r: L.bossR, rgb: L.bossRgb, flicker: L.bossFlicker }); // 11.10: every live boss gets its light hole (solo = 1)
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
    for (const pl of this.players) ctx.drawImage(this.playerShadow, pl.x - sr, pl.y - sr * 0.5, sr * 2, sr);
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
    for (const r of this.remote) if (!r.dead) items.push(r);
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      if (it === p || it.flashes) it.draw(ctx); // player instances (local + remote)
      else if (it.img) ctx.drawImage(it.img, it.x - (it.w * it.s) / 2, it.y - it.h * it.s);
      else this.enemies.drawOne(ctx, it, t);
    }
    ctx.restore();

    // world space: projectiles → orbs → particles
    ctx.save();
    ctx.translate(vw / 2 - view.x, vh / 2 - view.y);
    this.combat.draw(ctx, t, this.players);
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
