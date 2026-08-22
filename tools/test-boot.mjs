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
// Ryū boss banner/spawn → victory 5:00).
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
const { saveMeta } = await import('../js/core/meta.js');
const { buildCharacters } = await import('../js/art/characters.js');
const { buildItems, buildIcons } = await import('../js/art/items.js');
const { initHud } = await import('../js/ui/hud.js');
const { initScreens } = await import('../js/ui/screens.js');
const { aliveCap } = await import('../js/entities/spawner.js');
const { getLevel } = await import('../js/world/levels.js');
const { clamp } = await import('../js/utils/math.js');
const { recomputeStats } = await import('../js/entities/player.js');

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
for (const k of ['gem', 'heart', 'orb', 'bolt', 'boomerang', 'blade', 'bullet', 'bomb', 'flame', 'explosion', 'burn', 'blight'])
  assert(items[k], `items missing "${k}"`);

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
game.bus.on('banner', (b) => { if (run === 3) m02Banners.push(b.text); });
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
      byId['btn-mute'].click(); // consumed on next update → 'mute' → hud writes LS
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
  if (run === 3) {
    // 13.3 — M02 run: keep-alive so the run reaches the Ryū (t=240) + victory (t=300)
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
byId['btn-start'].click();
assert(game.state === 'PLAYING', 'btn-start click did not start the run');

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
m02RunDone = true;

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

console.log(
  `PASS boot-sim — runs=3 (death + victory + m02) · level-ups=${levelUps} · max enemies alive=${maxEnemies} · ` +
  `meta: gameover shards saved → Upgrades buy → maxHp 120 at run start · ` +
  `boss spawned · pause/resume + mute · card pick via click + key 1 · all 7 weapons (wand-off kill window) · ` +
  `pistols/bombs/flame projectiles · burn DoT kill · dash i-frame E2E · synergy E2E (blight) · 10.7 empty-pool guard (entry + mid-queue) · heart heal · gem pickup SFX (10.8) · ` +
  `touch stick + dash button · HUD dash --cd driven (10.1) · scores save/render/clear · quit flow · M02 backdrop (13.2) + m02 real run: Higan skins, ×1.25 stats, Ryū boss (13.3) · M03 backdrop (13.4: sun glow + godrays + fish schools + bubbles) · loop alive throughout`,
);
