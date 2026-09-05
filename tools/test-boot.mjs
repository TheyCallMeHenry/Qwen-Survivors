// tools/test-boot.mjs — Node repro of the browser boot + full runs.
//
// Stubs a minimal DOM/canvas (canvas APIs validated like a real browser:
// arc/ellipse/gradients throw on bad radii), replicates js/main.js boot()
// (audio excluded — verified safe by review: every path no-ops pre-ctx), then
// pumps the real Loop via a stubbed requestAnimationFrame and simulates the
// user's path: btn-start click → run 1 (stand still → level-up cards → heart
// pickup → forced death) → meta flow (gameover saves Soulshards → menu →
// Upgrades screen: assert rows/shards, buy Vitality, back) → run 2 via
// btn-start (meta maxHp 80 applied (mage 60 + 20) → kept alive → all 8 weapons via forced
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
const drawOps = { drawImage: 0, arc: 0, ellipse: 0, fill: 0, fillRect: 0, stroke: 0, fillText: 0, radial: 0 };

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
      if (p === 'ellipse') return (...a) => { drawOps.ellipse++; if (a.length !== 7) throw new TypeError('ellipse: ' + a.length + ' args, 7 required'); if (!okR(a[2]) || !okR(a[3])) throw new IndexSizeError(); };
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
    style: { _props: {}, set transform(v) { this._props.transform = v; }, get transform() { return this._props.transform; }, setProperty(k, v) { this._props[k] = v; } },
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
const { buildCharacters, buildRoster } = await import('../js/art/characters.js');
const { buildItems, buildIcons, gemHeartFor } = await import('../js/art/items.js');
const { initHud } = await import('../js/ui/hud.js');
const { initScreens, saveScores } = await import('../js/ui/screens.js');
const { aliveCap } = await import('../js/entities/spawner.js');
const { getLevel } = await import('../js/world/levels.js');
const { clamp, rand, mulberry32 } = await import('../js/utils/math.js');
const { recomputeStats, cardOffers } = await import('../js/entities/player.js');
const { weaponCap, bossCount } = await import('../js/net/coop.js');
const { SNAP_V } = await import('../js/net/sync.js');

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
// 11.6.1 roster art (D28/D62): 5 sheets × idle[2]/run[4]; warden sheet strictly
// LARGER than the original player sprite but < brute (area, D62); ghost tint rebuild.
{
  const roster = buildRoster();
  for (const k of [...CFG.characters.order, 'ghost'])
    assert(roster[k] && roster[k].idle.length === 2 && roster[k].run.length === 4 && roster[k].w > 0 && roster[k].h > 0,
      `roster missing "${k}" frames/sizes`);
  assert(roster.mage.w * roster.mage.h === 56 * 64, '11.6.1: mage sheet 56×64 (original player)');
  assert(roster.warden.w * roster.warden.h > roster.mage.w * roster.mage.h
    && roster.warden.w * roster.warden.h < 64 * 60, '11.6.1 D62: player < warden area < brute (64×60)');
  buildRoster('#4be3ff'); // D62 per-seat tint rebuild — no crash
}
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
let soloHudDone = false; // 11.7 solo invariance (11.11): no coop class, TL = local player
let soloInvDone = false; // 11.11 solo invariance: a 1P run carries NO co-op overhead
let sawBullets = false, sawBombs = false, sawFlames = false, sawArrows = false;
let sawBolts = false, sawAxes = false, sawBlades = false, sawGarlic = false; // 22.1: all-weapon E2E observation
let burnDone = false, burnAsserted = false, burnEnemy = null, burnKills = 0, burnAt = 0;
let dashIFrameStep = 0, dashIFrameHp0 = 0; // 0 = not started, 1 = in flight, 2 = done
let synActive = false, synDone = false, synRetries = 0;
let e107A = false, e107ADone = false, e107B = false, e107BDone = false; // 10.7 empty-pool guard E2E
let benchPhase = 0, benchStartT = 0; // 10.4 one-shot worst-case bench: 0=off · 1=measuring · 2=done
let bench = null;
let m02RunDone = false; // 13.3 — M02 real run one-shot
let syn128Done = false; // 12.8 — per-synergy combat E2Es (flamingArrows/heartPiercer/blueFlame/stormVolley)
let m03RunDone = false; // 13.5 — M03 real run one-shot

