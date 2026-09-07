// Pickups, projectiles and card icons — pre-rendered sprites.

import { makeCanvas, glowSprite, shadowSprite, poly, roundRectPath, formShade } from './base.js';
import { TAU } from '../utils/math.js';

// Per-level pickup tints (13.10, A5): m01 = original, M02 gold-pink, M03 cyan.
// 22.3: the m03 heart moved from teal (≈ gem cyan at a glance) to warm coral —
// cool gems vs warm hearts is the strongest in-run discrimination, and coral
// keeps the underwater identity. Exported for the test-logic contrast invariant.
export const GEM_PAL = {
  m01: { glow: '94,234,212', stops: ['#25f2cf', '#0fb89b', '#0a6f60'], edge: 'rgba(6,60,50,0.6)' },
  m02: { glow: '255,196,128', stops: ['#ffd98a', '#ff9e7d', '#c94f6d'], edge: 'rgba(120,40,60,0.6)' },
  m03: { glow: '80,220,255', stops: ['#6fd8ff', '#1f9fd8', '#0d5f96'], edge: 'rgba(8,60,90,0.6)' },
};
export const HEART_PAL = {
  m01: { top: '#ff7d90', low: '#d42a4c', edge: 'rgba(90,10,30,0.65)' },
  m02: { top: '#ffb3a0', low: '#e0446e', edge: 'rgba(120,20,50,0.65)' },
  m03: { top: '#ff9d7e', low: '#e2503c', edge: 'rgba(110,30,25,0.65)' }, // 22.3 coral
};

// Per-level gem/heart pair (13.10): m01 default; unknown level falls back to m01.
export function gemHeartFor(levelKey) {
  return {
    gem: gemSprite(GEM_PAL[levelKey] || GEM_PAL.m01),
    heart: heartSprite(HEART_PAL[levelKey] || HEART_PAL.m01),
  };
}

function gemSprite(pal = GEM_PAL.m01) {
  const c = makeCanvas(24, 26);
  const g = c.getContext('2d');
  g.drawImage(glowSprite(11, pal.glow, 0.35), 0, -1);
  const grad = g.createLinearGradient(0, 2, 0, 24);
  grad.addColorStop(0, pal.stops[0]);
  grad.addColorStop(0.5, pal.stops[1]);
  grad.addColorStop(1, pal.stops[2]);
  g.fillStyle = grad;
  poly(g, [[12, 1], [21, 12], [12, 24], [3, 12]]);
  g.fill();
  // top facet
  g.fillStyle = 'rgba(230,255,250,0.5)';
  poly(g, [[12, 1], [3, 12], [12, 12]]);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillRect(8, 6, 2, 2);
  g.strokeStyle = pal.edge;
  g.lineWidth = 1;
  poly(g, [[12, 1], [21, 12], [12, 24], [3, 12]]);
  g.stroke();
  return c;
}

function heartSprite(pal = HEART_PAL.m01) {
  const c = makeCanvas(22, 20);
  const g = c.getContext('2d');
  const path = () => {
    g.beginPath();
    g.moveTo(11, 18.5);
    g.bezierCurveTo(1.5, 10.5, 0.5, 4.5, 5.5, 3.5);
    g.bezierCurveTo(9, 2.8, 11, 5.5, 11, 7);
    g.bezierCurveTo(11, 5.5, 13, 2.8, 16.5, 3.5);
    g.bezierCurveTo(21.5, 4.5, 20.5, 10.5, 11, 18.5);
    g.closePath();
  };
  const grad = g.createLinearGradient(0, 2, 0, 19);
  grad.addColorStop(0, pal.top);
  grad.addColorStop(1, pal.low);
  path();
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = pal.edge;
  g.lineWidth = 1;
  g.stroke();
  g.fillStyle = 'rgba(255,220,228,0.85)';
  g.beginPath(); g.ellipse(6.5, 6.5, 2.6, 1.8, -0.6, 0, TAU); g.fill();
  return c;
}

function boltSprite() {
  const c = makeCanvas(28, 12);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(2, 0, 26, 0);
  grad.addColorStop(0, 'rgba(94,234,212,0)');
  grad.addColorStop(0.55, 'rgba(94,234,212,0.85)');
  grad.addColorStop(1, '#eafffb');
  g.strokeStyle = grad;
  g.lineWidth = 3.4;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(4, 6); g.lineTo(22, 6); g.stroke();
  g.strokeStyle = '#f2fffd';
  g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(8, 6); g.lineTo(22, 6); g.stroke();
  const head = glowSprite(7, '150,255,240', 0.9);
  g.drawImage(head, 22 - 7, 6 - 7);
  return c;
}

function orbSprite() {
  const c = makeCanvas(18, 18);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(9, 9, 0, 9, 9, 9);
  grad.addColorStop(0, '#f3e8ff');
  grad.addColorStop(0.35, '#b07af0');
  grad.addColorStop(0.8, 'rgba(139,92,246,0.35)');
  grad.addColorStop(1, 'rgba(139,92,246,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 18, 18);
  return c;
}

function boomerangSprite() {
  const c = makeCanvas(40, 40);
  const g = c.getContext('2d');
  g.drawImage(glowSprite(18, '150,180,255', 0.30), 0, 0);
  g.strokeStyle = '#b9c6e8';
  g.lineWidth = 5;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(20, 21, 13, Math.PI * 0.72, Math.PI * 2.28);
  g.stroke();
  g.strokeStyle = 'rgba(232,240,255,0.8)';
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(20, 21, 14.6, Math.PI * 0.78, Math.PI * 2.22);
  g.stroke();
  // spikes
  g.fillStyle = '#8fa2cc';
  for (const a of [Math.PI * 0.9, Math.PI * 1.6, Math.PI * 2.4]) {
    const x = 20 + Math.cos(a) * 13, y = 21 + Math.sin(a) * 13;
    g.beginPath();
    g.moveTo(x, y - 3.4); g.lineTo(x + 4.4, y); g.lineTo(x, y + 3.4);
    g.closePath(); g.fill();
    formShade(g, x - 1, y - 3.4, 5.4, 6.8, { shade: 0.26 }); // 24.9 metal spike lit top-left
  }
  return c;
}

function bladeSprite() {
  const c = makeCanvas(30, 30);
  const g = c.getContext('2d');
  g.drawImage(glowSprite(14, '94,234,212', 0.32), 0, 0);
  g.beginPath();
  g.arc(15, 15, 12, -1.15, 1.15);
  g.arc(15, 15, 6.5, 1.35, -1.35, true);
  g.closePath();
  const grad = g.createLinearGradient(4, 4, 26, 26);
  grad.addColorStop(0, '#e8f4ff');
  grad.addColorStop(1, '#7fa8d8');
  g.fillStyle = grad;
  g.fill();
  // 24.9 single top-left key light over the blade (path still current) so metal reads
  // lit from the same direction as every character/enemy body.
  formShade(g, 3, 3, 24, 24, { shade: 0.28 });
  g.strokeStyle = 'rgba(94,234,212,0.8)';
  g.lineWidth = 1.4;
  g.stroke();
  return c;
}

function bulletSprite() {
  // Twin Fangs tracer — small warm round (distinct from the cyan Moonbolt)
  const c = makeCanvas(20, 10);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 5, 18, 5);
  grad.addColorStop(0, 'rgba(255,214,120,0)');
  grad.addColorStop(0.55, 'rgba(255,214,120,0.85)');
  grad.addColorStop(1, '#fff7e6');
  g.strokeStyle = grad;
  g.lineWidth = 3.2;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(2, 5); g.lineTo(16, 5); g.stroke();
  g.strokeStyle = '#fffdf5';
  g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(6, 5); g.lineTo(16, 5); g.stroke();
  const head = glowSprite(6, '255,220,150', 0.85);
  g.drawImage(head, 16 - 6, 5 - 6);
  return c;
}

function arrowSprite() {
  // 12.2: Bow & Arrow arrow — straight shaft, pointed tip, rear fletching
  const c = makeCanvas(30, 12);
  const g = c.getContext('2d');
  g.strokeStyle = '#c9b08a';
  g.lineWidth = 2.4;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(4, 6); g.lineTo(22, 6); g.stroke();
  g.fillStyle = '#e8eefc';
  g.beginPath(); g.moveTo(29, 6); g.lineTo(21, 2.6); g.lineTo(21, 9.4); g.closePath(); g.fill();
  g.strokeStyle = '#e8b45a';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(4, 6); g.lineTo(7, 3.2);
  g.moveTo(6.5, 6); g.lineTo(9.5, 3.2);
  g.moveTo(4, 6); g.lineTo(7, 8.8);
  g.moveTo(6.5, 6); g.lineTo(9.5, 8.8);
  g.stroke();
  return c;
}

function bombSprite() {
  // Cartoon bomb: round black sphere, curved fuse wire out of the top, spark
  const c = makeCanvas(30, 34);
  const g = c.getContext('2d');
  g.strokeStyle = '#c9a35c';
  g.lineWidth = 2.4;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(15, 9);
  g.quadraticCurveTo(17, 3, 23, 2.5);
  g.stroke();
  const sp = glowSprite(5, '255,180,80', 0.9);
  g.drawImage(sp, 23 - 5, 2 - 5);
  g.fillStyle = '#ffd75e';
  g.beginPath(); g.arc(23, 2, 2.2, 0, TAU); g.fill();
  const grad = g.createRadialGradient(12, 15, 2, 15, 18, 12);
  grad.addColorStop(0, '#5a6478');
  grad.addColorStop(0.4, '#2c3140');
  grad.addColorStop(1, '#12141c');
  g.fillStyle = grad;
  g.beginPath(); g.arc(15, 18, 11, 0, TAU); g.fill();
  g.fillStyle = '#39404f';
  g.beginPath(); g.arc(15, 12, 4, 0, TAU); g.fill();
  g.fillStyle = 'rgba(232,240,255,0.5)';
  g.beginPath(); g.ellipse(11, 14, 2.6, 1.7, -0.6, 0, TAU); g.fill();
  return c;
}

