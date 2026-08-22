// Procedural music + ambience. 66 BPM eldritch loop in D-dim7 ({D, F, Ab, B}):
// a whole-bar sub root crawl under a detuned-saw drone layer (slow-LFO
// lowpass), sparse heartbeat thumps, one lone beat-pair color tone per bar
// fed through a dark delay, plus a filtered-noise texture. Scheduled
// `schedAhead` s ahead of ctx.currentTime; the 4-bar pattern wraps
// indefinitely (seam verified in Node: test-logic pumps a fake clock across
// many loop boundaries). Ambience runs anytime once unlocked: wind bed
// (looped filtered noise + LFOs) + scheduled panned wolf howls. Music plays
// only during a run: runstart / pause(false) start it, pause(true) / gameover
// stop it. Needs the initSfx handle (shared AudioContext + buses).
// Top-level side-effect free (Node-importable via tools/check.mjs).

import { CFG } from '../config.js';

const A = CFG.audio;
const BEAT = 60 / A.bpm;
const EIGHTH = BEAT / 2;
const BAR = BEAT * 4;

// 4 bars x 8 eighth-steps. null = rest. Every pitched note comes from the
// D-dim7 set {D, F, Ab, B} — the tritone/minor-2nd dissonance is structural,
// not decorative.
export const MUSIC = {
  bars: 4,
  stepsPerBar: 8,
  sub: [36.71, 36.71, 43.65, 43.65], // D1, D1, F1, F1 — one whole-bar sine each
  drone: [
    [87.31, 103.83, 123.47], //  F2, Ab2, B2
    [103.83, 123.47, 146.83], // Ab2, B2, D3
    [87.31, 123.47, 146.83], //  F2, B2, D3 (tritone F-B held)
    [103.83, 123.47, 146.83], // Ab2, B2, D3
  ],
  pulse: [
    [36.71, null, null, 32, null, null, null, null], // dun ... dun
    [null, null, null, null, null, null, null, null],
    [43.65, null, null, 36.71, null, null, null, null],
    [null, null, null, null, 32, null, null, null],
  ],
  color: [
    [null, null, null, null, 233.08, null, null, null], // Ab4 — the tritone
    [null, 349.23, null, null, null, null, null, null], //  F4
    [null, null, 246.94, null, null, null, null, null], // B3
    [null, null, null, null, 293.66, null, null, null], // D4 — points back to the loop start
  ],
};

// 13.11 Per-level flavor layers (A5) — scheduled on the SAME 4-bar lattice as MUSIC
// (m01 'wood' gets nothing: the 10.6 track stands untouched). Slots hold a
// frequency or null (rest), like MUSIC.pulse/color. 'higan' = Map 02 (temple
// bell + wind chime + taiko; taiko thickens while the boss is up), 'drowned'
// = Map 03 (rising bubble blips + one whale-song glide per loop; the muffle
// lives in CFG.audio — a lowpass the music level bus routes through when
// levelKey is 'm03', wired in startMusic).
export const FLAVOR = {
  higan: {
    bell: [73.42, null, null, null], // D2 temple strike, once per loop
    chime: [
      [null, null, null, null, null, 587.33, null, null], // D5 ping
      [null, null, null, null, null, null, null, null],
      [null, null, null, 698.46, null, null, null, null], // F5 ping
      [null, null, null, null, null, null, 493.88, null], // B4 ping
    ],
    taiko: [
      [55, null, null, null, 55, null, null, null],
      [null, null, null, null, 55, null, null, null],
      [55, null, null, null, 55, null, null, null],
      [null, null, null, null, null, null, 55, null],
    ],
  },
  drowned: {
    bubble: [
      [null, null, 880, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, 1174.66, null, null, null],
      [null, null, null, null, null, null, 698.46, null],
    ],
    whale: [1, null, null, null], // one glide per loop, bar 0 step 0
  },
};

