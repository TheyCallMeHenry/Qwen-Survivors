// Procedural music + ambience. 92 BPM D-minor loop (sub bass, detuned-saw pads
// through a slow-LFO lowpass, sparse delay-fed plucks) scheduled `schedAhead` s
// ahead of ctx.currentTime; wind bed (looped filtered noise + LFOs); scheduled
// panned wolf howls. Music plays only during a run: runstart / pause(false)
// start it, pause(true) / gameover stop it. Ambience runs anytime once unlocked.
// Needs the initSfx handle (shared AudioContext + buses).
// Top-level side-effect free (Node-importable via tools/check.mjs).

import { CFG } from '../config.js';

const A = CFG.audio;
const BEAT = 60 / A.bpm;
const EIGHTH = BEAT / 2;
const BAR = BEAT * 4;

// 4 bars x 8 eighth-steps, D minor: i, i, bVII, V.
export const MUSIC = {
  bars: 4,
  stepsPerBar: 8,
  bass: [
    [73.42, null, 73.42, null, 87.31, null, 73.42, null], // Dm
    [73.42, null, 73.42, null, 87.31, null, 73.42, null], // Dm
    [65.41, null, 65.41, null, 82.41, null, 65.41, null], // C
    [61.74, null, 61.74, null, 77.78, null, 61.74, null], // B
  ],
  pluck: [
    [null, null, null, null, null, null, 293.66, null],
    [null, 349.23, null, null, null, null, 440, null],
    [null, null, null, null, 523.25, null, null, null],
    [null, null, null, null, null, null, 246.94, null],
  ],
  pad: [
    [146.83, 174.61, 220], // Dm
    [146.83, 174.61, 220], // Dm
    [130.81, 164.81, 196], // C
    [123.47, 155.56, 185], // B
  ],
};