// 16.1 — foreground snow path probe (D70: quantify what actually draws). The ctx
// stub counts path ops, so the delta across ONE snow pass = the flake path
// commands; 0 commands = invisible flakes in the browser too (empty-path fill
// is a silent no-op both here and in canvas). Per kind, n flakes: snow = n arc
// + n fill · petal = n ellipse + n fill · bubble = 2n arc + n stroke + n fill.
function probeSnow(what) {
  const s = game.snow, n = s.flakes.length;
  const a0 = drawOps.arc, e0 = drawOps.ellipse, f0 = drawOps.fill, st0 = drawOps.stroke;
  s.draw(ctx, game.camera, game.camera.w, game.camera.h, 1);
  const arc = drawOps.arc - a0, ell = drawOps.ellipse - e0, fill = drawOps.fill - f0, stroke = drawOps.stroke - st0;
  assert(n === CFG.perf.snowCount, `${what}: flake count ${n} !== CFG.perf.snowCount`);
  if (s.kind === 'snow') assert(arc === n && ell === 0 && fill === n && stroke === 0, `${what}: snow pass drew arc=${arc} ellipse=${ell} fill=${fill} (want ${n}/0/${n} — 0 = invisible snow)`);
  else if (s.kind === 'petal') assert(arc === 0 && ell === n && fill === n && stroke === 0, `${what}: petal pass drew arc=${arc} ellipse=${ell} fill=${fill} (want 0/${n}/${n})`);
  else if (s.kind === 'bubble') assert(arc === 2 * n && ell === 0 && fill === n && stroke === n, `${what}: bubble pass drew arc=${arc} stroke=${stroke} fill=${fill} (want ${2 * n}/${n}/${n})`);
  else assert(false, `${what}: unknown snow kind "${s.kind}"`);
}

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
    const missing = ['axe', 'garlic', 'blades', 'pistols', 'bombs', 'flame', 'bow', 'snowball', 'ringLightning'].filter((k) => !game.player.weapons[k]);
    if (missing.length) {
      // the starting weapon is wand (mage default) — force the other weapons
      // through the real pickCard/applyCard pipeline (the click still goes through the card DOM).
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
      if (!sawArrows && game.combat.arrows.length > 0) sawArrows = true;
      // 22.1: observe the remaining four weapons in the live run
      if (!sawBolts && game.combat.bolts.length > 0) sawBolts = true;
      if (!sawAxes && game.combat.axes.length > 0) sawAxes = true;
      if (!sawBlades && p.weapons.blades && typeof p._orbitT === 'number' && p._orbitT > 0.1) sawBlades = true;
      if (!sawGarlic && p.weapons.garlic && typeof p._garlicT === 'number' && p._garlicT > 0) sawGarlic = true;
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
    if (!soloHudDone && st === 'PLAYING' && game.t >= 6) {
      soloHudDone = true;
      // 11.7 solo invariance (11.11): no coop class, TL (#hud-left) driven by the local player
      assert(!byId['hud'].classList.contains('coop'), '11.7: coop class present on #hud during a solo run');
      assert(byId['hp-label'].textContent === `${Math.max(0, Math.ceil(game.player.hp))} / ${game.player.maxHp}`,
        '11.7: solo TL panel not driven by the local player');
    }
    if (!soloInvDone && st === 'PLAYING' && game.bossSpawned) {
      soloInvDone = true;
      // 11.11 — solo invariance: a 1P run carries NO co-op overhead. D57 re-read:
      // "identical" = no co-op overhead, NOT Phase-10 stat/sprite identity — the
      // solo baseline INCLUDES character select + the selected char's stats/weapon,
      // so the asserts below are about net/roster/cap/boss state, not sprites.
      assert(game.net === null && game.netRole === 'solo', '11.11: solo run is not net-free (net/netRole)');
      assert(game.netRoster.length === 0 && game.netMyId === null, '11.11: solo run carries a roster/seat');
      assert(game.players.length === 1 && game.remote.length === 0, '11.11: solo run has remote players');
      assert(game.enemies.coopS === 1, '11.11: solo difficulty ramp != 1.0');
      assert(weaponCap(1) === CFG.run.maxWeapons, '11.11: 1P weapon cap != base maxWeapons');
      assert(bossCount(1) === 1, '11.11: 1P boss count != 1');
      const soloBosses = game.enemies.list.filter((e) => e.boss);
      assert(soloBosses.length === 1 && soloBosses[0].type === 'wraith', '11.11: solo m01 boss is not exactly one Wraith');
      for (const [k, owner] of Object.entries(game.weaponOwner)) {
        assert(owner === game.player, `11.11: solo weaponOwner "${k}" is not owned by the local player`);
      }
      assert(game._ownerExclusion(game.player).size === 0, '11.11: solo owner exclusion is not empty');
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
    // all 8 weapons L5 + all passives max + 5/5 synergies + aliveCap dummies
    // kept in a 150-450 px ring around the player (maxed weapons keep the
    // ring turning over → sustained mass-damage + mass-kill bursts). Logs
    // update vs render vs hud+screens ms — the 10.4 before/after contract.
    if (benchPhase === 0 && synDone && st === 'PLAYING' && game.t >= 205) {
      benchPhase = 1;
      for (const k of Object.keys(CFG.weapons)) p.weapons[k] = 5;
      for (const k of Object.keys(CFG.passives)) p.passives[k] = CFG.passives[k].max;
      p.synergies = {};
      // 12.6: multi-level synergies — max each at its OWN level count (bench = worst case)
      for (const k of Object.keys(CFG.synergies)) p.synergies[k] = CFG.synergies[k].levels.length;
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
          `[10.4-bench] 5 s worst-case (8 weapons L5 + passives max + 5/5 synergies, ${maxEnemies} enemies peak): ` +
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
        // 12.6 rebaseline: heartMagnet (hp+magnet) also gates once passives max — clear every
        // gated candidate except phoenix so the pool stays exactly {phoenix}.
        for (const k of Object.keys(p.synergies)) if (k !== 'phoenix') delete p.synergies[k];
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

// 11.6.2 — character select E2E (D58 Soulshard shop + selection + run-start application)
{
  const cs = () => byId['char-list'].children;
  localStorage.removeItem(CFG.meta.charListKey);
  localStorage.removeItem(CFG.meta.charKey);
  game.meta.shards = 9999;
  saveMeta(CFG.meta.storageKey, game.meta);
  let denied = 0;
  const offDenied = game.bus.on('denied', () => denied++);

  document.getElementById('btn-character').click();
  pump(30);
  assert(!byId['screen-select'].classList.contains('hidden'), '11.6.2: select screen not shown');
  assert(byId['screen-menu'].classList.contains('hidden'), '11.6.2: menu screen not hidden under the select');
  assert(cs().length === 4, `11.6.2: expected 4 char cards, got ${cs().length}`);
  const [cm, cw, cr, csw] = cs();
  assert(cm.classList.contains('sel'), '11.6.2: starter (mage) selected by default');
  assert(cw.classList.contains('locked') && cr.classList.contains('locked') && csw.classList.contains('locked'),
    '11.6.2: non-starters locked on fresh LS');
  assert(cw.children[2].children[0].textContent.includes('3500'), '11.6.2: locked warden does not show its D58 cost');
  assert(byId['char-shards'].textContent.includes('9999'), '11.6.2: shard wallet not rendered');

  cw.click(); // affordable → buy + select in one tap
  assert(game.charKey === 'warden' && game.player.charKey === 'warden', '11.6.2: warden purchase did not select it');
  assert(game.chars.includes('warden') && game.meta.shards === 9999 - 3500, '11.6.2: warden purchase did not spend the 3500 cost');
  assert(localStorage.getItem(CFG.meta.charKey) === 'warden', '11.6.2: warden selection not persisted');
  assert(JSON.parse(localStorage.getItem(CFG.meta.charListKey)).includes('warden'), '11.6.2: warden unlock not persisted');
  assert(cs()[1].classList.contains('sel') && !cs()[1].classList.contains('locked'), '11.6.2: re-render did not mark warden selected + unlocked');
  assert(byId['char-shards'].textContent.includes('6499'), '11.6.2: shard wallet not updated after purchase');

  csw.click(); // 7500 > 6499 remaining → denied, not selected
  assert(denied === 1, '11.6.2: unaffordable tap did not emit the denied blip');
  assert(csw.classList.contains('shake'), '11.6.2: unaffordable tap did not shake the card');
  assert(game.charKey === 'warden' && game.meta.shards === 6499, '11.6.2: unaffordable tap changed the selection/shards');

  byId['btn-char-confirm'].click(); // 2b: the select closes on confirm
  pump(30);
  assert(byId['screen-select'].classList.contains('hidden') && !byId['screen-menu'].classList.contains('hidden'),
    '11.6.2: confirm did not close the select back to the menu');
  assert(game.state === 'MENU', '11.6.2: select changed the game state');

  // restore the clean solo-default state (fresh LS + mage + wallet) for the run flow below
  game.setCharacter('mage');
  game.meta.shards = 0;
  saveMeta(CFG.meta.storageKey, game.meta);
  localStorage.setItem(CFG.meta.charListKey, JSON.stringify(['mage']));
  offDenied();
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
probeSnow('run 1 m01 start (16.1)'); // in-game m01 foreground — the user-visible path

// run 1: stand still (keep-alive iframes in steer) → kills + level-up cards +
// heart/pause one-shots → force death through the real damage pipeline
// (balance-independent) → GAMEOVER (immediate; 22.6 dropped the DYING slow-mo).
// Keep-alive is what makes this window seed- and balance-independent since the
// 10.5 spawn band: the swarm reaches the player from ~t=2 s, so survival is no
// longer a given.
run = 1;
pump(20 * 60);
assert(game.kills > 0, 'run 1: player never landed a kill (auto-weapons not firing?)');
assert(pumpUntil(() => game.state === 'PLAYING', 30 * 60), 'run 1: never returned to PLAYING');
game.player.iframes = 0;
game.player.hp = 1;
game.combat.damagePlayer(game.player, 5, game.player.x, game.player.y);
// 22.6: death now ends the run immediately (no DYING transient), so assert GAMEOVER directly.
assert(game.state === 'GAMEOVER', `run 1: forced death did not end the run (state=${game.state})`);
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
sawBullets = sawBombs = sawFlames = sawArrows = false;
sawBolts = sawAxes = sawBlades = sawGarlic = false; // 22.1
burnDone = burnAsserted = false; burnEnemy = null; burnKills = 0; burnAt = 0;
dashIFrameStep = 0; dashIFrameHp0 = 0;
synActive = synDone = false; synRetries = 0;
byId['btn-start'].click();
assert(game.state === 'PLAYING', 'btn-start click did not start run 2');
assert(game.player.maxHp === 80, 'meta maxHp upgrade not applied at run start (mage 60 + 20 expected)');
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
probeSnow('m02 menu backdrop (16.1)');
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
probeSnow('m01 menu backdrop (16.1)');

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
probeSnow('m03 menu backdrop (16.1)');
assert(game.world.lakes.length === 3 && game.world.lakes.every((l) => l.img && l.koi === 5), 'm03 fish schools not wired');
assert(game.minimapBase, 'm03 minimap base missing');

// 13.3 — M02 "Higan" REAL run (13.3): m02 weights + Higan slot skins +
// ×1.25 stat tables + Ryū boss. btn-start → startRun() → last levelKey.
run = 3;
game.levelKey = 'm02';
byId['btn-start'].click();
assert(game.state === 'PLAYING', 'btn-start did not start the m02 run');
probeSnow('m02 run start (16.1)');
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
const ryuBosses = game.enemies.list.filter((e) => e.boss);
const ryuBoss = ryuBosses[0];
assert(ryuBosses.length === 1 && ryuBoss && ryuBoss.type === 'ryu', 'm02 boss is not the Ryū (solo = exactly 1, 11.10)');
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
probeSnow('m03 run start (16.1)');
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
const sharkBosses = game.enemies.list.filter((e) => e.boss);
const sharkBoss = sharkBosses[0];
assert(sharkBosses.length === 1 && sharkBoss && sharkBoss.type === 'shark', 'm03 boss is not the Great White (solo = exactly 1, 11.10)');
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

// 16.2 — projectile spawn origin: feet → mid-torso (shared spawn offset, config
// scalar). Controlled m01 game (fresh Game — the main flow keeps going after):
// every weapon's first projectile must spawn at mid-torso y (feet.y − def.h ×
// spawnOriginFrac), not the feet; the blade orbit center is mid-torso (a
// feet-level enemy is NOT sheared); combat.draw now draws blades/garlic for each
// live player (latent fix: this.player was never assigned → they were never drawn).
// fire162 = the player's weapon fire pass (Player.update → _weapons, projectiles
// spawn UNMOVED — assert exact origins); tick162 = the projectile sim pass.
{
  const g2 = new Game({
    input: new Input(canvas, { joyBase: byId['joy-base'], joyKnob: byId['joy-knob'], dashBtn: byId['btn-dash'] }),
    loop: { timescale: 1, hitStop() {} }, ctx: makeCtx(), mctx, characters, items,
  });
  g2.resize(1280, 800);
  g2.startRun('m01');
  const p2 = g2.player;
  const f162 = CFG.combat.spawnOriginFrac;
  const sy162 = p2.y - p2.def.h * f162;
  assert(sy162 < p2.y, '16.2: mid-torso origin is above the feet');
  const fire162 = () => p2.update(1 / 60, { x: 0, y: 0 }, g2.combat, g2.enemies, g2.world);
  const tick162 = () => g2.combat.update(1 / 60, g2.players, g2.enemies);
  // wand (owned at run start) — the target sits inside every weapon range
  // (flame range is now flat 150 and uses a strict <, so keep it comfortably inside;
  // still within bombs bombMin/bombDist + pistolRange/wandRange for the others)
  g2.enemies.spawn('rat', p2.x + 120, p2.y);
  fire162();
  assert(g2.combat.bolts.length > 0 && g2.combat.bolts[0].y === sy162 && g2.combat.bolts[0].x === p2.x,
    `16.2: wand bolt spawned at mid-torso (got y=${g2.combat.bolts[0] && g2.combat.bolts[0].y}, want ${sy162}, feet ${p2.y})`);
  g2.combat.bolts.length = 0; tick162();
  // axe
  p2.weapons.axe = 1; p2._axeCd = 0;
  fire162();
  assert(g2.combat.axes.length > 0 && g2.combat.axes[0].y === sy162 && g2.combat.axes[0].x === p2.x,
    '16.2: axe spawned at mid-torso');
  g2.combat.axes.length = 0; tick162();
  // twin pistols (2 rounds, same origin)
  p2.weapons.pistols = 1; p2._pistolCd = 0;
  fire162();
  assert(g2.combat.bullets.length === 2 && g2.combat.bullets.every((b) => b.y === sy162 && b.x === p2.x),
    '16.2: pistol bullets spawned at mid-torso (×2)');
  g2.combat.bullets.length = 0; tick162();
  // bombs (lob starts at mid-torso: arc origin y0 = sy)
  p2.weapons.bombs = 1; p2._bombCd = 0;
  fire162();
  assert(g2.combat.bombs.length === 1 && g2.combat.bombs[0].y0 === sy162 && g2.combat.bombs[0].x0 === p2.x,
    '16.2: bomb arc origin at mid-torso');
  g2.combat.bombs.length = 0; tick162();
  // flame (emission origin — 16.3 builds on this)
  p2.weapons.flame = 1; p2._flame.fuel = CFG.weapons.flame.levels[0].fuel;
  fire162();
  assert(g2.combat.flames.length > 0 && g2.combat.flames.every((fl) => fl.y === sy162 && fl.x === p2.x),
    '16.2: flame emission origin at mid-torso');
  g2.combat.flames.length = 0; tick162();

  // Flame reach vs. VISUAL stream (user report 2026-09-04): acquisition is flat 150,
  // so an enemy parked beyond the visible stream must never be acquired, ignited or
  // damaged. Two ISOLATED cases — _nearest picks the CLOSEST foe, so a far target has
  // to be tested with no nearer one present. Math.random stubbed to 0 → speed =
  // flameSpeed, life = flameLife (deterministic stream). Enemies are frozen (vx/vy=0,
  // state 'idle') so they cannot walk and re-baseline the distance mid-probe.
  {
    const C150 = CFG.combat;
    const rm = Math.random;
    // Flame hits are queried from enemies.grid (HashGrid), which the per-step enemy
    // update rebuilds. This isolated probe never runs that update, so re-insert here —
    // shadow() is NOT a rebuild path (its arg is a sprite radius).
    const clearFoes = () => { g2.enemies.list.length = 0; g2.enemies.grid.clear(); };
    const regrid = () => { g2.enemies.grid.clear(); for (const e of g2.enemies.list) if (!e.dead) g2.enemies.grid.add(e.x, e.y, e); };
    p2.weapons.flame = 5; p2._axeCd = p2._pistolCd = p2._bombCd = p2._bowCd = 999;
    const probe = (dx) => {
      clearFoes();
      g2.combat.flames.length = 0; g2.combat._flameCd.clear();
      const e = g2.enemies.spawn('rat', p2.x + dx, p2.y);
      e.hp = 1e6; e.vx = e.vy = 0; e.state = 'idle';
      p2._flame.fuel = CFG.weapons.flame.levels[4].fuel; p2._flame.reloading = false;
      // rand(a,b) = a + Math.random()*(b-a), so 0.5 pins each spread to its CENTRE
      // (speed 520 / life 0.33 → reach ~124 px); 0 would give the minimum of every
      // spread and silently shrink the stream instead.
      Math.random = () => 0.5;
      fire162();
      const emitted = g2.combat.flames.length, acquired = emitted > 0;
      let touched = false;
      for (let i = 0; i < 40; i++) {
        e.vx = e.vy = 0; regrid(); tick162(); // ~0.67 s > flameLife
        if (e.hp < 1e6 || (e.burnT || 0) > 0) touched = true;
      }
      Math.random = rm;
      return { e, acquired, emitted, dmg: e.hp < 1e6, burn: (e.burnT || 0) > 0, touched };
    };
    const inn = probe(120);
    assert(inn.acquired && inn.touched,
      `flame: foe at 120 px is acquired + damaged + burning (acquired=${inn.acquired} dmg=${inn.dmg} burn=${inn.burn})`);
    const out = probe(400); // inside the OLD 300–380 ramp, outside the visible stream
    assert(!out.acquired && !out.dmg && !out.burn,
      `flame: foe at 400 px is NOT acquired/damaged (range aligned to visuals) (acquired=${out.acquired} dmg=${out.dmg} burn=${out.burn})`);
    assert(CFG.weapons.flame.levels.every((s) => s.range === 150), 'flame: acquisition range flat 150 at every level');
    clearFoes();
    g2.combat.flames.length = 0;
    // restore a target for the remaining 16.2 origin checks (wand/axe/pistols/bombs/bow
    // all aim via _nearest) and put the cooldowns back so they fire again.
    g2.enemies.spawn('rat', p2.x + 120, p2.y);
    p2._axeCd = p2._pistolCd = p2._bombCd = 0;
    p2.weapons.flame = 0;
  }

  // bow (23.1 charge-up): one fire pass enters the wind-up (no arrow yet), the arrow
  // looses only after CFG.weapons.bow.charge elapses — then spawn origin = mid-torso (16.2)
  p2.weapons.bow = 1; p2._bowCd = 0; p2._bowCharge = 0;
  fire162();
  assert(g2.combat.arrows.length === 0 && p2._bowCharge > 0,
    '23.1: bow enters the charge-up wind-up before any arrow exists');
  const chStart = p2._bowCharge;
  assert(Math.abs(chStart - CFG.weapons.bow.charge) < 1e-9, `23.1: charge starts at CFG.weapons.bow.charge (${CFG.weapons.bow.charge})`);
  let chargeTicks = 0;
  while (g2.combat.arrows.length === 0 && chargeTicks < 60) { fire162(); chargeTicks++; }
  assert(chargeTicks >= Math.round(CFG.weapons.bow.charge * 60) - 1,
    `23.1: the arrow looses only after the full wind-up (ticks=${chargeTicks})`);
  assert(g2.combat.arrows.length > 0 && g2.combat.arrows[0].y === sy162 && g2.combat.arrows[0].x === p2.x,
    '16.2: arrow spawned at mid-torso');
  // 23.1 visible draw/telegraph: Player.draw strokes the drawn string WHILE charging, not idle
  p2._bowCharge = CFG.weapons.bow.charge * 0.5;
  const st0 = drawOps.stroke;
  p2.draw(g2.ctx);
  assert(drawOps.stroke - st0 === 1, '23.1: the drawn-string telegraph renders during the wind-up');
  g2.combat.arrows.length = 0; tick162();

  // 12.3 Snowball Launcher E2E: lob origin at mid-torso (16.2), burst ON impact damages +
  // applies a slow stack, and emits a frost-tagged explosion (the draw selects frostImg).
  p2.weapons.snowball = 1; p2._snowCd = 0;
  // Isolate: _nearest picks the CLOSEST foe, so clear leftovers (the bow block parked a
  // rat at +120) and use one clean target the snowball will actually lob to.
  g2.enemies.list.length = 0; g2.enemies.grid.clear();
  const snowTarget = g2.enemies.spawn('rat', p2.x + 130, p2.y);
  snowTarget.hp = 1e6; snowTarget.maxHp = 1e6; snowTarget.vx = snowTarget.vy = 0; snowTarget.state = 'idle';
  const snowHp0 = snowTarget.hp;
  fire162();
  assert(g2.combat.snowballs.length === 1 && g2.combat.snowballs[0].y0 === sy162
    && g2.combat.snowballs[0].x0 === p2.x,
    '12.3: snowball lob origin at mid-torso (16.2)');
  const exBefore = g2.combat.explosions.length;
  // The burst queries enemies.grid.range(); the grid is only rebuilt in enemies.update,
  // which this isolated probe never runs — re-insert the target every tick (pin geometry
  // while the snowball flies) so the burst query sees it, exactly as the 23.2 bomb E2E does.
  const regridSnow = () => { g2.enemies.grid.clear(); for (const e of g2.enemies.list) if (!e.dead) g2.enemies.grid.add(e.x, e.y, e); };
  let snowTicks = 0;
  while (g2.combat.snowballs.length && snowTicks < 90) {
    snowTarget.vx = snowTarget.vy = 0; snowTarget.x = p2.x + 130; snowTarget.y = p2.y;
    regridSnow();
    tick162();
    snowTicks++;
  }
  assert(snowTicks < 90 && g2.combat.snowballs.length === 0,
    `12.3: snowball bursts at its target and is removed (ticks=${snowTicks})`);
  assert(snowTarget.hp < snowHp0, '12.3: the burst damages the targeted enemy');
  assert(snowTarget.slowStacks.length === 1, '12.3: the burst applies one slow stack to a hit enemy');
  const frostEx = g2.combat.explosions.slice(exBefore).find((x) => x.frost);
  assert(!!frostEx, '12.3: impact emits a frost-tagged explosion (frostImg draw path)');
  p2.weapons.snowball = 0;
  g2.combat.explosions.length = 0;

// 12.4 Ring of Chain Lightning E2E: bolt origin mid-torso (16.2), shock stacks → stun +
// chain burst to a nearby foe (+1 shock stack, no re-proc), drawable arc on the owner.
{
  // Silence every weapon NOT under test. Ownership persists across the whole 16.x
  // probe (wand/axe/pistols/bombs/flame/bow/snowball all still owned), so a live cd
  // means stray projectiles fly during fire162/tick162 — an in-flight Sunder Bomb
  // exploding on T2 was exactly this probe's failure (hp −87.6, want 42).
  p2._snowCd = 999; p2._bombCd = 999;
  // Clear ALL weapon projectiles still in flight from earlier probes (a bomb mid-arc
  // explodes during tick162 and damages the pinned pair), then unown everything but
  // the ring — `if (this.weapons.x)` gates each fire site, so cd values are inert.
  for (const arr of [g2.combat.bolts, g2.combat.axes, g2.combat.bullets, g2.combat.bombs,
    g2.combat.flames, g2.combat.arrows, g2.combat.snowballs]) arr.length = 0;
  for (const k of ['wand', 'axe', 'pistols', 'bombs', 'flame', 'bow', 'snowball']) p2.weapons[k] = 0;
  p2.weapons.ringLightning = 1; p2._ringCd = 0; p2._ringBeams.length = 0;
    // Freeze every other pipeline for this probe: the spawn waves (g2 never pumps
    // game.update, but fire162/tick162 must stay noise-free), contact damage, and DoT.
    // Restored in the cleanup below.
    const dmgPLayerBak = g2.combat.damagePlayer;
    g2.combat.damagePlayer = () => false;
    const dotBak = g2.combat._dot;
    g2.combat._dot = () => {};
    g2.enemies.list.length = 0; g2.enemies.grid.clear();
    const ringT1 = g2.enemies.spawn('rat', p2.x + 130, p2.y);
    // Bolt damage must never kill T1 (a dead target → _nearest null → no bolts) but
    // stay > 2×ringDmg so a chain visit is readable as an hp delta on the capped twin.
    ringT1.hp = 500; ringT1.maxHp = 500;
    // Pinned beyond the bolt's hit circle at T1 (130 + ringJumpR, strict <) but within
    // chain reach: only a proc's chain can ever touch it. Capped HP → a second visit kills.
    const ringT2 = g2.enemies.spawn('rat', p2.x + CFG.combat.ringJumpR + 30, p2.y);
    ringT2.hp = 60; ringT2.maxHp = 60;
    let ringTicks = 0, boltN = 0;
    const stunTicks = Math.ceil(CFG.combat.stunDur * 60) + 2;
    const stunHold = stunTicks + 8;
    // Isolate the probe: _chainArc walks enemies.list directly (not the grid), and
    // g2.enemies still holds every foe from earlier probes — clear to the pinned pair.
    const pinRing = () => {
      // Geometry ONLY — never resurrect dead probe foes (the old push-alive pattern
      // masked kills and double-counted damage in the hp-delta asserts).
      g2.enemies.list.length = 0; g2.enemies.grid.clear();
      for (const e of g2.enemies.list) if (!e.dead) { g2.enemies.list.push(e); g2.enemies.grid.add(e.x, e.y, e); }
      // list was just emptied above — re-add the pinned pair explicitly
      g2.enemies.list.push(ringT1, ringT2);
      for (const e of [ringT1, ringT2]) if (!e.dead) g2.enemies.grid.add(e.x, e.y, e);
    };
    pinRing();
    // Deterministic bolt rhythm (bolt period = ringCd·60 = 54 ticks). Two livelocks
    // made the original free-running probe fail: (a) a drifting cd phase-locks arrivals
    // past the stack TTL; (b) bolts mid-stun re-stun T1 and re-chain T2. So: pin cd=0
    // per fire (exact-period firing), accumulate exactly shockMaxStacks, then HOLD THE
    // RING SILENT (holdRing) for stunDur + margin so no bolt lands during the drain.
    let bolts = 0;
    const fireBolt = () => {
      p2._ringCd = 0;
      pinRing(); fire162();
      assert(p2._ringCd === CFG.combat.ringCd, `12.4: bolt #${bolts + 1} fired at tick ${ringTicks}`);
      bolts++;
    };
    // Hold the ring silent for ≥ n ticks (cd pinned far positive; fireBolt re-pins it).
    const holdRing = (n) => { p2._ringCd = Math.max(p2._ringCd, n + 1); };
    // Status timers live in Enemies._ai — the probe must drive enemies.update itself
    // (the isolated g2 never pumps game.update): stack TTL expiry, stun countdown,
    // knockback. Pin AFTER the AI pass so the geometry stays exact for fire/chain queries.
    const advance = (ticks) => {
      for (let n = 0; n < ticks; n++) {
        p2.dead = false; p2.hp = p2.maxHp;
        pinRing();
        // Drain ONLY the status timers during a stun window (game.js:348 order:
        // enemies.update before combat.update). If a bolt landed mid-window it would
        // re-stun T1 and the expiry assert below could never settle.
        g2.enemies.update(1 / 60, g2.players, g2.world, g2.combat);
        boltN = g2.enemies.list.reduce((m, e) => m + (e.shockStacks ? e.shockStacks.length : 0), 0);
        const t2Before = ringT2.shockStacks.length;
        tick162();
        pinRing();
        if (ringT2.shockStacks.length - t2Before > 1) {
          assert(false, `12.4: one chain visit per tick (Δ=${ringT2.shockStacks.length - t2Before}, tick=${ringTicks}, list=${g2.enemies.list.length})`);
        }
        if (p2.dead) { assert(false, `12.4: probe owner died mid-probe (tick=${ringTicks})`); return false; }
        ringTicks++;
      }
      return true;
    };
    // Bolts 1..max−1 accumulate without stunning. NO advance() between fires: the only
    // timer drain is fireBolt's own p2.update (one dt per fire), so stacks sit at
    // ttl − k·dt (≪ statusStackTtl) and cd lands exactly ≤ 0 for the next pin.
    for (let b = 0; b < CFG.combat.shockMaxStacks - 1; b++) fireBolt();
    boltN = g2.enemies.list.reduce((m, e) => m + (e.shockStacks ? e.shockStacks.length : 0), 0);
    assert(boltN === CFG.combat.shockMaxStacks - 1 && ringT2.shockStacks.length === 0,
      `${CFG.combat.shockMaxStacks - 1} shocks accumulated, no proc yet, T2 untouched (foe stacks=${boltN}, T2=${ringT2.shockStacks.length})`);
    // The proc bolt: 3rd stack → stun + chain burst to T2 (chain arcs emit mid-chain).
    const exArc0 = p2._ringBeams.length;
    fireBolt();
    holdRing(stunHold);
    assert(ringT1.stunT > 0, '12.4: the final shock stack stuns (proc fires)');
    assert(p2._ringBeams.length >= exArc0 + CFG.weapons.ringLightning.levels[0].jumps,
      `12.4: the chain burst emits arc beams mid-chain (beams=${p2._ringBeams.length - exArc0})`);
    // Drain window: ring held silent past stunDur so NO bolt lands while T1 is
    // stunned (a mid-window bolt would re-stun it and could re-chain T2 — the expiry
    // assert below must settle with exactly one chain visit on the record).
    // stunT drains exactly stunDur in enemies.update; drain margin absorbs float residue.
    holdRing(stunTicks);
    advance(stunTicks);
    assert(Math.abs(ringT1.stunT) < 1e-9, `12.4: the stun expires after stunDur (stunT=${ringT1.stunT}, ticks=${stunTicks})`);
    // T2 was chained exactly once (a second visit would kill it: 60 − 2×ringDmg < 30).
    // Chain damage = the proc bolt's OWN damage value (`combat._chainArc` uses C.ringDmg,
    // not the weapon level) — one visit drains exactly ringDmg from the capped twin.
    assert(!ringT2.dead && Math.abs(ringT2.hp - (60 - CFG.combat.ringDmg)) < 1e-9,
      `12.4: the chain burst damages a nearby foe exactly once (hp=${ringT2.hp}, want ${60 - CFG.combat.ringDmg})`);
    // T2 was chained exactly once: it holds exactly 1 shock stack and never procs
    // from a chain visit (a re-proc would stun it and/or double-hit the hp assert).
    assert(ringT2.shockStacks.length === 1 && ringT2.stunT === 0,
      `12.4: chained foe holds 1 stack, never re-procs (stacks=${ringT2.shockStacks.length}, stun=${ringT2.stunT})`);
    // No immunity after the stun: bolts land again (drain = fireBolt's own dt only;
    // every stack sits ≪ ttl 300). The drain window advanced cd to ~0.9 − stunHold·dt,
    // so exactly ONE more bolt fits before the cd gate — stacks=1 proves it landed.
    // (A second chain burst would re-hit T2, whose hp is asserted to exactly ONE
    // visit further down — so the probe stops at the shock meter, never past it.)
    const boltsBeforeP2 = bolts;
    fireBolt();
    // stunT hits exactly 0 via float subtraction (never `=== 0` — FP-exactness pitfall).
    assert(bolts - boltsBeforeP2 === 1
      && ringT1.shockStacks.length === 1 && Math.abs(ringT1.stunT) < 1e-9,
      `12.4: shocks land again after the stun (stk=${ringT1.shockStacks.length}, bolts=${bolts - boltsBeforeP2})`);
    holdRing(999); // probe over — no more bolts, nothing drifts during the draw checks
    // Beam lifetime = ringBeamDur; every fire emits one bolt beam (+ chain beams).
    // Freshly pin cd=0 and fire ONE bolt right before the draw checks so a live arc
    // exists on the owner for combat.draw to stroke.
    fireBolt();
    assert(p2._ringBeams.length >= 1, '12.4: bolt arcs emitted on the owner during the probe');
    const ringBeam = p2._ringBeams.find((b) => b.x === p2.x && b.y === sy162);
    assert(!!ringBeam, '12.4: bolt arc carries the mid-torso origin (16.2)');
    const st0r = drawOps.stroke;
    g2.combat.draw(g2.ctx, g2.t, g2.players);
    assert(drawOps.stroke - st0r >= 1, '12.4: combat.draw strokes the lightning arcs (sparkImg path live)');
    p2.weapons.ringLightning = 0; p2._ringBeams.length = 0;
    g2.combat.damagePlayer = dmgPLayerBak;
    g2.combat._dot = dotBak;
    g2.enemies.list.length = 0; g2.enemies.grid.clear();
  }

  // blades: orbit center = mid-torso (16.2) — the feet-level orbit point must NOT
  // be sheared, the mid-torso one must (rad = the level-1 orbit radius; _orbitT
  // starts 0 → after one tick the blade sits ~0.04 rad past +x at radius rad).
  const rad162 = CFG.weapons.blades.levels[0].rad;
  const eF = g2.enemies.spawn('rat', p2.x + rad162, p2.y);   // feet-level orbit point
  const eM = g2.enemies.spawn('rat', p2.x + rad162, sy162);  // mid-torso orbit point
  // populate the spatial grid exactly as the first half of enemies.update does
  // (the grid is only rebuilt there — without it the orbiter queries nothing;
  // skipping the full update keeps the rats at their exact spawn geometry)
  g2.enemies.grid.clear();
  for (const e of g2.enemies.list) if (!e.dead) g2.enemies.grid.add(e.x, e.y, e);
  p2.weapons.blades = 1; p2._orbitT = 0; p2._tempestT = 0;
  tick162();
  assert(eM.hp < eM.maxHp && eF.hp === eF.maxHp,
    `16.2: blade orbits mid-torso (mid hit=${eM.hp < eM.maxHp}, feet hit=${eF.hp < eF.maxHp})`);
  // draw: blade + garlic ring rendered per live player (latent-fix — they were
  // invisible before: this.player/this.orbitT/this.garlicT were never assigned).
  p2.weapons.garlic = 1; // mage has no garlic — grant one for the ring draw
  const d0 = drawOps.drawImage, ar0 = drawOps.arc;
  g2.combat.draw(g2.ctx, g2.t, g2.players);
  assert(drawOps.drawImage - d0 >= CFG.weapons.blades.levels[0].n, '16.2: combat.draw drew the blade sprites (per-player loop live)');
  assert(drawOps.arc - ar0 === 1, '16.2: combat.draw drew the garlic pulse ring (feet-centered, live phase)');

  // 22.1 audit: garlic is the only weapon with a drawn effect but NO in-tree damage
  // check — assert the pulse lands. Park a rat inside S.r + e.r, force the per-player
  // timer to fire a pulse, then the real combat.update path must deal S.dmg × dmgMul
  // with zero knockback (ground pulse = pure tick, kb = 0). The earlier per-weapon
  // checks left projectiles/orbit armed behind, so clear arrays + disable orbit for a
  // garlic-only measurement (grid is populated exactly as enemies.update does).
  {
    const gS = CFG.weapons.garlic.levels[0];
    p2.weapons.blades = 0;
    g2.combat.bolts.length = 0; g2.combat.bullets.length = 0;
    g2.combat.arrows.length = 0; g2.combat.axes.length = 0;
    g2.combat.bombs.length = 0; g2.combat.flames.length = 0; g2.combat.explosions.length = 0;
    const eR = g2.enemies.spawn('rat', p2.x + gS.r, p2.y);
    g2.enemies.grid.clear();
    for (const e of g2.enemies.list) if (!e.dead) g2.enemies.grid.add(e.x, e.y, e);
    const hp0 = eR.hp;
    p2._garlicT = CFG.combat.garlicTick; // next update fires a pulse
    tick162();
    const dealt = hp0 - eR.hp;
    const want = gS.dmg * p2.dmgMul;
    assert(dealt > 0 && eR.hp >= 0, `22.1: garlic pulse damaged the foe inside the ring (dealt=${dealt.toFixed(2)}, hp=${eR.hp.toFixed(2)}/${eR.maxHp})`);
    assert(Math.abs(dealt - want) <= 1e-6, `22.1: garlic pulse damage = level dmg × dmgMul (${want})`);
    assert(eR.vx === 0 && eR.vy === 0, `22.1: garlic pulse applies zero knockback (kb = 0)`);
  }

  // 23.2 Sunder Bombs E2E — real lob → fuse → explode pipeline (no direct _explode call):
  // blast lands within the NEW radius ×1.5, damage = level dmg × dmgMul, knockback is
  // radial FROM THE BLAST CENTRE with the doubled bombKb magnitude.
  {
    const BS = CFG.weapons.bombs.levels[0];
    p2.weapons.garlic = 0; p2.weapons.blades = 0;
    for (const k of ['wand', 'axe', 'pistols', 'flame', 'bow']) p2.weapons[k] = 0;
    g2.combat.bolts.length = 0; g2.combat.bullets.length = 0;
    g2.combat.arrows.length = 0; g2.combat.axes.length = 0;
    g2.combat.bombs.length = 0; g2.combat.flames.length = 0; g2.combat.explosions.length = 0;
    p2.weapons.bombs = 1; p2._bombCd = 0;
    // enemy due east inside the NEW radius but OUTSIDE the old one (95) — only the
    // reworked blast can reach it; frozen so it cannot wander off the bearing
    const eB = g2.enemies.spawn('rat', p2.x + 120, p2.y);
    eB.hp = 1e6; eB.maxHp = 1e6;
    const regridB = () => { g2.enemies.grid.clear(); for (const e of g2.enemies.list) if (!e.dead) g2.enemies.grid.add(e.x, e.y, e); };
    let sawBomb = false, sawExpl = false, bombX = 0, bombY = 0;
    for (let i = 0; i < 240 && !sawExpl; i++) {
      eB.vx = eB.vy = 0; eB.x = p2.x + 120; eB.y = p2.y; // pin geometry while flying
      fire162();
      if (g2.combat.bombs.length) sawBomb = true;
      regridB();
      g2.combat.update(1 / 60, g2.players, g2.enemies);
      if (g2.combat.explosions.length) {
        sawExpl = true;
        bombX = g2.combat.explosions[0].x; bombY = g2.combat.explosions[0].y;
      }
    }
    assert(sawBomb && sawExpl, '23.2: the bomb lobbed, fused, and exploded (explosion record pushed)');
    assert(Math.hypot(bombX - p2.x, bombY - p2.y) <= CFG.combat.bombDist + 1e-6,
      `23.2: blast centre within bombDist (${Math.hypot(bombX - p2.x, bombY - p2.y).toFixed(1)})`);
    const dealt = 1e6 - eB.hp;
    assert(dealt > 0 && Math.abs(dealt - BS.dmg * p2.dmgMul) <= 1e-6,
      `23.2: blast damage = level dmg × dmgMul (${dealt.toFixed(2)} vs ${BS.dmg * p2.dmgMul})`);
    const bdx = eB.x - bombX, bdy = eB.y - bombY;
    const bd = Math.hypot(bdx, bdy) || 1;
    const along = (eB.vx * bdx + eB.vy * bdy) / bd; // knockback component along blast→enemy
    const perp = Math.abs((eB.vx * -bdy + eB.vy * bdx) / bd);
    assert(along >= CFG.combat.bombKb * 0.95 && perp <= CFG.combat.bombKb * 0.1,
      `23.2: knockback radial from the blast centre at ≥~full bombKb (along=${along.toFixed(1)} perp=${perp.toFixed(1)}, kb=${CFG.combat.bombKb})`);
    // visual-vs-damage radius E2E: draw one explosion frame — the drawn sprite must
    // cover the damage radius (old ramp drew 0.60× at k=0 = the reported defect)
    const exX = g2.combat.explosions[0];
    exX.t = 0;
    const seen = [];
    const vctx = new Proxy({}, { get(_, p) {
      if (p === 'drawImage') return (img, dx, dy, dw) => { seen.push(dw); };
      if (typeof p === 'string') return () => undefined;
      return undefined; } });
    g2.combat.draw(vctx, g2.t, g2.players);
    assert(seen.length > 0 && seen[seen.length - 1] >= exX.r * 2,
      `23.2: drawn blast width ${seen[seen.length - 1]} ≥ damage diameter ${exX.r * 2} at flash start`);
    g2.combat.bombs.length = 0; g2.combat.explosions.length = 0;
    eB.dead = true;
  }

  // 23.3 Over-heal E2E — full run pipeline: pickups.update collect → game route →
  // over-health past maxHp, then per-step decay back toward 100%.
  {
    p2.weapons.bombs = 0;
    g2.combat.bombs.length = 0; g2.combat.explosions.length = 0;
    const pl = g2.player;
    pl.overHeal = 0; pl.hp = pl.maxHp;
    // no synergy → the old clamped path (hp stays pinned at maxHp)
    g2.pickups.heart(pl.x, pl.y);
    const gotNoSyn = g2.pickups.update(1 / 60, pl, g2._pickupSpots);
    if (!(pl.hp >= pl.maxHp && pl.applyOverHeal(gotNoSyn.heal))) pl.heal(gotNoSyn.heal);
    assert(gotNoSyn.heal > 0 && pl.hp === pl.maxHp && pl.overHeal === 0,
      '23.3: without the synergy, a full-HP heart does nothing (clamped path)');
    // with synergy → over-health lands via the same route game.js uses
    pl.synergies.phoenix = 1;
    g2.pickups.heart(pl.x, pl.y);
    const gotSyn = g2.pickups.update(1 / 60, pl, g2._pickupSpots);
    if (!(pl.hp >= pl.maxHp && pl.applyOverHeal(gotSyn.heal))) pl.heal(gotSyn.heal);
    assert(pl.hp === pl.maxHp + CFG.gems.heartHeal && pl.overHeal === CFG.gems.heartHeal,
      `23.3: heart at full HP → hp ${pl.hp} over maxHp ${pl.maxHp}`);
    // ceiling via the real route: repeated hearts never pass 200% of CURRENT max HP
    for (let i = 0; i < 5; i++) {
      g2.pickups.heart(pl.x, pl.y);
      const got = g2.pickups.update(1 / 60, pl, g2._pickupSpots);
      if (!(pl.hp >= pl.maxHp && pl.applyOverHeal(got.heal))) pl.heal(got.heal);
    }
    assert(pl.hp === pl.maxHp * 2 && pl.overHeal === pl.maxHp,
      `23.3: hearts cap at 200% of current max HP (hp=${pl.hp}, maxHp=${pl.maxHp})`);
    // decay ticks with the real player.update (regen off so it cannot refill)
    const regenBak = pl.regen; pl.regen = 0;
    const ohBefore = pl.overHeal;
    pl.update(1, { x: 0, y: 0 }, g2.combat, g2.enemies, g2.world);
    assert(pl.overHeal < ohBefore - pl.maxHp * 0.005,
      `23.3: over-health decays ~1%/s through the live update (${ohBefore.toFixed(1)} → ${pl.overHeal.toFixed(1)})`);
    // HUD shows it while any pool exists (pairs with Phase 19 — otherwise "nothing happened").
    // The main HUD is GAMEOVER here (run-2 ended) and reads game.player (seatPlayer(0)),
    // so drive the same over-health route on the MAIN player before hud.update().
    const plM = game.player;
    const bak = { oh: plM.overHeal, hp: plM.hp, regen: plM.regen, state: game.state };
    game.state = 'PLAYING'; // hud.update() early-returns unless a run is on screen
    plM.regen = 0; plM.overHeal = 0; plM.hp = plM.maxHp; plM.synergies.phoenix = 1;
    { const got = CFG.gems.heartHeal; if (!(plM.hp >= plM.maxHp && plM.applyOverHeal(got))) plM.heal(got); }
    hud.update();
    assert(byId['hp-label'].textContent === `${Math.max(0, Math.ceil(plM.hp))} / ${Math.ceil(plM.maxHp + plM.overHeal)}`,
      `23.3: HUD HP label shows the over-health ceiling (got "${byId['hp-label'].textContent}")`);
    const ohTf = byId['oh-fill'].style._props.transform;
    assert(typeof ohTf === 'string' && ohTf.startsWith('scaleX(') && parseFloat(ohTf.slice(7)) > 0,
      `23.3: HUD over-health segment driven (>0 while the pool exists; got ${JSON.stringify(ohTf)})`);
    // no pool → label reverts to plain maxHp
    plM.overHeal = 0; plM.hp = Math.min(plM.hp, plM.maxHp);
    hud.update();
    assert(byId['hp-label'].textContent === `${Math.max(0, Math.ceil(plM.hp))} / ${plM.maxHp}`,
      `23.3: HUD HP label reverts with no pool (got "${byId['hp-label'].textContent}")`);
    game.state = bak.state;
    plM.overHeal = bak.oh; plM.hp = bak.hp; plM.regen = bak.regen;
    pl.synergies = {}; pl.overHeal = 0; pl.hp = Math.min(pl.hp, pl.maxHp); pl.regen = regenBak;
  }

  // 12.8 — per-synergy combat E2Es (flamingArrows · heartPiercer · blueFlame · stormVolley).
  // Isolation per the hot pitfalls: unown everything but the weapon under test + clear ALL
  // projectile arrays at block entry (ownership persists; in-flight shots damage the pinned
  // pair), regrid every tick, never resurrect dead probe foes, status timers drained only by
  // the drives below. Each synergy is compared against a no-synergy control on identical geometry.
  {
    p2.weapons.bombs = 0;
    for (const k of ['wand', 'garlic', 'axe', 'blades', 'pistols', 'bombs', 'flame', 'snowball', 'ringLightning', 'bow']) p2.weapons[k] = 0;
    for (const arr of [g2.combat.bolts, g2.combat.axes, g2.combat.bullets, g2.combat.bombs,
      g2.combat.flames, g2.combat.arrows, g2.combat.snowballs, g2.combat.explosions]) arr.length = 0;
    p2.synergies = {};
    const dmgBak = g2.combat.damagePlayer; g2.combat.damagePlayer = () => false;
    const clearFoes128 = () => { g2.enemies.list.length = 0; g2.enemies.grid.clear(); };
    const regrid128 = () => { g2.enemies.grid.clear(); for (const e of g2.enemies.list) if (!e.dead) g2.enemies.grid.add(e.x, e.y, e); };

    // --- Flaming Arrows + Heart-Piercer (the bow's two synergies, one probe each) ---
    const BOW = CFG.weapons.bow.levels[0];
    const arrowProbe = ({ x }) => {
      clearFoes128();
      for (const arr of [g2.combat.arrows, g2.combat.bolts]) arr.length = 0;
      p2.x = x; p2.y = 600; // pin the owner so sy and the geometry are exact every shot
      const sy = p2.y - p2.def.h * CFG.combat.spawnOriginFrac;
      const foes = [];
      for (const dx of [140, 180, 220]) {
        const e = g2.enemies.spawn('rat', p2.x + dx, sy);
        // Pooled enemy objects inherit status fields from prior probe foes — zero them
        // explicitly (never assume a fresh spawn is clean).
        e.hp = 1e6; e.maxHp = 1e6; e.vx = e.vy = 0; e.state = 'idle';
        e.burnT = 0; e.burnDps = 0; e.blightT = 0; e.slowStacks = []; e.freezeT = 0;
        foes.push(e);
      }
      regrid128();
      p2.weapons.bow = 1; p2._bowCd = 0; p2._bowCharge = CFG.weapons.bow.charge * 0.5;
      let ticks = 0;
      while (!g2.combat.arrows.length && ticks < 60) { // fire pass until the arrow looses
        foes[0].x = p2.x + 140; foes[1].x = p2.x + 180; foes[2].x = p2.x + 220;
        for (const e of foes) { e.y = sy; e.vx = e.vy = 0; }
        regrid128();
        fire162(); ticks++;
      }
      const arrow = g2.combat.arrows[0];
      let hits = 0, burnSeen = false;
      // Drive combat ONLY (never enemies.update — the foes stay exactly where pinned).
      for (let n = 0; n < 90 && g2.combat.arrows.length; n++) {
        g2.combat.update(1 / 60, g2.players, g2.enemies);
        if (arrow.hit.size > hits) hits = arrow.hit.size;
        if (foes.some((e) => (e.burnT || 0) > 0)) burnSeen = true;
      }
      const dealt = foes.map((e) => 1e6 - e.hp);
      return { arrow, ticks, hits, burnSeen, dealt };
    };
    // Control: plain bow — one hit, no burn, base damage
    p2.synergies = {};
    const plain = arrowProbe({ x: 900 });
    assert(plain.arrow && plain.hits === 1 && !plain.burnSeen,
      `12.8 control: plain arrow hits once, no burn (hits=${plain.hits} burn=${plain.burnSeen})`);
    assert(Math.abs(plain.dealt[0] - BOW.dmg * p2.dmgMul) < 1e-6 && plain.dealt.slice(1).every((d) => d === 0),
      `12.8 control: plain arrow damage = base (dealt=${plain.dealt.map((d) => d.toFixed(2))})`);
    // Flaming Arrows L1: arrow carries the row → hit foe burns with the row's numbers
    p2.synergies = { flamingArrows: 1 };
    const FA = CFG.synergies.flamingArrows.levels[0];
    const fa = arrowProbe({ x: 1500 });
    assert(fa.arrow.flaming === FA, '12.8 flamingArrows: the fired arrow carries the synergy level row');
    assert(fa.burnSeen && fa.dealt[0] > 0,
      `12.8 flamingArrows: struck foe ignites (burnSeen=${fa.burnSeen} dealt=${fa.dealt[0].toFixed(2)})`);
    const burnFoe = g2.enemies.list.find((e) => (e.burnT || 0) > 0);
    assert(Math.abs(burnFoe.burnDps - FA.dps) < 1e-9 && Math.abs(burnFoe.burnT - FA.dur) <= 1 / 60,
      `12.8 flamingArrows: burn = row dps/dur (dps=${burnFoe.burnDps} burnT=${burnFoe.burnT})`);
    // Heart-Piercer L1: +bonus damage on the FIRST foe, pierces into the second
    p2.synergies = { heartPiercer: 1 };
    const HP1 = CFG.synergies.heartPiercer.levels[0];
    const hpj = arrowProbe({ x: 2100 });
    assert(hpj.arrow.pierce === HP1.pierce && Math.abs(hpj.arrow.dmg - (BOW.dmg * p2.dmgMul + HP1.bonus)) < 1e-6,
      `12.8 heartPiercer: arrow carries pierce budget + bonus damage (pierce=${hpj.arrow.pierce} dmg=${hpj.arrow.dmg})`);
    assert(hpj.hits === 1 + HP1.pierce && hpj.dealt[0] > 0 && hpj.dealt[1] > 0 && hpj.dealt[2] === 0,
      `12.8 heartPiercer: pierces exactly ${HP1.pierce} extra foe(s) (hits=${hpj.hits} dealt=${hpj.dealt.map((d) => d.toFixed(0))})`);
    assert(Math.abs(hpj.dealt[0] - (BOW.dmg * p2.dmgMul + HP1.bonus)) < 1e-6,
      `12.8 heartPiercer: first-foe damage = base + bonus (${hpj.dealt[0].toFixed(2)})`);
    p2.weapons.bow = 0; p2.synergies = {};
    for (const arr of [g2.combat.arrows]) arr.length = 0; clearFoes128();

    // --- Blue Flame: the snowball burst flash-freezes + burns on impact ---
    const snowProbe = () => {
      // x=500: the ONLY foe inside wandRange (380) must be this probe's target — a
      // leftover at +140 from an earlier probe sits closer and steals the aim.
      clearFoes128(); g2.combat.snowballs.length = 0;
      p2.x = 500; p2.y = 600;
      const e = g2.enemies.spawn('rat', p2.x + 130, p2.y);
      // Pool reuse inherits the control burst's slow stack — zero every status field.
      e.hp = 1e6; e.maxHp = 1e6; e.burnT = 0; e.burnDps = 0; e.blightT = 0;
      e.slowStacks = []; e.freezeT = 0;
      let ticks = 0;
      // Pin cd=0 every fire pass: the control shot sets cd = S.cd, which would delay
      // this probe's emission past its own first fire pass otherwise.
      while (g2.combat.snowballs.length === 0 && ticks < 90) { p2._snowCd = 0; fire162(); ticks++; }
      const ball = g2.combat.snowballs[0];
      let burstAt = -1;
      for (let n = 0; n < 180; n++) {
        e.x = p2.x + 130; e.y = p2.y; regrid128();
        g2.combat.update(1 / 60, g2.players, g2.enemies); // burst queries the grid we just pinned
        if (!g2.combat.snowballs.length) { burstAt = n; break; }
      }
      return { ball, e, burstAt };
    };
    p2.weapons.snowball = 1; p2._snowCd = 0;
    const plainSnow = snowProbe();
    assert(plainSnow.ball && !plainSnow.ball.blue && !(plainSnow.e.freezeT > 0) && !(plainSnow.e.burnT > 0),
      '12.8 control: plain burst freezes/burns nothing');
    // Synergy level 5 (the D76 card): the probe must set the SAME level it expects on the ball.
    p2.synergies = { blueFlame: 5 };
    const BF = CFG.synergies.blueFlame.levels[4]; // L5 row — the card must deliver its freeze (D76)
    const bf = snowProbe();
    assert(bf.ball.blue === BF, '12.8 blueFlame: the lobbed snowball carries the synergy level row');
    assert(bf.e.freezeT > 0 && Math.abs(bf.e.burnDps - BF.dps) < 1e-9 && (bf.e.burnT || 0) > 0,
      `12.8 blueFlame: burst freezes + burns on impact (freezeT=${bf.e.freezeT} dps=${bf.e.burnDps})`);
    assert(bf.e.slowStacks.length === 1, '12.8 blueFlame: the burst still lays its slow stack (12.5 pipeline intact)');
    p2.weapons.snowball = 0; p2.synergies = {};
    clearFoes128(); g2.combat.snowballs.length = 0; g2.combat.explosions.length = 0;

    // --- Storm Volley: every 4th VOLLEY both twin rounds carry the strike; a lone
    // second round still spends its slot (D79 cadence) ---
    p2.synergies = { stormVolley: 1 };
    const SV = CFG.synergies.stormVolley.levels[0];
    let volley = 0, loneStrike = -1, both4 = false;
    const pistolProbe = (oneFoe) => {
      clearFoes128(); g2.combat.bullets.length = 0;
      p2.x = 500; p2.y = 600; p2._pistolCd = 0;
      const e1 = g2.enemies.spawn('rat', p2.x + 140, p2.y);
      if (!oneFoe) g2.enemies.spawn('rat', p2.x - 140, p2.y);
      regrid128();
      let n = 0;
      while (g2.combat.bullets.length === 0 && n < 90) { fire162(); n++; }
      const bs = g2.combat.bullets.slice();
      g2.combat.bullets.length = 0;
      return bs;
    };
    p2.weapons.pistols = 1; p2._bulletShots = 0;
    let probeGuard = 0;
    while (volley < 8 && probeGuard++ < 400) {
      volley++;
      const loneSecond = volley === 5 || volley === 7; // only ONE foe → second round aims at nothing
      const bs = pistolProbe(loneSecond);
      if (bs.length !== 2) continue; // a trigger with no target spends nothing — only count real volleys
      const struck = bs.filter((b) => b.storm === SV).length;
      if (volley % 4 === 0) { if (struck === 2) both4 = true; }
      else if (struck > 0 && loneStrike < 0) loneStrike = volley;
    }
    assert(volley === 8, `12.8 stormVolley: probe completed 8 volleys (got ${volley})`);
    assert(loneStrike < 0, '12.8 stormVolley: no strike before the 4th volley');
    assert(both4, '12.8 stormVolley: BOTH twin rounds carry the strike on the 4th volley (D79)');
    // The strike itself: bullet impact → S.dmg damage + chain arc with shock stacks
    clearFoes128(); g2.combat.bullets.length = 0;
    p2.x = 500; p2.y = 600;
    const svT1 = g2.enemies.spawn('rat', p2.x + 140, p2.y);
    svT1.hp = 1e6; svT1.maxHp = 1e6;
    // T2 beyond the bullet's hit circle (bulletR=5): only the strike's chain can reach it
    const svT2 = g2.enemies.spawn('rat', p2.x + 140 + CFG.combat.ringJumpR * 0.6, p2.y);
    svT2.hp = 1e6; svT2.maxHp = 1e6;
    regrid128();
    // Aim straight at T1's center (bullet origin = mid-torso y, foes sit at feet y —
    // a flat ang=0 shot passes above their hit circles). Then fly the round across
    // the gap; impact → _strike(SV.dmg) + _chainArc into T2 (1 shock stack, no re-proc).
    const svAng = Math.atan2(svT1.y - (p2.y - p2.def.h * CFG.combat.spawnOriginFrac), svT1.x - p2.x);
    g2.combat.fireBullet(p2.x, p2.y - p2.def.h * CFG.combat.spawnOriginFrac, svAng, 1, null, p2, SV);
    let svTicks = 0;
    while (svT1.hp >= 1e6 && svTicks < 40) { g2.combat.update(1 / 60, g2.players, g2.enemies); svTicks++; }
    assert(svT1.hp < 1e6 && svT2.hp < 1e6,
      `12.8 stormVolley: the strike damages the struck foe + chains (t1=${(1e6 - svT1.hp).toFixed(0)} t2=${(1e6 - svT2.hp).toFixed(0)})`);
    // Bullet impact damage (1) + the strike (SV.dmg): the round's own dmg resolves first.
    assert(Math.abs((1e6 - svT1.hp) - (SV.dmg + 1)) < 1e-6, `12.8 stormVolley: struck foe takes bullet dmg + S.dmg (${SV.dmg} + 1)`);
    assert(svT2.shockStacks.length === 1 && svT2.stunT === 0,
      '12.8 stormVolley: chained foe gains 1 shock stack, never re-procs');
    p2.weapons.pistols = 0; p2.synergies = {}; p2._bulletShots = 0;
    clearFoes128();
    for (const arr of [g2.combat.bullets, g2.combat.bolts, g2.combat.axes, g2.combat.bombs,
      g2.combat.flames, g2.combat.arrows, g2.combat.snowballs, g2.combat.explosions]) arr.length = 0;
    g2.combat.damagePlayer = dmgBak;
    syn128Done = true;
  }
}

// 16.3 — Pyre Lance flame: +33% stream length, 2x flow/extension, LEAD-while-moving.
// Controlled m01 game; Math.random SEEDED with mulberry32(163) — math.js's `rand`
// is a const wrapper around Math.random, and combat.js imports it live, so the
// stub makes the flame's per-flame speed/life/spray deterministic (restored after).
// The player's velocity is fixed, so the momentum term is known exactly (vx0 −
// v_player × flameMomentum = the pure emission velocity). Wobble is a draw-only
// offset — positions are exact.
{
  const g3 = new Game({
    input: new Input(canvas, { joyBase: byId['joy-base'], joyKnob: byId['joy-knob'], dashBtn: byId['btn-dash'] }),
    loop: { timescale: 1, hitStop() {} }, ctx: makeCtx(), mctx, characters, items,
  });
  g3.resize(1280, 800);
  g3.startRun('m01');
  const p3 = g3.player;
  const C3 = CFG.combat;
  const realRandom = Math.random;
  p3.vx = 300; p3.vy = 0; // moving east, toward the target
  Math.random = mulberry32(163);
  g3.combat.emitFlame(p3.x, p3.y, 0, 6, 4, 2.5, p3); // flame A: the moving player's shot
  Math.random = mulberry32(163); // same seed → identical sp/spray/life (A/B pair)
  p3.vx = 0; p3.vy = 0; // parked player = the stationary control; rise only bends vy, x stays drag-only
  g3.combat.emitFlame(p3.x, p3.y, 0, 6, 4, 2.5, p3); // flame B: stationary control shot
  const fA = g3.combat.flames[g3.combat.flames.length - 2];
  const fB = g3.combat.flames[g3.combat.flames.length - 1];
  const vx0 = fA.vx, Lf = fA.life;
  const spA = Math.hypot(vx0 - 300 * C3.flameMomentum, fA.vy); // pure emission speed
  assert(Math.abs(spA - C3.flameSpeed) <= C3.flameSpeedVar, '16.3: emission speed in the 2x band (520 ± 160)');
  assert(fA.life === fB.life && fA.vy === fB.vy, '16.3: A/B pair identical except momentum (same seed)');
  let moved = 0;
  for (let i = 0; i < 240; i++) {
    const x0 = fA.x;
    g3.combat.update(1 / 60, g3.players, g3.enemies); // flames removed at age ≥ Lf (pass enemies, no early kill)
    if (fA.x !== x0) moved++;
  }
  Math.random = realRandom; // restore for any later sections (all RNG above deterministic)
  // x travel = the engine's own recurrence (vx *= dr; x += vx·dt), replayed
  // bit-exact over the N ticks the flame actually moved (age < Lf each tick).
  const dt3 = 1 / 60, dr3 = Math.exp(-C3.flameDrag * dt3);
  let ev = vx0, kx = p3.x; // same starting point as f.x (float add is non-associative)
  for (let j = 0; j < moved; j++) { ev *= dr3; kx += ev * dt3; }
  assert(fA.x === kx, `16.3: flame x-travel = bit-exact drag integral (got ${fA.x.toFixed(3)}, want ${kx.toFixed(3)})`);
  const reachA = (C3.flameSpeed / C3.flameDrag) * (1 - Math.exp(-C3.flameDrag * C3.flameLife));
  const reachBase = (260 / 2.0) * (1 - Math.exp(-2.0 * 0.65)); // pre-16.3 build (260/80/2.0/0.65)
  assert(reachA > reachBase * 1.32 && reachA < reachBase * 1.34,
    `16.3: stream length ~+33% vs the pre-16.3 build (${reachA.toFixed(1)} vs ${reachBase.toFixed(1)})`);
  // LEAD-while-moving (D70 directional-momentum hypothesis): identical-emission A/B —
  // the moving shot's x must lead the stationary control's x by the closed-form
  // momentum integral (v_player × flameMomentum / drag × (1 − e^(−drag·life))).
  const lead = fA.x - fB.x;
  const momX = (300 * C3.flameMomentum) / C3.flameDrag * (1 - Math.exp(-C3.flameDrag * Lf));
  assert(Math.abs(lead - momX) / momX < 0.05,
    `16.3: moving shot leads the stationary control by the momentum integral (got ${lead.toFixed(1)}, want ${momX.toFixed(1)} px)`);
  assert(lead > 30, `16.3: momentum adds lead travel (${lead.toFixed(1)} px > 30 px) — the jet does not trail the player`);
}

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
  const { joinProfile } = await import('../js/net/coop.js');
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

  rawA.send({ t: 'hello', levelKey: 'm01', profile: joinProfile(hostG.meta, hostG.chars) });
  const jA = await rawA.wait((m) => m.t === 'joined', 'host joined');
  assert(jA.seat === 0, '11.2: first joiner is host seat 0');
  rawB.send({ t: 'hello', levelKey: 'm01', profile: joinProfile(c1G.meta, c1G.chars) });
  await rawB.wait((m) => m.t === 'joined', 'c1 joined');
  rawC.send({ t: 'hello', levelKey: 'm01', profile: joinProfile(c2G.meta, c2G.chars) });
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
  // 11.6.3: these profiles carry chars=[starter] (fresh LS) → all-starter lobby →
  // the host opens on the ghost entry pick; consume it so the sim broadcasts state.
  assert(hostG._ghost && hostG.state === 'LEVELUP' && hostG.cards.length === 2,
    '11.6.3 (via 11.2): all-starter lobby opens on the 2-card ghost entry pick');
  hostG.pickCard(0);
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
  assert(lastSt.v === SNAP_V && lastSt.step > 100 && lastSt.score >= 0,
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
  // (CFG.characters.mage.weapon) is granted at reset by nobody, so upgrades to
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

// 11.6.3 — ghost fallback E2E (D59/D62): real relay + Game instances.
// (a) all-starter 3P → every seat ghosts: the host opens on exactly its 2-card
// starting pair, remotes auto-receive ghost sheets + disjoint pairs, a mid-run
// 4th joiner ghosts in with a pair disjoint from all three. (b) mixed lobby
// (one seat has a non-starter unlocked) → NO ghosting.
{
  const { createGameServer, attachCoopRoom } = await import('../tools/serve.mjs');
  const { joinProfile } = await import('../js/net/coop.js');
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
        else if (Date.now() - t0 > ms) { clearInterval(to); rej(new Error('11.6.3 E2E timeout: ' + what)); }
      }, 5);
    });
    c.send = (m) => c.w.send(JSON.stringify(m));
    raws.push(c);
    return c;
  };
  const dummyLoop = { timescale: 1, hitStop() {} };
  const mkGame = () => {
    const g = new Game({
      input: new Input(canvas, { joyBase: byId['joy-base'], joyKnob: byId['joy-knob'], dashBtn: byId['btn-dash'] }),
      loop: dummyLoop, ctx: makeCtx(), mctx, characters, items,
    });
    g.resize(1280, 800);
    return g;
  };
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
  const DT = 1 / 60;
  const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
  const keepAlive = (g) => {
    for (const p of g.players) if (p.dead || p.hp < p.maxHp * 0.5) { p.dead = false; p.hp = p.maxHp; p.iframes = 5; }
  };

  // --- (a) all-starter lobby → ghost run ---
  const hostG = mkGame(), c1G = mkGame(), c2G = mkGame(), c3G = mkGame();
  const rawA = mkRaw(), rawB = mkRaw(), rawC = mkRaw(), rawD = mkRaw();
  await Promise.all([rawA, rawB, rawC, rawD].map((c) => c.opened));
  wire(hostG, rawA); wire(c1G, rawB); wire(c2G, rawC);
  rawA.send({ t: 'hello', levelKey: 'm01', profile: joinProfile(hostG.meta, hostG.chars) });
  await rawA.wait((m) => m.t === 'joined', 'host joined');
  rawB.send({ t: 'hello', levelKey: 'm01', profile: joinProfile(c1G.meta, c1G.chars) });
  await rawB.wait((m) => m.t === 'joined', 'c1 joined');
  rawC.send({ t: 'hello', levelKey: 'm01', profile: joinProfile(c2G.meta, c2G.chars) });
  await rawC.wait((m) => m.t === 'joined', 'c2 joined');

  hostG.startRun('m01');
  assert(hostG._ghost, '11.6.3: all-starter lobby → ghost run (D59)');
  assert(hostG.state === 'LEVELUP' && hostG.cards.length === 2
    && hostG.cards.every((c) => c.kind === 'weapon' && c.level === 1)
    && hostG.player.charKey === 'ghost' && hostG.player.maxHp === CFG.characters.ghost.hp + hostG.player.metaHp,
    '11.6.3: host seat opens on its 2-card starting pair (ghost: baseline 100 HP + meta, no starting weapon)');
  const hostPair = hostG.cards.map((c) => c.key);
  const pl1 = hostG.players[1], pl2 = hostG.players[2];
  assert(pl1.charKey === 'ghost' && pl2.charKey === 'ghost', '11.6.3: remote seats ghosted');
  const w1 = Object.keys(pl1.weapons), w2 = Object.keys(pl2.weapons);
  assert(w1.length === 1 && w2.length === 1,
    `11.6.3: remotes auto-received their starting weapon (${w1}/${w2})`);
  const allFlat = [...hostPair, ...w1, ...w2];
  assert(new Set(allFlat).size === allFlat.length && allFlat.every((k) => CFG.weapons[k]),
    '11.6.3: host pair + both remote picks — never duplicated across players (D59)');
  assert(pl1._ghostOffers.length === 2 && pl2._ghostOffers.length === 2,
    '11.6.3: remotes keep the remainder of their pair for their first level-up');
  hostG.pickCard(0); // consume the entry pick
  assert(Object.keys(hostG.player.weapons).length === 1 && hostG.state === 'PLAYING',
    '11.6.3: entry pick applied → run continues');
  // 11.8 — per-player theming (D62): every ghosted seat is themed by its UNIQUE Pac-Man tint
  const hudG = initHud(hostG);
  assert(byId['hud'].style._props['--char'] === CFG.ghostColors[0]
    && byId['touch-ui'].style._props['--char'] === CFG.ghostColors[0]
    && byId['hud'].style._props['--char-line'] === 'rgba(255,75,75,0.65)',
    '11.8: local theming roots not themed by the seat-0 ghost tint (Blinky)');
  assert(hudG.panels[0].root.style._props['--char'] === CFG.ghostColors[1]
    && hudG.panels[1].root.style._props['--char'] === CFG.ghostColors[2],
    '11.8: seat-1/seat-2 panels not themed by their per-seat ghost tints (Pinky/Inky)');

  const rs1 = await rawB.wait((m) => m.t === 'runstart', 'c1 runstart');
  const rs2 = await rawC.wait((m) => m.t === 'runstart', 'c2 runstart');
  assert(rs1.seed === rs2.seed, '11.6.3: shared seed relayed');
  for (let i = 0; i < 60; i++) {
    keepAlive(hostG); keepAlive(c1G); keepAlive(c2G);
    hostG.update(DT); c1G.update(DT); c2G.update(DT);
    if (i % 20 === 19) await tick();
  }
  await rawB.wait((m) => m.t === 'state' && m.players.length === 3, 'c1 first state');
  assert(c1G.state === 'PLAYING' && c1G._ghost && c1G.player.charKey === 'ghost',
    '11.6.3: client (seat 1) renders its own ghost seat from the roster profiles');

  // Mid-run 4th joiner: the lobby is STILL all-starter → it ghosts in too, with a
  // pair disjoint from the three existing ones.
  wire(c3G, rawD);
  rawD.send({ t: 'hello', levelKey: 'm01', profile: joinProfile(c3G.meta, c3G.chars) });
  const jD = await rawD.wait((m) => m.t === 'joined', 'c3 joined');
  assert(jD.seat === 3, '11.6.3: joiner takes seat 3');
  const roD = await rawA.wait((m) => m.t === 'roster' && m.players.length === 4, 'host roster 4');
  assert(roD.players[3].profile.chars.length === 1, '11.6.3: roster carries the joiner char state');
  await tick(60);
  const pl3 = hostG.players[3];
  assert(pl3 && pl3.charKey === 'ghost', '11.6.3: mid-run joiner ghosted (D59 all-starter still holds)');
  const w3 = Object.keys(pl3.weapons);
  assert(w3.length === 1 && !allFlat.includes(w3[0]),
    `11.6.3: joiner auto-picked a 4th unique starting weapon (${w3})`);
  // The 4 ghost first-picks (host entry, both remote starts, joiner start) must
  // each be registered to their picker; live pump auto-picks may add legitimate
  // extra entries (11.5) — assert the true first-picks, not a strict count.
  const expectOwner = { [hostPair[0]]: hostG.player, [w1[0]]: pl1, [w2[0]]: pl2, [w3[0]]: pl3 };
  assert(Object.keys(expectOwner).every((k) => hostG.weaponOwner[k] === expectOwner[k])
    && new Set(Object.values(expectOwner)).size === 4,
    '11.6.3: every ghost pick registered its distinct first-picker owner (11.5)');
  for (let i = 0; i < 30; i++) {
    keepAlive(hostG); keepAlive(c1G); keepAlive(c2G); keepAlive(c3G);
    hostG.update(DT); c1G.update(DT); c2G.update(DT); c3G.update(DT);
    if (i % 20 === 19) await tick();
  }

  // --- (b) mixed lobby → no ghosting (fresh room: host-leave closes (a)'s) ---
  rawA.w.close();
  await rawB.wait((m) => m.t === 'closed' && m.reason === 'host-leave', 'room closed (host leave)');
  const h2 = mkGame(), m1 = mkGame(), m2 = mkGame();
  const rA = mkRaw(), rB = mkRaw(), rC = mkRaw();
  await Promise.all([rA, rB, rC].map((c) => c.opened));
  wire(h2, rA); wire(m1, rB); wire(m2, rC);
  const rangerChars = ['mage', 'ranger'];
  rA.send({ t: 'hello', levelKey: 'm01', profile: joinProfile(h2.meta, rangerChars) });
  await rA.wait((m) => m.t === 'joined', 'mixed host joined');
  rB.send({ t: 'hello', levelKey: 'm01', profile: joinProfile(m1.meta, m1.chars) });
  await rB.wait((m) => m.t === 'joined', 'mixed c1 joined');
  rC.send({ t: 'hello', levelKey: 'm01', profile: joinProfile(m2.meta, m2.chars) });
  await rC.wait((m) => m.t === 'joined', 'mixed c2 joined');
  h2.startRun('m01');
  // 11.6.4 (D56): the two starter-only seats both hold mage — seat order keeps
  // the FIRST pick unique; the exhausted displaced seats ghost (D59) with their
  // disjoint 2-offer deal. The host (a playable pick) is never ghosted here.
  assert(h2.state === 'PLAYING' && h2.player.charKey === 'mage' && h2.player.weapons.wand === 1,
    '11.6.3/11.6.4: mixed lobby — host keeps its char + starting weapon, no ghost entry pick');
  const q1 = h2.players[1], q2 = h2.players[2];
  assert(q1.charKey === 'ghost' && q2.charKey === 'ghost',
    '11.6.4: duplicated starter picks — the host keeps mage; both exhausted remote seats ghost (D56/D59)');
  const qw1 = Object.keys(q1.weapons), qw2 = Object.keys(q2.weapons);
  assert(qw1.length === 1 && qw2.length === 1 && qw1[0] !== qw2[0]
    && q1._ghostOffers.length === 2 && q2._ghostOffers.length === 2,
    '11.6.4: ghosted seats auto-pick disjoint starting weapons + keep their pair');

  for (const c of raws) c.w.close();
  await new Promise((res) => { srv.closeAllConnections?.(); srv.close(res); });
}

