// tools/test-boot.mjs — Node repro of the browser boot + full runs.
//
// Stubs a minimal DOM/canvas (canvas APIs validated like a real browser:
// arc/ellipse/gradients throw on bad radii), replicates js/main.js boot()
// (audio excluded — verified safe by review: every path no-ops pre-ctx), then
// pumps the real Loop via a stubbed requestAnimationFrame and simulates the
// user's path: btn-start click → run 1 (stand still → level-up cards → heart
// pickup → forced death) → meta flow (gameover saves Soulshards → menu →
// Upgrades screen: assert rows/shards, buy Vitality, back) → run 2 via
// btn-start (meta maxHp 120 applied → kept alive → all 7 weapons via forced
// card picks → wand-off kill window → bullets/bombs/flames observed → burn
// DoT kill → dash i-frame E2E → touch stick + dash button → synergy E2E:
// all-max → blight card drawn + picked → wraith boss at 4:00 → victory at
// 5:00) → btn-go-menu → scores overlay (render/clear/back) → quit flow
// (window.close stub + fallback screen) → 13.2 M02 menu-backdrop E2E (m02 +
// m01 regression) → 13.4 M03 backdrop E2E (sun glow + godrays + fish schools
// + bubble foreground) → 13.3 M02 real run 3 (Higan skins + ×1.25 stats +
// Ryū boss banner/spawn → victory 5:00) → 13.5 M03 real run 4 (drowned
// skins + ×1.56 stats + Great White boss banner/spawn → victory 5:00).
// Catches first-frame/wired-up runtime crashes the pure-logic tests cannot
// see, and drives paths the happy-path sim never hit: keyboard card picks,
// non-start weapons, heart heal, meta buy + apply, new-weapon projectiles,
// burn DoT, dash i-frames, synergy cards, mobile stick/dash, score
// persistence, quit.
//
// Usage: node tools/test-boot.mjs — exit 0 = PASS.

import assert from 'node:assert';

// ---------- browser stubs (must exist before js/ functions execute) ----------

const grad = { addColorStop() {} };
class IndexSizeError extends Error {
  constructor() { super('IndexSizeError'); this.name = 'IndexSizeError'; }
}
const okR = (v) => Number.isFinite(v) && v >= 0;

// 10.4 bench: draw-op counts (Node ms under-states browser cost — draw call
// volume is the proxy for it). Counted inside the ctx proxy only; the harness
// set() no-ops, so nothing else can instrument this way.
const drawOps = { drawImage: 0, arc: 0, fill: 0, fillRect: 0, stroke: 0, fillText: 0, radial: 0 };

function makeCtx() {
  return new Proxy({}, {
    get(_, p) {
      if (p === 'canvas') return { width: 1, height: 1 };
      if (p === 'createRadialGradient') return (x0, y0, r0, x1, y1, r1) => {
        drawOps.radial++;
        if (!okR(r0) || !okR(r1)) throw new IndexSizeError();
        return grad;
      };
      if (p === 'createLinearGradient') return () => grad;
      if (p === 'arc') return (...a) => { drawOps.arc++; if (a.length < 3 || a.length > 6) throw new TypeError('arc: ' + a.length + ' args'); if (!okR(a[2])) throw new IndexSizeError(); };
      if (p === 'ellipse') return (...a) => { if (a.length !== 7) throw new TypeError('ellipse: ' + a.length + ' args, 7 required'); if (!okR(a[2]) || !okR(a[3])) throw new IndexSizeError(); };
      if (p === 'measureText') return () => ({ width: 8 });
      if (p === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h) * 4), width: w, height: h });
      if (typeof p === 'string') {
        if (p in drawOps) { const o = drawOps; return () => { o[p]++; }; }
        return () => undefined;
      }
      return undefined;
    },
    set() { return true; },
  });
}
const ctx2d = makeCtx();

function makeEl(tag = 'div') {
  const el = {
    tag,
    style: { _props: {}, setProperty(k, v) { this._props[k] = v; } },
    className: '', textContent: '', hidden: false,
    tabIndex: 0, disabled: false,
    offsetWidth: 0, offsetHeight: 0,
    children: [],
    classList: (() => {
      const s = new Set();
      return {
        add: (...c) => c.forEach((x) => s.add(x)),
        remove: (...c) => c.forEach((x) => s.delete(x)),
        toggle: (c, f) => { const w = f === undefined ? !s.has(c) : !!f; if (w) s.add(c); else s.delete(c); return w; },
        contains: (c) => s.has(c),
      };
    })(),
    addEventListener(type, fn) { el._ls = el._ls || {}; (el._ls[type] = el._ls[type] || []).push(fn); },
    removeEventListener() {},
    click() { for (const fn of (el._ls && el._ls.click) || []) fn(); },
    setAttribute() {}, getAttribute() { return null; },
    append(...cs) { el.children.push(...cs); },
    appendChild(c) { el.children.push(c); return c; },
    remove() {}, focus() {}, blur() {},
    querySelector() { return makeEl('q'); },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 800 }; },
  };
  let inner = '';
  Object.defineProperty(el, 'innerHTML', {
    get: () => inner,
    set: (v) => { inner = v; if (v === '') el.children.length = 0; },
  });
  return el;
}
function makeCanvasEl(w, h) {
  const c = makeEl('canvas');
  c.width = w; c.height = h;
  c.getContext = () => ctx2d;
  c.toDataURL = () => 'data:,';
  return c;
}

const byId = Object.create(null);
byId['game'] = makeCanvasEl(1280, 800);
byId['minimap'] = makeCanvasEl(264, 202);

globalThis.window = globalThis;
globalThis.document = {
  hidden: false,
  body: makeEl('body'),
  addEventListener() {}, removeEventListener() {},
  createElement: (tag) => (tag === 'canvas' ? makeCanvasEl(32, 32) : makeEl(tag)),
  getElementById: (id) => byId[id] || (byId[id] = makeEl(id)),
};
globalThis.innerWidth = 1280;
globalThis.innerHeight = 800;
globalThis.devicePixelRatio = 1;
const winListeners = Object.create(null);
globalThis.addEventListener = (t, fn) => { (winListeners[t] = winListeners[t] || []).push(fn); };
globalThis.removeEventListener = () => {};
let closeCount = 0;
globalThis.close = () => { closeCount++; }; // window.close() stub (screens.js attemptClose)
const key = (code) => { // synthetic keydown+keyup through the captured window listeners
  const e = { code, repeat: false, preventDefault() {} };
  (winListeners.keydown || []).forEach((f) => f(e));
  (winListeners.keyup || []).forEach((f) => f(e));
};
const winEvt = (type, e) => (winListeners[type] || []).forEach((f) => f(e));
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.localStorage = {
  _d: Object.create(null),
  getItem(k) { return k in this._d ? this._d[k] : null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; },
};
const raf = { cb: null };
globalThis.requestAnimationFrame = (fn) => { raf.cb = fn; return 1; };
globalThis.cancelAnimationFrame = () => {};

// ---------- replicate js/main.js boot() (audio excluded) ----------

const { CFG } = await import('../js/config.js');
const { Loop } = await import('../js/core/loop.js');
const { Input } = await import('../js/core/input.js');
const { Game } = await import('../js/core/game.js');
const { saveMeta, saveSelectedLevel } = await import('../js/core/meta.js');
const { buildCharacters } = await import('../js/art/characters.js');
const { buildItems, buildIcons, gemHeartFor } = await import('../js/art/items.js');
const { initHud } = await import('../js/ui/hud.js');
const { initScreens, saveScores } = await import('../js/ui/screens.js');
const { aliveCap } = await import('../js/entities/spawner.js');
const { getLevel } = await import('../js/world/levels.js');
const { clamp } = await import('../js/utils/math.js');
const { recomputeStats, cardOffers } = await import('../js/entities/player.js');
const { weaponCap } = await import('../js/net/coop.js');

const canvas = byId['game'];
const cvsEvt = (type, e) => (canvas._ls && canvas._ls[type] || []).slice().forEach((f) => f(e));
const ctx = canvas.getContext('2d', { alpha: false });
const mctx = byId['minimap'].getContext('2d');

const input = new Input(canvas, { joyBase: byId['joy-base'], joyKnob: byId['joy-knob'], dashBtn: byId['btn-dash'] });
const characters = buildCharacters();
const items = buildItems();
const icons = buildIcons();

// sprite-shape sanity (the key-mismatch class of bug that kills a live frame)
for (const k of Object.keys(CFG.enemies))
  assert(characters[k] && characters[k].frames.length > 0, `characters missing enemy "${k}"`);
