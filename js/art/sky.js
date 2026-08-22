// Sky: gradient band, twinkling stars, moon, drifting clouds, distant ridge silhouettes.

import { makeCanvas, glowSprite, poly } from './base.js';
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

// Flat stratus band (m02 dusk: pink-gray ellipses).
function stratusSprite(rng, w) {
  const h = Math.round(w * 0.22);
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  for (let i = 0; i < 3; i++) {
    const px = w * 0.2 + rng() * w * 0.6;
    const py = h * (0.35 + rng() * 0.3);
    const pr = (14 + rng() * 16) * (w / 480);
    const grad = g.createRadialGradient(px, py, pr * 0.2, px, py, pr * 1.6);
    grad.addColorStop(0, 'rgba(214,166,186,0.30)');
    grad.addColorStop(0.7, 'rgba(160,120,150,0.18)');
    grad.addColorStop(1, 'rgba(140,100,130,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(px, py, pr * 2.2, pr * 0.6, 0, 0, TAU);
    g.fill();
  }
  return c;
}

// Mt. Fuji: seamless 2400px tile, single snow-capped peak centered.
function fujiSprite() {
  const w = 2400, h = 300;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const px = w / 2, peakY = 30;
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#4b2c47');
  grad.addColorStop(1, '#33203c');
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(0, h);
  g.lineTo(0, h * 0.86);
  g.quadraticCurveTo(w * 0.28, h * 0.52, px - 140, peakY + 40);
  g.quadraticCurveTo(px - 40, peakY + 8, px, peakY);
  g.quadraticCurveTo(px + 40, peakY + 8, px + 140, peakY + 40);
  g.quadraticCurveTo(w * 0.72, h * 0.52, w, h * 0.88);
  g.lineTo(w, h);
  g.closePath();
  g.fill();
  // snow cap (zigzag under the summit)
  const cap = [[px, peakY]];
  for (let i = 1; i <= 5; i++) cap.push([px + 20 * i, peakY + 8 * i + (i % 2 ? 5 : -2)]);
  for (let i = 5; i >= 1; i--) cap.push([px - 17 * i, peakY + 8 * i + ((i + 1) % 2 ? 4 : -2)]);
  poly(g, cap);
  g.fillStyle = 'rgba(244,236,242,0.92)';
  g.fill();
  return c;
}

function starsArr(rng, n, yMax) {
  const stars = [];
  for (let i = 0; i < n; i++) {
    stars.push({
      x: rng(), y: rng() * yMax,
      r: 0.6 + rng() * 1.1,
      ph: rng() * TAU, sp: 0.5 + rng() * 1.6,
      a: 0.3 + rng() * 0.55,
    });
  }
  return stars;
}

// Sun glow at the surface (m03: replaces the moon).
function surfaceGlowSprite() {
  const c = makeCanvas(240, 240);
  c.getContext('2d').drawImage(glowSprite(118, '160,235,255', 0.32), 0, 0);
  return c;
}

// God-ray light shaft: slanted quad, vertical fade (drawn screen-space, top-anchored).
function godraySprite(rng, w, h) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const skew = w * (0.25 + rng() * 0.25);
  const shaft = (ox, ow, a) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `rgba(174,232,255,${a})`);
    grad.addColorStop(0.75, `rgba(174,232,255,${a * 0.4})`);
    grad.addColorStop(1, 'rgba(174,232,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(ox, 0);
    g.lineTo(ox + ow, 0);
    g.lineTo(ox + ow + skew, h);
    g.lineTo(ox + skew, h);
    g.closePath();
    g.fill();
  };
  shaft(w * 0.2, w * 0.6, 0.10);
  shaft(w * 0.38, w * 0.26, 0.12);
  return c;
}

// Surface shimmer band (m03 near ridge): wavy lines just above the horizon line.
function shimmerSprite() {
  const w = 2400, h = 252;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(160,230,255,0.05)';
  g.fillRect(0, h - 40, w, 40);
  for (let i = 0; i < 3; i++) {
    g.strokeStyle = `rgba(150,225,255,${0.12 - i * 0.03})`;
    g.lineWidth = 14 - i * 4;
    const y = h - 8 - i * 14;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x < w; x += 120) g.quadraticCurveTo(x + 60, y + (x % 240 ? 6 : -6), x + 120, y);
    g.stroke();
  }
  return c;
}

export function buildSky(levelKey = 'm01') {
  if (levelKey === 'm03') {
    const rng = mulberry32(779);
    const godrays = [];
    for (let i = 0; i < 7; i++) {
      const w = 140 + rng() * 80;
      godrays.push({
        img: godraySprite(rng, w, 520),
        x: rng() * 2400,
        speed: 2 + rng() * 4,
        alpha: 0.5 + rng() * 0.5,
        par: 0.03 + rng() * 0.05,
      });
    }
    return {
      clouds: [],
      stars: [], // no stars underwater — the loop is a no-op
      moon: surfaceGlowSprite(),
      ridges: { far: makeCanvas(2400, 200), near: shimmerSprite() },
      star: '#bfeaff', moonX: 0.5, moonY: -0.25, moonScale: 2.4,
      godrays,
    };
  }
  if (levelKey === 'm02') {
    const rng = mulberry32(778);
    const clouds = [];
    const bands = [
      { yFrac: 0.10, scale: 0.6, speed: 3, alpha: 0.6 },
      { yFrac: 0.22, scale: 0.9, speed: 5, alpha: 0.8 },
      { yFrac: 0.34, scale: 1.2, speed: 8, alpha: 1 },
    ];
    for (const b of bands) {
      const n = 1 + ((rng() * 2) | 0); // 1–2 per band
      for (let i = 0; i < n; i++) {
        const w = 360 + rng() * 260;
        clouds.push({
          img: stratusSprite(rng, w),
          x: rng() * 2400,
          yFrac: b.yFrac + (rng() - 0.5) * 0.06,
          speed: b.speed * (0.8 + rng() * 0.5),
          scale: b.scale * (0.85 + rng() * 0.4),
          alpha: b.alpha,
        });
      }
    }
    return {
      clouds,
      stars: starsArr(rng, 80, 0.55),
      moon: moonSprite(),
      ridges: {
        far: fujiSprite(),
        near: ridge(2400, 150, 60, '#33203c', false, rng),
      },
      star: '#ffe9f0', moonX: 0.72, moonY: 0.16, moonScale: 1.45,
    };
  }
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
  return {
    clouds,
    stars: starsArr(rng, 110, 0.55),
    moon: moonSprite(),
    ridges: {
      far: ridge(2400, 200, 66, '#252b4c', false, rng),
      near: ridge(2400, 252, 104, '#1b2138', true, rng),
    },
    star: '#cfd8ff', moonX: 0.06, moonY: 0.22, moonScale: 1,
  };
}