// 11.6.4 — co-op character sync E2E (D53/D56/D57): distinct per-seat chars from
// the D53 profiles (host sim: per-char stats + starting weapon), a mid-run
// joiner whose selected char is TAKEN gets reassigned to its next unlocked
// char (and the client renders the host-assigned char), plus the select screen
// greying out taken chars (D56).
{
  const { createGameServer, attachCoopRoom } = await import('../tools/serve.mjs');
  const { joinProfile, resolveChars } = await import('../js/net/coop.js');
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
        else if (Date.now() - t0 > ms) { clearInterval(to); rej(new Error('11.6.4 E2E timeout: ' + what)); }
      }, 5);
    });
    c.send = (m) => c.w.send(JSON.stringify(m));
    raws.push(c);
    return c;
  };
  const dummyLoop = { timescale: 1, hitStop() {} };
  const mkGame = () => {
    const g = new Game({
      input: new Input(canvas, { joyBase: byId['joy-base'], joyKnob: byId['joy-knob'], dashBtn: byId['btn-dash'] }),
      loop: dummyLoop, ctx: makeCtx(), mctx, characters, items,
    });
    g.resize(1280, 800);
    return g;
  };
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
  const DT = 1 / 60;
  const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
  const keepAlive = (g) => {
    for (const p of g.players) if (p.dead || p.hp < p.maxHp * 0.5) { p.dead = false; p.hp = p.maxHp; p.iframes = 5; }
  };

  // Per-seat selections (simulated LS state): distinct chars on three seats.
  const hostG = mkGame(), c1G = mkGame(), c2G = mkGame(), c3G = mkGame();
  const rawA = mkRaw(), rawB = mkRaw(), rawC = mkRaw(), rawD = mkRaw();
  await Promise.all([rawA, rawB, rawC, rawD].map((c) => c.opened));
  wire(hostG, rawA); wire(c1G, rawB); wire(c2G, rawC); wire(c3G, rawD);
  hostG.chars = ['mage']; hostG.charKey = 'mage';
  c1G.chars = ['mage', 'warden']; c1G.charKey = 'warden';
  c2G.chars = ['mage', 'ranger']; c2G.charKey = 'ranger';
  rawA.send({ t: 'hello', levelKey: 'm01', profile: joinProfile(hostG.meta, hostG.chars, hostG.charKey) });
  await rawA.wait((m) => m.t === 'joined', 'host joined');
  rawB.send({ t: 'hello', levelKey: 'm01', profile: joinProfile(c1G.meta, c1G.chars, c1G.charKey) });
  await rawB.wait((m) => m.t === 'joined', 'c1 joined');
  rawC.send({ t: 'hello', levelKey: 'm01', profile: joinProfile(c2G.meta, c2G.chars, c2G.charKey) });
  await rawC.wait((m) => m.t === 'joined', 'c2 joined');

  hostG.startRun('m01');
  assert(!hostG._ghost && hostG.state === 'PLAYING' && hostG.player.charKey === 'mage',
    '11.6.4: mixed lobby → no ghosting, host keeps its own char');
  const pl1 = hostG.players[1], pl2 = hostG.players[2];
  assert(pl1.charKey === 'warden' && pl1.maxHp === CFG.characters.warden.hp + pl1.metaHp && pl1.weapons.garlic === 1
    && Math.abs(pl1.dmgMul - CFG.characters.warden.dmg) < 1e-9,
    '11.6.4: remote (seat 1) spawned from its profile char — warden 150 HP, ×0.85 dmg, Wraith Garlic');
  assert(pl2.charKey === 'ranger' && pl2.maxHp === CFG.characters.ranger.hp + pl2.metaHp && pl2.weapons.blades === 1
    && Math.abs(pl2.dmgMul - CFG.characters.ranger.dmg) < 1e-9,
    '11.6.4: remote (seat 2) spawned from its profile char — ranger 110 HP, Aegis Blades');
  assert(new Set([hostG.player.charKey, pl1.charKey, pl2.charKey]).size === 3,
    '11.6.4: per-seat chars unique across the lobby (D56)');
  // 11.6b (D29 respec): starting-weapon pre-ownership — each seat's starting weapon is
  // registered owned at run start, so it is excluded from the OTHER seats' offers.
  assert(hostG.weaponOwner.wand === hostG.player && hostG.weaponOwner.garlic === pl1
    && hostG.weaponOwner.blades === pl2,
    '11.6b: starting weapons pre-owned at run start (wand/garlic/blades → their seats)');
  assert(hostG._ownerExclusion(pl1).has('wand') && hostG._ownerExclusion(pl1).has('blades')
    && !hostG._ownerExclusion(pl1).has('garlic')
    && hostG._ownerExclusion(hostG.player).has('garlic') && hostG._ownerExclusion(hostG.player).has('blades')
    && !hostG._ownerExclusion(hostG.player).has('wand'),
    '11.6b: other seats\' starters are excluded from offers, own starter is not');
  // Synergy first-pick ownership: host force-picks blight (forced card bypasses gating,
  // same pattern as the 11.5 garlic pick); the other seats never see it.
  hostG.levelupQueue = 1;
  hostG.state = 'LEVELUP';
  hostG.cards = [{ kind: 'synergy', key: 'blight', level: 1 }];
  hostG.pickCard(0);
  assert(hostG.state === 'PLAYING', '11.6b: forced pick drains the queue (back to PLAYING)');
  assert(hostG.player.synergies.blight === 1 && hostG.weaponOwner.blight === hostG.player,
    '11.6b: first picker owns the synergy (host pick registered)');
  assert(!hostG._ownerExclusion(hostG.player).has('blight'),
    '11.6b: owner keeps their own synergy (no self-exclusion)');
  // Max the cap + passives so pl1's pool is exactly the gated synergies {blight, phoenix,
  // heartMagnet} (12.6 rebaseline: hp+magnet maxed also gates heartMagnet): blight must be
  // absent (host-owned), phoenix + heartMagnet (unowned) must be present.
  const pl1P0 = { ...pl1.passives };
  pl1.weapons = { wand: 5, garlic: 5, axe: 5 }; // 3 maxed = cap 3 filled; gates blight(wand+garlic)+phoenix(passives) only
  pl1.passives = { speed: 3, hp: 3, dmg: 5, magnet: 3, regen: 3 };
  const pl1Excl = cardOffers(pl1.weapons, pl1.passives, pl1.synergies, hostG.rng, weaponCap(3), hostG._ownerExclusion(pl1));
  assert(pl1Excl.every((c) => c.kind === 'synergy' && (c.key === 'phoenix' || c.key === 'heartMagnet'))
    && !pl1Excl.some((c) => c.key === 'blight') && pl1Excl.some((c) => c.key === 'phoenix'),
    '12.6: owned blight never offered to another seat (pool = {phoenix, heartMagnet})');
  pl1.weapons = { garlic: 1 }; pl1.passives = pl1P0; recomputeStats(pl1); // restore the warden baseline
  for (let i = 0; i < 40; i++) {
    keepAlive(hostG); keepAlive(c1G); keepAlive(c2G);
    hostG.update(DT); c1G.update(DT); c2G.update(DT);
    if (i % 20 === 19) await tick();
  }

  // 11.7 — co-op HUD corners (host side): TL = seat 0 (host), TR/BL/BR per-seat panels,
  // visible count = player count, join order (A5). The host Game drives a second HUD
  // instance on the shared stub #hud (panels are the appended children).
  const hudHost = initHud(hostG);
  const [pan1, pan2, pan3] = hudHost.panels;
  hudHost.update();
  assert(byId['hud'].classList.contains('coop'), '11.7: co-op run did not add the coop class to #hud');
  assert(!byId['hud'].classList.contains('hidden'), '11.7: HUD hidden during the co-op run');
  assert(byId['hp-label'].textContent === `${Math.max(0, Math.ceil(hostG.player.hp))} / ${hostG.player.maxHp}`
    && byId['lvl-badge'].textContent === `LV ${hostG.player.level}`,
    '11.7: TL panel not driven by seat-0 (host) data');
  // 11.8 — per-char theming (D62 channel): local/seat-0 roots = Mage accent, seat panels themed per char
  assert(byId['hud'].style._props['--char'] === CFG.characters.mage.accent
    && byId['touch-ui'].style._props['--char'] === CFG.characters.mage.accent
    && byId['hud'].style._props['--char-grad'] === `linear-gradient(90deg, ${CFG.characters.mage.accent}, rgb(197,241,255))`,
    '11.8: local theming roots not themed by the seat-0 (Mage) accent');
  assert(pan1.root.style._props['--char'] === CFG.characters.warden.accent
    && pan1.root.style._props['--char-soft'] === 'rgba(255,180,84,0.16)'
    && pan2.root.style._props['--char'] === CFG.characters.ranger.accent,
    '11.8: seat-1/seat-2 panels not themed by the Warden/Ranger accents');
  assert(!pan1.root.classList.contains('off') && pan1.name.textContent === 'Warden',
    '11.7: seat-1 (TR) panel not visible with the assigned char name at 3P');
  pl1.hp = 40;
  hudHost.update();
  assert(pan1.hpLabel.textContent === `40 / ${pl1.maxHp}`, '11.7: seat-1 HP bar not tracking pl1');
  pl1.level = 7;
  hudHost.update();
  assert(pan1.lvl.textContent === 'LV 7', '11.7: seat-1 level badge not tracking pl1');
  pl1.level = 1;
  // 3P = TL+TR+BL (visible count = player count, join order A5) — BR only at 4P.
  assert(!pan2.root.classList.contains('off') && pan2.name.textContent === 'Ranger',
    '11.7: seat-2 (BL) panel not visible with the assigned char name at 3P');
  assert(pan3.root.classList.contains('off'),
    '11.7: seat-3 (BR) panel visible at 3P (only 3 players seated)');

  // Mid-run joiner: its selected char (mage) is TAKEN by the host, and it has
  // swash unlocked → the host reassigns it swash; the client renders that.
  c3G.chars = ['mage', 'swash']; c3G.charKey = 'mage';
  rawD.send({ t: 'hello', levelKey: 'm01', profile: joinProfile(c3G.meta, c3G.chars, c3G.charKey) });
  await rawD.wait((m) => m.t === 'joined', 'c3 joined');
  await rawA.wait((m) => m.t === 'roster' && m.players.length === 4, 'host roster 4');
  await tick(60);
  const pl3 = hostG.players[3];
  assert(pl3 && pl3.charKey === 'swash' && pl3.maxHp === CFG.characters.swash.hp + pl3.metaHp && pl3.weapons.flame === 1,
    '11.6.4: late joiner with a TAKEN pick is reassigned its next unlocked char (swash, Pyre Lance)');
  assert(resolveChars(hostG.netRoster).join() === 'mage,warden,ranger,swash',
    '11.6.4: host-authoritative resolution — every seat unique, seat order');
  await rawD.wait((m) => m.t === 'runstart', 'c3 runstart');
  for (let i = 0; i < 60; i++) {
    keepAlive(hostG); keepAlive(c1G); keepAlive(c2G); keepAlive(c3G);
    hostG.update(DT); c1G.update(DT); c2G.update(DT); c3G.update(DT);
    if (i % 20 === 19) await tick();
  }
  assert(c3G.player.charKey === 'swash' && c3G._ghost === false,
    '11.6.4: joiner client renders the host-assigned char (swash, not the LS pick)');

  // 11.7 — the 4th joiner: BR (seat 3) appears, visible count = 4; then it leaves →
  // the count drops back to 3 and the seat-3 panel hides again.
  for (let i = 0; i < 30; i++) {
    keepAlive(hostG); keepAlive(c1G); keepAlive(c2G); keepAlive(c3G);
    hostG.update(DT); c1G.update(DT); c2G.update(DT); c3G.update(DT);
    if (i % 15 === 14) await tick();
  }
  hudHost.update(); // render-hook equivalent — panels track the live player count
  assert(!pan3.root.classList.contains('off') && pan3.name.textContent === 'Swashbuckler',
    '11.7: seat-3 (BR) panel did not appear for the 4th joiner');
  assert(pan3.root.style._props['--char'] === CFG.characters.swash.accent,
    '11.8: seat-3 panel not themed by the late joiner’s (Swashbuckler) accent');
  rawD.w.close();
  await tick(80);
  for (let i = 0; i < 20; i++) {
    keepAlive(hostG); keepAlive(c1G); keepAlive(c2G); keepAlive(c3G);
    hostG.update(DT); c1G.update(DT); c2G.update(DT); c3G.update(DT);
    if (i % 10 === 9) await tick();
  }
  assert(hostG.players.length === 3, '11.7: seat-3 leave did not reconcile the host roster back to 3');
  hudHost.update();
  assert(pan3.root.classList.contains('off'), '11.7: seat-3 panel still visible after the leave');
  assert(!pan1.root.classList.contains('off') && !pan2.root.classList.contains('off'),
    '11.7: other seat panels disturbed by the seat-3 leave');

  // 11.10 — boss count: N players = N bosses of the current level. The wave is
  // injected through the real _spawns path: fast-forward the host past B.at
  // (240 s) so the next _playingUpdate step fires it (3P → Wraith ×3), then
  // verify count + per-boss ramp + banner + the bosses crossing the wire via
  // the same enemySnap pipeline as every other enemy.
  const bossBanners = [];
  const offBossBanners = hostG.bus.on('banner', (b) => bossBanners.push(b.text));
  hostG.t = 241; // past B.at — the boss wave fires on the next step
  for (let i = 0; i < 10; i++) {
    keepAlive(hostG); keepAlive(c1G); keepAlive(c2G);
    hostG.update(DT); c1G.update(DT); c2G.update(DT);
    if (i % 5 === 4) await tick();
  }
  offBossBanners();
  const bossWave = hostG.enemies.list.filter((e) => e.boss);
  assert(bossWave.length === 3, '11.10: 3P → 3 bosses of the current level (Wraith ×3)');
  assert(bossWave.every((e) => e.type === 'wraith'
    && Math.abs(e.maxHp - CFG.enemies.wraith.hp * hostG.enemies.diff * hostG.enemies.coopS) < 1e-6),
    '11.10: every boss carries the +33%/player ramp (maxHp = base × diff × coopScale(3), Q7)');
  assert(bossBanners.includes('THE WRAITH AWAKENS ×3'), '11.10: co-op boss banner names the ×N wave');
  await tick(40);
  assert(c1G.enemies.list.filter((e) => e.boss).length === 3,
    '11.10: client sees all 3 bosses in the per-step state (enemySnap boss flag, N-pipeline)');

  // 11.12 — pause-on-blur in co-op (risk register: the co-op blur rule = the documented
  // host-only pause — a client blur cannot pause the shared run; the UI says "pause is
  // host-only"): what Game._onBlur calls on each browser, asserted here without the
  // global blur listener (the harness doesn't fire window blur).
  if (hostG.state === 'LEVELUP') hostG.pickCard(0); // the run must be PLAYING for the pause
  hostG.pause();
  assert(hostG.state === 'PAUSED', '11.12: host blur-pause did not pause the co-op run');
  assert(c1G.state === 'PLAYING', '11.12: client stays PLAYING under a host pause (no client pause path)');
  c1G.pause();
  assert(c1G.state === 'PLAYING', '11.12: client pause() is a no-op (the host owns the sim)');
  hostG.resume();
  assert(hostG.state === 'PLAYING', '11.12: host resume did not restore PLAYING');

  // 11.12 — multi-client E2E must reach VICTORY (join → run with locks + scaling →
  // victory): pump the live 3P run from the boss wave to t = 300 (DAWN BREAKS) with
  // all three seats alive (keepAlive per the 11.2/11.3 pattern).
  for (let i = 0; i < 6000 && !(hostG.state === 'GAMEOVER' && hostG.victory); i++) {
    keepAlive(hostG); keepAlive(c1G); keepAlive(c2G);
    if (hostG.state === 'LEVELUP') hostG.pickCard(0); // the run must not park on a level-up
    hostG.update(DT); c1G.update(DT); c2G.update(DT);
    if (i % 20 === 19) await tick();
  }
  assert(hostG.state === 'GAMEOVER' && hostG.victory,
    `11.12: 3P co-op run did not reach victory (state=${hostG.state} t=${hostG.t.toFixed(1)}s)`);

  for (const c of raws) c.w.close();
  await new Promise((res) => { srv.closeAllConnections?.(); srv.close(res); });

  // Greyed-out taken chars in the select screen (D56) — fake co-op lobby on the
  // main game (solo menu state): the other seats' picks are TAKEN + denied.
  const saved = { net: game.net, netMyId: game.netMyId, netRoster: game.netRoster, state: game.state };
  game.net = { sendClosed() {} }; // truthy gate only — the select reads roster/netMyId
  game.netMyId = 'me';
  game.netRoster = [
    { id: 'me', seat: 0, profile: { chars: ['mage', 'warden'], charKey: 'mage' } },
    { id: 'p2', seat: 1, profile: { chars: ['mage', 'warden'], charKey: 'warden' } },
    { id: 'p3', seat: 2, profile: { chars: ['mage', 'ranger'], charKey: 'ranger' } },
  ];
  let denied4 = 0;
  const offDenied4 = game.bus.on('denied', () => denied4++);
  document.getElementById('btn-character').click();
  pump(10);
  const cs4 = byId['char-list'].children;
  assert(cs4.length === 4, '11.6.4: select shows all 4 chars');
  assert(cs4[1].classList.contains('taken') && cs4[2].classList.contains('taken')
    && !cs4[0].classList.contains('taken') && !cs4[3].classList.contains('taken'),
    '11.6.4: co-op — warden/ranger (held by other seats) are greyed TAKEN, own + free stay open');
  cs4[1].click(); // warden is taken → denied, not selected
  assert(denied4 === 1 && game.charKey === 'mage', '11.6.4: tapping a taken char is denied (D56)');
  byId['btn-char-confirm'].click();
  pump(5);
  offDenied4(); // bus.on returns its own unsubscribe
  game.net = saved.net; game.netMyId = saved.netMyId; game.netRoster = saved.netRoster;
}