assert(characters.player.idle.length > 0 && characters.player.run.length > 0, 'characters missing player frames');
for (const k of ['orb', 'bolt', 'boomerang', 'blade', 'bullet', 'bomb', 'flame', 'explosion', 'burn', 'blight'])
  assert(items[k], `items missing "${k}"`);
for (const lk of ['m01', 'm02', 'm03']) { // gem/heart are per-level now (13.10)
  const gh = gemHeartFor(lk);
  assert(gh.gem.width === 24 && gh.heart.width === 22, `gemHeartFor(${lk}) wrong sprite shape`);
}

let game;
const loop = new Loop({
  update: (dt) => game.update(dt),
  render: (dt) => {
    game.render(dt);
    hud.update();
    screens.update();
  },
});
game = new Game({ input, loop, ctx, mctx, characters, items });
game.bus.on('gem', () => gemEvents++); // 10.8 — gem pickup SFX event counter
const m02Banners = []; // 13.3 — run-3 boss banners (name-driven, per-level)
const m03Banners = []; // 13.5 — run-4 boss banners
game.bus.on('banner', (b) => { if (run === 3) m02Banners.push(b.text); if (run === 4) m03Banners.push(b.text); });
const hud = initHud(game);
const screens = initScreens(game, { icons });

const resize = () => {
  const w = globalThis.innerWidth, h = globalThis.innerHeight;
  const dpr = 1;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  game.resize(w, h);
};
resize();
loop.start();

// ---------- frame pump + user simulation ----------

let t = performance.now();
let run = 0;
let dbgT = -1e9;
let dbgHits = 0;
let dbgState = '';
let maxEnemies = 0;
let levelUps = 0;
let cardCursor = 0;
let paused = false;
let muted = false;
let keyPickDone = false;
let heartDone = false, heartAsserted = false, heartHp = 0, heartAt = 0;
let gemDone = false, gemAsserted = false, gemT0 = 0, gemEvents = 0; // 10.8 gem pickup SFX
let wandOffDone = false, wandOffAsserted = false, wandOffAt = 0, wandOffKills = 0, wandLv = 1;
let stickDone = false, stickUp = false, stickT = 0, stickX0 = 0;
let dashBtnDone = false, dashBtnAsserted = false;
let sawBullets = false, sawBombs = false, sawFlames = false;
let burnDone = false, burnAsserted = false, burnEnemy = null, burnKills = 0, burnAt = 0;
let dashIFrameStep = 0, dashIFrameHp0 = 0; // 0 = not started, 1 = in flight, 2 = done
let synActive = false, synDone = false, synRetries = 0;
let e107A = false, e107ADone = false, e107B = false, e107BDone = false; // 10.7 empty-pool guard E2E
let benchPhase = 0, benchStartT = 0; // 10.4 one-shot worst-case bench: 0=off · 1=measuring · 2=done
let bench = null;
let m02RunDone = false; // 13.3 — M02 real run one-shot
let m03RunDone = false; // 13.5 — M03 real run one-shot