function snowballSprite() {
  // 12.3: packed snow ball — bright core, bumpy frost rim, cold speckles
  const c = makeCanvas(22, 22);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(9, 9, 1, 11, 11, 10);
  grad.addColorStop(0, '#f4fbff');
  grad.addColorStop(0.6, '#cfe8fa');
  grad.addColorStop(1, '#8fb8d8');
  g.fillStyle = grad;
  g.beginPath(); g.arc(11, 11, 9, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [x, y, r] of [[6, 8, 2.2], [14, 6, 1.8], [16, 13, 2.0], [9, 15, 1.7]]) {
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  g.strokeStyle = 'rgba(140,190,225,0.6)';
  g.lineWidth = 1;
  g.beginPath(); g.arc(11, 11, 9, 0, TAU); g.stroke();
  return c;
}

function frostBurstSprite() {
  // 12.3: snowball impact — cold white/cyan flash, drawn additively and scaled to the
  // damage radius at runtime (same ≥1.0× ramp as the bomb flash, 23.2 rule)
  const c = makeCanvas(64, 64);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  grad.addColorStop(0, 'rgba(245,252,255,0.95)');
  grad.addColorStop(0.45, 'rgba(170,225,250,0.65)');
  grad.addColorStop(0.8, 'rgba(110,180,230,0.28)');
  grad.addColorStop(1, 'rgba(90,160,220,0)');
  g.fillStyle = grad;
  g.beginPath(); g.arc(32, 32, 31, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(235,248,255,0.7)';
  g.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.4;
    g.beginPath();
    g.moveTo(32 + Math.cos(a) * 10, 32 + Math.sin(a) * 10);
    g.lineTo(32 + Math.cos(a) * 26, 32 + Math.sin(a) * 26);
    g.stroke();
  }
  return c;
}

function sparkSprite() {
  // 12.4: lightning strike point — additive cyan-white star burst
  const c = makeCanvas(20, 20);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(10, 10, 1, 10, 10, 9);
  grad.addColorStop(0, 'rgba(245,250,255,0.95)');
  grad.addColorStop(0.4, 'rgba(180,215,255,0.6)');
  grad.addColorStop(1, 'rgba(140,190,255,0)');
  g.fillStyle = grad;
  g.beginPath(); g.arc(10, 10, 9, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(235,245,255,0.9)';
  g.lineWidth = 1.4;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.35;
    g.beginPath();
    g.moveTo(10 + Math.cos(a) * 2, 10 + Math.sin(a) * 2);
    g.lineTo(10 + Math.cos(a) * 9, 10 + Math.sin(a) * 9);
    g.stroke();
  }
  return c;
}

function flameSprite() {
  // Soft radial flame blob — drawn additively ('lighter') at runtime
  const c = makeCanvas(24, 24);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(12, 14, 1, 12, 12, 11);
  grad.addColorStop(0, 'rgba(255,246,200,0.95)');
  grad.addColorStop(0.4, 'rgba(255,170,60,0.75)');
  grad.addColorStop(0.75, 'rgba(255,90,30,0.35)');
  grad.addColorStop(1, 'rgba(255,60,20,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 24, 24);
  return c;
}

function explosionSprite() {
  // Bomb AOE flash — white core → orange → transparent, scaled at runtime
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.25, 'rgba(255,214,120,0.85)');
  grad.addColorStop(0.55, 'rgba(255,120,50,0.5)');
  grad.addColorStop(0.8, 'rgba(255,80,40,0.18)');
  grad.addColorStop(1, 'rgba(255,60,30,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return c;
}

function burnSprite() {
  // Small enemy-status flame (flicker is done at draw time)
  const c = makeCanvas(16, 16);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(8, 10, 0.5, 8, 8, 7);
  grad.addColorStop(0, 'rgba(255,240,180,0.95)');
  grad.addColorStop(0.5, 'rgba(255,150,50,0.7)');
  grad.addColorStop(1, 'rgba(255,80,30,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 16);
  return c;
}

function blightSprite() {
  // Green wisp for the blight status
  const c = makeCanvas(16, 16);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(8, 8, 0.5, 8, 8, 7);
  grad.addColorStop(0, 'rgba(210,255,170,0.9)');
  grad.addColorStop(0.5, 'rgba(120,220,90,0.55)');
  grad.addColorStop(1, 'rgba(60,160,60,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 16);
  return c;
}

// --- 24.3 synergy projectile variants (Phase 24 visual overhaul) -----------------
// One distinct sprite per synergy-bearing projectile, built once at load and looked
// up by the record's `v` tag (combat.draw). Same footprint as the base sprite so the
// runtime draw geometry stays identical; only palette + a shape accent change. The
// BASE sprites above are untouched → no-synergy path is byte-identical (rule: solo
// invariance). Palette per synergy matches its card identity (config.js SYNERGY_EFFECT).

// Shared tracer recolor for bolt/bullet-shaped variants (linear trail + hot head).
function tracerSprite(w, h, rgbTrail, rgbHead, glowRgb, accent) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const midY = h / 2;
  const grad = g.createLinearGradient(2, 0, w - 2, 0);
  grad.addColorStop(0, `rgba(${rgbTrail},0)`);
  grad.addColorStop(0.55, `rgba(${rgbTrail},0.9)`);
  grad.addColorStop(1, rgbHead);
  g.strokeStyle = grad;
  g.lineWidth = 3.4;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(4, midY); g.lineTo(w - 6, midY); g.stroke();
  // hot core line
  g.strokeStyle = accent;
  g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(8, midY); g.lineTo(w - 6, midY); g.stroke();
  const head = glowSprite(7, glowRgb, 0.9);
  g.drawImage(head, (w - 6) - 7, midY - 7);
  return c;
}

// Blight Moonbolt: violet poison trail + dripping venom glob at the head.
function boltBlightSprite() {
  const c = tracerSprite(28, 12, '168,90,255', '#f3e0ff', '190,120,255', 'rgba(243,224,255,0.9)');
  const g = c.getContext('2d');
  // venom drip below the head
  g.fillStyle = 'rgba(150,70,220,0.85)';
  g.beginPath(); g.arc(20, 9.5, 1.8, 0, TAU); g.fill();
  return c;
}

// Inferno bullet: deep ember-orange tracer with a flame flicker behind the head.
function bulletInfernoSprite() {
  const c = tracerSprite(20, 10, '255,110,40', '#fff0d0', '255,120,40', 'rgba(255,240,208,0.9)');
  const g = c.getContext('2d');
  // small flame lick above the trail
  g.fillStyle = 'rgba(255,150,60,0.7)';
  g.beginPath();
  g.moveTo(9, 5); g.quadraticCurveTo(6, 1.5, 4, 4); g.quadraticCurveTo(6, 5, 9, 5);
  g.fill();
  return c;
}

// Storm Volley bullet: electric blue-white tracer with a zigzag spark across the head.
function bulletStormSprite() {
  const c = tracerSprite(20, 10, '120,190,255', '#eaf6ff', '150,200,255', 'rgba(234,246,255,0.95)');
  const g = c.getContext('2d');
  // lightning zigzag over the head
  g.strokeStyle = 'rgba(210,235,255,0.95)';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(11, 1.5); g.lineTo(14, 4); g.lineTo(12, 5); g.lineTo(16, 8.5);
  g.stroke();
  return c;
}

// Flaming Arrows: base arrow silhouette wrapped in a flame gradient + fire tip.
function arrowFlamingSprite() {
  const c = makeCanvas(30, 12);
  const g = c.getContext('2d');
  // shaft wrapped in fire
  const grad = g.createLinearGradient(4, 6, 24, 6);
  grad.addColorStop(0, '#7a2b0a');
  grad.addColorStop(0.6, '#ff7a1a');
  grad.addColorStop(1, '#ffd873');
  g.strokeStyle = grad;
  g.lineWidth = 2.8;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(4, 6); g.lineTo(22, 6); g.stroke();
  // burning head
  g.fillStyle = '#fff0c8';
  g.beginPath(); g.moveTo(29, 6); g.lineTo(21, 2.6); g.lineTo(21, 9.4); g.closePath(); g.fill();
  // flame licks trailing off the shaft
  g.fillStyle = 'rgba(255,140,40,0.6)';
  for (const [x, y] of [[8, 3], [13, 9], [17, 3]]) {
    g.beginPath();
    g.moveTo(x, y); g.quadraticCurveTo(x - 2, y + (y < 6 ? -3 : 3), x - 4, y);
    g.quadraticCurveTo(x - 2, y, x, y);
    g.fill();
  }
  return c;
}

// Heart-Piercer arrow: cold steel/cyan shaft with a longer crystalline head.
function arrowPiercerSprite() {
  const c = makeCanvas(30, 12);
  const g = c.getContext('2d');
  g.strokeStyle = '#9fd8e6';
  g.lineWidth = 2.4;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(4, 6); g.lineTo(22, 6); g.stroke();
  // elongated crystal head (pierces further)
  const grad = g.createLinearGradient(20, 6, 30, 6);
  grad.addColorStop(0, '#bff2ff');
  grad.addColorStop(1, '#ffffff');
  g.fillStyle = grad;
  g.beginPath(); g.moveTo(30, 6); g.lineTo(20, 3.4); g.lineTo(20, 8.6); g.closePath(); g.fill();
  // cold fletching
  g.strokeStyle = '#7fd0e0';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(4, 6); g.lineTo(7, 3.2);
  g.moveTo(6.5, 6); g.lineTo(9.5, 3.2);
  g.moveTo(4, 6); g.lineTo(7, 8.8);
  g.moveTo(6.5, 6); g.lineTo(9.5, 8.8);
  g.stroke();
  return c;
}

// Napalm bomb: dark crimson casing + burning dripping fuse (fire replaces the spark).
function bombNapalmSprite() {
  const c = makeCanvas(30, 34);
  const g = c.getContext('2d');
  // burning fuse
  g.strokeStyle = '#8a3a1c';
  g.lineWidth = 2.4;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(15, 9);
  g.quadraticCurveTo(17, 3, 23, 2.5);
  g.stroke();
  // flame at the fuse tip (instead of the yellow spark)
  const fl = glowSprite(6, '255,110,40', 0.95);
  g.drawImage(fl, 23 - 6, 2 - 6);
  g.fillStyle = '#ffd873';
  g.beginPath(); g.arc(23, 2, 2.2, 0, TAU); g.fill();
  // crimson casing (form-shaded from the top-left key)
  const grad = g.createRadialGradient(12, 15, 2, 15, 18, 12);
  grad.addColorStop(0, '#a8462e');
  grad.addColorStop(0.45, '#5c1c14');
  grad.addColorStop(1, '#200a08');
  g.fillStyle = grad;
  g.beginPath(); g.arc(15, 18, 11, 0, TAU); g.fill();
  // drip of burning gel
  g.fillStyle = 'rgba(255,140,50,0.7)';
  g.beginPath(); g.arc(20, 24, 2.2, 0, TAU); g.fill();
  // top-left rim highlight (light convention)
  g.fillStyle = 'rgba(255,190,150,0.5)';
  g.beginPath(); g.ellipse(11, 14, 2.6, 1.7, -0.6, 0, TAU); g.fill();
  return c;
}

// Blue-Flame snowball: cold blue core with a hotter cyan-white rim and frozen speckles.
function snowballBlueSprite() {
  const c = makeCanvas(22, 22);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(9, 9, 1, 11, 11, 10);
  grad.addColorStop(0, '#eafcff');
  grad.addColorStop(0.55, '#5fd0ff');
  grad.addColorStop(1, '#1a6fd8');
  g.fillStyle = grad;
  g.beginPath(); g.arc(11, 11, 9, 0, TAU); g.fill();
  // icy shard speckles
  g.fillStyle = 'rgba(240,252,255,0.9)';
  for (const [x, y, r] of [[6, 8, 2.2], [14, 6, 1.8], [16, 13, 2.0], [9, 15, 1.7]]) {
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  // cold rim glow
  g.strokeStyle = 'rgba(140,220,255,0.8)';
  g.lineWidth = 1.2;
  g.beginPath(); g.arc(11, 11, 9, 0, TAU); g.stroke();
  return c;
}

// 19.1 HUD equipment chip: blit a buildIcons() icon into a target canvas backing store
// at `css` CSS-px with device-pixel-ratio baked once (crisp on HiDPI, no per-frame work).
export function drawIconScaled(target, icon, css, dpr) {
  const px = Math.max(1, Math.round(css * dpr));
  target.width = px; target.height = px;
  const g = target.getContext('2d');
  g.clearRect(0, 0, px, px);
  g.imageSmoothingEnabled = true;
  g.drawImage(icon, 0, 0, icon.width, icon.height, 0, 0, px, px);
}

// Card icons (72x72) for level-up UI.
// 28.1 ground-up redesign: every silhouette redrawn from scratch — bolder motifs,
// stronger silhouettes, layer-by-layer shading. Category plates unchanged
// (weapon = teal · passive = amber · synergy = violet) so the card DOM still codes.
const PLATE = {
  weapon: { bgA: '#0f2a30', bgB: '#07161d', line: 'rgba(94,234,212,0.55)', hi: 'rgba(94,234,212,0.16)' },
  passive: { bgA: '#2c2114', bgB: '#1a1207', line: 'rgba(245,198,107,0.55)', hi: 'rgba(245,198,107,0.14)' },
  synergy: { bgA: '#251633', bgB: '#150b21', line: 'rgba(190,140,255,0.6)', hi: 'rgba(190,140,255,0.16)' },
};
export function buildIcons() {
  const icons = {};
  // Category plate + soft glow behind the silhouette (build-time only).
  const make = (kind, fn) => {
    const c = makeCanvas(72, 72);
    const g = c.getContext('2d');
    const p = PLATE[kind] || PLATE.weapon;
    roundRectPath(g, 4, 4, 64, 64, 15);
    const bg = g.createLinearGradient(0, 4, 0, 68);
    bg.addColorStop(0, p.bgA); bg.addColorStop(1, p.bgB);
    g.fillStyle = bg; g.fill();
    g.strokeStyle = p.line; g.lineWidth = 2; g.stroke();
    // top-left inner highlight + soft center glow under the silhouette
    const hl = g.createLinearGradient(8, 8, 40, 40);
    hl.addColorStop(0, p.hi); hl.addColorStop(1, 'rgba(255,255,255,0)');
    roundRectPath(g, 6, 6, 60, 60, 13);
    g.fillStyle = hl; g.fill();
    g.drawImage(glowSprite(26, kind === 'synergy' ? '190,140,255' : kind === 'passive' ? '245,198,107' : '120,150,220', 0.14), 10, 10);
    fn(g);
    return c;
  };

  // ---- shared drawing helpers (build-time only) --------------------------
  const seg = (g, pts) => { g.beginPath(); for (let i = 0; i < pts.length; i++) i ? g.lineTo(pts[i][0], pts[i][1]) : g.moveTo(pts[i][0], pts[i][1]); g.stroke(); };
  const dot = (g, x, y, r, fill) => { g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  // four-point glint: axis ticks centered on (x,y)
  const glint = (g, x, y, r, color, w = 1.4) => {
    g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x - r, y); g.lineTo(x + r, y);
    g.moveTo(x, y - r); g.lineTo(x, y + r);
    g.stroke();
  };
  // classic zigzag lightning polygon from (x,top) down `drop` px
  const boltShape = (g, x, top, drop, w = 1) => {
    const pts = [[0.5, 0], [0.08, 0.44], [0.38, 0.44], [0.22, 1], [0.92, 0.4], [0.56, 0.4], [0.98, 0]];
    g.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const px = x - w / 2 + pts[i][0] * w, py = top + pts[i][1] * drop;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath();
  };
  // teardrop flame with tip at (x,y), bulb centered below, `h` tall, leaning `lean` rad
  const flameShape = (g, x, y, h, lean = 0) => {
    const cx = x + Math.sin(lean) * h * 0.28;
    const cy = y + h * 0.62;
    const r = h * 0.34;
    g.beginPath();
    g.moveTo(x, y);
    g.bezierCurveTo(x + r * 0.9 + Math.sin(lean) * r, y + h * 0.3, cx + r, cy - r * 0.2, cx, cy + r);
    g.bezierCurveTo(cx - r, cy - r * 0.2, x - r * 0.9 + Math.sin(lean) * r, y + h * 0.3, x, y);
    g.closePath();
  };
  // crescent blade: outer arc radius R, inner radius r, centered on origin
  const crescent = (g, R, r, span = 1.05) => {
    g.beginPath();
    g.arc(0, 0, R, -span, span);
    g.arc(0, 0, r, span * 1.25, -span * 1.25, true);
    g.closePath();
  };
  // classic heart path fitting a `w`×`h` box at (x,y): bottom tip, lobes at top
  const heartPath = (g, x, y, w, h) => {
    const cx = x + w / 2;
    g.beginPath();
    g.moveTo(cx, y + h);
    g.bezierCurveTo(x - w * 0.12, y + h * 0.56, x - w * 0.07, y + h * 0.02, cx - w * 0.24, y + h * 0.07);
    g.bezierCurveTo(x + w * 0.33, y + h * 0.1, cx, y + h * 0.26, cx, y + h * 0.36);
    g.bezierCurveTo(cx, y + h * 0.26, x + w * 0.67, y + h * 0.1, cx + w * 0.24, y + h * 0.07);
    g.bezierCurveTo(x + w * 1.07, y + h * 0.02, x + w * 1.12, y + h * 0.56, cx, y + h);
    g.closePath();
  };

  // ================= WEAPONS ==============================================
  icons.wand = make('weapon', (g) => {
    // Runed wand angled up-right: leather grip, gold ferrule, moonstone orb in a cradle
    const shaft = g.createLinearGradient(18, 56, 44, 24);
    shaft.addColorStop(0, '#3d2e1c'); shaft.addColorStop(0.5, '#7a5f40'); shaft.addColorStop(1, '#a9855a');
    g.strokeStyle = shaft; g.lineWidth = 6; g.lineCap = 'round';
    seg(g, [[18, 56], [44, 24]]);
    // leather wrap on the grip
    g.strokeStyle = 'rgba(30,20,10,0.55)'; g.lineWidth = 1.3;
    for (const t of [0.1, 0.24, 0.38]) {
      const x = 18 + (44 - 18) * t, y = 56 - (56 - 24) * t;
      seg(g, [[x - 3, y - 2], [x + 3, y + 2]]);
    }
    // gold ferrule where the orb cradle begins
    g.strokeStyle = '#c9a35c'; g.lineWidth = 3.4;
    seg(g, [[41, 27.5], [45, 22.5]]);
    // moonstone orb: halo → body → limb → specular
    const halo = g.createRadialGradient(50, 19, 2, 50, 19, 16);
    halo.addColorStop(0, 'rgba(140,255,232,0.5)'); halo.addColorStop(1, 'rgba(94,234,212,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(50, 19, 16, 0, TAU); g.fill();
    const orb = g.createRadialGradient(46, 15, 1.5, 50, 19, 11);
    orb.addColorStop(0, '#eafffb'); orb.addColorStop(0.55, '#7cf0da'); orb.addColorStop(1, '#2a9d8b');
    g.fillStyle = orb; g.beginPath(); g.arc(50, 19, 10.5, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(14,70,62,0.5)'; g.lineWidth = 1.4; g.beginPath(); g.arc(50, 19, 10.5, 0, TAU); g.stroke();
    dot(g, 46.5, 15, 2.6, 'rgba(255,255,255,0.92)');
    // three-prong cradle hugging the orb's lower-left
    g.strokeStyle = '#e8c66a'; g.lineWidth = 2.2; g.lineCap = 'round';
    for (const a of [Math.PI * 0.62, Math.PI * 0.87, Math.PI * 1.12]) {
      g.beginPath();
      g.moveTo(50 + Math.cos(a) * 10.5, 19 + Math.sin(a) * 10.5);
      g.lineTo(50 + Math.cos(a) * 14.5, 19 + Math.sin(a) * 14.5);
      g.stroke();
    }
    glint(g, 63, 11, 3, 'rgba(180,255,235,0.9)');
    glint(g, 37, 9, 2.2, 'rgba(180,255,235,0.7)');
    dot(g, 60, 33, 1.6, 'rgba(180,255,235,0.8)');
  });

  icons.garlic = make('weapon', (g) => {
    // Radiant bulb: pulsing aura rings, veined cloves, knobby stalk
    for (const [r, a] of [[29, 0.4], [33.5, 0.22]]) {
      g.strokeStyle = `rgba(170,130,235,${a})`; g.lineWidth = r > 30 ? 1.6 : 2.2;
      g.beginPath(); g.arc(36, 42, r, 0, TAU); g.stroke();
    }
    const bulb = () => {
      g.beginPath();
      g.moveTo(36, 20);
      g.bezierCurveTo(51, 26, 56, 44, 47, 54);
      g.bezierCurveTo(41, 60, 31, 60, 25, 54);
      g.bezierCurveTo(16, 44, 21, 26, 36, 20);
      g.closePath();
    };
    const grad = g.createRadialGradient(30, 30, 2, 36, 40, 22);
    grad.addColorStop(0, '#fdfbff'); grad.addColorStop(0.55, '#d9c7f2'); grad.addColorStop(1, '#9a7cc9');
    bulb(); g.fillStyle = grad; g.fill();
    formShade(g, 18, 16, 36, 44, { shade: 0.24 });
    bulb(); g.strokeStyle = 'rgba(90,60,150,0.55)'; g.lineWidth = 1.5; g.stroke();
    // clove seams radiating from the stalk point
    g.strokeStyle = 'rgba(120,88,180,0.75)'; g.lineWidth = 1.4;
    for (const dx of [-10, -3.5, 3.5, 10]) {
      g.beginPath(); g.moveTo(36 + dx * 0.28, 23);
      g.quadraticCurveTo(36 + dx * 1.15, 41, 36 + dx * 0.55, 57); g.stroke();
    }
    // stalk + two leaf shoots
    g.strokeStyle = '#6f9c58'; g.lineWidth = 2.6; g.lineCap = 'round';
    seg(g, [[36, 20], [35, 13]]);
    g.strokeStyle = '#84b56b'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(35, 13); g.quadraticCurveTo(30, 8, 24, 7); g.stroke();
    g.beginPath(); g.moveTo(35, 13); g.quadraticCurveTo(41, 9, 47, 10); g.stroke();
    dot(g, 24, 7, 1.6, '#a9d48a'); dot(g, 47, 10, 1.6, '#a9d48a');
  });

  icons.axe = make('weapon', (g) => {
    // Double-bit battle axe planted on a swept motion arc
    g.strokeStyle = 'rgba(185,198,232,0.38)'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.arc(46, 44, 27, Math.PI * 0.92, Math.PI * 1.62); g.stroke();
    g.strokeStyle = 'rgba(185,198,232,0.18)'; g.lineWidth = 2;
    g.beginPath(); g.arc(46, 44, 31, Math.PI * 0.97, Math.PI * 1.55); g.stroke();
    // haft with wedge bindings
    const haft = g.createLinearGradient(28, 60, 42, 34);
    haft.addColorStop(0, '#3d2e1c'); haft.addColorStop(1, '#856a47');
    g.strokeStyle = haft; g.lineWidth = 6.5; g.lineCap = 'round';
    seg(g, [[28, 60], [41, 35]]);
    g.strokeStyle = 'rgba(23,16,8,0.6)'; g.lineWidth = 1.4;
    seg(g, [[31.5, 51], [35.5, 52.5]]); seg(g, [[35, 44], [39, 45.5]]);
    // double-bit head: left bit, right bit, central spike
    const steel = g.createLinearGradient(24, 10, 56, 34);
    steel.addColorStop(0, '#eef4ff'); steel.addColorStop(0.5, '#9db0d8'); steel.addColorStop(1, '#5a6c96');
    g.fillStyle = steel;
    poly(g, [[41, 32], [25, 24], [17, 12], [30, 8], [41, 16]]); g.fill();
    poly(g, [[41, 32], [57, 24], [65, 12], [52, 8], [41, 16]]); g.fill();
    poly(g, [[36, 16], [46, 16], [41, 4]]); g.fill();
    formShade(g, 17, 4, 48, 28, { shade: 0.26 });
    // edge bevels + socket wedge
    g.strokeStyle = 'rgba(240,248,255,0.85)'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(17, 12); g.quadraticCurveTo(24, 17, 25, 24); g.stroke();
    g.beginPath(); g.moveTo(65, 12); g.quadraticCurveTo(58, 17, 57, 24); g.stroke();
    g.fillStyle = '#c9a35c';
    poly(g, [[37.5, 30], [44.5, 30], [43, 36], [39, 36]]); g.fill();
  });

  icons.blades = make('weapon', (g) => {
    // Orbit ring + three crescent blades flung tangentially over a small hub
    g.strokeStyle = 'rgba(94,234,212,0.35)'; g.lineWidth = 1.8;
    g.beginPath(); g.arc(36, 38, 26, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(94,234,212,0.25)';
    g.beginPath(); g.arc(36, 38, 7, 0, TAU); g.fill();
    dot(g, 36, 38, 3.4, 'rgba(220,255,246,0.8)');
    const steel = () => { const s = g.createLinearGradient(-9, -9, 9, 9); s.addColorStop(0, '#f2f8ff'); s.addColorStop(0.6, '#a9bfe4'); s.addColorStop(1, '#6d84b5'); return s; };
    // crescents face outward and sweep clockwise; narrow span = sharper cutting horns
    for (const [cx, cy, rot] of [[36, 27, 0], [24.5, 45.5, 2.1], [48, 46, -2.1]]) {
      g.save(); g.translate(cx, cy); g.rotate(rot);
      crescent(g, 15, 6.6, 0.78);
      g.fillStyle = steel(); g.fill();
      g.strokeStyle = 'rgba(94,234,212,0.85)'; g.lineWidth = 1.4; g.stroke();
      dot(g, 12, 0, 1.6, '#eafffb'); // tang tip on the outer arc
      g.restore();
    }
  });

  icons.pistols = make('weapon', (g) => {
    // Twin revolvers crossed in an X: muzzles high-out, wooden grips crossed low-center.
    // Dark outline per gun keeps the two silhouettes legible against each other at 72px.
    const OL = 'rgba(9,13,24,0.9)';
    const revolver = (x, y, rot, dim) => {
      g.save(); g.translate(x, y); g.rotate(rot);
      const metal = g.createLinearGradient(0, -9, 0, 14);
      if (dim) { metal.addColorStop(0, '#96a6cc'); metal.addColorStop(0.55, '#6a7cab'); metal.addColorStop(1, '#414f70'); }
      else { metal.addColorStop(0, '#d6e2f8'); metal.addColorStop(0.55, '#93a9d9'); metal.addColorStop(1, '#5a6b93'); }
      g.lineJoin = 'round';
      // grip first (wood, hangs down-back), outlined so it reads as its own part
      g.fillStyle = dim ? '#5c3d24' : '#7c542f';
      g.beginPath();
      g.moveTo(-5, -2); g.lineTo(3, -2); g.lineTo(-1, 17); g.lineTo(-9, 15);
      g.closePath(); g.fill();
      g.strokeStyle = OL; g.lineWidth = 2; g.stroke();
      // trigger guard
      g.strokeStyle = metal; g.lineWidth = 2.6;
      g.beginPath(); g.arc(0, 5.5, 4.6, -0.35, Math.PI * 0.72); g.stroke();
      // frame + barrel pointing +x, with front sight nub
      g.fillStyle = metal;
      g.beginPath();
      g.moveTo(-6, -8); g.lineTo(25, -6.5); g.lineTo(25, 1.5); g.lineTo(-6, 2.5);
      g.closePath(); g.fill(); g.strokeStyle = OL; g.lineWidth = 2; g.stroke();
      g.fillStyle = metal; g.fillRect(20, -9.5, 2.2, 3); // sight
      // cylinder in front of the frame, keyed with a dark center + flute
      g.fillStyle = metal;
      g.beginPath(); g.arc(-0.5, -3.2, 6.2, 0, TAU); g.fill();
      g.strokeStyle = OL; g.lineWidth = 2; g.stroke();
      dot(g, -0.5, -3.2, 2.3, 'rgba(22,29,50,0.85)');
      g.strokeStyle = 'rgba(30,40,66,0.5)'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(-3.5, -7.5); g.lineTo(-3.5, 1); g.stroke(); // cylinder flute
      // muzzle bore
      dot(g, 24.5, -2.5, 1.7, '#141c30');
      // hammer nub at the back-top
      g.fillStyle = metal;
      poly(g, [[-6, -8], [-8.5, -11.5], [-4, -10.5]]); g.fill();
      g.restore();
    };
    // back gun (dimmer, muzzle up-left) then front gun (bright, muzzle up-right)
    revolver(31, 45, Math.PI + 0.8, true);
    revolver(42, 45, -0.8, false);
    glint(g, 13, 22, 2.8, 'rgba(255,236,170,0.9)');
    glint(g, 60, 22, 2.4, 'rgba(255,236,170,0.7)');
  });

  icons.bombs = make('weapon', (g) => {
    // Sunder Bomb: cast-iron shell, glowing sunder crack, lit fuse with spark
    g.strokeStyle = '#c9a35c'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(40, 20); g.quadraticCurveTo(48, 12, 55, 12); g.stroke();
    const fz = g.createRadialGradient(56, 12, 0.5, 56, 12, 4.5);
    fz.addColorStop(0, '#fffbe8'); fz.addColorStop(0.5, '#ffd75e'); fz.addColorStop(1, 'rgba(255,150,40,0)');
    g.fillStyle = fz; g.beginPath(); g.arc(56, 12, 4.5, 0, TAU); g.fill();
    // neck + body
    g.fillStyle = '#39404f';
    roundRectPath(g, 32, 18, 9, 8, 2.5); g.fill();
    const grad = g.createRadialGradient(28, 32, 3, 36, 40, 21);
    grad.addColorStop(0, '#7b869c'); grad.addColorStop(0.45, '#353b4d'); grad.addColorStop(1, '#0e1017');
    g.fillStyle = grad; g.beginPath(); g.arc(36, 40, 20, 0, TAU); g.fill();
    formShade(g, 16, 20, 40, 40, { shade: 0.3 });
    g.strokeStyle = 'rgba(9,10,16,0.8)'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(36, 40, 20, 0, TAU); g.stroke();
    // iron banding seam
    g.strokeStyle = 'rgba(140,152,175,0.4)'; g.lineWidth = 1.4;
    g.beginPath(); g.arc(36, 40, 15.5, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    // sunder crack glowing magma-hot
    const crack = [[27, 31], [33, 38], [29, 44], [36, 51]];
    g.strokeStyle = 'rgba(255,120,40,0.5)'; g.lineWidth = 4; g.lineJoin = 'round';
    seg(g, crack); 
    g.strokeStyle = '#ffb347'; g.lineWidth = 1.8; seg(g, crack);
    g.strokeStyle = '#fff2c8'; g.lineWidth = 0.8; seg(g, crack);
    dot(g, 26, 56, 1.6, 'rgba(255,190,90,0.85)'); dot(g, 47, 53, 1.3, 'rgba(255,190,90,0.7)');
  });

  icons.flame = make('weapon', (g) => {
    // Pyre Lance: great flame tongue splitting into three licks with a rising ember column
    const glow = g.createRadialGradient(36, 40, 2, 36, 40, 28);
    glow.addColorStop(0, 'rgba(255,214,120,0.5)'); glow.addColorStop(1, 'rgba(255,90,30,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(36, 40, 28, 0, TAU); g.fill();
    const layer = (h, lean, fill, tipX, tipY) => { g.fillStyle = fill; flameShape(g, tipX, tipY, h, lean); g.fill(); };
    layer(28, -0.85, 'rgba(255,110,40,0.9)', 21, 32);
    layer(25, 0.85, 'rgba(255,110,40,0.9)', 51, 36);
    layer(44, 0, '#ff9a3c', 36, 12);
    layer(30, 0, '#ffc85e', 36, 24);
    layer(17, 0, '#fff2c4', 36, 36);
    // ember column rising upper-right
    for (const [x, y, r] of [[54, 14, 1.8], [60, 22, 1.4], [57, 33, 1.1], [20, 14, 1.3]]) {
      dot(g, x, y, r, 'rgba(255,200,110,0.9)');
    }
  });

  icons.snowball = make('weapon', (g) => {
    // Frost cannon angled up-right: banded tube, ice shell riding the muzzle, frost puffs
    g.save(); g.translate(32, 44); g.rotate(-0.62);
    const tube = g.createLinearGradient(0, -9, 0, 9);
    tube.addColorStop(0, '#b9d6e8'); tube.addColorStop(0.5, '#67859f'); tube.addColorStop(1, '#2c3e52');
    g.fillStyle = tube; roundRectPath(g, -24, -9.5, 42, 19, 6); g.fill();
    // frost-rimed bands
    g.fillStyle = 'rgba(180,225,250,0.55)';
    roundRectPath(g, -14, -9, 4.5, 18, 2); g.fill();
    roundRectPath(g, 0, -9, 4.5, 18, 2); g.fill();
    g.fillStyle = '#1d2b3a'; roundRectPath(g, 14, -11.5, 7, 23, 3); g.fill(); // muzzle ring
    g.fillStyle = '#465c72'; roundRectPath(g, -28, -6, 9, 12, 3.5); g.fill(); // breech block
    g.restore();
    // dark bore opening under the shell so the muzzle reads as a muzzle
    dot(g, 46.2, 33.8, 6.2, 'rgba(8,16,26,0.9)');
    // packed ice shell riding the muzzle
    const ball = g.createRadialGradient(43, 27, 1, 46, 30, 11.5);
    ball.addColorStop(0, '#ffffff'); ball.addColorStop(0.55, '#cfe8fa'); ball.addColorStop(1, '#7ea9cc');
    g.fillStyle = ball; g.beginPath(); g.arc(46, 30, 10.5, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(120,180,220,0.6)'; g.lineWidth = 1.3;
    g.beginPath(); g.arc(46, 30, 10.5, 0, TAU); g.stroke();
    for (const [x, y] of [[-0.9, -0.3], [0.4, -0.9], [-0.3, 0.8]]) { // crack facets
      g.beginPath(); g.moveTo(46, 30); g.lineTo(46 + x * 10, 30 + y * 10); g.stroke();
    }
    dot(g, 42, 26, 2.4, 'rgba(255,255,255,0.95)');
    // snowflake puffs
    for (const [x, y, r] of [[22, 13, 3.4], [58, 12, 3], [26, 5], [57, 36, 2.6]]) {
      g.strokeStyle = 'rgba(200,235,255,0.8)'; g.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI + 0.35; g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(a) * r, y - Math.sin(a) * r); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); }
    }
  });

  icons.ringLightning = make('weapon', (g) => {
    // Signet ring: gold band, lightning bolt refracted inside a storm sapphire
    g.strokeStyle = '#8a6a3a'; g.lineWidth = 7.5;
    g.beginPath(); g.arc(36, 46, 17, 0, TAU); g.stroke();
    const band = g.createLinearGradient(24, 40, 50, 58);
    band.addColorStop(0, '#f0d489'); band.addColorStop(0.55, '#c9a35c'); band.addColorStop(1, '#7d5f30');
    g.strokeStyle = band; g.lineWidth = 5;
    g.beginPath(); g.arc(36, 46, 17, 0, TAU); g.stroke();
    // gem setting: hex collar + domed sapphire
    g.fillStyle = '#6e5228';
    poly(g, [[36, 12], [49, 20], [49, 32], [36, 40], [23, 32], [23, 20]]); g.fill();
    const gem = g.createRadialGradient(32, 21, 1, 36, 26, 13);
    gem.addColorStop(0, '#eef7ff'); gem.addColorStop(0.5, '#6fa9ff'); gem.addColorStop(1, '#24408f');
    g.fillStyle = gem;
    poly(g, [[36, 15], [46.5, 21.5], [46.5, 31.5], [36, 37.5], [25.5, 31.5], [25.5, 21.5]]); g.fill();
    // bolt refracted inside the gem
    boltShape(g, 30, 17, 20, 12);
    g.fillStyle = '#fdf6c8'; g.fill();
    // prongs + band highlight
    g.strokeStyle = '#e8c66a'; g.lineWidth = 2.4; g.lineCap = 'round';
    seg(g, [[25, 19], [20.5, 14.5]]); seg(g, [[47, 19], [51.5, 14.5]]);
    g.strokeStyle = 'rgba(255,248,210,0.6)'; g.lineWidth = 1.8;
    g.beginPath(); g.arc(36, 46, 19.5, Math.PI * 1.08, Math.PI * 1.5); g.stroke();
    glint(g, 36, 8, 2.6, 'rgba(220,240,255,0.9)'); dot(g, 55, 34, 1.5, 'rgba(200,225,255,0.7)');
  });

  icons.bow = make('weapon', (g) => {
    // Recurve longbow drawn: wooden limbs curving back, taut string, nocked arrow
    const limb = g.createLinearGradient(0, 8, 0, 64);
    limb.addColorStop(0, '#c2955a'); limb.addColorStop(0.5, '#8f6a3c'); limb.addColorStop(1, '#5c4123');
    g.strokeStyle = limb; g.lineWidth = 5.5; g.lineCap = 'round';
    g.beginPath(); g.arc(24, 36, 25, -Math.PI * 0.44, Math.PI * 0.44); g.stroke();
    // recurve tips flicking forward
    g.lineWidth = 4;
    const aTop = [-Math.PI * 0.44, Math.PI * 0.44];
    for (const a of aTop) {
      const ex = 24 + 25 * Math.cos(a), ey = 36 + 25 * Math.sin(a);
      g.beginPath(); g.moveTo(ex, ey);
      g.quadraticCurveTo(ex + 6, ey + (a < 0 ? -6 : 6), ex + 12, ey + (a < 0 ? -7 : 7));
      g.stroke();
    }
    // string pinched back at the grip
    const nx = 18, ny = 36;
    for (const a of aTop) {
      const ex = 24 + 25 * Math.cos(a), ey = 36 + 25 * Math.sin(a);
      g.strokeStyle = 'rgba(235,240,252,0.9)'; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(ex + 12, ey + (a < 0 ? -7 : 7)); g.lineTo(nx, ny); g.stroke();
    }
    // arrow shaft → pierce pad, nock fletch at the pinch
    const shaftG = g.createLinearGradient(22, 36, 50, 36);
    shaftG.addColorStop(0, '#8f6a3c'); shaftG.addColorStop(1, '#d9c08e');
    g.strokeStyle = shaftG; g.lineWidth = 3.4;
    seg(g, [[22, 36], [50, 36]]);
    g.fillStyle = '#eef4ff';
    poly(g, [[61, 36], [49, 31], [49, 41]]); g.fill(); // broadhead
    g.strokeStyle = 'rgba(120,90,50,0.8)'; g.lineWidth = 1; seg(g, [[49, 31], [55, 36], [49, 41]]);
    g.strokeStyle = '#e8b45a'; g.lineWidth = 2;
    for (const dy of [-3.5, 0, 3.5]) { g.beginPath(); g.moveTo(nx, ny + dy); g.lineTo(nx + 6, ny + dy * 1.6 - (dy < 0 ? 1 : dy > 0 ? -1 : 0)); g.stroke(); }
    dot(g, nx, ny, 1.8, '#d9c08e');
  });

  // ================= PASSIVES =============================================
  icons.boots = make('passive', (g) => {
    // Striding winged boot facing right: tall shaft, forward toe, lug sole, gold ankle
    // strap, cream feather wing set at the back of the ankle, wind streaks behind.
    // Dark outline + lighter leather keep the profile off the amber plate at 72px.
    const OL = 'rgba(16,9,2,0.85)';
    const streak = (y, x0, len, w) => {
      g.lineWidth = w; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + len, y); g.stroke();
    };
    g.strokeStyle = 'rgba(245,198,107,0.55)'; g.lineCap = 'round';
    streak(24, 7, 13, 2.6); streak(31, 5, 12, 2.2); streak(40, 7, 11, 1.8);
    // sole (dark, slight toe spring) + heel lug
    g.fillStyle = '#241609';
    g.beginPath();
    g.moveTo(24, 47); g.lineTo(55, 47);
    g.quadraticCurveTo(60, 47, 60, 43.5); g.lineTo(60, 42);
    g.lineTo(58, 42); g.lineTo(57, 46.5);
    g.lineTo(24, 49); g.closePath(); g.fill();
    roundRectPath(g, 23, 46, 36, 6.5, 3); g.fillStyle = '#241609'; g.fill();
    // boot body: shaft + vamp + toe in one outlined silhouette
    const leather = g.createLinearGradient(16, 14, 56, 50);
    leather.addColorStop(0, '#e0a868'); leather.addColorStop(0.5, '#a9713d'); leather.addColorStop(1, '#71441f');
    g.fillStyle = leather;
    g.beginPath();
    g.moveTo(27, 14);                    // cuff back
    g.lineTo(44, 12.5);                  // cuff front
    g.lineTo(46, 33);                    // shaft front descends
    g.quadraticCurveTo(53, 34, 56, 39);  // instep to toe
    g.quadraticCurveTo(59, 42, 58.5, 46.5); // toe box down
    g.lineTo(25, 47.5);                  // sole line back
    g.lineTo(25.5, 30);                  // heel column
    g.closePath(); g.fill();
    g.strokeStyle = OL; g.lineWidth = 2.2; g.lineJoin = 'round'; g.stroke();
    formShade(g, 27, 14, 20, 33, { shade: 0.22 });
    // welt stitch + gold ankle strap with buckle
    g.strokeStyle = 'rgba(60,35,12,0.6)'; g.lineWidth = 1.2;
    seg(g, [[27, 44], [56, 43]]);
    g.strokeStyle = '#f0cf72'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(27, 30); g.lineTo(45, 31.4); g.stroke();
    dot(g, 41, 31.2, 2.2, '#ffe27e');
    // cuff fold
    g.strokeStyle = '#7c5230'; g.lineWidth = 3; g.lineCap = 'round';
    seg(g, [[26.5, 17], [44.5, 15.5]]);
    // feathered wing at the back ankle: three swept-back feathers, outlined
    const feather = (x, y, len, lift) => {
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x - len * 0.55, y - lift, x - len, y - lift * 0.7);
      g.quadraticCurveTo(x - len * 0.5, y + 4, x, y + 4.5);
      g.closePath();
      g.fillStyle = 'rgba(255,247,224,0.97)'; g.fill();
      g.strokeStyle = 'rgba(120,90,40,0.5)'; g.lineWidth = 1; g.stroke();
    };
    feather(27, 14, 18, 9); feather(26, 21, 21, 6); feather(27, 28, 15, 3);
    // dust kick ahead of the toe
    dot(g, 63, 51, 2.2, 'rgba(245,198,107,0.7)'); dot(g, 58, 55, 1.5, 'rgba(245,198,107,0.5)');
  });

  icons.heart = make('passive', (g) => {
    // Herbalist heart: glossy berry heart with oak leaves behind and a fresh sprout tip
    // leaves peeking above the lobes
    const leaf = (x, y, rot) => {
      g.save(); g.translate(x, y); g.rotate(rot);
      const lg = g.createLinearGradient(0, -12, 0, 4);
      lg.addColorStop(0, '#8fce6e'); lg.addColorStop(1, '#3e7a3c');
      g.fillStyle = lg;
      g.beginPath();
      g.moveTo(0, 4);
      g.quadraticCurveTo(-9, -2, -2.5, -11);
      g.quadraticCurveTo(0, -13.5, 2.5, -11);
      g.quadraticCurveTo(9, -2, 0, 4);
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(30,60,28,0.55)'; g.lineWidth = 1; // central vein
      g.beginPath(); g.moveTo(0, 2); g.quadraticCurveTo(0, -6, 0, -11); g.stroke();
      g.restore();
    };
    leaf(24, 26, -0.75); leaf(48, 26, 0.75);
    seg(g, [[36, 18], [36, 11]]); // stem
    dot(g, 36, 10.5, 1.8, '#a9d48a');
    // classic heart silhouette via cubic lobes (stable at this size)
    const hp = () => {
      g.beginPath();
      g.moveTo(36, 60);
      g.bezierCurveTo(11, 43, 10.5, 22.5, 21, 19.5);
      g.bezierCurveTo(28.5, 17.5, 36, 24, 36, 28.5);
      g.bezierCurveTo(36, 24, 43.5, 17.5, 51, 19.5);
      g.bezierCurveTo(61.5, 22.5, 61, 43, 36, 60);
      g.closePath();
    };
    hp();
    const grad = g.createLinearGradient(14, 20, 14, 60);
    grad.addColorStop(0, '#ff9aa8'); grad.addColorStop(0.5, '#ef3f5c'); grad.addColorStop(1, '#a91e39');
    g.fillStyle = grad; g.fill();
    formShade(g, 14, 20, 42, 40, { shade: 0.24, rim: 'rgba(255,190,205,0.4)' });
    hp(); g.strokeStyle = 'rgba(110,12,36,0.6)'; g.lineWidth = 1.5; g.stroke();
    // key-light gloss + a second small shine
    g.fillStyle = 'rgba(255,235,240,0.8)';
    g.beginPath(); g.ellipse(24, 29, 5.6, 3.4, -0.55, 0, TAU); g.fill();
    dot(g, 31, 25, 1.6, 'rgba(255,255,255,0.85)');
  });

  icons.sword = make('passive', (g) => {
    // Rune-etched broadsword point-up: fullered blade, gold crossguard, wrapped grip, pommel gem
    const steel = g.createLinearGradient(26, 52, 48, 10);
    steel.addColorStop(0, '#7f93bd'); steel.addColorStop(0.5, '#e4edff'); steel.addColorStop(1, '#aebfe6');
    poly(g, [[33, 52], [39, 52], [42, 24], [36, 11], [30, 24]]);
    g.fillStyle = steel; g.fill();
    formShade(g, 30, 11, 12, 41, { shade: 0.24 });
    // fuller groove + glowing runes in it
    g.strokeStyle = 'rgba(60,75,110,0.55)'; g.lineWidth = 2;
    seg(g, [[36, 50], [36, 20]]);
    g.strokeStyle = '#ffd75e'; g.lineWidth = 1.5; g.lineCap = 'round';
    for (const y of [25, 32, 39]) { seg(g, [[33.5, y], [36, y + 3], [38.5, y]]); }
    // edge lights along both bevels
    g.strokeStyle = 'rgba(240,248,255,0.75)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(36, 11); g.lineTo(30, 24); g.stroke();
    // crossguard wings + pommel
    const gold = g.createLinearGradient(22, 50, 50, 55);
    gold.addColorStop(0, '#f0d489'); gold.addColorStop(0.6, '#c9a35c'); gold.addColorStop(1, '#8a6a3a');
    g.fillStyle = gold;
    poly(g, [[22, 50], [50, 50], [47, 56], [25, 56]]); g.fill();
    dot(g, 23.5, 50.5, 2.4, '#ffd75e'); dot(g, 48.5, 50.5, 2.4, '#ffd75e');
    // grip wrap
    const grip = g.createLinearGradient(36, 56, 36, 64);
    grip.addColorStop(0, '#7a5c33'); grip.addColorStop(1, '#4a3419');
    g.fillStyle = grip; roundRectPath(g, 33, 55.5, 6, 8.5, 2.5); g.fill();
    g.strokeStyle = 'rgba(20,14,6,0.55)'; g.lineWidth = 1;
    seg(g, [[33.2, 58], [38.8, 59]]); seg(g, [[33.2, 61], [38.8, 62]]);
    // pommel gem ringed in gold
    dot(g, 36, 65.5, 4, '#c9a35c'); dot(g, 36, 65.5, 2.4, '#7fb8ff');
  });

  icons.magnet = make('passive', (g) => {
    // Horseshoe magnet tilted right: red body, silver poles, field lines + pulled iron filings
    for (const [r, a] of [[26, 0.5], [31, 0.28]]) {
      g.strokeStyle = `rgba(245,198,107,${a})`; g.lineWidth = r > 28 ? 1.5 : 2;
      g.beginPath(); g.arc(36, 34, r, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    }
    g.save(); g.translate(36, 38); g.rotate(-0.35);
    const body = g.createLinearGradient(-16, -18, 16, 14);
    body.addColorStop(0, '#ff8a76'); body.addColorStop(0.5, '#dd4c4c'); body.addColorStop(1, '#9c2b34');
    g.strokeStyle = body; g.lineWidth = 11; g.lineCap = 'butt';
    g.beginPath(); g.arc(0, -4, 15, Math.PI, 0); g.stroke();
    seg(g, [[-15, -4], [-15, 12]]); seg(g, [[15, -4], [15, 12]]);
    // rim light on the arch back
    g.strokeStyle = 'rgba(255,200,180,0.5)'; g.lineWidth = 2;
    g.beginPath(); g.arc(0, -4, 19.5, Math.PI * 1.15, Math.PI * 1.6); g.stroke();
    // pole caps (silver) with bevels
    const cap = g.createLinearGradient(0, 8, 0, 15);
    cap.addColorStop(0, '#f2f5ff'); cap.addColorStop(1, '#a9b4cf');
    g.fillStyle = cap;
    roundRectPath(g, -20.5, 8, 11, 7, 1.5); g.fill();
    roundRectPath(g, 9.5, 8, 11, 7, 1.5); g.fill();
    g.restore();
    // iron filings pulled toward the poles
    for (const [x, y] of [[30, 62], [38, 65], [45, 60], [25, 57]]) {
        dot(g, x, y, 1.5, 'rgba(180,196,230,0.85)');
    }
  });

  icons.sigil = make('passive', (g) => {
    // Moon sigil: waxing crescent inside a double rune ring with tick marks + orbit sparks
    g.strokeStyle = 'rgba(245,198,107,0.55)'; g.lineWidth = 2.2;
    g.beginPath(); g.arc(36, 36, 27, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(245,198,107,0.3)'; g.lineWidth = 1.4;
    g.beginPath(); g.arc(36, 36, 23, 0, TAU); g.stroke();
    for (let i = 0; i < 8; i++) { // rune ticks between the two rings
      const a = (i / 8) * TAU + 0.35;
      seg(g, [[36 + Math.cos(a) * 22.6, 36 + Math.sin(a) * 22.6], [36 + Math.cos(a) * 27.4, 36 + Math.sin(a) * 27.4]]);
    }
    // crescent moon: blue-lit disc bitten by plate-colored disc
    const grad = g.createRadialGradient(30, 30, 2, 35, 36, 19);
    grad.addColorStop(0, '#fbfdff'); grad.addColorStop(0.6, '#a8cff8'); grad.addColorStop(1, '#4a76b5');
    g.fillStyle = grad; g.beginPath(); g.arc(35, 36, 17.5, 0, TAU); g.fill();
    g.fillStyle = PLATE.passive.bgB;
    g.beginPath(); g.arc(44.5, 29.5, 14.5, 0, TAU); g.fill();
    // crater dimples on the lit sliver + a bright star at the horns
    dot(g, 26, 38, 1.6, 'rgba(70,110,170,0.5)'); dot(g, 28, 45, 1.2, 'rgba(70,110,170,0.45)');
    glint(g, 48, 46, 2.6, 'rgba(255,240,200,0.9)'); dot(g, 52, 26, 1.3, 'rgba(255,240,200,0.6)');
  });

  icons.gem = make('passive', (g) => {
    // Soul shard: pentagon crystal, three shaded facets, ridge lights, inner glow + rising motes
    const grad = g.createLinearGradient(18, 12, 54, 60);
    grad.addColorStop(0, '#3af5d4'); grad.addColorStop(0.5, '#0fb89b'); grad.addColorStop(1, '#0a6f60');
    poly(g, [[36, 11], [55, 33], [48, 59], [24, 59], [17, 33]]);
    g.fillStyle = grad; g.fill();
    // facets: lit upper-left, dark upper-right, mid body
    g.fillStyle = 'rgba(235,255,250,0.55)'; poly(g, [[36, 11], [17, 33], [36, 40]]); g.fill();
    g.fillStyle = 'rgba(4,52,44,0.5)'; poly(g, [[36, 11], [55, 33], [36, 40]]); g.fill();
    g.fillStyle = 'rgba(10,90,78,0.35)'; poly(g, [[17, 33], [24, 59], [48, 59], [55, 33], [36, 40]]); g.fill();
    // ridge highlights along every facet seam
    g.strokeStyle = 'rgba(240,255,250,0.7)'; g.lineWidth = 1.4;
    seg(g, [[17, 33], [36, 40], [55, 33]]); seg(g, [[36, 11], [36, 40]]);
    // outer edge stroke keeps the silhouette crisp
    poly(g, [[36, 11], [55, 33], [48, 59], [24, 59], [17, 33]]);
    g.strokeStyle = 'rgba(6,60,50,0.7)'; g.lineWidth = 1.5; g.stroke();
    // inner soul light pulsing from the core + rising motes
    const inner = g.createRadialGradient(36, 48, 0.5, 36, 49, 7);
    inner.addColorStop(0, 'rgba(220,255,248,0.95)'); inner.addColorStop(1, 'rgba(94,234,212,0)');
    g.fillStyle = inner; g.beginPath(); g.arc(36, 49, 7, 0, TAU); g.fill();
    dot(g, 36, 22, 1.5, 'rgba(225,255,250,0.85)'); dot(g, 30, 48, 1.2, 'rgba(225,255,250,0.6)');
  });

  icons.dash = make('passive', (g) => {
    // Phantom Step: two ghost afterimages dissolving into motion streaks behind a runner
    // silhouette leaning at full sprint
    g.strokeStyle = 'rgba(94,234,212,0.45)'; g.lineWidth = 2.6; g.lineCap = 'round';
    for (const [y, x0, len] of [[27, 6, 16], [36, 4, 22], [45, 8, 18]]) seg(g, [[x0, y], [x0 + len, y]]);
    // dissolving afterimage ghosts
    for (const [x, r, a] of [[20, 3.2, 0.28], [28, 4, 0.45]]) {
      g.strokeStyle = `rgba(94,234,212,${a + 0.2})`; g.lineWidth = 1.6;
      g.beginPath(); g.arc(x, 37, r + 4, Math.PI * 0.6, Math.PI * 1.4); g.stroke();
      dot(g, x, 33, r * 0.5, `rgba(94,234,212,${a})`);
    }
    // runner silhouette: forward-leaning torso, head, driving legs
    const runner = '#5eead4';
    dot(g, 48, 27, 4.6, runner);
    g.strokeStyle = runner; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(46, 33); g.lineTo(50, 41); g.stroke(); // torso lean
    g.beginPath(); g.moveTo(50, 41); g.lineTo(42, 48); g.lineTo(47, 56); g.stroke(); // back leg trailing
    g.beginPath(); g.moveTo(50, 41); g.lineTo(58, 46); g.lineTo(55, 55); g.stroke(); // front leg driving
    g.lineWidth = 4.5;
    g.beginPath(); g.moveTo(47, 35); g.lineTo(40, 39); g.stroke(); // arm pumping back
    g.beginPath(); g.moveTo(47, 35); g.lineTo(56, 37); g.stroke(); // arm forward
    // spark head + speed chevrons trailing the figure
    const head = g.createRadialGradient(52, 28, 1, 54, 30, 8);
    head.addColorStop(0, '#ffffff'); head.addColorStop(0.5, '#9cf2e2'); head.addColorStop(1, 'rgba(94,234,212,0)');
    g.fillStyle = head; g.beginPath(); g.arc(54, 30, 8, 0, TAU); g.fill();
  });

  // ================= SYNERGIES ============================================
  icons.blight = make('synergy', (g) => {
    // Blight Hex: skull fused into a violet hex rune, toxic drips below, sickly eye sockets
    const hx = [[36, 10], [56, 21.5], [56, 44.5], [36, 56], [16, 44.5], [16, 21.5]];
    const grad = g.createLinearGradient(16, 10, 56, 56);
    grad.addColorStop(0, '#d4b3ff'); grad.addColorStop(0.55, '#8a5fd6'); grad.addColorStop(1, '#43286f');
    poly(g, hx); g.fillStyle = grad; g.fill();
    formShade(g, 16, 10, 40, 46, { shade: 0.26, rim: 'rgba(225,195,255,0.4)' });
    poly(g, hx); g.strokeStyle = 'rgba(30,14,58,0.7)'; g.lineWidth = 1.6; g.stroke();
    // inner hex hairline
    g.strokeStyle = 'rgba(230,210,255,0.4)'; g.lineWidth = 1.2;
    poly(g, hx.map(([x, y]) => [36 + (x - 36) * 0.82, 33 + (y - 33) * 0.82])); g.stroke();
    // skull: dome merged with the hex, dark sockets, nasal, jaw teeth
    const bone = g.createLinearGradient(24, 16, 48, 44);
    bone.addColorStop(0, '#f5ecff'); bone.addColorStop(0.7, '#c9b3e8'); bone.addColorStop(1, '#8f6fbf');
    g.fillStyle = bone;
    g.beginPath();
    g.moveTo(24, 32);
    g.bezierCurveTo(24, 18, 48, 18, 48, 32);
    g.bezierCurveTo(48, 39, 44, 42, 42, 45);
    g.lineTo(30, 45);
    g.bezierCurveTo(28, 42, 24, 39, 24, 32);
    g.closePath(); g.fill();
    // sockets glow toxic green from deep inside
    for (const ex of [30.5, 41.5]) {
      const socket = g.createRadialGradient(ex, 31, 0.5, ex, 31, 5);
      socket.addColorStop(0, '#c9ff8a'); socket.addColorStop(0.6, 'rgba(120,200,70,0.6)'); socket.addColorStop(1, 'rgba(20,40,10,0)');
      g.fillStyle = socket; g.beginPath(); g.arc(ex, 31, 5, 0, TAU); g.fill();
      dot(g, ex, 31, 2.6, '#1c1230');
    }
    poly(g, [[36, 34], [38, 39], [34, 39]]); g.fillStyle = '#1c1230'; g.fill(); // nasal cavity
    g.strokeStyle = 'rgba(28,18,48,0.8)'; g.lineWidth = 1.4;
    for (const tx of [32, 36, 40]) seg(g, [[tx, 45], [tx, 49]]); // teeth
    g.fillStyle = '#b9f28a';
    for (const [x, y, r] of [[27, 58, 2.6], [36, 61, 3.2], [45, 57, 2.2]]) { dot(g, x, y, r, '#b9f28a'); }
    dot(g, 52, 50, 1.4, 'rgba(185,242,138,0.7)'); // drifting spore
  });

  icons.tempest = make('synergy', (g) => {
    // Tempest Blades: storm cloud low-left with three blade-bolts slashing up-right
    const cloud = g.createLinearGradient(10, 40, 34, 62);
    cloud.addColorStop(0, '#8f9bbd'); cloud.addColorStop(1, '#4d5878');
    for (const [x, y, r] of [[18, 50, 8], [28, 47, 9.5], [38, 52, 7]]) { g.fillStyle = cloud; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    roundRectPath(g, 11, 50, 30, 9, 4.5); g.fillStyle = cloud; g.fill();
    // underlit rim where the bolts flash the cloud from below
    g.strokeStyle = 'rgba(255,233,168,0.5)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(14, 57); g.lineTo(38, 57); g.stroke();
    // three lightning blades: straight bolt shafts with a crescent edge
    const bladeBolt = (x, y, rot) => {
      g.save(); g.translate(x, y); g.rotate(rot);
      boltShape(g, -6, -20, 40, 12);
      const bg = g.createLinearGradient(0, -20, 0, 20);
      bg.addColorStop(0, '#fffbe8'); bg.addColorStop(0.55, '#ffe06a'); bg.addColorStop(1, '#ffaa3c');
      g.fillStyle = bg; g.fill();
      g.strokeStyle = 'rgba(255,247,230,0.8)'; g.lineWidth = 1; g.stroke();
      g.restore();
    };
    bladeBolt(30, 34, 0.6); bladeBolt(41, 32, 0.85); bladeBolt(50, 37, 1.15);
    // scattered charge sparks
    dot(g, 55, 22, 1.6, 'rgba(255,233,168,0.9)'); dot(g, 46, 16, 1.3, 'rgba(255,233,168,0.75)');
    glint(g, 18, 34, 2.2, 'rgba(200,220,255,0.6)');
  });

  icons.inferno = make('synergy', (g) => {
    // Inferno Rounds: bullet fired up-right trailing a torn ribbon of flame, sparks in the wake
    // flame ribbon behind the projectile
    const ribbon = g.createLinearGradient(12, 56, 48, 20);
    ribbon.addColorStop(0, 'rgba(255,90,30,0)'); ribbon.addColorStop(0.45, 'rgba(255,120,40,0.75)'); ribbon.addColorStop(1, '#ffc85e');
    g.fillStyle = ribbon;
    g.beginPath();
    g.moveTo(12, 60);
    g.bezierCurveTo(22, 48, 30, 44, 40, 35); // reaches the casing's heel
    g.bezierCurveTo(33, 44, 30, 48, 27, 55);
    g.bezierCurveTo(23, 61, 16, 63, 12, 60);
    g.closePath(); g.fill();
    for (const [x, y, h] of [[20, 40, 14], [30, 50, 11], [38, 36, 10]]) {
      flameShape(g, x, y, h, -0.5); g.fillStyle = 'rgba(255,150,60,0.85)'; g.fill();
    }
    // the round flying up-right: molten ogive nose leads, brass casing trails into the wake
    g.save(); g.translate(44, 28); g.rotate(0.72); // nose (local -y) points up-right
    const brass = g.createLinearGradient(-5, 6, 5, 0);
    brass.addColorStop(0, '#8f6a2c'); brass.addColorStop(0.45, '#d3a44a'); brass.addColorStop(1, '#ffe9a8');
    g.fillStyle = brass; roundRectPath(g, -5, -6, 10, 12, 2); g.fill(); // casing
    g.strokeStyle = 'rgba(40,20,4,0.6)'; g.lineWidth = 1.2; roundRectPath(g, -5, -6, 10, 12, 2); g.stroke();
    dot(g, 0, 4.6, 1.6, 'rgba(70,45,12,0.8)'); // primer
    g.beginPath(); g.moveTo(-5, -6); g.quadraticCurveTo(-5, -20, 0, -22); g.quadraticCurveTo(5, -20, 5, -6); g.closePath();
    const nose = g.createLinearGradient(0, -22, 0, -6);
    nose.addColorStop(0, '#fff8e8'); nose.addColorStop(0.5, '#ffb45e'); nose.addColorStop(1, '#ff6a2a');
    g.fillStyle = nose; g.fill();
    g.strokeStyle = 'rgba(120,50,10,0.55)'; g.lineWidth = 1; g.stroke();
    g.restore();
    // heat glint on the leading nose tip + ember wake
    glint(g, 56, 15, 3.2, 'rgba(255,247,230,0.95)', 1.8);
    for (const [x, y, r] of [[14, 30, 1.6], [24, 22, 1.2], [58, 44, 1.5], [10, 46, 1.2]]) {
      dot(g, x, y, r, 'rgba(255,200,110,0.9)');
    }
  });

  icons.napalm = make('synergy', (g) => {
    // Napalm Detonation: bomb splitting open, pressurized fire jets arcing out both sides
    g.strokeStyle = '#c9a35c'; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(40, 22); g.quadraticCurveTo(48, 14, 54, 15); g.stroke();
    dot(g, 55, 15, 2.4, '#ffd75e');
    const grad = g.createRadialGradient(27, 30, 2, 34, 42, 19);
    grad.addColorStop(0, '#6b768c'); grad.addColorStop(0.5, '#2d3343'); grad.addColorStop(1, '#101219');
    g.fillStyle = grad; g.beginPath(); g.arc(34, 42, 17, 0, TAU); g.fill();
    // split seam: glowing interior where the shell tears open
    const tear = [[26, 36], [33, 42], [29, 48]];
    g.strokeStyle = 'rgba(255,140,40,0.55)'; g.lineWidth = 5; seg(g, tear);
    g.strokeStyle = '#ffc85e'; g.lineWidth = 2; seg(g, tear);
    g.fillStyle = '#39404f'; g.beginPath(); g.arc(31, 27, 5.5, 0, TAU); g.fill(); // neck ring
    // three pressurized jets sweeping outward
    const jet = (x, y, h, lean) => { flameShape(g, x, y, h, lean); };
    jet(18, 46, 30, -0.9); g.fillStyle = 'rgba(255,110,40,0.85)'; g.fill();
    jet(46, 50, 26, 0.7); g.fillStyle = 'rgba(255,110,40,0.85)'; g.fill();
    jet(34, 16, 20, 0); g.fillStyle = '#ff9a3c'; g.fill();
    jet(34, 22, 12, 0); g.fillStyle = '#ffc85e'; g.fill();
    // sticky droplets flung outward
    for (const [x, y, r] of [[12, 60, 2], [58, 58, 1.7], [60, 34, 1.4], [10, 30, 1.5]]) {
      dot(g, x, y, r, 'rgba(255,170,70,0.9)');
    }
  });

  icons.phoenix = make('synergy', (g) => {
    // Phoenix Heart: flame-plumed heart rising, split flame wings sweeping up from behind it
    g.strokeStyle = 'rgba(255,140,59,0.45)'; g.lineWidth = 2;
    g.beginPath(); g.arc(36, 38, 27, 0, TAU); g.stroke();
    // flame wings: layered feathers sweeping up-outward
    for (const flip of [1, -1]) {
      g.save(); g.translate(36, 34); g.scale(flip, 1);
      const wing = g.createLinearGradient(10, -28, 30, 0);
      wing.addColorStop(0, '#ffcf6a'); wing.addColorStop(1, 'rgba(255,110,40,0.7)');
      g.fillStyle = wing;
      for (const [base, len] of [[8, 30], [15, 26], [22, 21]]) {
        g.beginPath();
        g.moveTo(base, 2);
        g.quadraticCurveTo(base + len * 0.35, -len * 0.55, base + len * 0.85, -len);
        g.quadraticCurveTo(base + len * 0.7, -len * 0.25, base + 6, 3);
        g.closePath(); g.fill();
      }
      g.restore();
    }
    const hp2 = () => {
      g.beginPath();
      g.moveTo(36, 60);
      g.bezierCurveTo(14, 44.5, 13.5, 27, 22, 24.5);
      g.bezierCurveTo(27.5, 23, 36, 27.5, 36, 31);
      g.bezierCurveTo(36, 27.5, 44.5, 23, 50, 24.5);
      g.bezierCurveTo(58.5, 27, 58, 44.5, 36, 60);
      g.closePath();
    };
    hp2();
    const hg = g.createLinearGradient(15, 24, 15, 62);
    hg.addColorStop(0, '#ffd76a'); hg.addColorStop(0.5, '#ff7a3a'); hg.addColorStop(1, '#c92e2e');
    g.fillStyle = hg; g.fill();
    formShade(g, 15, 24, 42, 38, { shade: 0.2, rim: 'rgba(255,220,160,0.45)' });
    hp2(); g.strokeStyle = 'rgba(140,30,20,0.55)'; g.lineWidth = 1.5; g.stroke();
    // flame crest licking off the top of the heart + rising embers
    flameShape(g, 36, 17, 15, 0); g.fillStyle = 'rgba(255,210,110,0.9)'; g.fill();
    flameShape(g, 36, 22, 8, 0); g.fillStyle = '#fff2c4'; g.fill();
    for (const [x, y, r] of [[15, 17, 1.7], [57, 19, 1.4], [12, 33, 1.2], [60, 31, 1.1]]) {
      dot(g, x, y, r, 'rgba(255,200,110,0.9)');
    }
  });

  icons.flamingArrows = make('synergy', (g) => {
    // Flaming Arrows: triple fletched shafts fanned up-right, steel heads, flames sheathing the flight
    const arrow = (x0, y0, rot, dim) => {
      g.save(); g.translate(x0, y0); g.rotate(rot);
      const shaftG = g.createLinearGradient(0, 0, 34, 0);
      shaftG.addColorStop(0, dim ? '#5c4123' : '#8f6a3c'); shaftG.addColorStop(1, dim ? '#8a6a44' : '#d9c08e');
      g.strokeStyle = shaftG; g.lineWidth = 3.2; g.lineCap = 'round';
      seg(g, [[0, 0], [34, 0]]);
      // nock + two feather vanes swept back
      g.fillStyle = dim ? 'rgba(200,160,90,0.7)' : '#e8b45a';
      for (const s of [1, -1]) {
        g.beginPath(); g.moveTo(3, 0);
        g.quadraticCurveTo(-4, 2 * s, -7, 6 * s); g.lineTo(1, 1.5 * s);
        g.closePath(); g.fill();
      }
      // steel broadhead
      const hs = g.createLinearGradient(34, -5, 46, 4);
      hs.addColorStop(0, dim ? '#b9c8e0' : '#f2f8ff'); hs.addColorStop(1, dim ? '#7689b5' : '#9fb4d8');
      g.fillStyle = hs;
      poly(g, [[34, -4.5], [46, 0], [34, 4.5]]); g.fill();
      g.strokeStyle = 'rgba(120,90,50,0.8)'; g.lineWidth = 1;
      seg(g, [[34, -4.5], [40, 0], [34, 4.5]]); // barbed shoulder line
      g.restore();
    };
    // fanned trio: distinct angles so three shafts read at 72px
    arrow(10, 56, -Math.PI / 4 + 0.2, true);
    arrow(20, 62, -Math.PI / 4 - 0.16, true);
    arrow(16, 54, -Math.PI / 4, false);  // front hero shaft
    // flames hugging the hero shaft's flight and licking its head
    for (const [x, y, h] of [[40, 38, 13], [32, 46, 9]]) { flameShape(g, x, y, h, -0.7); g.fillStyle = 'rgba(255,140,50,0.8)'; g.fill(); }
    flameShape(g, 53, 14, 14, -0.3); g.fillStyle = '#ffc85e'; g.fill();
    flameShape(g, 53, 20, 7, -0.3); g.fillStyle = '#fff2c4'; g.fill();
    dot(g, 46, 11, 1.4, 'rgba(255,210,120,0.9)'); dot(g, 62, 27, 1.3, 'rgba(255,210,120,0.8)');
  });

  icons.heartPiercer = make('synergy', (g) => {
    // Heart-Piercer: thorned rose-heart skewered by a crystal lance, entry spark + exit shards
    const hp3 = () => {
      g.beginPath();
      g.moveTo(36, 55);
      g.bezierCurveTo(12, 40, 11.5, 22, 21, 19.5);
      g.bezierCurveTo(27.5, 18, 36, 22.5, 36, 26);
      g.bezierCurveTo(36, 22.5, 44.5, 18, 51, 19.5);
      g.bezierCurveTo(60.5, 22, 60, 40, 36, 55);
      g.closePath();
    };
    hp3();
    const hg = g.createLinearGradient(16, 16, 16, 54);
    hg.addColorStop(0, '#ff9a8a'); hg.addColorStop(0.55, '#d43548'); hg.addColorStop(1, '#7e1b2a');
    g.fillStyle = hg; g.fill();
    formShade(g, 16, 16, 40, 38, { shade: 0.22, rim: 'rgba(255,190,200,0.4)' });
    hp3(); g.strokeStyle = 'rgba(90,12,30,0.6)'; g.lineWidth = 1.5; g.stroke();
    // thorns at the lobes
    g.fillStyle = '#5e7a4a';
    poly(g, [[17, 22], [12, 17], [21, 18]]); g.fill();
    poly(g, [[53, 40], [59, 46], [50, 42]]); g.fill();
    // crystal lance across the heart: faceted shaft + diamond tip + exit shards
    const shaft = g.createLinearGradient(12, 56, 60, 18);
    shaft.addColorStop(0, '#9fc8ff'); shaft.addColorStop(0.5, '#eafffb'); shaft.addColorStop(1, '#cfe6ff');
    poly(g, [[13, 57], [55, 21], [58, 24.5], [16, 60]]);
    g.fillStyle = shaft; g.fill();
    poly(g, [[55, 21], [62, 14], [58, 24.5]]); g.fillStyle = '#eafffb'; g.fill(); // arrowhead tip
    g.strokeStyle = 'rgba(120,170,230,0.8)'; g.lineWidth = 1;
    seg(g, [[14.5, 58.5], [56.5, 22.8]]); // facet ridge
    g.strokeStyle = 'rgba(120,170,230,0.8)'; g.lineWidth = 1;
    dot(g, 22, 49, 2.6, 'rgba(255,255,255,0.9)'); // entry gleam where it entered the heart
    for (const [x, y] of [[63, 12], [60, 28], [50, 14]]) dot(g, x, y, 1.3, 'rgba(220,240,255,0.9)'); // exit shards
    // beat pulse ring behind the heart
    g.strokeStyle = 'rgba(255,120,140,0.3)'; g.lineWidth = 1.8;
    g.beginPath(); g.arc(36, 37, 29, 0, TAU); g.stroke();
  });

  icons.blueFlame = make('synergy', (g) => {
    // Blue Flame: cold-fire torch — great blue flame with an ice core; a snowflake melts at its base
    const glow = g.createRadialGradient(36, 40, 2, 36, 40, 27);
    glow.addColorStop(0, 'rgba(180,230,255,0.55)'); glow.addColorStop(1, 'rgba(40,90,230,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(36, 40, 27, 0, TAU); g.fill();
    flameShape(g, 25, 30, 30, -0.35); g.fillStyle = 'rgba(90,160,255,0.8)'; g.fill();
    flameShape(g, 47, 32, 28, 0.35); g.fillStyle = 'rgba(90,160,255,0.8)'; g.fill();
    flameShape(g, 36, 12, 42, 0); g.fillStyle = '#7ab8ff'; g.fill();
    flameShape(g, 36, 24, 27, 0); g.fillStyle = '#b9dcff'; g.fill();
    flameShape(g, 36, 35, 15, 0); g.fillStyle = '#eaf7ff'; g.fill();
    // ice crystal frozen inside the hottest part of the flame
    g.save(); g.translate(36, 40);
    g.strokeStyle = 'rgba(240,250,255,0.95)'; g.lineWidth = 1.8; g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI + 0.35;
      seg(g, [[-Math.cos(a) * 7, -Math.sin(a) * 7], [Math.cos(a) * 7, Math.sin(a) * 7]]);
      for (const s of [1, -1]) { // branch arms
        const bx = Math.cos(a) * 4.6 * s, by = Math.sin(a) * 4.6 * s;
        seg(g, [[bx, by], [bx + Math.cos(a + 1.1) * 2.4, by + Math.sin(a + 1.1) * 2.4]]);
      }
    }
    g.restore();
    // melting drip falling from the snowflake side + cold sparks
    g.fillStyle = 'rgba(160,215,255,0.9)';
    g.beginPath(); g.moveTo(23, 50); g.quadraticCurveTo(21, 55, 23.5, 57); g.quadraticCurveTo(26, 55, 24, 50); g.closePath(); g.fill();
    for (const [x, y, r] of [[17, 28, 1.4], [56, 24, 1.6], [58, 44, 1.2]]) dot(g, x, y, r, 'rgba(200,235,255,0.9)');
  });

  icons.stormVolley = make('synergy', (g) => {
    // Storm Volley: storm cloud dispensing a volley of bullets that are lightning bolts
    const cloud = g.createLinearGradient(8, 40, 32, 60);
    cloud.addColorStop(0, '#8f9bbd'); cloud.addColorStop(1, '#4d5878');
    for (const [x, y, r] of [[16, 48, 7.5], [26, 45, 9], [36, 50, 6.5]]) { g.fillStyle = cloud; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    roundRectPath(g, 9, 48, 29, 8.5, 4.2); g.fillStyle = cloud; g.fill();
    g.strokeStyle = 'rgba(255,233,168,0.45)'; g.lineWidth = 2; // flash underlight
    g.beginPath(); g.moveTo(12, 55); g.lineTo(35, 55); g.stroke();
    // volley of bolt-rounds fanning down-right, with casing bases at the muzzle
    const volley = (x, y, rot) => {
      g.save(); g.translate(x, y); g.rotate(rot);
      boltShape(g, -4.5, -13, 26, 9); // bolt body
      const bg = g.createLinearGradient(0, -13, 0, 13);
      bg.addColorStop(0, '#fffbe8'); bg.addColorStop(0.55, '#ffe06a'); bg.addColorStop(1, '#8fb8ff');
      g.fillStyle = bg; g.fill();
      g.strokeStyle = 'rgba(255,247,230,0.7)'; g.lineWidth = 0.9; g.stroke();
      const brass = g.createLinearGradient(-4, 13, 4, 13); // cartridge base where the bolt loads
      brass.addColorStop(0, '#ffe9a8'); brass.addColorStop(1, '#b78a3c');
      g.fillStyle = brass; roundRectPath(g, -4.5, 11, 9, 4.5, 1.2); g.fill();
      g.restore();
    };
    volley(40, 34, 0.7); volley(50, 42, 0.85); volley(57, 24, 0.9);
    dot(g, 34, 20, 1.6, 'rgba(255,233,168,0.9)'); dot(g, 60, 40, 1.3, 'rgba(200,220,255,0.7)');
  });

  icons.heartMagnet = make('synergy', (g) => {
    // Heart Compass: lodestone bottom-right pulling a stream of hearts along an orbit arc
    g.strokeStyle = 'rgba(190,140,255,0.6)'; g.lineWidth = 2;
    g.beginPath(); g.arc(34, 38, 23, 0, TAU); g.stroke();
    // pull-field dashes pointing inward along the arc
    g.strokeStyle = 'rgba(190,140,255,0.35)'; g.lineWidth = 1.6;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.85 + i * 0.42;
      seg(g, [[34 + Math.cos(a) * 29, 38 + Math.sin(a) * 29], [34 + Math.cos(a) * 33, 38 + Math.sin(a) * 33]]);
    }
    // lodestone horseshoe at the bottom-right, poles pointing up-left toward the hearts
    g.save(); g.translate(51, 50); g.rotate(-Math.PI * 0.25);
    const body = g.createLinearGradient(-10, -10, 8, 9);
    body.addColorStop(0, '#d6baff'); body.addColorStop(0.55, '#8a5fd6'); body.addColorStop(1, '#4b2d80');
    g.strokeStyle = body; g.lineWidth = 7.5; g.lineCap = 'butt';
    g.beginPath(); g.arc(0, -2, 9.5, Math.PI, 0); g.stroke();
    seg(g, [[-9.5, -2], [-9.5, 6]]); seg(g, [[9.5, -2], [9.5, 6]]);
    const cap = g.createLinearGradient(0, 4, 0, 10);
    cap.addColorStop(0, '#f2f5ff'); cap.addColorStop(1, '#a9b4cf');
    g.fillStyle = cap;
    roundRectPath(g, -13, 5, 7, 5.5, 1.2); g.fill();
    roundRectPath(g, 6, 5, 7, 5.5, 1.2); g.fill();
    g.restore();
    // heart stream: hero heart riding the orbit, two smaller ones shrinking behind
    const hearts = [[24, 31, 14, 1], [44, 24, 9, 0.8], [56, 17, 6, 0.55]];
    const miniHeart = (cx, cy, s) => {
      g.beginPath();
      g.moveTo(cx, cy + s);
      g.bezierCurveTo(cx - s * 1.9, cy + s * 0.12, cx - s * 1.5, cy - s * 1.4, cx - s * 0.45, cy - s * 1.12);
      g.bezierCurveTo(cx - s * 0.15, cy - s * 1.02, cx, cy - s * 0.62, cx, cy - s * 0.38);
      g.bezierCurveTo(cx, cy - s * 0.62, cx + s * 0.15, cy - s * 1.02, cx + s * 0.45, cy - s * 1.12);
      g.bezierCurveTo(cx + s * 1.5, cy - s * 1.4, cx + s * 1.9, cy + s * 0.12, cx, cy + s);
      g.closePath();
    };
    for (const [hx0, hy0, s, a] of hearts) {
      const hg = g.createLinearGradient(hx0, hy0 - s, hx0, hy0 + s);
      hg.addColorStop(0, `rgba(255,154,168,${a})`); hg.addColorStop(1, `rgba(201,46,74,${a})`);
      miniHeart(hx0, hy0, s); g.fillStyle = hg; g.fill();
      if (s > 10) { // hero heart gets gloss + rim
        formShade(g, hx0 - s * 1.9, hy0 - s * 1.4, s * 3.8, s * 2.4, { shade: 0.2, rim: 'rgba(255,190,205,0.4)' });
        g.fillStyle = 'rgba(255,235,240,0.75)';
        g.beginPath(); g.ellipse(hx0 - s * 0.5, hy0 - s * 0.55, s * 0.28, s * 0.17, -0.55, 0, TAU); g.fill();
      }
    }
    glint(g, 36, 42, 2.6, 'rgba(255,170,190,0.85)'); // heart dust at the field center
  });

  return icons;
}

export function buildItems() {
  // gem/heart are per-level (gemHeartFor, 13.10) — not built here.
  return {
    bolt: boltSprite(),
    orb: orbSprite(),
    boomerang: boomerangSprite(),
    blade: bladeSprite(),
    bullet: bulletSprite(),
    arrow: arrowSprite(),
    snowball: snowballSprite(),
    frostBurst: frostBurstSprite(),
    spark: sparkSprite(),
    bomb: bombSprite(),
    flame: flameSprite(),
    explosion: explosionSprite(),
    burn: burnSprite(),
    blight: blightSprite(),
    shadowPickup: shadowSprite(7, 3, 0.30),
    // 24.3 synergy variant maps (keyed by the projectile record's `v` tag). game.constructor
    // assigns each to combat.<type>Var; combat.draw picks map[v] || baseImg.
    boltVar: { blight: boltBlightSprite() },
    bulletVar: { inferno: bulletInfernoSprite(), storm: bulletStormSprite() },
    arrowVar: { flaming: arrowFlamingSprite(), piercer: arrowPiercerSprite() },
    bombVar: { napalm: bombNapalmSprite() },
    snowballVar: { blue: snowballBlueSprite() },
  };
}
