// Synthesized SFX + shared audio graph.
// Lazy AudioContext: created/resumed only after the first input.gesture
// (browser autoplay policy — no audio, no warnings, before a gesture).
// Graph: SFX/music/amb buses -> compressor -> master. Mute state lives in
// localStorage (CFG.scores.muteKey, owned by hud.js); re-read here at init and
// on the 'mute' bus event, applied as master gain (zeroed, never persisted).
// Top-level side-effect free (Node-importable via tools/check.mjs).

import { CFG } from '../config.js';

const A = CFG.audio;

// Min seconds between re-plays of a recipe (rate-limits frequent events).
const GAPS = {
  dash: 0.25, kill: 0.04, hurt: 0.2, death: 0, chime: 0.4,
  card: 0.15, banner: 0.6, runstart: 0.5, gameover: 0.5,
  pistol: 0.07, boom: 0.12, fire: 0.09,
};

export function initSfx(game) {
  const bus = game.bus;
  const input = game.input;
  let ctx = null;
  let graph = null;
  let muted = readMuted();

  const off = [];

  function readMuted() {
    try { return localStorage.getItem(CFG.scores.muteKey) === '1'; } catch { return false; }
  }

  function makeNoise(seconds) {
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function ensure() {
    if (ctx || !input.gesture) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    const master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    const mk = (v) => { const g = ctx.createGain(); g.gain.value = v; g.connect(comp); return g; };
    graph = { master, sfx: mk(A.sfxVol), music: mk(A.musicVol), amb: mk(A.ambVol), noise: makeNoise(1) };
    comp.connect(master);
    master.connect(ctx.destination);
  }

  function setMuted(v) {
    muted = v;
    if (!ctx || !graph) return;
    const t = ctx.currentTime;
    graph.master.gain.cancelScheduledValues(t);
    graph.master.gain.setTargetAtTime(v ? 0 : 1, t, 0.02);
  }

  // --- voice helpers (dest = a bus gain node) ---

  function tone(dest, type, f0, t, a, peak, d, f1 = 0, detune = 0) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + a + d * 0.7);
    if (detune) o.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + a + d + 0.05);
  }

  function burst(dest, t, a, peak, d, type, f0, f1 = 0, q = 1) {
    const src = ctx.createBufferSource();
    src.buffer = graph.noise;
    src.loop = true;
    const fl = ctx.createBiquadFilter();
    fl.type = type;
    fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    src.connect(fl);
    fl.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + a + d + 0.05);
  }

  // --- recipes (t = ctx.currentTime at fire; gains relative to the SFX bus) ---

  const RECIPES = {
    dash(t) { burst(graph.sfx, t, 0.02, 0.5, 0.18, 'bandpass', 420, 1600, 1.2); },
    kill(t) {
      burst(graph.sfx, t, 0.005, 0.28, 0.08, 'highpass', 2400, 0, 0.8);
      tone(graph.sfx, 'sine', 520, t, 0.004, 0.1, 0.07, 880);
    },
    hurt(t) {
      tone(graph.sfx, 'sine', 150, t, 0.005, 0.8, 0.24, 55);
      burst(graph.sfx, t, 0.005, 0.4, 0.12, 'lowpass', 300, 0, 0.7);
    },
    death(t) {
      tone(graph.sfx, 'sine', 120, t, 0.01, 0.9, 0.95, 36);
      burst(graph.sfx, t, 0.01, 0.5, 0.85, 'lowpass', 240, 0, 0.7);
    },
    chime(t) {
      [587.33, 698.46, 880].forEach((f, i) => tone(graph.sfx, 'triangle', f, t + i * 0.1, 0.01, 0.28, 0.5));
    },
    card(t) {
      tone(graph.sfx, 'triangle', 587.33, t, 0.005, 0.3, 0.12);
      tone(graph.sfx, 'triangle', 880, t + 0.06, 0.005, 0.3, 0.16);
    },
    banner(t) {
      burst(graph.sfx, t, 0.35, 0.4, 0.8, 'lowpass', 180, 900, 0.8);
      tone(graph.sfx, 'sine', 82.41, t, 0.05, 0.3, 1.0);
    },
    runstart(t) {
      for (const f of [146.83, 174.61, 220]) tone(graph.sfx, 'sawtooth', f, t, 0.02, 0.22, 0.7);
    },
    gameover(t, stats) {
      if (stats && stats.victory) {
        [293.66, 369.99, 440, 587.33].forEach((f, i) => tone(graph.sfx, 'triangle', f, t + i * 0.09, 0.01, 0.26, 0.6));
      } else {
        tone(graph.sfx, 'sawtooth', 146.83, t, 0.02, 0.4, 0.85, 73.42);
        burst(graph.sfx, t, 0.02, 0.4, 0.8, 'lowpass', 200, 0, 0.7);
      }
    },
    pistol(t) {
      burst(graph.sfx, t, 0.003, 0.3, 0.05, 'highpass', 3000, 0, 1);
      tone(graph.sfx, 'square', 880, t, 0.002, 0.08, 0.05);
    },
    boom(t) {
      burst(graph.sfx, t, 0.01, 0.5, 0.35, 'lowpass', 500, 90, 0.8);
      tone(graph.sfx, 'sine', 90, t, 0.008, 0.4, 0.4, 40);
    },
    fire(t) { // flame whoosh — fires ~60×/s while the geyser is up; GAPS throttles
      burst(graph.sfx, t, 0.03, 0.14, 0.08, 'bandpass', 900, 400, 1.4);
    },
  };

  const last = Object.create(null);
  function play(name, arg) {
    if (!ctx) return;
    const t = ctx.currentTime;
    if (t - (last[name] ?? -1e9) < (GAPS[name] || 0)) return;
    last[name] = t;
    RECIPES[name](t, arg);
  }

  off.push(
    bus.on('dash', () => play('dash')),
    bus.on('kill', () => play('kill')),
    bus.on('hurt', () => play('hurt')),
    bus.on('death', () => play('death')),
    bus.on('levelup', () => play('chime')),
    bus.on('cards', () => play('chime')),
    bus.on('card', () => play('card')),
    bus.on('banner', () => play('banner')),
    bus.on('runstart', () => play('runstart')),
    bus.on('gameover', (s) => play('gameover', s)),
    bus.on('pistol', () => play('pistol')),
    bus.on('boom', () => play('boom')),
    bus.on('fire', () => play('fire')),
    bus.on('mute', () => setMuted(readMuted())),
  );

  const update = () => {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return;
    }
    ensure();
  };

  return {
    update,
    ctx: () => ctx,
    gain: (n) => (graph ? graph[n] : null),
  };
}