function steer() {
  const st = game.state;
  maxEnemies = Math.max(maxEnemies, game.enemies.list.length);
  if (st === 'LEVELUP') {
    const cards = byId['cards'].children;
    assert(cards.length > 0, 'LEVELUP but no card elements built');
    levelUps++;
    if (synActive) {
      // 9.3a synergy E2E drives this draw (the generic auto-pick would steal it):
      // find blight in the draw; otherwise take any card and re-draw (bounded).
      const i = game.player.synergies.blight
        ? -1
        : game.cards.findIndex((c) => c.kind === 'synergy' && c.key === 'blight');
      if (i >= 0) {
        cards[i].click();
        assert(game.player.synergies.blight === 1, 'blight pick did not land in player.synergies');
      } else if (!game.player.synergies.blight) {
        assert(synRetries < 2, 'blight never appeared in the synergy draws');
        synRetries++;
        cards[0].click();
        game.levelupQueue = 1; // re-draw: the owned synergy leaves the pool
      } else {
        cards[0].click(); // blight owned; drain leftover queue card(s)
      }
      if (game.player.synergies.blight && game.state === 'PLAYING') {
        synDone = true;
        synActive = false;
        // E2E done — stop leveling (keeps the pump from cycling through the
        // leftover synergy draws).
        game.player.gainXp = () => 0;
      }
      return;
    }
    if (e107B) {
      // 10.7 (B) drives this pick: take the lone offer; the re-draw then hits
      // the empty pool (pickCard guard) → silently back to PLAYING.
      cards[0].click();
      return;
    }
    const missing = ['axe', 'garlic', 'blades', 'pistols', 'bombs', 'flame'].filter((k) => !game.player.weapons[k]);
    if (missing.length) {
      // startWeapons is ['wand'] — force the other weapons through the real
      // pickCard/applyCard pipeline (the click still goes through the card DOM).
      game.cards = missing.map((k) => ({ kind: 'weapon', key: k, level: 1 }));
      cards[0].click();
    } else if (!keyPickDone) {
      keyPickDone = true;
      key('Digit1'); // keyboard card pick: takeCardEdges → pickCard(0)
    } else {
      cards[cardCursor++ % cards.length].click();
    }
  }
  if (run === 1 && !heartDone && st === 'PLAYING' && game.t >= 3) {
    heartDone = true;
    heartHp = game.player.hp = Math.min(game.player.hp, 20);
    heartAt = game.t;
    game.pickups.heart(game.player.x, game.player.y);
  }
  // 10.8 — a forced gem collect must fire the pickup SFX bus event
  if (run === 1 && !gemDone && st === 'PLAYING' && game.t >= 2) {
    gemDone = true;
    gemT0 = game.t;
    game.pickups.gem(game.player.x, game.player.y, 10);
  }
  if (gemDone && !gemAsserted && game.t >= gemT0 + 0.08) {
    gemAsserted = true;
    assert(gemEvents > 0, 'gem pickup did not emit the gem bus event');
  }
  if (run === 1 && heartDone && !heartAsserted && st === 'PLAYING' && game.t >= heartAt + 0.08) {
    heartAsserted = true;
    assert(game.player.hp > heartHp, 'heart pickup did not heal');
  }
  if (run === 1) {
    // keep-alive for the standing window (mirrors run 2's guard): tests the
    // kill/level-up/heart/pause pipelines, not survival — death is forced
    // below through the real damage pipeline with iframes explicitly cleared.
    game.player.iframes = 1;
    if (!paused && game.t >= 8) {
      paused = true;
      byId['btn-pause'].click();
      assert(game.state === 'PAUSED', 'btn-pause did not pause');
      byId['btn-resume'].click();
      assert(game.state === 'PLAYING', 'btn-resume did not resume');
    }
    if (!muted) {
      muted = true;
      byId['set-mute'].click(); // consumed on next update → 'mute' → hud writes LS (13.8: Settings row)
    }
  }
  if (run === 2) {
    const p = game.player;
    // 9.5 dash i-frame E2E: needs a real, unmasked i-frame window, so the
    // keep-alive guard below is off while the 2-frame test is in flight.
    if (dashIFrameStep === 0 && st === 'PLAYING' && p.dashCd <= 0 && game.t >= 30) {
      p.dashT = 0; p.dashCd = 0; p.iframes = 0;
      assert(p.tryDash(1, 0), 'tryDash refused at t>=30 with dashCd<=0');
      dashIFrameStep = 1;
      dashIFrameHp0 = p.hp;
      assert(game.combat.damagePlayer(p, 5, p.x, p.y) === false, 'dash i-frame: damage landed at dash start');
      assert(p.hp === dashIFrameHp0, 'dash i-frame: hp changed at dash start');
    } else if (dashIFrameStep === 1) {
      assert(p.dashT > 0, 'dash ended before the mid-dash i-frame check');
      assert(p.iframes > 0, 'mid-dash: iframes not re-asserted by player.update');
      assert(game.combat.damagePlayer(p, 5, p.x, p.y) === false, 'dash i-frame: damage landed mid-dash');
      assert(p.hp === dashIFrameHp0, 'dash i-frame: hp changed mid-dash');
      dashIFrameStep = 2;
    }
    if (dashIFrameStep !== 1) {
      p.iframes = 1;
      if (p.hp < 50) p.hp = 50;
    }
    // 9.6c burn DoT: a fresh rat must die through the dpsTick pipeline (no flash/kb)
    if (!burnDone && st === 'PLAYING' && game.t >= 20) {
      burnDone = true; burnAt = game.t; burnKills = game.kills;
      burnEnemy = game.enemies.spawn('rat', p.x + 60, p.y);
      burnEnemy.burnT = 2; burnEnemy.burnDps = 50;
    }
    if (burnDone && !burnAsserted && game.t >= burnAt + 1) {
      burnAsserted = true;
      assert(burnEnemy.dead, 'burn DoT did not kill the rat');
      assert(game.kills > burnKills, 'burn DoT kill did not route through onKill');
    }
    const w = p.weapons;
    if (!wandOffDone && w.axe && w.garlic && w.blades && w.wand) {
      // all base weapons owned — kill the wand for 15s: the rest must still land kills
      wandOffDone = true; wandOffAt = game.t; wandOffKills = game.kills;
      wandLv = w.wand; w.wand = 0;
    }
    if (wandOffDone && !wandOffAsserted && game.t >= wandOffAt + 15) {
      wandOffAsserted = true;
      if (w.wand === 0) assert(game.kills > wandOffKills, 'other weapons never landed a kill while the wand was off');
      w.wand = Math.max(w.wand, wandLv);
    }
    // 9.6a/b/c — the three new weapons must actually produce their projectiles
    if (st === 'PLAYING') {
      if (!sawBullets && game.combat.bullets.length > 0) sawBullets = true;
      if (!sawBombs && game.combat.bombs.length > 0) sawBombs = true;
      if (!sawFlames && game.combat.flames.length > 0) sawFlames = true;
    }
    if (!stickDone && st === 'PLAYING' && game.t >= 60) {
      stickDone = true; stickT = game.t; stickX0 = p.x;
      // The world is seed-random and the t>=30 dash test leaves the player right
      // of the village — a seed can pin it against a hut so the right-steer window
      // makes 0 px of progress. No-op static colliders for the 1 s window so the
      // lane is deterministic; `delete` below restores the prototype method.
      game.world.collidersNear = () => [];
      cvsEvt('pointerdown', { pointerId: 7, clientX: 640, clientY: 400, pointerType: 'touch' });
      winEvt('pointermove', { pointerId: 7, clientX: 692, clientY: 400, pointerType: 'touch' });
    }
    if (stickDone && !stickUp && game.t >= stickT + 1) {
      winEvt('pointerup', { pointerId: 7, clientX: 692, clientY: 400, pointerType: 'touch' });
      stickUp = true;
      delete game.world.collidersNear;
      assert(p.x > stickX0 + 100, `touch stick did not steer right (dx=${(p.x - stickX0).toFixed(0)}px)`);
    }
    if (!dashBtnDone && st === 'PLAYING' && p.dashCd <= 0 && game.t >= 90) {
      dashBtnDone = true;
      (byId['btn-dash']._ls && byId['btn-dash']._ls.pointerdown || []).forEach((f) => f({ preventDefault() {} }));
    }
    if (dashBtnDone && !dashBtnAsserted && p.dashT > 0) {
      dashBtnAsserted = true;
      // 10.1 — the HUD dash indicator must carry the SAME live --cd fraction as the touch ring
      const cdHud = byId['btn-dash-hud'].style._props['--cd'];
      const cdTouch = byId['btn-dash'].style._props['--cd'];
      assert(cdHud === cdTouch && parseFloat(cdHud) > 0,
        `HUD dash --cd not driven (hud=${cdHud} touch=${cdTouch}, mid-dash expects equal + > 0)`);
    }
    // 9.3a synergy E2E setup: force every requirement to max so the offer pool
    // is exactly the 5 fused cards; the LEVELUP branch above then drives the
    // real draw/pick pipeline to hand out blight.
    if (!synActive && !synDone && st === 'PLAYING' && game.t >= 200) {
      for (const k of Object.keys(CFG.weapons)) p.weapons[k] = 5;
      for (const k of Object.keys(CFG.passives)) p.passives[k] = CFG.passives[k].max;
      p.synergies = {};
      synActive = true;
      game.levelupQueue = 1;
    }
    // 10.4 — one-shot worst-case multi-hit bench (5 s in-game window, run 2):
    // all 7 weapons L5 + all passives max + 5/5 synergies + aliveCap dummies
    // kept in a 150-450 px ring around the player (maxed weapons keep the
    // ring turning over → sustained mass-damage + mass-kill bursts). Logs
    // update vs render vs hud+screens ms — the 10.4 before/after contract.
    if (benchPhase === 0 && synDone && st === 'PLAYING' && game.t >= 205) {
      benchPhase = 1;
      for (const k of Object.keys(CFG.weapons)) p.weapons[k] = 5;
      for (const k of Object.keys(CFG.passives)) p.passives[k] = CFG.passives[k].max;
      p.synergies = {};
      for (const k of Object.keys(CFG.synergies)) p.synergies[k] = 1;
      recomputeStats(p);
      bench = {
        upd: 0, nUpd: 0, ren: 0, nRen: 0, dom: 0, sec: null, ops0: { ...drawOps },
        ou: game.update.bind(game), or: game.render.bind(game),
        oh: hud.update.bind(hud), os: screens.update.bind(screens),
      };
      game.update = (dt) => { const t0 = performance.now(); bench.ou(dt); bench.upd += performance.now() - t0; bench.nUpd++; };
      game.render = (dt) => { const t0 = performance.now(); bench.or(dt); bench.ren += performance.now() - t0; bench.nRen++; };
      hud.update = () => { const t0 = performance.now(); bench.oh(); bench.dom += performance.now() - t0; };
      screens.update = () => { const t0 = performance.now(); bench.os(); bench.dom += performance.now() - t0; };
      if (process.env.DEBUG_BOOT) {
        // opt-in section breakdown (DEBUG_BOOT=1): wrap the subsystem
        // sections inside update/render for the window only.
        bench.sec = {};
        const wrap = (key, obj, m) => {
          const fn = obj[m];
          const s = (bench.sec[key] = { t: 0, n: 0, obj, m, fn });
          obj[m] = function (...a) {
            const t0 = performance.now();
            const r = fn.apply(this, a);
            s.t += performance.now() - t0;
            s.n++;
            return r;
          };
        };
        wrap('u:player', game.player, 'update');
        wrap('u:spawns', game, '_spawns');
        wrap('u:enemies', game.enemies, 'update');
        wrap('u:combat', game.combat, 'update');
        wrap('u:pickups', game.pickups, 'update');
        wrap('u:particles', game.particles, 'update');
        wrap('u:snow', game.snow, 'update');
        wrap('u:camera', game.camera, 'update');
        wrap('r:world', game.world, 'drawBackground');
        wrap('r:pickups', game.pickups, 'draw');
        wrap('r:shadows', game.enemies, 'drawShadows');
        wrap('r:drawOne', game.enemies, 'drawOne');
        wrap('r:orbs', game.enemies, 'drawOrbs');
        wrap('r:combat', game.combat, 'draw');
        wrap('r:particles', game.particles, 'draw');
        wrap('r:lighting', game.lighting, 'draw');
        wrap('r:snow', game.snow, 'draw');
      }
      benchStartT = game.t;
      while (game.enemies.list.length < aliveCap(game.t)) benchSpawn();
    }
    if (benchPhase === 1) {
      while (game.enemies.list.length < aliveCap(game.t)) benchSpawn();
      if (game.t >= benchStartT + 5) {
        benchPhase = 2;
        game.update = bench.ou; game.render = bench.or;
        hud.update = bench.oh; screens.update = bench.os;
        if (bench.sec) {
          for (const s of Object.values(bench.sec)) s.obj[s.m] = s.fn;
          console.log(
            `[10.4-sec] ms/frame over the 5 s window (nRen=${bench.nRen}, nUpd=${bench.nUpd}): ` +
            Object.entries(bench.sec).map(([k, s]) => `${k}=${(s.t / bench.nRen).toFixed(3)}(x${s.n})`).join(' '),
          );
        }
        const ops = Object.keys(bench.ops0)
          .map((k) => `${k}=${((drawOps[k] - bench.ops0[k]) / bench.nRen).toFixed(1)}`)
          .join(' ');
        console.log(
          `[10.4-bench] 5 s worst-case (7 weapons L5 + passives max + 5/5 synergies, ${maxEnemies} enemies peak): ` +
          `update=${(bench.upd / bench.nUpd).toFixed(3)} ms/step (n=${bench.nUpd}) · ` +
          `render=${(bench.ren / bench.nRen).toFixed(3)} ms/frame (n=${bench.nRen}) · ` +
          `hud+screens=${(bench.dom / bench.nRen).toFixed(3)} ms/frame · ` +
          `ops/frame: ${ops}`,
        );
      }
    }
    // 10.7 — empty-pool softlock guard E2E (the bench left the roster all-max):
    // (A) queue=2 with an empty pool must never enter LEVELUP — the levels are
    // granted silently; (B) queue=2 with a one-card pool ({phoenix}) — the
    // pick's re-draw hits the empty pool and is silently absorbed.
    if (benchPhase === 2 && st === 'PLAYING' && game.t >= 215 && !e107ADone && !e107B) {
      if (!e107A) {
        e107A = true;
        game.levelupQueue = 2;
      } else if (game.levelupQueue === 0) {
        e107ADone = true;
        delete p.synergies.phoenix; // pool = exactly {phoenix}
        e107B = true;
        game.levelupQueue = 2;
      }
    }
    if (benchPhase === 2 && st === 'PLAYING' && e107B && game.levelupQueue === 0 && p.synergies.phoenix === 1) {
      e107B = false;
      e107BDone = true;
    }
  }
  if (run === 3 || run === 4) {
    // 13.3/13.5 — M02/M03 run: keep-alive so the run reaches the boss (t=240) + victory (t=300)
    const p = game.player;
    p.iframes = 1;
    if (p.hp < 50) p.hp = 50;
  }
  if (process.env.DEBUG_BOOT) {
    const p = game.player;
    const prevHp = p.hp;
    if (p.hp < prevHp) dbgHits++;
    if (game.state !== dbgState || game.t - dbgT >= 5) {
      dbgState = game.state;
      dbgT = game.t;
      let md = 1e9, msp = 0;
      for (const e of game.enemies.list) {
        md = Math.min(md, Math.hypot(e.x - p.x, e.y - p.y));
        msp = Math.max(msp, Math.hypot(e.vx, e.vy));
      }
      console.log(`[dbg] ${game.state} t=${game.t.toFixed(1)} hp=${p.hp.toFixed(0)}/${p.maxHp} dead=${p.dead} enemies=${game.enemies.list.length} hits=${dbgHits} minDist=${md === 1e9 ? '-' : md.toFixed(0)} maxSpd=${msp.toFixed(0)} p=(${p.x.toFixed(0)},${p.y.toFixed(0)})`);
    }
  }
}

