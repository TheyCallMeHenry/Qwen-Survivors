// Bootstrap: canvas/DPR setup, input, game, UI + audio wiring, main loop.
// Node-safe: only the final boot() call is guarded so tools/check.mjs can import this module.

import { CFG } from './config.js';
import { Loop } from './core/loop.js';
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

  // 29.1 (diagnostic): ?fps=1 shows a live frame-rate readout so the user can
  // measure on their own phone/desktop (Node-side sim was clean; early-run lag
  // points to device fill cost). URL-gated, DOM-only, one update/second — the
  // render pipeline is untouched. (A CFG config entry would live in config.js,
  // outside this task's write scope; the URL param is the gate.)
  if (new URLSearchParams(location.search).get('fps') === '1') {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:9999;padding:2px 8px;background:rgba(0,0,0,.55);color:#7CFC00;font:14px monospace;pointer-events:none';
    document.body.appendChild(el);
    let last = 0, lastT = performance.now();
    setInterval(() => {
      const n = loop.frames, t = performance.now();
      el.textContent = `${Math.round(((n - last) * 10000) / (t - lastT)) / 10} fps · ${canvas.width}×${canvas.height}px`;
      last = n; lastT = t;
    }, 1000);
  }

  addEventListener('resize', resize);
  resize();
  loop.start();
}

if (typeof window !== 'undefined') boot();
