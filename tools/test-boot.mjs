// tools/test-boot.mjs — Node repro of the browser boot + full runs.
//
// Stubs a minimal DOM/canvas (canvas APIs validated like a real browser:
// arc/ellipse/gradients throw on bad radii), replicates js/main.js boot()
// (audio excluded — verified safe by review: every path no-ops pre-ctx), then
// pumps the real Loop via a stubbed requestAnimationFrame and simulates the
// user's path: btn-start click → run 1 (stand still → level-up cards → heart
// pickup → forced death → btn-retry) → run 2 (kept alive → all 4 weapons via
// forced card picks → wand-off kill window → touch stick + dash button →
// wraith boss at 4:00 → victory at 5:00) → btn-go-menu → scores overlay
// (render/clear/back) → quit flow (window.close stub + fallback screen).
// Catches first-frame/wired-up runtime crashes the pure-logic tests cannot
// see, and drives paths the happy-path sim never hit: keyboard card picks,
// non-start weapons, heart heal, mobile stick/dash, score persistence, quit.
//
// Usage: node tools/test-boot.mjs — exit 0 = PASS.

import assert from 'node:assert';

// ---------- browser stubs (must exist before js/ functions execute) ----------

const grad = { addColorStop() {} };
class IndexSizeError extends Error {
  constructor() { super('IndexSizeError'); this.name = 'IndexSizeError'; }
}
const okR = (v) => Number.isFinite(v) && v >= 0;

function makeCtx() {
  return new Proxy({}, {
    get(_, p) {
      if (p === 'canvas') return { width: 1, height: 1 };
      if (p === 'createRadialGradient') return (x0, y0, r0, x1, y1, r1) => {
        if (!okR(r0) || !okR(r1)) throw new IndexSizeError();
        return grad;
      };
      if (p === 'createLinearGradient') return () => grad;
      if (p === 'arc') return (...a) => { if (a.length < 3 || a.length > 6) throw new TypeError('arc: ' + a.length + ' args'); if (!okR(a[2])) throw new IndexSizeError(); };
      if (p === 'ellipse') return (...a) => { if (a.length !== 7) throw new TypeError('ellipse: ' + a.length + ' args, 7 required'); if (!okR(a[2]) || !okR(a[3])) throw new IndexSizeError(); };
      if (p === 'measureText') return () => ({ width: 8 });
      if (p === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h) * 4), width: w, height: h });
      if (typeof p === 'string') return () => undefined;
      return undefined;
    },
    set() { return true; },
  });
}
const ctx2d = makeCtx();

function makeEl(tag = 'div') {
  const el = {
    tag,
    style: { setProperty() {} },
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
const { buildCharacters } = await import('../js/art/characters.js');
const { buildItems, buildIcons } = await import('../js/art/items.js');
const { initHud } = await import('../js/ui/hud.js');
const { initScreens } = await import('../js/ui/screens.js');

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
for (const k of ['gem', 'heart', 'orb', 'bolt', 'boomerang', 'blade'])
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
let wandOffDone = false, wandOffAsserted = false, wandOffAt = 0, wandOffKills = 0, wandLv = 1;
let stickDone = false, stickUp = false, stickT = 0, stickX0 = 0;
let dashBtnDone = false, dashBtnAsserted = false;

function steer() {
  const st = game.state;
  maxEnemies = Math.max(maxEnemies, game.enemies.list.length);
  if (st === 'LEVELUP') {
    const cards = byId['cards'].children;
    assert(cards.length > 0, 'LEVELUP but no card elements built');
    levelUps++;
    const missing = ['axe', 'garlic', 'blades'].filter((k) => !game.player.weapons[k]);
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
  if (run === 1 && heartDone && !heartAsserted && st === 'PLAYING' && game.t >= heartAt + 0.08) {
    heartAsserted = true;
    assert(game.player.hp > heartHp, 'heart pickup did not heal');
  }
  if (run === 1) {
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
    p.iframes = 1;
    if (p.hp < 50) p.hp = 50;
    const w = p.weapons;
    if (!wandOffDone && w.axe && w.garlic && w.blades && w.wand) {
      // all four weapons owned — kill the wand for 15s: kills must still happen
      wandOffDone = true; wandOffAt = game.t; wandOffKills = game.kills;
      wandLv = w.wand; w.wand = 0;
    }
    if (wandOffDone && !wandOffAsserted && game.t >= wandOffAt + 15) {
      wandOffAsserted = true;
      if (w.wand === 0) assert(game.kills > wandOffKills, 'non-start weapons (axe/garlic/blades) never landed a kill');
      w.wand = Math.max(w.wand, wandLv);
    }
    if (!stickDone && st === 'PLAYING' && game.t >= 60) {
      stickDone = true; stickT = game.t; stickX0 = p.x;
      cvsEvt('pointerdown', { pointerId: 7, clientX: 640, clientY: 400, pointerType: 'touch' });
      winEvt('pointermove', { pointerId: 7, clientX: 692, clientY: 400, pointerType: 'touch' });
    }
    if (stickDone && !stickUp && game.t >= stickT + 1) {
      winEvt('pointerup', { pointerId: 7, clientX: 692, clientY: 400, pointerType: 'touch' });
      stickUp = true;
      assert(p.x > stickX0 + 100, `touch stick did not steer right (dx=${(p.x - stickX0).toFixed(0)}px)`);
    }
    if (!dashBtnDone && st === 'PLAYING' && p.dashCd <= 0 && game.t >= 90) {
      dashBtnDone = true;
      (byId['btn-dash']._ls && byId['btn-dash']._ls.pointerdown || []).forEach((f) => f({ preventDefault() {} }));
    }
    if (dashBtnDone && !dashBtnAsserted && p.dashT > 0) dashBtnAsserted = true;
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

// run 1: stand still → kills + level-up cards → force death through the real
// damage pipeline (balance-independent) → DYING slow-mo → GAMEOVER
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

// run 2: retry via the real button, survive → boss at 4:00 → victory at 5:00
run = 2;
byId['btn-retry'].click();
assert(game.state === 'PLAYING', 'btn-retry click did not start the run');
pump(6 * 60 * 60);
assert(game.state === 'GAMEOVER' && game.victory, `run 2: expected victory, got state=${game.state} t=${game.t.toFixed(1)}s`);
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

// self-verification: every one-shot path above must have actually fired
assert(keyPickDone, 'keyboard card pick never exercised');
assert(heartDone && heartAsserted, 'heart pickup path never exercised');
assert(wandOffDone && wandOffAsserted, 'wand-off kill window never exercised');
assert(stickDone && stickUp, 'touch stick path never exercised');

console.log(
  `PASS boot-sim — runs=2 (death + victory) · level-ups=${levelUps} · max enemies alive=${maxEnemies} · ` +
  `boss spawned · pause/resume + mute · card pick via click + key 1 · all 4 weapons (wand-off kill window) · ` +
  `heart heal · touch stick + dash button · scores save/render/clear · quit flow · loop alive throughout`,
);