// 10.4 bench: ring dummy around the player (mostly rats — cheap HP = constant
// mass-kill + onKill turnover; some wolves for speed variance).
function benchSpawn() {
  const p = game.player;
  const r = game.rng;
  const a = r() * 6.283185307;
  const d = 150 + r() * 300;
  const x = clamp(p.x + Math.cos(a) * d, CFG.world.margin, CFG.world.w - CFG.world.margin);
  const y = clamp(p.y + Math.sin(a) * d, CFG.world.margin, CFG.world.h - CFG.world.margin);
  game.enemies.spawn(r() < 0.7 ? 'rat' : 'wolf', x, y);
}

function pump(n) {
  for (let i = 0; i < n; i++) {
    t += 1000 / 60;
    const cb = raf.cb;
    assert(cb, `loop died (no rAF reschedule) at state=${game.state} t=${(t / 1000).toFixed(1)}s`);
    raf.cb = null;
    cb(t);
    steer();
  }
}

function pumpUntil(pred, frames) {
  for (let i = 0; i < frames; i++) {
    pump(1);
    if (pred()) return true;
  }
  return false;
}

// menu, then the user's exact action
pump(90);

// 13.7 — level select E2E (fresh LS: 0 wins → only m01 unlocked + selected)
{
  const ls = byId['level-select'];
  assert(ls.children.length === 3, `level select: expected 3 cards, got ${ls.children.length}`);
  const [c0, c1, c2] = ls.children;
  assert(c0.classList.contains('sel') && !c0.classList.contains('locked'), 'level select: m01 selected + unlocked by default');
  assert(c1.classList.contains('locked') && c2.classList.contains('locked'), 'level select: m02/m03 locked at 0 wins');
  assert(c0.children[1].textContent.includes('Evernight Wood'), 'level select: m01 card shows the level name');
  assert(c1.children[2].children[0].textContent.includes('Locked') && c1.children[2].children[0].textContent.includes('Evernight Wood'), 'level select: locked m02 shows the requirement');
  let denied = 0;
  game.bus.on('denied', () => denied++);
  c2.click(); // locked m03 → denied blip + shake, selection unchanged
  assert(denied === 1, 'level select: locked tap did not emit the denied blip');
  assert(game.selectedLevelKey === 'm01', 'level select: locked tap changed the selection');
  assert(c2.classList.contains('shake'), 'level select: locked tap did not shake the card');
  // Simulate 3 m01 wins → m02 unlocked; re-render via a scores-overlay round trip; select m02
  game.wins.m01 = 3;
  byId['btn-scores'].click(); pump(30);
  byId['btn-scores-back'].click(); pump(30);
  const [u0, u1, u2] = byId['level-select'].children;
  assert(!u1.classList.contains('locked'), 'level select: m02 not unlocked after 3\u00d7 m01 wins (re-render)');
  u1.click(); // select m02
  assert(game.selectedLevelKey === 'm02' && game.levelKey === 'm02', 'level select: selecting m02 did not set selection + backdrop');
  assert(localStorage.getItem(CFG.meta.levelKey) === 'm02', 'level select: m02 selection not persisted');
  assert(byId['level-select'].children[1].classList.contains('sel'), 'level select: m02 card not marked selected after re-render');
  // Restore a clean state so the existing run-1..run-4 flow is unaffected
  game.wins.m01 = 0; game.wins.m02 = 0; game.wins.m03 = 0;
  game.selectedLevelKey = 'm01';
  saveSelectedLevel(CFG.meta.levelKey, 'm01');
  game.previewLevel('m01');
  byId['btn-scores'].click(); pump(30);
  byId['btn-scores-back'].click(); pump(30);
  assert(byId['level-select'].children[0].classList.contains('sel') && byId['level-select'].children[1].classList.contains('locked'),
    'level select: reset state not restored (m01 sel + m02 locked expected)');
}

// 13.8 — view zoom + Pause-menu Settings E2E (harness is non-touch → desktop default 1.0)
{
  assert(game.zoom === CFG.zoom.full, 'zoom: desktop default is not full view (1.0)');
  assert(game.camera.w === 1280 && game.camera.h === 800, 'zoom: camera view not 1:1 with the canvas at default');
  byId['set-zoom'].click();
  assert(game.zoom === CFG.zoom.touch, 'zoom: Settings toggle did not switch to 0.80');
  assert(Math.abs(game.camera.w - 1600) < 1e-6 && Math.abs(game.camera.h - 1000) < 1e-6, 'zoom: camera view not enlarged to 1600×1000');
  assert(localStorage.getItem(CFG.zoom.key) === '0.8', 'zoom: 0.80 selection not persisted');
  byId['set-zoom'].click();
  assert(game.zoom === CFG.zoom.full && Math.abs(game.camera.w - 1280) < 1e-6, 'zoom: toggle back to 1.0 failed');
  assert(localStorage.getItem(CFG.zoom.key) === '1', 'zoom: 1.0 selection not persisted');
  byId['set-mute'].click(); pump(30);
  assert(localStorage.getItem(CFG.scores.muteKey) === '1', 'settings mute: toggle did not persist qsurv.mute');
  assert(byId['set-mute'].classList.contains('muted'), 'settings mute: row not marked muted');
  byId['set-mute'].click(); pump(30);
  assert(localStorage.getItem(CFG.scores.muteKey) === '0', 'settings mute: un-mute did not persist');
}

// 13.10 — per-level flavor: NEW MAP UNLOCKED banner (fires once when the cumulative-win
// threshold crosses) + game-over unlock-progress line. Synthetic victories via the real
// _gameOver path (state is MENU; the gameover screen + bus are the real ones).
{
  const unlockBanners = [];
  game.bus.on('banner', (b) => { if (b.text === 'NEW MAP UNLOCKED') unlockBanners.push(b); });
  game.wins.m01 = 2; // one win before the m02 unlock threshold (3×)
  game._gameOver(true);
  assert(unlockBanners.length === 1, '13.10: NEW MAP UNLOCKED banner did not fire at the 3rd m01 win');
  assert(game.wins.m01 === 3, '13.10: victory did not record the win');
  assert(byId['go-stats'].children.length === 12,
    '13.10: game-over screen expected 6 stat rows (5 + Unlocks)');
  assert(byId['go-stats'].children[11].textContent === 'The Drowned City — 0/3 wins',
    '13.10: game-over screen missing the unlock-progress line');
  byId['btn-go-menu'].click();
  pump(30);
  game._gameOver(true); // m03 still locked but nothing newly crossed → no second banner
  assert(unlockBanners.length === 1, '13.10: NEW MAP UNLOCKED fired again without a new unlock');
  byId['btn-go-menu'].click();
  pump(30);
  game.wins.m01 = 0; // restore clean state for the run-1..4 flow
  saveScores(CFG.scores.storageKey, [], CFG.scores.max); // keep the scores E2E clean
}

