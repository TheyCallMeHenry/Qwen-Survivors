// Pickups, projectiles and card icons — pre-rendered sprites.

import { makeCanvas, glowSprite, shadowSprite, poly, roundRectPath } from './base.js';
import { TAU } from '../utils/math.js';

// Per-level pickup tints (13.10, A5): m01 = original, M02 gold-pink, M03 cyan.
const GEM_PAL = {
  m01: { glow: '94,234,212', stops: ['#25f2cf', '#0fb89b', '#0a6f60'], edge: 'rgba(6,60,50,0.6)' },
  m02: { glow: '255,196,128', stops: ['#ffd98a', '#ff9e7d', '#c94f6d'], edge: 'rgba(120,40,60,0.6)' },
  m03: { glow: '80,220,255', stops: ['#6fd8ff', '#1f9fd8', '#0d5f96'], edge: 'rgba(8,60,90,0.6)' },
};
const HEART_PAL = {
  m01: { top: '#ff7d90', low: '#d42a4c', edge: 'rgba(90,10,30,0.65)' },
  m02: { top: '#ffb3a0', low: '#e0446e', edge: 'rgba(120,20,50,0.65)' },
  m03: { top: '#7fe8e0', low: '#18a8c8', edge: 'rgba(10,60,90,0.65)' },
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
    bomb: bombSprite(),
    flame: flameSprite(),
    explosion: explosionSprite(),
    burn: burnSprite(),
    blight: blightSprite(),
    shadowPickup: shadowSprite(7, 3, 0.30),
  };
}
