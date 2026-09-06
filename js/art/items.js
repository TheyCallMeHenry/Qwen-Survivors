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
export function buildIcons() {
  const icons = {};
  const make = (fn) => {
    const c = makeCanvas(72, 72);
    const g = c.getContext('2d');
    g.drawImage(glowSprite(30, '120,150,220', 0.18), 6, 6);
    fn(g);
    return c;
  };
  icons.wand = make((g) => {
    g.strokeStyle = '#6b543a'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(20, 52); g.lineTo(48, 18); g.stroke();
    const grad = g.createRadialGradient(50, 16, 1, 50, 16, 12);
    grad.addColorStop(0, '#eafffb'); grad.addColorStop(0.5, '#5eead4'); grad.addColorStop(1, 'rgba(94,234,212,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(50, 16, 12, 0, TAU); g.fill();
  });
  icons.garlic = make((g) => {
    const grad = g.createRadialGradient(30, 34, 2, 36, 40, 22);
    grad.addColorStop(0, '#f4f0ff'); grad.addColorStop(1, '#b79be0');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(36, 12);
    g.bezierCurveTo(52, 20, 56, 40, 46, 52);
    g.bezierCurveTo(40, 58, 32, 58, 26, 52);
    g.bezierCurveTo(16, 40, 20, 20, 36, 12);
    g.fill();
    g.strokeStyle = 'rgba(140,110,190,0.6)'; g.lineWidth = 1.4;
    for (const dx of [-10, 0, 10]) { g.beginPath(); g.moveTo(36 + dx * 0.4, 18); g.quadraticCurveTo(36 + dx, 40, 36 + dx * 0.5, 54); g.stroke(); }
    g.fillStyle = 'rgba(160,120,230,0.5)';
    g.beginPath(); g.arc(36, 44, 26, 0, TAU); g.lineWidth = 2; g.strokeStyle = 'rgba(160,120,230,0.45)'; g.stroke();
  });
  icons.axe = make((g) => {
    g.strokeStyle = '#b9c6e8'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.arc(36, 38, 20, Math.PI * 0.75, Math.PI * 2.25); g.stroke();
    g.fillStyle = '#8fa2cc';
    for (const a of [Math.PI, Math.PI * 1.5, 0]) {
      const x = 36 + Math.cos(a) * 20, y = 38 + Math.sin(a) * 20;
      g.beginPath(); g.moveTo(x, y - 5); g.lineTo(x + 7, y); g.lineTo(x, y + 5); g.closePath(); g.fill();
    }
  });
  icons.blades = make((g) => {
    for (const [cx, cy, rot] of [[36, 30, 0.4], [30, 44, 2.6], [44, 46, 4.0]]) {
      g.save(); g.translate(cx, cy); g.rotate(rot);
      g.beginPath(); g.arc(0, 0, 11, -1.1, 1.1); g.arc(0, 0, 5, 1.3, -1.3, true); g.closePath();
      g.fillStyle = '#cfe6ff'; g.fill();
      g.strokeStyle = 'rgba(94,234,212,0.8)'; g.lineWidth = 1.3; g.stroke();
      g.restore();
    }
  });
  icons.boots = make((g) => {
    g.fillStyle = '#8a5a34';
    roundRectPath(g, 22, 16, 16, 30, 5); g.fill();
    g.fillStyle = '#6d4527';
    roundRectPath(g, 22, 34, 26, 14, 5); g.fill();
    g.fillStyle = '#3a2414';
    roundRectPath(g, 20, 44, 30, 8, 4); g.fill();
    g.fillStyle = 'rgba(255,220,160,0.5)';
    g.fillRect(24, 18, 4, 12);
  });
  icons.heart = make((g) => {
    g.save(); g.translate(10, 8); g.scale(1.9, 1.9);
    g.beginPath();
    g.moveTo(11, 18.5);
    g.bezierCurveTo(1.5, 10.5, 0.5, 4.5, 5.5, 3.5);
    g.bezierCurveTo(9, 2.8, 11, 5.5, 11, 7);
    g.bezierCurveTo(11, 5.5, 13, 2.8, 16.5, 3.5);
    g.bezierCurveTo(21.5, 4.5, 20.5, 10.5, 11, 18.5);
    g.fill();
    const grad = g.createLinearGradient(0, 2, 0, 19);
    grad.addColorStop(0, '#ff7d90'); grad.addColorStop(1, '#d42a4c');
    g.fillStyle = grad; g.fill();
    g.restore();
  });
  icons.sword = make((g) => {
    g.strokeStyle = '#c9d6f2'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(22, 50); g.lineTo(46, 18); g.stroke();
    g.strokeStyle = '#8a6a3a'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(20, 40); g.lineTo(34, 46); g.stroke();
    g.fillStyle = '#5a4423'; g.beginPath(); g.arc(19, 49, 3.4, 0, TAU); g.fill();
    g.fillStyle = 'rgba(94,234,212,0.5)';
    g.beginPath(); g.arc(47, 17, 4, 0, TAU); g.fill();
  });
  icons.magnet = make((g) => {
    g.strokeStyle = '#e05252'; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); g.arc(36, 32, 15, Math.PI, 0); g.stroke();
    g.strokeStyle = '#e05252';
    g.beginPath(); g.moveTo(21, 32); g.lineTo(21, 48); g.stroke();
    g.beginPath(); g.moveTo(51, 32); g.lineTo(51, 48); g.stroke();
    g.fillStyle = '#e8ecf8';
    g.fillRect(21, 44, 9, 7); g.fillRect(42, 44, 9, 7);
  });
  icons.sigil = make((g) => {
    const grad = g.createRadialGradient(36, 36, 4, 36, 36, 24);
    grad.addColorStop(0, '#eaf6ff'); grad.addColorStop(0.7, '#7fb2e8'); grad.addColorStop(1, '#2c4a78');
    g.fillStyle = grad;
    g.beginPath(); g.arc(36, 36, 22, 0, TAU); g.fill();
    g.fillStyle = '#101828';
    g.beginPath(); g.arc(44, 32, 19, 0, TAU); g.fill();
    g.fillStyle = 'rgba(94,234,212,0.9)';
    g.fillRect(50, 44, 3, 12); g.fillRect(45.5, 48.5, 12, 3);
  });
  const gunPath = (g) => {
    g.beginPath();
    g.moveTo(-18, -6); g.lineTo(18, -6); g.lineTo(18, 1); g.lineTo(2, 1);
    g.lineTo(5, 16); g.lineTo(-6, 16); g.lineTo(-4, 1); g.lineTo(-18, 1);
    g.closePath();
  };
  icons.pistols = make((g) => {
    g.fillStyle = '#9fb2e0';
    g.save(); g.translate(33, 32); gunPath(g); g.fill(); g.restore();
    g.fillStyle = '#7f95cc';
    g.save(); g.translate(39, 40); g.scale(-1, 1); gunPath(g); g.fill(); g.restore();
    g.fillStyle = 'rgba(255,214,120,0.9)';
    g.beginPath(); g.arc(53, 32, 3, 0, TAU); g.fill();
    g.beginPath(); g.arc(19, 40, 3, 0, TAU); g.fill();
  });
  icons.bow = make((g) => {
    // 12.2: drawn bow (limb + string) with a nocked arrow
    g.strokeStyle = '#8a6a3a'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.arc(26, 36, 24, -Math.PI * 0.42, Math.PI * 0.42); g.stroke();
    const tx = 26 + 24 * Math.cos(Math.PI * 0.42), ty = 36 + 24 * Math.sin(Math.PI * 0.42);
    g.strokeStyle = 'rgba(230,235,250,0.8)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(26 + 24 * Math.cos(-Math.PI * 0.42), 36 - 24 * Math.sin(Math.PI * 0.42));
    g.lineTo(tx, ty); g.stroke();
    g.strokeStyle = '#c9b08a'; g.lineWidth = 3.4;
    g.beginPath(); g.moveTo(22, 36); g.lineTo(48, 36); g.stroke();
    g.fillStyle = '#e8eefc';
    g.beginPath(); g.moveTo(58, 36); g.lineTo(47, 31.5); g.lineTo(47, 40.5); g.closePath(); g.fill();
    g.strokeStyle = '#e8b45a'; g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(22, 36); g.lineTo(27, 32.5);
    g.moveTo(24.5, 36); g.lineTo(29.5, 32.5);
    g.moveTo(22, 36); g.lineTo(27, 39.5);
    g.moveTo(24.5, 36); g.lineTo(29.5, 39.5);
    g.stroke();
  });
  icons.ringLightning = make((g) => {
    // 12.4: jeweled finger ring with a lightning bolt visible inside the gem
    g.strokeStyle = '#e8c66a'; g.lineWidth = 6;
    g.beginPath(); g.arc(36, 44, 19, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(255,244,200,0.55)'; g.lineWidth = 2;
    g.beginPath(); g.arc(36, 44, 22, Math.PI * 1.05, Math.PI * 1.55); g.stroke();
    // gem setting
    g.fillStyle = '#8a6a3a';
    g.beginPath(); g.moveTo(36, 12); g.lineTo(48, 22); g.lineTo(48, 34); g.lineTo(36, 42); g.lineTo(24, 34); g.lineTo(24, 22); g.closePath(); g.fill();
    const gem = g.createRadialGradient(33, 22, 1, 36, 27, 12);
    gem.addColorStop(0, '#eef7ff'); gem.addColorStop(0.55, '#7fb8ff'); gem.addColorStop(1, '#2a4f9e');
    g.fillStyle = gem;
    g.beginPath(); g.moveTo(36, 16); g.lineTo(45, 24); g.lineTo(45, 33); g.lineTo(36, 39); g.lineTo(27, 33); g.lineTo(27, 24); g.closePath(); g.fill();
    // bolt inside the gem
    g.fillStyle = '#fdf6c8';
    g.beginPath();
    g.moveTo(38, 18);
    g.lineTo(31, 29); g.lineTo(35.5, 29);
    g.lineTo(33, 37);
    g.lineTo(42, 25); g.lineTo(37, 25);
    g.closePath(); g.fill();
    // prongs
    g.strokeStyle = '#c9a35c'; g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(26, 21); g.lineTo(22, 17);
    g.moveTo(46, 21); g.lineTo(50, 17);
    g.stroke();
  });
  icons.snowball = make((g) => {
    // 12.3: frozen rocket launcher — a stubby tube angled up with a packed snowball
    // riding the muzzle and frost puffs at the rim.
    g.save(); g.translate(34, 42); g.rotate(-0.6);
    const tube = g.createLinearGradient(0, -8, 0, 8);
    tube.addColorStop(0, '#9fc4dd'); tube.addColorStop(0.5, '#5f7f9c'); tube.addColorStop(1, '#33465c');
    g.fillStyle = tube;
    roundRectPath(g, -22, -9, 40, 18, 6); g.fill();
    g.fillStyle = '#22303f';
    roundRectPath(g, 14, -11, 7, 22, 3); g.fill();
    g.fillStyle = '#4a5f75';
    roundRectPath(g, -26, -6, 8, 12, 3); g.fill();
    g.restore();
    const ball = g.createRadialGradient(40, 20, 1, 43, 23, 11);
    ball.addColorStop(0, '#f6fcff'); ball.addColorStop(0.7, '#cfe8fa'); ball.addColorStop(1, '#8fb8d8');
    g.fillStyle = ball;
    g.beginPath(); g.arc(43, 23, 10, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    for (const [x, y, r] of [[38, 20, 2.2], [47, 19, 1.8], [45, 27, 2.0]]) {
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    g.strokeStyle = 'rgba(190,230,255,0.8)'; g.lineWidth = 1.6;
    for (const [x, y] of [[24, 12], [56, 14], [30, 4]]) {
      g.beginPath(); g.arc(x, y, 3, 0, TAU); g.stroke();
    }
  });
  icons.bombs = make((g) => {
    g.strokeStyle = '#c9a35c'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(36, 22); g.quadraticCurveTo(40, 12, 50, 10); g.stroke();
    g.fillStyle = '#ffd75e';
    g.beginPath(); g.arc(50, 10, 3, 0, TAU); g.fill();
    const grad = g.createRadialGradient(31, 32, 3, 36, 38, 22);
    grad.addColorStop(0, '#5a6478'); grad.addColorStop(0.5, '#2c3140'); grad.addColorStop(1, '#12141c');
    g.fillStyle = grad;
    g.beginPath(); g.arc(36, 38, 20, 0, TAU); g.fill();
    g.fillStyle = '#39404f';
    g.beginPath(); g.arc(36, 24, 6, 0, TAU); g.fill();
    g.fillStyle = 'rgba(232,240,255,0.5)';
    g.beginPath(); g.ellipse(29, 30, 4, 2.6, -0.6, 0, TAU); g.fill();
  });
  icons.flame = make((g) => {
    const grad = g.createRadialGradient(36, 40, 2, 36, 38, 26);
    grad.addColorStop(0, 'rgba(255,246,200,0.98)');
    grad.addColorStop(0.45, 'rgba(255,170,60,0.85)');
    grad.addColorStop(0.8, 'rgba(255,90,30,0.4)');
    grad.addColorStop(1, 'rgba(255,60,20,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(36, 38, 26, 0, TAU); g.fill();
    g.fillStyle = '#ffb347';
    g.beginPath();
    g.moveTo(36, 16);
    g.bezierCurveTo(48, 30, 50, 44, 36, 56);
    g.bezierCurveTo(22, 44, 24, 30, 36, 16);
    g.fill();
    g.fillStyle = '#ffe9a8';
    g.beginPath();
    g.moveTo(36, 30);
    g.bezierCurveTo(42, 38, 43, 46, 36, 52);
    g.bezierCurveTo(29, 46, 30, 38, 36, 30);
    g.fill();
  });
  icons.blight = make((g) => {
    const grad = g.createRadialGradient(36, 36, 2, 36, 36, 26);
    grad.addColorStop(0, 'rgba(220,255,180,0.9)');
    grad.addColorStop(0.6, 'rgba(110,210,80,0.5)');
    grad.addColorStop(1, 'rgba(40,140,50,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(36, 36, 26, 0, TAU); g.fill();
    g.strokeStyle = '#b9f28a';
    g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(24, 44); g.quadraticCurveTo(30, 24, 44, 20);
    g.moveTo(32, 52); g.quadraticCurveTo(38, 38, 50, 34);
    g.stroke();
  });
  icons.tempest = make((g) => {
    g.strokeStyle = 'rgba(159,178,224,0.5)'; g.lineWidth = 2;
    g.beginPath(); g.arc(36, 36, 22, 0, TAU); g.stroke();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      const x = 36 + Math.cos(a) * 22, y = 36 + Math.sin(a) * 22;
      g.save(); g.translate(x, y); g.rotate(a + TAU / 4);
      g.beginPath(); g.arc(0, 0, 9, -1.1, 1.1); g.arc(0, 0, 4.5, 1.3, -1.3, true); g.closePath();
      g.fillStyle = '#cfe6ff'; g.fill();
      g.strokeStyle = 'rgba(94,234,212,0.8)'; g.lineWidth = 1.3; g.stroke();
      g.restore();
    }
    g.strokeStyle = '#ffe9a8'; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(48, 20); g.lineTo(58, 12); g.stroke();
    g.fillStyle = '#fff7e6';
    g.beginPath(); g.arc(58, 12, 3, 0, TAU); g.fill();
  });
  icons.inferno = make((g) => {
    const grad = g.createLinearGradient(14, 44, 54, 20);
    grad.addColorStop(0, 'rgba(255,214,120,0)');
    grad.addColorStop(0.6, 'rgba(255,214,120,0.9)');
    grad.addColorStop(1, '#fff7e6');
    g.strokeStyle = grad; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(14, 44); g.lineTo(52, 22); g.stroke();
    g.fillStyle = '#ff8c3b';
    g.beginPath();
    g.moveTo(52, 14);
    g.bezierCurveTo(60, 20, 62, 30, 54, 34);
    g.bezierCurveTo(50, 28, 50, 20, 52, 14);
    g.fill();
    g.fillStyle = '#ffe9a8';
    g.beginPath();
    g.moveTo(53, 20);
    g.bezierCurveTo(57, 24, 58, 28, 54, 31);
    g.bezierCurveTo(52, 27, 52, 23, 53, 20);
    g.fill();
  });
  icons.napalm = make((g) => {
    g.strokeStyle = '#c9a35c'; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(30, 28); g.quadraticCurveTo(34, 18, 44, 16); g.stroke();
    g.fillStyle = '#ffd75e';
    g.beginPath(); g.arc(44, 16, 2.6, 0, TAU); g.fill();
    const grad = g.createRadialGradient(26, 36, 2, 30, 42, 19);
    grad.addColorStop(0, '#5a6478'); grad.addColorStop(0.5, '#2c3140'); grad.addColorStop(1, '#12141c');
    g.fillStyle = grad;
    g.beginPath(); g.arc(30, 42, 17, 0, TAU); g.fill();
    g.fillStyle = '#39404f';
    g.beginPath(); g.arc(30, 28, 5, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,140,59,0.85)';
    for (const [x, s] of [[18, 1], [34, 1.2], [48, 0.9]]) {
      g.beginPath();
      g.moveTo(x, 30);
      g.bezierCurveTo(x + 6 * s, 22, x + 7 * s, 14, x + 2 * s, 8);
      g.bezierCurveTo(x - 2 * s, 16, x - 4 * s, 24, x, 30);
      g.fill();
    }
  });
  // 12.6: five new synergy icons (fire-tipped arrow / pierced heart / blue flame /
  // round+bolt / heart-on-magnet-orbit) — same 72x72 card style as the legacy five.
  icons.flamingArrows = make((g) => {
    g.strokeStyle = '#8a6a44'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(16, 54); g.lineTo(46, 24); g.stroke();
    g.fillStyle = '#e8f2ff';
    poly(g, [[46, 14], [58, 22], [48, 30]]);
    g.fill();
    g.fillStyle = 'rgba(255,140,59,0.9)';
    for (const [x, s] of [[22, 1], [32, 0.8]]) {
      g.beginPath();
      g.moveTo(x, 46);
      g.bezierCurveTo(x + 6 * s, 38, x + 7 * s, 30, x + 2 * s, 24);
      g.bezierCurveTo(x - 2 * s, 32, x - 4 * s, 40, x, 46);
      g.fill();
    }
  });
  icons.heartPiercer = make((g) => {
    g.save(); g.translate(12, 16); g.scale(2.0, 2.0);
    g.beginPath();
    g.moveTo(11, 18.5);
    g.bezierCurveTo(1.5, 10.5, 0.5, 4.5, 5.5, 3.5);
    g.bezierCurveTo(9, 2.8, 11, 5.5, 11, 7);
    g.bezierCurveTo(11, 5.5, 13, 2.8, 16.5, 3.5);
    g.bezierCurveTo(21.5, 4.5, 20.5, 10.5, 11, 18.5);
    g.closePath();
    const hg = g.createLinearGradient(0, 2, 0, 19);
    hg.addColorStop(0, '#ff7a6a'); hg.addColorStop(1, '#b03040');
    g.fillStyle = hg; g.fill();
    g.restore();
    g.strokeStyle = '#e8f2ff'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(14, 52); g.lineTo(58, 20); g.stroke();
    g.fillStyle = '#eafffb';
    g.beginPath(); g.arc(58, 20, 3.4, 0, TAU); g.fill();
  });
  icons.blueFlame = make((g) => {
    const grad = g.createRadialGradient(36, 44, 3, 36, 42, 26);
    grad.addColorStop(0, 'rgba(210,240,255,0.95)');
    grad.addColorStop(0.55, 'rgba(70,160,255,0.6)');
    grad.addColorStop(1, 'rgba(30,80,220,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(36, 42, 26, 0, TAU); g.fill();
    for (const [x, s] of [[28, 1], [40, 0.75]]) {
      g.fillStyle = 'rgba(120,190,255,0.9)';
      g.beginPath();
      g.moveTo(x, 52);
      g.bezierCurveTo(x + 7 * s, 42, x + 8 * s, 32, x + 2 * s, 22);
      g.bezierCurveTo(x - 3 * s, 34, x - 4 * s, 44, x, 52);
      g.fill();
    }
    g.strokeStyle = 'rgba(220,245,255,0.85)'; g.lineWidth = 2; g.lineCap = 'round';
    for (const [x, y] of [[18, 26], [54, 32], [24, 54]]) {
      g.beginPath();
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5); }
      g.stroke();
    }
  });
  icons.stormVolley = make((g) => {
    g.fillStyle = '#4a5266';
    for (const x of [18, 30]) { g.beginPath(); g.arc(x, 52, 6, 0, TAU); g.fill(); }
    g.strokeStyle = '#ffe9a8'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(14, 44); g.lineTo(26, 36); g.stroke();
    const bolt = (x) => {
      g.beginPath();
      g.moveTo(x, 10); g.lineTo(x - 7, 30); g.lineTo(x - 1, 30); g.lineTo(x - 5, 46);
      g.lineTo(x + 7, 24); g.lineTo(x + 1, 24); g.lineTo(x + 6, 10);
      g.closePath();
      const bg = g.createLinearGradient(0, 10, 0, 46);
      bg.addColorStop(0, '#fff7e6'); bg.addColorStop(1, '#8fb8ff');
      g.fillStyle = bg; g.fill();
    };
    bolt(44); bolt(24);
  });
  icons.heartMagnet = make((g) => {
    g.strokeStyle = 'rgba(159,178,224,0.6)'; g.lineWidth = 2.2;
    g.beginPath(); g.arc(36, 38, 21, 0, TAU); g.stroke();
    g.save(); g.translate(26, 30); g.scale(1.5, 1.5);
    g.beginPath();
    g.moveTo(11, 18.5);
    g.bezierCurveTo(1.5, 10.5, 0.5, 4.5, 5.5, 3.5);
    g.bezierCurveTo(9, 2.8, 11, 5.5, 11, 7);
    g.bezierCurveTo(11, 5.5, 13, 2.8, 16.5, 3.5);
    g.bezierCurveTo(21.5, 4.5, 20.5, 10.5, 11, 18.5);
    g.closePath();
    g.fillStyle = '#ff7a8a'; g.fill();
    g.restore();
    g.strokeStyle = '#c9d6ff'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.arc(52, 50, 9, Math.PI * 0.15, Math.PI * 1.35); g.stroke();
    g.fillStyle = '#ff6b6b';
    g.fillRect(45, 44, 7, 5); g.fillRect(45, 54, 7, 5);
  });
  icons.phoenix = make((g) => {
    const grad = g.createRadialGradient(36, 40, 4, 36, 38, 28);
    grad.addColorStop(0, 'rgba(255,200,120,0)');
    grad.addColorStop(0.7, 'rgba(255,140,59,0.35)');
    grad.addColorStop(1, 'rgba(255,80,30,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(36, 38, 28, 0, TAU); g.fill();
    g.save(); g.translate(6, 6); g.scale(1.9, 1.9);
    g.beginPath();
    g.moveTo(11, 18.5);
    g.bezierCurveTo(1.5, 10.5, 0.5, 4.5, 5.5, 3.5);
    g.bezierCurveTo(9, 2.8, 11, 5.5, 11, 7);
    g.bezierCurveTo(11, 5.5, 13, 2.8, 16.5, 3.5);
    g.bezierCurveTo(21.5, 4.5, 20.5, 10.5, 11, 18.5);
    g.closePath();
    const hg = g.createLinearGradient(0, 2, 0, 19);
    hg.addColorStop(0, '#ffb347'); hg.addColorStop(1, '#e04848');
    g.fillStyle = hg; g.fill();
    g.restore();
  });
  icons.gem = make((g) => {
    const grad = g.createLinearGradient(0, 16, 0, 60);
    grad.addColorStop(0, '#25f2cf');
    grad.addColorStop(0.5, '#0fb89b');
    grad.addColorStop(1, '#0a6f60');
    g.fillStyle = grad;
    poly(g, [[36, 16], [54, 38], [36, 60], [18, 38]]);
    g.fill();
    g.fillStyle = 'rgba(230,255,250,0.5)';
    poly(g, [[36, 16], [18, 38], [36, 38]]);
    g.fill();
    g.strokeStyle = 'rgba(6,60,50,0.6)';
    g.lineWidth = 1.5;
    poly(g, [[36, 16], [54, 38], [36, 60], [18, 38]]);
    g.stroke();
  });
  icons.dash = make((g) => {
    g.strokeStyle = '#5eead4';
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [x, a] of [[16, 0.35], [28, 0.6], [40, 1]]) {
      g.globalAlpha = a;
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(x, 22); g.lineTo(x + 12, 36); g.lineTo(x, 50);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.fillStyle = '#eafffb';
    g.beginPath(); g.arc(56, 36, 4, 0, TAU); g.fill();
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