byId['btn-start'].click();
assert(game.state === 'PLAYING', 'btn-start click did not start the run');
assert(game.levelKey === 'm01', 'btn-start did not begin the selected level (m01)');

// run 1: stand still (keep-alive iframes in steer) → kills + level-up cards +
// heart/pause one-shots → force death through the real damage pipeline
// (balance-independent) → DYING slow-mo → GAMEOVER. Keep-alive is what makes
// this window seed- and balance-independent since the 10.5 spawn band: the
// swarm reaches the player from ~t=2 s, so survival is no longer a given.
run = 1;
pump(20 * 60);
assert(game.kills > 0, 'run 1: player never landed a kill (auto-weapons not firing?)');
assert(pumpUntil(() => game.state === 'PLAYING', 30 * 60), 'run 1: never returned to PLAYING');
game.player.iframes = 0;
game.player.hp = 1;
game.combat.damagePlayer(game.player, 5, game.player.x, game.player.y);
assert(game.state === 'DYING', `run 1: forced death did not enter DYING (state=${game.state})`);
assert(pumpUntil(() => game.state === 'GAMEOVER', 8 * 60), `run 1: expected death, got state=${game.state} t=${game.t.toFixed(1)}s`);
assert(!game.victory, 'run 1: death must not be a victory');

// meta flow: run 1's gameover must have persisted the Soulshards profile
assert(typeof JSON.parse(localStorage.getItem(CFG.meta.storageKey)).shards === 'number',
  'run 1 gameover did not save the meta profile');
// force a known wallet, then drive the real Upgrades screen
game.meta.shards = 50;
saveMeta(CFG.meta.storageKey, game.meta);
byId['btn-go-menu'].click();
pump(30);
assert(game.state === 'MENU', `btn-go-menu did not return to menu (state=${game.state})`);
byId['btn-upgrades'].click();
pump(30);
assert(byId['meta-list'].children.length === 5, 'Upgrades screen: expected 5 upgrade rows');
assert(byId['meta-shards'].textContent === '50', 'Upgrades screen: shard count not rendered');
const buyBtn = byId['meta-list'].children[0].children[2];
assert(buyBtn._upgKey === 'maxHp', 'first upgrade row is not maxHp');
buyBtn.click();
assert(game.meta.upgrades.maxHp === 1, 'buyMeta did not level up maxHp');
assert(game.meta.shards === 30, 'buyMeta did not deduct the 20-shard cost');
assert(JSON.parse(localStorage.getItem(CFG.meta.storageKey)).upgrades.maxHp === 1, 'meta purchase not persisted');
byId['btn-upgrades-back'].click();
pump(30);

// run 2: start from the menu (the flow no longer uses btn-retry), survive →
// boss at 4:00 → victory at 5:00
run = 2;
// re-arm run 2 one-shots (the menu gap ran steer() against run 1's dead player)
wandOffDone = wandOffAsserted = false; wandOffAt = 0; wandOffKills = 0; wandLv = 1;
stickDone = stickUp = false; stickT = 0; stickX0 = 0;
dashBtnDone = dashBtnAsserted = false;
sawBullets = sawBombs = sawFlames = false;
burnDone = burnAsserted = false; burnEnemy = null; burnKills = 0; burnAt = 0;
dashIFrameStep = 0; dashIFrameHp0 = 0;
synActive = synDone = false; synRetries = 0;
byId['btn-start'].click();
assert(game.state === 'PLAYING', 'btn-start click did not start run 2');
assert(game.player.maxHp === 120, 'meta maxHp upgrade not applied at run start (100 + 20 expected)');
// Pump UNTIL victory (capped), not a fixed frame count: with the 10.5 spawn
// band the keep-alive player farms XP near-continuously → back-to-back LEVELUP
// states freeze the clock, and the victory check (after the level-up return in
// _playingUpdate) only runs on no-XP frames — a fixed pump can stall just
// short of t=300. The cap is a livelock guard, not an expectation.
assert(pumpUntil(() => game.state === 'GAMEOVER' && game.victory, 20 * 60 * 60),
  `run 2: expected victory, got state=${game.state} t=${game.t.toFixed(1)}s`);
assert(game.bossSpawned, 'wraith boss never spawned');
assert(dashBtnDone && dashBtnAsserted, 'touch dash button never triggered a dash');

// high scores: both runs saved via the real gameover bus path, sorted desc
const lsScores = () => JSON.parse(localStorage.getItem(CFG.scores.storageKey) || '[]');
assert(lsScores().length === 2, `expected 2 saved score entries, got ${lsScores().length}`);
assert(lsScores()[0].score >= lsScores()[1].score, 'high scores not sorted desc');

// back to the menu
byId['btn-go-menu'].click();
pump(90);
assert(game.state === 'MENU', `btn-go-menu did not return to menu (state=${game.state})`);

// scores overlay: render saved entries → clear → back to menu
byId['btn-scores'].click();
pump(30);
assert(!byId['screen-scores'].classList.contains('hidden'), 'btn-scores did not open the scores screen');
assert(byId['scores-list'].children.length === lsScores().length, 'scores list row count mismatch');
byId['btn-clear-scores'].click();
pump(30);
assert(lsScores().length === 0, 'btn-clear-scores did not clear storage');
byId['btn-scores-back'].click();
pump(30);
assert(!byId['screen-menu'].classList.contains('hidden'), 'btn-scores-back did not return to the menu');

// quit flow: window.close() attempt + fallback quit screen + ack re-attempt
byId['btn-quit'].click();
pump(30);
assert(closeCount === 1 && !byId['screen-quit'].classList.contains('hidden'), 'btn-quit did not attempt close + fallback');
byId['btn-quit-ack'].click();
pump(30);
assert(closeCount >= 2, 'btn-quit-ack did not re-attempt close');

// 13.2 — M02 "Higan" menu backdrop (no real m02 run: weights land 13.3).
// toMenu() early-returns on MENU, so force the fallback (world.data null) branch.
game.state = 'GAMEOVER';
game.level = getLevel('m02');
game.levelKey = 'm02';
game.world.data = null;
game.toMenu();
pump(300);
assert(game.world.level.key === 'm02', 'm02 menu backdrop did not generate');
assert(game.world.decor.length > 100 && game.world.decor.every((d) => d.img), 'm02 menu backdrop: decor sprites unresolved');
assert(game.snow.kind === 'petal', 'm02 menu backdrop foreground is not petal');
assert(game.minimapBase, 'm02 minimap base missing');
// m01 regression: same dance returns the snow backdrop
game.state = 'GAMEOVER';
game.level = getLevel('m01');
game.levelKey = 'm01';
game.world.data = null;
game.toMenu();
pump(300);
assert(game.world.level.key === 'm01', 'm01 menu backdrop regression');
assert(game.snow.kind === 'snow', 'm01 menu backdrop foreground is not snow');

// 13.4 — M03 "The Drowned City" menu backdrop (no real m03 run: weights land 13.5).
// Render pump exercises the m03 sky (sun glow + godrays pass) + open-water schools.
game.state = 'GAMEOVER';
game.level = getLevel('m03');
game.levelKey = 'm03';
game.world.data = null;
game.toMenu();
pump(300);
assert(game.world.level.key === 'm03', 'm03 menu backdrop did not generate');
assert(game.world.decor.length > 100 && game.world.decor.every((d) => d.img && d.img.width === d.w && d.img.height === d.h), 'm03 menu backdrop: decor sprites unresolved or size mismatch');
assert(game.snow.kind === 'bubble', 'm03 menu backdrop foreground is not bubble');
assert(game.world.lakes.length === 3 && game.world.lakes.every((l) => l.img && l.koi === 5), 'm03 fish schools not wired');
assert(game.minimapBase, 'm03 minimap base missing');

