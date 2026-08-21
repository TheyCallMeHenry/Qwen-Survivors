// Sky: gradient band, twinkling stars, moon, drifting clouds, distant ridge silhouettes.

import { makeCanvas, glowSprite } from './base.js';
import { TAU, mulberry32 } from '../utils/math.js';

function cloudSprite(rng, w) {
  const h = Math.round(w * 0.52);
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const puffs = 9 + ((rng() * 7) | 0);
  for (let i = 0; i < puffs; i++) {
    const px = w * 0.12 + rng() * w * 0.76;
    const py = h * 0.58 + rng() * h * 0.26;
    const pr = (16 + rng() * 26) * (w / 260);
    let grad = g.createRadialGradient(px, py, pr * 0.25, px, py, pr);
    grad.addColorStop(0, 'rgba(118,128,164,0.50)');
    grad.addColorStop(0.72, 'rgba(76,84,118,0.28)');
    grad.addColorStop(1, 'rgba(60,66,96,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
    // moonlit top highlight
    grad = g.createRadialGradient(px - pr * 0.18, py - pr * 0.55, 1, px - pr * 0.18, py - pr * 0.55, pr * 0.72);
    grad.addColorStop(0, 'rgba(199,210,246,0.50)');
    grad.addColorStop(1, 'rgba(199,210,246,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(px - pr * 0.18, py - pr * 0.55, pr * 0.72, 0, TAU); g.fill();
  }
  return c;
}

function moonSprite() {
  const c = makeCanvas(240, 240);
  const g = c.getContext('2d');
  const glow = glowSprite(118, '190,208,255', 0.30);
  g.drawImage(glow, 118 - 118, 118 - 118);
  const grad = g.createRadialGradient(104, 102, 10, 120, 120, 66);
  grad.addColorStop(0, '#f7faff');
  grad.addColorStop(0.55, '#d4def5');
  grad.addColorStop(0.92, '#97a7d4');
  grad.addColorStop(1, '#7b8ab9');
  g.fillStyle = grad;
  g.beginPath(); g.arc(120, 120, 64, 0, TAU); g.fill();
  const craters = [[98, 108, 9], [140, 132, 12], [112, 148, 7], [148, 98, 6], [92, 140, 5]];
  for (const [x, y, r] of craters) {
    g.fillStyle = 'rgba(128,144,194,0.38)';
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.fillStyle = 'rgba(230,238,255,0.16)';
    g.beginPath(); g.arc(x - r * 0.25, y - r * 0.3, r * 0.62, 0, TAU); g.fill();
  }
  return c;
}

// Seamless-tileable ridge silhouette. w/step must be integer.
function ridge(w, h, amp, color, snow, rng) {
  const step = 48;
  const n = w / step;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const pts = [];
  let y = h * 0.55;
  for (let i = 0; i <= n; i++) {
    if (i > 0) {
      y += (rng() - 0.5) * amp * 0.9;
      y = Math.max(h * 0.16, Math.min(h * 0.82, y));
    }
    pts.push([i * step, y]);
  }
  pts[n][1] = pts[0][1]; // seamless wrap
  g.beginPath();
  g.moveTo(0, h);
  for (const p of pts) g.lineTo(p[0], p[1]);
  g.lineTo(w, h);
  g.closePath();
  g.fillStyle = color;
  g.fill();
  if (snow) {
    g.fillStyle = 'rgba(212,224,248,0.45)';
    for (let i = 1; i < n; i++) {
      if (pts[i][1] < pts[i - 1][1] && pts[i][1] < pts[i + 1][1]) {
        g.beginPath();
        g.moveTo(pts[i][0] - 13, pts[i][1] + 9);
        g.lineTo(pts[i][0], pts[i][1]);
        g.lineTo(pts[i][0] + 13, pts[i][1] + 9);
        g.closePath();
        g.fill();
      }
    }
  }
  return c;
}

export function buildSky() {
  const rng = mulberry32(777);
  const clouds = [];
  const bands = [
    { yFrac: 0.12, scale: 0.55, speed: 4, n: 3, alpha: 0.65 },
    { yFrac: 0.22, scale: 0.85, speed: 7, n: 4, alpha: 0.85 },
    { yFrac: 0.33, scale: 1.15, speed: 11, n: 3, alpha: 1 },
  ];
  for (const b of bands) {
    for (let i = 0; i < b.n; i++) {
      const w = 240 + rng() * 240;
      clouds.push({
        img: cloudSprite(rng, w),
        x: rng() * 2400,
        yFrac: b.yFrac + (rng() - 0.5) * 0.06,
        speed: b.speed * (0.8 + rng() * 0.5),
        scale: b.scale * (0.85 + rng() * 0.4),
        alpha: b.alpha,
      });
    }
  }
  const stars = [];
  for (let i = 0; i < 110; i++) {
    stars.push({
      x: rng(), y: rng() * 0.55,
      r: 0.6 + rng() * 1.1,
      ph: rng() * TAU, sp: 0.5 + rng() * 1.6,
      a: 0.3 + rng() * 0.55,
    });
  }
  return {
    clouds,
    stars,
    moon: moonSprite(),
    ridges: {
      far: ridge(2400, 200, 66, '#252b4c', false, rng),
      near: ridge(2400, 252, 104, '#1b2138', true, rng),
    },
  };
}
