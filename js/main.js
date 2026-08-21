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
  const hud = initHud(game);
  const screens = initScreens(game, { icons });
  const sfx = initSfx(game);
  const music = initMusic(game, sfx);

  addEventListener('resize', resize);
  resize();
  loop.start();
}

if (typeof window !== 'undefined') boot();