// 13.3 — M02 "Higan" REAL run (13.3): m02 weights + Higan slot skins +
// ×1.25 stat tables + Ryū boss. btn-start → startRun() → last levelKey.
run = 3;
game.levelKey = 'm02';
byId['btn-start'].click();
assert(game.state === 'PLAYING', 'btn-start did not start the m02 run');
const m02Gem = game.pickups.gemImg;
assert(m02Gem && m02Gem.width === 24 && game.pickups.heartImg.width === 22,
  '13.10: pickup reskin (gem/heart) not applied at m02 run start');
assert(game.levelKey === 'm02' && game.level.diff === 1.25, 'm02 run did not take level m02 (diff 1.25)');
assert(game.enemies.diff === 1.25, 'm02 run: enemies.diff not wired');
for (const k of ['rat', 'bat', 'goblin', 'wolf', 'brute', 'cultist', 'ryu'])
  assert(game.enemies.defs[k] && game.enemies.defs[k].frames.length > 0, `m02 run: sprite set missing slot "${k}"`);
{
  const sp = game.world.playerStart;
  const sample = game.enemies.spawn('rat', sp.x, sp.y + 400);
  assert(sample.hp === 25 && sample.dmg === 10, 'm02 run: spawned stats not ×1.25 (25/10 expected)');
  sample.dead = true; // compacted on the next update; not a kill
}
assert(pumpUntil(() => game.bossSpawned, 20 * 60 * 60), `m02 run: Ryū never spawned (state=${game.state} t=${game.t.toFixed(1)}s)`);
const ryuBoss = game.enemies.list.find((e) => e.boss);
assert(ryuBoss && ryuBoss.type === 'ryu', 'm02 boss is not the Ryū');
assert(ryuBoss.hp === 3000 && ryuBoss.dmg === 35, 'Ryū stats not ×1.25 (3000/35 expected)');
assert(m02Banners.includes('RYŪ AWAKENS'), 'm02 boss banner did not name Ryū');
assert(pumpUntil(() => game.state === 'GAMEOVER' && game.victory, 20 * 60 * 60),
  `m02 run: expected victory, got state=${game.state} t=${game.t.toFixed(1)}s`);
assert(game.kills > 0, 'm02 run: no kills (m02 roster never spawned?)');
{
  const m02Scores = JSON.parse(localStorage.getItem('qsurv.hiscores.m02.v1') || '[]');
  assert(m02Scores.length === 1 && m02Scores[0].score === game.stats().score,
    '13.9: m02 victory score not saved to the m02 list');
}
m02RunDone = true;

// 13.5 — M03 "The Drowned City" REAL run (13.5): m03 weights + drowned slot skins +
// ×1.56 stat tables + Great White boss. btn-go-menu → btn-start → last levelKey.
run = 4;
byId['btn-go-menu'].click();
assert(game.state === 'MENU', 'm03 run: btn-go-menu did not return to menu');
game.levelKey = 'm03';
byId['btn-start'].click();
assert(game.state === 'PLAYING', 'btn-start did not start the m03 run');
assert(game.pickups.gemImg && game.pickups.gemImg !== m02Gem,
  '13.10: m03 run did not reskin the pickups');
assert(game.levelKey === 'm03' && game.level.diff === 1.56, 'm03 run did not take level m03 (diff 1.56)');
assert(game.enemies.diff === 1.56, 'm03 run: enemies.diff not wired');
for (const k of ['rat', 'bat', 'goblin', 'wolf', 'brute', 'cultist', 'shark'])
  assert(game.enemies.defs[k] && game.enemies.defs[k].frames.length > 0, `m03 run: sprite set missing slot "${k}"`);
{
  const sp = game.world.playerStart;
  const sample = game.enemies.spawn('rat', sp.x, sp.y + 400);
  assert(Math.abs(sample.hp - 31.2) < 1e-9 && sample.dmg === 12.48, 'm03 run: spawned stats not ×1.56 (31.2/12.48 expected)');
  sample.dead = true; // compacted on the next update; not a kill
}
assert(pumpUntil(() => game.bossSpawned, 20 * 60 * 60), `m03 run: Great White never spawned (state=${game.state} t=${game.t.toFixed(1)}s)`);
const sharkBoss = game.enemies.list.find((e) => e.boss);
assert(sharkBoss && sharkBoss.type === 'shark', 'm03 boss is not the Great White');
assert(sharkBoss.hp === 3744 && sharkBoss.dmg === 43.68, 'Great White stats not ×1.56 (3744/43.68 expected)');
assert(m03Banners.includes('THE GREAT WHITE AWAKENS'), 'm03 boss banner did not name the Great White');
assert(pumpUntil(() => game.state === 'GAMEOVER' && game.victory, 20 * 60 * 60),
  `m03 run: expected victory, got state=${game.state} t=${game.t.toFixed(1)}s`);
assert(game.kills > 0, 'm03 run: no kills (m03 roster never spawned?)');
{
  const m03Scores = JSON.parse(localStorage.getItem('qsurv.hiscores.m03.v1') || '[]');
  assert(m03Scores.length === 1 && m03Scores[0].score === game.stats().score,
    '13.9: m03 victory score not saved to the m03 list');
}
m03RunDone = true;

// 11.1 — co-op transport E2E: the real serve.mjs (WS upgrade + frame codec +
// room relay) on an ephemeral loopback port, driven by native WebSocket clients
// (Node 22+). Ephemeral port 0 — the only fixed port stays 47893 (serve.mjs).
{
  const { createGameServer, attachCoopRoom } = await import('../tools/serve.mjs');
  const srv = createGameServer();
  attachCoopRoom(srv);
  await new Promise((res) => srv.listen(0, '127.0.0.1', res));
  const url = `ws://127.0.0.1:${srv.address().port}`;
  const clients = [];
  const mk = () => {
    const c = { w: new WebSocket(url), msgs: [] };
    c.opened = new Promise((res, rej) => {
      c.w.addEventListener('open', res);
      c.w.addEventListener('error', () => rej(new Error('11.1 E2E: ws connect failed')));
    });
    c.w.addEventListener('message', (ev) => { c.msgs.push(JSON.parse(String(ev.data))); });
    // Poll the inbox (not event-queued): WS frames can be delivered batched,
    // so a wait registered between awaits must still see earlier messages.
    c.wait = (pred, what, ms = 3000) => new Promise((res, rej) => {
      const t0 = Date.now();
      const to = setInterval(() => {
        const i = c.msgs.findIndex(pred);
        if (i !== -1) { clearInterval(to); const [m] = c.msgs.splice(i, 1); res(m); }
        else if (Date.now() - t0 > ms) { clearInterval(to); rej(new Error('11.1 E2E timeout: ' + what)); }
      }, 5);
    });
    c.send = (m) => c.w.send(JSON.stringify(m));
    clients.push(c);
    return c;
  };
  const a = mk(), b = mk(), d = mk();
  await Promise.all([a, b, d].map((c) => c.opened));
  a.send({ t: 'hello', levelKey: 'm01', profile: { maxHpBonus: 20 } });
  const ja = await a.wait((m) => m.t === 'joined', 'a joined');
  assert(ja.seat === 0 && ja.n === 1 && ja.levelKey === 'm01', '11.1: first client must be host seat 0 of the m01 room');
  b.send({ t: 'hello', levelKey: 'm01' });
  const jb = await b.wait((m) => m.t === 'joined', 'b joined');
  assert(jb.seat === 1 && jb.n === 2, '11.1: second client seat 1, n=2');
  const ro = await a.wait((m) => m.t === 'roster' && m.ids.length === 2, 'a roster after b');
  assert(ro.levelKey === 'm01', '11.1: roster carries the room level key');
  d.send({ t: 'hello' });
  const jd = await d.wait((m) => m.t === 'joined', 'd joined');
  assert(jd.seat === 2 && jd.n === 3, '11.1: third client seat 2, n=3');
  const e = mk();
  await e.opened;
  e.send({ t: 'hello' });
  const je = await e.wait((m) => m.t === 'joined', 'e joined');
  assert(je.seat === 3 && je.n === 4, '11.1: fourth client fills the room');
  const g = mk();
  await g.opened;
  g.send({ t: 'hello' });
  await g.wait((m) => m.t === 'full', 'fifth client rejected full');
  b.w.close();
  await a.wait((m) => m.t === 'left', 'a notified of b leave');
  await a.wait((m) => m.t === 'roster' && m.ids.length === 3, 'a roster after b leave');
  a.w.close();
  await d.wait((m) => m.t === 'closed' && m.reason === 'host-leave', 'd notified of host leave');
  const f = mk();
  await f.opened;
  f.send({ t: 'hello', levelKey: 'm02' });
  const jf = await f.wait((m) => m.t === 'joined', 'f joined fresh room');
  assert(jf.seat === 0 && jf.levelKey === 'm02', '11.1: room re-opens after close (new run)');
  for (const c of clients) c.w.close();
  await new Promise((res) => { srv.closeAllConnections?.(); srv.close(res); });
}

