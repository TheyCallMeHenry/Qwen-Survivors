// Pickups, projectiles and card icons — pre-rendered sprites.

import { makeCanvas, glowSprite, shadowSprite, poly, roundRectPath } from './base.js';
import { TAU } from '../utils/math.js';

function gemSprite() {
  const c = makeCanvas(24, 26);
  const g = c.getContext('2d');
  g.drawImage(glowSprite(11, '94,234,212', 0.35), 0, -1);
  const grad = g.createLinearGradient(0, 2, 0, 24);
  grad.addColorStop(0, '#25f2cf');
  grad.addColorStop(0.5, '#0fb89b');
  grad.addColorStop(1, '#0a6f60');
  g.fillStyle = grad;
  poly(g, [[12, 1], [21, 12], [12, 24], [3, 12]]);
  g.fill();
  // top facet
  g.fillStyle = 'rgba(230,255,250,0.5)';
  poly(g, [[12, 1], [3, 12], [12, 12]]);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillRect(8, 6, 2, 2);
  g.strokeStyle = 'rgba(6,60,50,0.6)';
  g.lineWidth = 1;
  poly(g, [[12, 1], [21, 12], [12, 24], [3, 12]]);
  g.stroke();
  return c;
}

function heartSprite() {
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
  grad.addColorStop(0, '#ff7d90');
  grad.addColorStop(1, '#d42a4c');
  path();
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = 'rgba(90,10,30,0.65)';
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
  return icons;
}

export function buildItems() {
  return {
    gem: gemSprite(),
    heart: heartSprite(),
    bolt: boltSprite(),
    orb: orbSprite(),
    boomerang: boomerangSprite(),
    blade: bladeSprite(),
    shadowPickup: shadowSprite(7, 3, 0.30),
  };
}