export function initMusic(game, sfx) {
  const bus = game.bus;
  let playing = false;
  let step = 0;
  let nextT = 0;
  let nodes = null; // { level, delay } (+ wind graph, created once)
  let howlAt = Infinity;

  const off = [];

  const rand = (lo, hi) => lo + Math.random() * (hi - lo);

  function build(c, musicBus, ambBus) {
    const level = c.createGain();
    level.gain.value = 1;
    level.connect(musicBus);
    const delay = c.createDelay(1);
    delay.delayTime.value = A.pluckDelay;
    const fb = c.createGain();
    fb.gain.value = A.pluckFb;
    const dOut = c.createGain();
    dOut.gain.value = 0.8;
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(dOut);
    dOut.connect(level);

    // Wind bed: looped noise -> lowpass (LFO) -> gain (LFO) -> amb bus.
    const wBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const wd = wBuf.getChannelData(0);
    for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
    const wSrc = c.createBufferSource();
    wSrc.buffer = wBuf;
    wSrc.loop = true;
    const wFilt = c.createBiquadFilter();
    wFilt.type = 'lowpass';
    wFilt.frequency.value = A.windCutoff;
    wFilt.Q.value = 0.6;
    const wGain = c.createGain();
    wGain.gain.value = A.windGain;
    const g1 = c.createOscillator();
    g1.frequency.value = A.windLfoHz;
    const g1g = c.createGain();
    g1g.gain.value = A.windGain * 0.5;
    g1.connect(g1g);
    g1g.connect(wGain.gain);
    const g2 = c.createOscillator();
    g2.frequency.value = A.windLfoHz * 0.5;
    const g2g = c.createGain();
    g2g.gain.value = A.windCutoff * 0.5;
    g2.connect(g2g);
    g2g.connect(wFilt.frequency);
    wSrc.connect(wFilt);
    wFilt.connect(wGain);
    wGain.connect(ambBus);
    wSrc.start();
    g1.start();
    g2.start();

    nodes = { level, delay };
    howlAt = c.currentTime + rand(A.howlEvery[0], A.howlEvery[1]);
  }

  function subVoice(c, f, t) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(A.subGain, t + 0.015);
    g.gain.setValueAtTime(A.subGain, t + EIGHTH - 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + EIGHTH - 0.01);
    o.connect(g);
    g.connect(nodes.level);
    o.start(t);
    o.stop(t + EIGHTH);
  }

  function pluckVoice(c, f, t) {
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(A.pluckGain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g);
    g.connect(nodes.level);
    const send = c.createGain();
    send.gain.value = A.pluckSend;
    g.connect(send);
    send.connect(nodes.delay);
    o.start(t);
    o.stop(t + 0.3);
  }

  function padBar(c, chord, t) {
    const fl = c.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = A.padCutoff;
    fl.Q.value = 0.7;
    const lfo = c.createOscillator();
    lfo.frequency.value = A.padLfoHz;
    const lg = c.createGain();
    lg.gain.value = A.padLfoDepth;
    lfo.connect(lg);
    lg.connect(fl.frequency);
    fl.connect(nodes.level);
    for (const f of chord) for (const det of [-7, 7]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(A.padTone, t + 0.5);
      g.gain.setValueAtTime(A.padTone, t + BAR - 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + BAR + 0.3);
      o.connect(g);
      g.connect(fl);
      o.start(t);
      o.stop(t + BAR + 0.4);
    }
    lfo.start(t);
    lfo.stop(t + BAR + 0.4);
  }

  function scheduleStep(bar, s8, t) {
    const c = sfx.ctx();
    const f = MUSIC.bass[bar][s8];
    if (f) subVoice(c, f, t);
    const p = MUSIC.pluck[bar][s8];
    if (p) pluckVoice(c, p, t);
    if (s8 === 0) padBar(c, MUSIC.pad[bar], t);
  }

  function howl(c, ambBus) {
    const t = c.currentTime + 0.05;
    const f0 = rand(320, 400);
    const dur = 2.2;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(A.howlGain, t + 0.18);
    g.gain.setValueAtTime(A.howlGain, t + 1.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0 * 0.85, t);
    o.frequency.linearRampToValueAtTime(f0 * 1.35, t + 0.5);
    const vib = c.createOscillator();
    vib.frequency.value = 5.5;
    const vg = c.createGain();
    vg.gain.value = 14;
    vib.connect(vg);
    vg.connect(o.frequency);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    o.connect(lp);
    lp.connect(g);
    const breath = c.createBufferSource();
    breath.buffer = sfx.gain('noise');
    breath.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1100;
    bp.Q.value = 0.8;
    const bg = c.createGain();
    bg.gain.value = 0.08;
    breath.connect(bp);
    bp.connect(bg);
    bg.connect(g);
    const p = c.createStereoPanner ? c.createStereoPanner() : null;
    if (p) {
      p.pan.value = rand(-0.8, 0.8);
      g.connect(p);
      p.connect(ambBus);
    } else {
      g.connect(ambBus);
    }
    o.start(t);
    o.stop(t + dur + 0.1);
    vib.start(t);
    vib.stop(t + dur + 0.1);
    breath.start(t);
    breath.stop(t + dur + 0.1);
  }

  function setLevel(v) {
    if (!nodes) return;
    const c = sfx.ctx();
    nodes.level.gain.cancelScheduledValues(c.currentTime);
    nodes.level.gain.setTargetAtTime(v, c.currentTime, 0.08);
  }

  function startMusic(reset) {
    playing = true;
    if (reset) step = 0;
    nextT = 0;
    setLevel(1);
  }

  function stopMusic() {
    playing = false;
    setLevel(0);
  }

  off.push(
    bus.on('runstart', () => startMusic(true)),
    bus.on('pause', (p) => (p ? stopMusic() : startMusic(false))),
    bus.on('gameover', () => stopMusic()),
  );

  const update = () => {
    const c = sfx.ctx();
    if (!c) return;
    const mb = sfx.gain('music');
    const ab = sfx.gain('amb');
    if (!mb || !ab) return;
    if (!nodes) build(c, mb, ab);
    if (playing) {
      if (!nextT || nextT < c.currentTime - 0.5) nextT = c.currentTime + 0.1;
      while (nextT < c.currentTime + A.schedAhead) {
        scheduleStep(Math.floor(step / 8) % MUSIC.bars, step % 8, nextT);
        step++;
        nextT += EIGHTH;
      }
    }
    if (c.currentTime >= howlAt) {
      howl(c, ab);
      howlAt = c.currentTime + rand(A.howlEvery[0], A.howlEvery[1]);
    }
  };

  return { update };
}