// 11.2 — host-authoritative sync E2E: real serve.mjs relay + three Game
// instances (host + 2 clients) over native WS. The host runs the 60 Hz sim
// for all players; clients render host snapshots (no local sim).
{
  const { createGameServer, attachCoopRoom } = await import('../tools/serve.mjs');
  const { profileFromMeta } = await import('../js/net/coop.js');
  const srv = createGameServer();
  attachCoopRoom(srv);
  await new Promise((res) => srv.listen(0, '127.0.0.1', res));
  const url = `ws://127.0.0.1:${srv.address().port}`;
  const raws = [];
  const mkRaw = () => {
    const c = { w: new WebSocket(url), msgs: [] };
    c.opened = new Promise((res) => { c.w.addEventListener('open', res); c.w.addEventListener('error', () => res()); });
    c.w.addEventListener('message', (ev) => c.msgs.push(JSON.parse(String(ev.data))));
    c.wait = (pred, what, ms = 4000) => new Promise((res, rej) => {
      const t0 = Date.now();
      const to = setInterval(() => {
        const i = c.msgs.findIndex(pred);
        if (i !== -1) { clearInterval(to); res(c.msgs.splice(i, 1)[0]); }
        else if (Date.now() - t0 > ms) { clearInterval(to); rej(new Error('11.2 E2E timeout: ' + what)); }
      }, 5);
    });
    c.send = (m) => c.w.send(JSON.stringify(m));
    raws.push(c);
    return c;
  };
  const rawA = mkRaw(), rawB = mkRaw(), rawC = mkRaw();
  await Promise.all([rawA, rawB, rawC].map((c) => c.opened));

  const dummyLoop = { timescale: 1, hitStop() {} };
  const mkGame = () => {
    const g = new Game({
      input: new Input(canvas, { joyBase: byId['joy-base'], joyKnob: byId['joy-knob'], dashBtn: byId['btn-dash'] }),
      loop: dummyLoop, ctx: makeCtx(), mctx, characters, items,
    });
    g.resize(1280, 800);
    return g;
  };
  const hostG = mkGame(), c1G = mkGame(), c2G = mkGame();
  // Mirror of CoopConn over a raw socket (attachNet is browser-only: location + native WS).
  const wire = (g, raw) => {
    const conn = {
      onMessage: null,
      send: (o) => raw.send(o),
      close: () => raw.w.close(),
      sendInput: (mx, my, dash) => raw.send({ t: 'input', mx, my, dash }),
      sendState: (id, body) => raw.send(Object.assign({ t: 'state' }, body, { id })),
      sendRunStart: (id, seed, levelKey) => raw.send({ t: 'runstart', id, seed, levelKey }),
      sendClosed: (reason) => raw.send({ t: 'closed', reason }),
    };
    raw.w.addEventListener('message', (ev) => { const m = JSON.parse(String(ev.data)); conn.onMessage && conn.onMessage(m); });
    g.net = conn;
    g.net.onMessage = (m) => g._netMsg(m);
  };
  wire(hostG, rawA); wire(c1G, rawB); wire(c2G, rawC);

  rawA.send({ t: 'hello', levelKey: 'm01', profile: profileFromMeta(hostG.meta) });
  const jA = await rawA.wait((m) => m.t === 'joined', 'host joined');
  assert(jA.seat === 0, '11.2: first joiner is host seat 0');
  rawB.send({ t: 'hello', levelKey: 'm01', profile: profileFromMeta(c1G.meta) });
  await rawB.wait((m) => m.t === 'joined', 'c1 joined');
  rawC.send({ t: 'hello', levelKey: 'm01', profile: profileFromMeta(c2G.meta) });
  await rawC.wait((m) => m.t === 'joined', 'c2 joined');
  const ro = await rawA.wait((m) => m.t === 'roster' && m.players.length === 3, 'host roster 3');
  assert(ro.ids.length === 3, '11.2: roster carries ids + per-seat profiles');

  hostG.startRun('m01');
  assert(hostG.netRole === 'host' && hostG.players.length === 3, '11.2: host sim owns all 3 players');
  assert(Math.abs(hostG.enemies.coopS - 1.66) < 1e-9, '11.3: 3P host run arms coopS = coopScale(3) = 1.66');
  const rs1 = await rawB.wait((m) => m.t === 'runstart', 'c1 runstart');
  const rs2 = await rawC.wait((m) => m.t === 'runstart', 'c2 runstart');
  assert(rs1.seed === rs2.seed && typeof rs1.seed === 'number' && rs1.levelKey === 'm01',
    '11.2: runstart carries the shared seed + level key');
  const DT = 1 / 60;
  const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
  // Pump before the state wait: the host only broadcasts state inside
  // update(); yield to the event loop so the WS round trip completes.
  for (let i = 0; i < 30; i++) {
    hostG.update(DT); c1G.update(DT); c2G.update(DT);
    if (i % 10 === 9) await tick();
  }
  await rawB.wait((m) => m.t === 'state' && m.players.length === 3, 'c1 first state');
  assert(c1G.state === 'PLAYING' && c2G.state === 'PLAYING', '11.2: clients enter the run without local sim');
  assert(c1G.world.W === hostG.world.W && c1G.world.H === hostG.world.H && c1G.remote.length === 2,
    '11.2: shared seed → same world; client holds 2 remote render players');

  // Pump 25 s of sim: spawns kick in, state flows, client tracks the host.
  // Yield to the event loop periodically: a sync pump blocks the WS round-trip.
  let lastSt = null, enemySeen = 0;
  const stWatch = (m) => { if (m.t === 'state') { lastSt = m; enemySeen = Math.max(enemySeen, m.enemies.length); } };
  rawB.w.addEventListener('message', (ev) => stWatch(JSON.parse(String(ev.data))));
  // 11.3 density keeps the idle seats alive (and the host off the LEVELUP screen)
  // so the E2E exercises sync, not death/cards.
  const keepAlive = () => {
    for (const p of hostG.players) if (p.dead || p.hp < p.maxHp * 0.5) { p.dead = false; p.hp = p.maxHp; p.iframes = 5; }
    if (hostG.state === 'LEVELUP') hostG.pickCard(0);
  };
  for (let i = 0; i < 1500; i++) {
    keepAlive();
    hostG.update(DT);
    c1G.update(DT);
    c2G.update(DT);
    if (i % 30 === 29) await tick();
  }
  await tick();
  assert(enemySeen > 0, '11.2: no enemies in the host state after 25 s of sim');
  const S3 = hostG.enemies.coopS;
  assert(hostG.enemies.list.some((e) => !e.boss)
    && hostG.enemies.list.every((e) => e.boss || Math.abs(e.maxHp - CFG.enemies[e.type].hp * S3) < 1e-6),
    '11.3: 3P host spawn — every non-boss enemy maxHp = base × coopScale(3) (boss same ramp, Q7)');
  assert(lastSt.v === 1 && lastSt.step > 100 && lastSt.score >= 0,
    '11.2: state relayed with v/step fields (relay passthrough)');
  assert(c1G.enemies.list.length > 0, '11.2: client applied enemy snapshots');
  const seat1 = hostG.players[1]; // c1G is seat 1 (join order)
  // Knockback transients (1.66× more hits at 3P, 11.3): poll until the lagged
  // client interp converges on the host's seat-1 position (2 s sim ≫ decay).
  let tracked = false;
  for (let i = 0; i < 120; i++) {
    keepAlive();
    hostG.update(DT); c1G.update(DT); c2G.update(DT);
    if (i % 30 === 29) await tick();
    if (Math.abs(c1G.player.x - seat1.x) < 0.6 && Math.abs(c1G.player.y - seat1.y) < 0.6) { tracked = true; break; }
  }
  assert(tracked, '11.2: client-local position tracks the host within r1 + interp');
  const hpx = hostG.players[1].x;
  // Real input path: keydown (no keyup) reaches every Input on the window —
  // client B's _clientUpdate sends axes(1,0) to the host each step.
  (winListeners.keydown || []).forEach((f) => f({ code: 'KeyD', repeat: false, preventDefault() {} }));
  for (let i = 0; i < 90; i++) {
    keepAlive();
    hostG.update(DT); c1G.update(DT); c2G.update(DT);
    if (i % 30 === 29) await tick();
  }
  (winListeners.keyup || []).forEach((f) => f({ code: 'KeyD', repeat: false, preventDefault() {} }));
  await tick();
  assert(hostG.players[1].x > hpx + 1,
    `11.2: client input drives the host remote player (state=${hostG.state} dead=${seat1.dead} hp=${seat1.hp} dx=${(seat1.x - hpx).toFixed(2)})`);

  // 11.4 leash: teleport c2's seat 1.5×leashR from the host player → the host
  // sim pulls every pairwise distance back ≤ leashR (convergence poll —
  // residual decel + keepAlive revives add drift; the leash itself converges
  // in 1–2 frames).
  const s3 = hostG.players[2];
  s3.x = hostG.player.x + CFG.coop.leashR * 1.5;
  s3.y = hostG.player.y + CFG.coop.leashR * 0.75;
  let leashed = false;
  for (let i = 0; i < 120; i++) {
    keepAlive();
    hostG.update(DT); c1G.update(DT); c2G.update(DT);
    if (i % 30 === 29) await tick();
    const ps = hostG.players;
    leashed = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) <= CFG.coop.leashR + 1e-6
      && Math.hypot(ps[0].x - ps[2].x, ps[0].y - ps[2].y) <= CFG.coop.leashR + 1e-6
      && Math.hypot(ps[1].x - ps[2].x, ps[1].y - ps[2].y) <= CFG.coop.leashR + 1e-6;
    if (leashed) break;
  }
  assert(leashed, '11.4: co-op leash — all pairwise player distances held ≤ CFG.coop.leashR after a 1.5R teleport');

  // 11.5 level-up scoping + weapon exclusivity (live 3P run: per-player cap = 3).
  if (hostG.state === 'LEVELUP') hostG.pickCard(0);
  assert(weaponCap(hostG.players.length) === 3, '11.5: 3P equip cap = 3 standard weapons per player');
  // Deterministic baseline: the pump's rng picks (and the forced picks below, which
  // bypass the offer-level cap) must not leak into this section — every player back
  // to the starting wand, ownership map cleared.
  hostG.weaponOwner = {};
  for (const p of hostG.players) p.weapons = { wand: 1 };
  // Host (local) player picks a NEW weapon through the real pick path.
  hostG.levelupQueue = 1;
  hostG.state = 'LEVELUP';
  hostG.cards = [{ kind: 'weapon', key: 'garlic', level: 1 }, { kind: 'passive', key: 'speed', level: 1 }];
  hostG.pickCard(0);
  assert(hostG.player.weapons.garlic === 1 && hostG.weaponOwner.garlic === hostG.player,
    '11.5: first picker owns the weapon (host pick registered)');
  assert(!hostG._ownerExclusion(hostG.player).has('garlic'), '11.5: owner keeps their own upgrades (no self-exclusion)');
  const pl1 = hostG.players[1];
  assert(pl1 && hostG._ownerExclusion(pl1).has('garlic'), '11.5: other players\' offers exclude the owned weapon');
  // Per-picker isolation: the host\'s passive pick must not touch the remote\'s dicts.
  const pl1Passives0 = { ...pl1.passives };
  const pl1Before = JSON.stringify(pl1Passives0);
  hostG.levelupQueue = 1;
  hostG.state = 'LEVELUP';
  hostG.cards = [{ kind: 'passive', key: 'dmg', level: 1 }];
  hostG.pickCard(0);
  assert(hostG.player.passives.dmg >= 1 && JSON.stringify(pl1.passives) === pl1Before,
    '11.5: picks affect only the picker (remote passives untouched)');
  // Remote auto-pick through the real path: passives maxed → no passive candidates; the
  // host-owned garlic can never be offered; any new-weapon pick registers pl1 as owner.
  pl1.passives = { speed: 3, hp: 3, dmg: 5, magnet: 3, regen: 3 };
  const pl1Owned0 = { ...pl1.weapons };
  hostG._remoteLevelUps(pl1, 1);
  const gained = Object.keys(pl1.weapons).filter((k) => (pl1.weapons[k] || 0) > (pl1Owned0[k] || 0));
  assert(!gained.includes('garlic'), '11.5: owned weapon never auto-picked for a remote');
  // Ownership is asserted for true first-picks only: the starting wand
  // (CFG.player.startWeapons) is granted at reset by nobody, so upgrades to
  // pre-owned weapons never register an owner.
  for (const k of gained) if (!(pl1Owned0[k] || 0) > 0) assert(hostG.weaponOwner[k] === pl1, `11.5: remote first-pick owns ${k}`);
  pl1.passives = pl1Passives0; recomputeStats(pl1); // restore the live sim
  for (const p of hostG.players) assert(Object.keys(p.weapons).length <= 3, '11.5: cap respected (≤3 standard weapons, 3P)');

  // Leave: c2 drops → roster reconciles on the host; run continues (host + c1 alive).
  rawC.w.close();
  const ro2 = await rawA.wait((m) => m.t === 'roster' && m.players.length === 2, 'host roster after c2 leave');
  assert(ro2.players.length === 2, '11.2: roster shrinks after leave');
  await new Promise((res) => setTimeout(res, 60));
  assert(hostG.players.length === 2 && hostG.players[2] === undefined, '11.2: host drops the leaver from the sim');
  assert(hostG.state === 'PLAYING' && c1G.state === 'PLAYING', '11.2: run continues after a leaver');
  for (const c of raws) c.w.close();
  await new Promise((res) => { srv.closeAllConnections?.(); srv.close(res); });
}