// self-verification: every one-shot path above must have actually fired
assert(keyPickDone, 'keyboard card pick never exercised');
assert(heartDone && heartAsserted, 'heart pickup path never exercised');
assert(wandOffDone && wandOffAsserted, 'wand-off kill window never exercised');
assert(sawBullets && sawBombs && sawFlames && sawArrows, 'new-weapon projectiles (bullets/bombs/flames/arrows) never observed');
assert(sawBolts && sawAxes && sawBlades && sawGarlic, `22.1: all-weapon E2E — bolts=${sawBolts} axes=${sawAxes} blades=${sawBlades} garlic=${sawGarlic}`);
assert(burnDone && burnAsserted, 'burn DoT kill path never exercised');
assert(dashIFrameStep === 2, 'dash i-frame E2E never completed');
assert(synDone, 'synergy E2E (blight) never completed');
assert(syn128Done, '12.8 per-synergy combat E2Es never completed');
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
  `meta: gameover shards saved → Upgrades buy → maxHp 80 at run start (mage 60+20) · ` +
  `boss spawned · pause/resume + mute · card pick via click + key 1 · all 8 weapons (wand-off kill window) · ` +
  `all 8 weapons observed live (bolts/axes/blades/garlic/bullets/bombs/flames/arrows) · burn DoT kill · dash i-frame E2E · synergy E2E (blight) · 12.8 per-synergy E2Es (flamingArrows burn-on-hit · heartPiercer bonus+pierce exactly 1 extra · blueFlame freeze+burn on burst · stormVolley 4th-volley both-rounds strike + chain shock) · 10.7 empty-pool guard (entry + mid-queue) · heart heal · gem pickup SFX (10.8) · ` +
  `touch stick + dash button · HUD dash --cd driven (10.1) · level select (13.7: 3 cards, locked denied blip + shake, select → backdrop preview + persist) · zoom + Settings (13.8: 0.80↔1.0 persist, Settings mute) · per-level flavor (13.10: NEW MAP UNLOCKED once-at-threshold + unlock-progress line + pickup reskin m02/m03) · scores save/render/clear + per-level lists (13.9: m02/m03 victory → own key, m01 untouched) · quit flow · M02 backdrop (13.2) + m02 real run: Higan skins, ×1.25 stats, Ryū boss (13.3) · M03 backdrop (13.4: sun glow + godrays + fish schools + bubbles) + m03 real run: drowned skins, ×1.56 stats, Great White boss (13.5) · 11.1 co-op transport E2E (real serve.mjs WS room on ephemeral port: host join / seats / full / leave+roster / host-leave close / room re-open) · 11.2/11.3 sync E2E (host+2 clients: shared seed, client tracking, input drive, leave→roster reconcile, ×1.66 spawn) + 11.4 leash (1.5R teleport → pairwise ≤ leashR) + 11.5 exclusivity (first-pick ownership, remote exclusion, per-picker picks, 3P cap) + 11.10 boss count (3P: Wraith ×3 via the real _spawns wave at B.at — each maxHp = base × diff × coopS, ×N banner, all three on the client wire; solo m02/m03 exactly 1 boss) + 11.11 solo invariance (net-free solo: no roster/seat/remotes, coopS 1, cap = base 5, exactly 1 Wraith, per-entry local ownership + empty exclusion) + 11.12 final co-op gate (pause-on-blur = host-only: host blur-pauses, client pause() no-op, host resume + 3P run pumped to VICTORY at t=300) · loop alive throughout`,
);