export function initMusic(game, sfx) {
  const bus = game.bus;
  let playing = false;
  let step = 0;
  let nextT = 0;
  let nodes = null; // { level, delay } (+ wind/texture graph, created once)
  let howlAt = Infinity;
  let level = null; // 13.11: levelKey for the flavor layers (set at startMusic)

  const off = [];

  const rand = (lo, hi) => lo + Math.random() * (hi - lo);

  function build(c, musicBus, ambBus) {
    const level = c.createGain();
    level.gain.value = 1;
    // 13.11 muffle: level -> lowpass -> musicBus. Default pass-through (~no-op);
    // startMusic retunes it per levelKey (m03 = deep underwater muffle).
    const muffle = c.createBiquadFilter();
    muffle.type = 'lowpass';
    muffle.frequency.value = A.muffleOff;
    level.connect(muffle);
    muffle.connect(musicBus);
    const delay = c.createDelay(1);
    delay.delayTime.value = A.delayTime;
    const fb = c.createGain();
    fb.gain.value = A.delayFb;
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

    // Music-side texture: looped noise -> bandpass (LFO) -> gain -> level, so
    // it breathes with the run (unlike the always-on wind).
    const tBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const td = tBuf.getChannelData(0);
    for (let i = 0; i < td.length; i++) td[i] = Math.random() * 2 - 1;
    const tSrc = c.createBufferSource();
    tSrc.buffer = tBuf;
    tSrc.loop = true;
    const tFilt = c.createBiquadFilter();
    tFilt.type = 'bandpass';
    tFilt.frequency.value = A.texCutoff;
    tFilt.Q.value = 0.8;
    const tLfo = c.createOscillator();
    tLfo.frequency.value = A.texLfoHz;
    const tLfg = c.createGain();
    tLfg.gain.value = A.texLfoDepth;
    tLfo.connect(tLfg);
    tLfg.connect(tFilt.frequency);
    const tGain = c.createGain();
    tGain.gain.value = A.texGain;
    tSrc.connect(tFilt);
    tFilt.connect(tGain);
    tGain.connect(level);
    tSrc.start();
    tLfo.start();

    nodes = { level, delay, muffle };
    howlAt = c.currentTime + rand(A.howlEvery[0], A.howlEvery[1]);
  }

  // Whole-bar sine root — the floor under the drone layer.
  function subVoice(c, f, t) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(A.subGain, t + 0.03);
    g.gain.setValueAtTime(A.subGain, t + BAR - 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + BAR);
    o.connect(g);
    g.connect(nodes.level);
    o.start(t);
    o.stop(t + BAR);
  }

  // Heartbeat thump: fast pitch-drop sine, gone well before the next beat.
  function pulseVoice(c, f, t) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.frequency.setValueAtTime(f, t);
    o.frequency.linearRampToValueAtTime(f * 0.55, t + 0.12);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(A.pulseGain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g);
    g.connect(nodes.level);
    o.start(t);
    o.stop(t + 0.5);
  }

  // A lone tone + a 0.7%-off partner: the slow beat keeps it alive and wrong.
  // Sent to the dark delay so each note rings out across the bar line.
  function colorVoice(c, f, t) {
    const send = c.createGain();
    send.gain.value = A.colorSend;
    send.connect(nodes.delay);
    for (const [mult, vol] of [[1, A.colorGain], [1.007, A.colorGain * 0.6]]) {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mult;
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.02);
      g.gain.setValueAtTime(vol, t + 0.9);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      o.connect(g);
      g.connect(nodes.level);
      g.connect(send);
      o.start(t);
      o.stop(t + 1.6);
    }
  }

  // Detuned-saw chord bed over the sub root; the 0.4 s release overlaps the
  // next bar's attack — identical every loop, so the seam is invisible.
  function droneBar(c, chord, t) {
    const fl = c.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = A.droneCutoff;
    fl.Q.value = 0.7;
    const lfo = c.createOscillator();
    lfo.frequency.value = A.droneLfoHz;
    const lg = c.createGain();
    lg.gain.value = A.droneLfoDepth;
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
      g.gain.linearRampToValueAtTime(A.droneGain, t + 0.4);
      g.gain.setValueAtTime(A.droneGain, t + BAR - 0.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + BAR + 0.4);
      o.connect(g);
      g.connect(fl);
      o.start(t);
      o.stop(t + BAR + 0.4);
    }
    lfo.start(t);
    lfo.stop(t + BAR + 0.4);
  }

  // 13.11 flavor voices (per-level, A5) — additive layers, m01 schedules none.
  function bellVoice(c, f, t) {
    const dur = 1.8;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(A.bellGain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.76; // inharmonic partial
    const g2 = c.createGain(); g2.gain.value = 0.4;
    o.connect(g); o2.connect(g2); g2.connect(g);
    g.connect(nodes.level);
    o.start(t); o.stop(t + dur + 0.1); o2.start(t); o2.stop(t + dur + 0.1);
  }
  function chimeVoice(c, f, t) {
    const dur = 0.9;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(A.chimeGain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    o.connect(g);
    g.connect(nodes.level);
    const send = c.createGain(); // ring out across the bar line via the dark delay
    send.gain.value = 0.5;
    g.connect(send);
    send.connect(nodes.delay);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function taikoVoice(c, f, t, boss) {
    const dur = 0.4;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(A.taikoGain * (boss ? 1.6 : 1), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    o.frequency.exponentialRampToValueAtTime(f * 0.6, t + dur * 0.7); // pitch drop
    o.connect(g); g.connect(nodes.level);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function bubbleVoice(c, f, t) {
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(A.bubbleGain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f * 0.6, t);
    o.frequency.linearRampToValueAtTime(f, t + 0.1); // rising chirp
    o.connect(g); g.connect(nodes.level);
    o.start(t); o.stop(t + 0.2);
  }
  function whaleVoice(c, t) {
    const dur = 3.5;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(A.whaleGain, t + 0.6);
    g.gain.setValueAtTime(A.whaleGain, t + dur - 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(160, t);
    o.frequency.linearRampToValueAtTime(240, t + dur * 0.45); // up…
    o.frequency.linearRampToValueAtTime(150, t + dur * 0.8); // …and down
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    o.connect(lp); lp.connect(g); g.connect(nodes.level);
    o.start(t); o.stop(t + dur + 0.1);
  }

  function scheduleStep(bar, s8, t, boss = false) {
    const c = sfx.ctx();
    if (s8 === 0) {
      subVoice(c, MUSIC.sub[bar], t);
      droneBar(c, MUSIC.drone[bar], t);
    }
    const p = MUSIC.pulse[bar][s8];
    if (p !== null) pulseVoice(c, p, t);
    const k = MUSIC.color[bar][s8];
    if (k !== null) colorVoice(c, k, t);
    // 13.11: per-level flavor — m01 ('wood') has no entry, so m01 stays untouched
    const f = FLAVOR[level];
    if (f) {
      const b = f.bell;
      if (b && b[bar] !== null && s8 === 0) bellVoice(c, b[bar], t);
      const ch = f.chime;
      if (ch && ch[bar][s8] !== null) chimeVoice(c, ch[bar][s8], t);
      const tk = f.taiko;
      if (tk) {
        if (boss) { if (s8 === 0 || s8 === 4) taikoVoice(c, 55, t, true); } // boss: on every beat
        else { const v = tk[bar][s8]; if (v !== null) taikoVoice(c, v, t, false); }
      }
      const bb = f.bubble;
      if (bb && bb[bar][s8] !== null) bubbleVoice(c, bb[bar][s8], t);
      const wh = f.whale;
      if (wh && wh[bar] !== null && s8 === 0) whaleVoice(c, t);
    }
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
    level = game.levelKey || 'm01';
    if (nodes) nodes.muffle.frequency.value = level === 'm03' ? A.muffleM03 : A.muffleOff;
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
        scheduleStep(Math.floor(step / 8) % MUSIC.bars, step % 8, nextT, game.bossSpawned);
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