// self-verification: every one-shot path above must have actually fired
assert(keyPickDone, 'keyboard card pick never exercised');
assert(heartDone && heartAsserted, 'heart pickup path never exercised');
assert(wandOffDone && wandOffAsserted, 'wand-off kill window never exercised');
assert(sawBullets && sawBombs && sawFlames, 'new-weapon projectiles (bullets/bombs/flames) never observed');
assert(burnDone && burnAsserted, 'burn DoT kill path never exercised');
assert(dashIFrameStep === 2, 'dash i-frame E2E never completed');
assert(synDone, 'synergy E2E (blight) never completed');
assert(e107ADone && e107BDone, '10.7 empty-pool guard E2E never completed');
assert(gemDone && gemAsserted, 'gem pickup SFX event never exercised');
assert(benchPhase === 2, '10.4 worst-case bench never completed');
assert(stickDone && stickUp, 'touch stick path never exercised');
assert(m02RunDone, 'm02 real run (13.3) never completed');
assert(m03RunDone, 'm03 real run (13.5) never completed');
assert(JSON.parse(localStorage.getItem(CFG.scores.storageKey) || '[]').length === 0,
  '13.9: m01 score list mutated by m02/m03 runs (cleared earlier; no cross-level leakage)');

console.log(
  `PASS boot-sim — runs=4 (death + victory + m02 + m03) · level-ups=${levelUps} · max enemies alive=${maxEnemies} · ` +
  `meta: gameover shards saved → Upgrades buy → maxHp 120 at run start · ` +
  `boss spawned · pause/resume + mute · card pick via click + key 1 · all 7 weapons (wand-off kill window) · ` +
  `pistols/bombs/flame projectiles · burn DoT kill · dash i-frame E2E · synergy E2E (blight) · 10.7 empty-pool guard (entry + mid-queue) · heart heal · gem pickup SFX (10.8) · ` +
  `touch stick + dash button · HUD dash --cd driven (10.1) · level select (13.7: 3 cards, locked denied blip + shake, select → backdrop preview + persist) · zoom + Settings (13.8: 0.80↔1.0 persist, Settings mute) · per-level flavor (13.10: NEW MAP UNLOCKED once-at-threshold + unlock-progress line + pickup reskin m02/m03) · scores save/render/clear + per-level lists (13.9: m02/m03 victory → own key, m01 untouched) · quit flow · M02 backdrop (13.2) + m02 real run: Higan skins, ×1.25 stats, Ryū boss (13.3) · M03 backdrop (13.4: sun glow + godrays + fish schools + bubbles) + m03 real run: drowned skins, ×1.56 stats, Great White boss (13.5) · 11.1 co-op transport E2E (real serve.mjs WS room on ephemeral port: host join / seats / full / leave+roster / host-leave close / room re-open) · 11.2/11.3 sync E2E (host+2 clients: shared seed, client tracking, input drive, leave→roster reconcile, ×1.66 spawn) + 11.4 leash (1.5R teleport → pairwise ≤ leashR) + 11.5 exclusivity (first-pick ownership, remote exclusion, per-picker picks, 3P cap) · loop alive throughout`,
);
