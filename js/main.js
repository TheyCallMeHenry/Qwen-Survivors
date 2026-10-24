// Bootstrap: canvas/DPR setup, input, game, UI + audio wiring, main loop.
// Node-safe: only the final boot() call is guarded so tools/check.mjs can import this module.

import { CFG } from './config.js';
import { Loop, PerfCounters } from './core/loop.js';
import { Input } from './core/input.js';
import { Game } from './core/game.js';
import { buildCharacters } from './art/characters.js';
import { buildItems, buildIcons } from './art/items.js';
import { initHud } from './ui/hud.js';
import { initScreens } from './ui/screens.js';
import { initSfx } from './audio/sfx.js';
import { initMusic } from './audio/music.js';

const $ = (id) => document.getElementById(id);

function boot() {
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  document.body.classList.toggle('touch', isTouch);

  const canvas = $('game');
  const ctx = canvas.getContext('2d', { alpha: false }); // full-frame paint every frame (sky/ground)
  const mctx = $('minimap').getContext('2d'); // 264x202, 1:1 with the minimap base — no DPR

  const resize = () => {
    const w = innerWidth, h = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, isTouch ? CFG.perf.dprCapMobile : CFG.perf.dprCapDesktop);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // width reset clears the transform; CSS-px space after this
    game.resize(w, h);
  };

  const input = new Input(canvas, { joyBase: $('joy-base'), joyKnob: $('joy-knob'), dashBtn: $('btn-dash') });
  const characters = buildCharacters();
  const items = buildItems();
  const icons = buildIcons();

  let game;
  const loop = new Loop({
    update: (dt) => game.update(dt),
    render: (dt) => {
      game.render(dt);
      hud.update();
      screens.update();
      sfx.update();
      music.update();
    },
  });
  game = new Game({ input, loop, ctx, mctx, characters, items });

  // Order matters: hud before sfx ('mute' bus event: hud writes LS, sfx reads it — insertion order),
  // sfx before music (ctx must exist before music ticks).
  const hud = initHud(game, { icons });
  const screens = initScreens(game, { icons });
  const sfx = initSfx(game);
  const music = initMusic(game, sfx);

  // 31.1 (diagnostic v2): ?fps=1 reports honest frame pacing and game speed. The 29.1
  // rAF-count average is replaced — it was proven blind (showed 60.0 through a 15 s
  // frozen screen; docs/fps-test-video-review-2026-10-23.md §C). Now: frame-time
  // p50/p95/p99 (ms), the sim/wall ratio decomposed per the loop.js PerfCounters
  // identity (advanced/intended/lost/idle), and a LoAF summary when the browser
  // supports it. URL-gated, DOM-only; off-URL the loop path is untouched (loop.perf stays null).
  if (new URLSearchParams(location.search).get('fps') === '1') {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:9999;padding:4px 8px;background:rgba(0,0,0,.55);color:#7CFC00;font:12px monospace;white-space:pre;pointer-events:none';
    document.body.appendChild(el);
    const perf = new PerfCounters({ step: loop.step });
    loop.perf = perf;
    const t0 = performance.now();
    perf.beginWindow(t0, loop.acc);
    let loaf = false;
    try { // feature-detect: throws on browsers without LoAF (Firefox/Safari) — histogram + ratio still work
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) perf.longFrame(e.duration);
      });
      po.observe({ type: 'long-animation-frame', buffered: true });
      loaf = true;
    } catch { /* no LoAF — the readout says so instead of misattributing stalls (research doc §E4) */ }
    const ms = (v) => Math.round(v * 100) / 100;
    setInterval(() => {
      const s = perf.sample(performance.now(), loop.acc); // percentiles computed once per window here
      const lost = s.lostClamp + s.lostCap;
      el.textContent =
        `p50 ${ms(s.p50)}ms p95 ${ms(s.p95)}ms p99 ${ms(s.p99)}ms · ${s.frames} frames · ${canvas.width}×${canvas.height}px\n` +
        `sim/wall ${Math.round(s.ratio * 1000) / 1000}x — adv ${ms(s.advanced)}s + intended ${ms(s.intended)}s + lost ${ms(lost)}s + idle ${ms(s.idle)}s = wall ${ms(s.wall)}s\n` +
        (loaf ? `LoAF: ${s.loafN} long frames, max ${Math.round(s.loafMax)}ms` : 'LoAF: unsupported here');
    }, CFG.perf.perfWindowMs);
  }

  addEventListener('resize', resize);
  resize();
  loop.start();
}

if (typeof window !== 'undefined') boot();
