// All tuning in one place. World units = CSS pixels.

export const CFG = {
  world: { w: 4200, h: 3200, margin: 70, tile: 256, cullPad: 300 },

  run: {
    time: 300,          // survive this long (s) to win
    bossAt: 240,        // wraith spawn time
    victoryBonus: 10000,
    timeScorePerSec: 15,
    maxWeapons: 4,      // weapon slots for card offers
    deathDelay: 1.8,    // slow-mo seconds before game over
    deathTimescale: 0.3,
  },

  player: {
    r: 14,
    maxHp: 100,
    speed: 265,
    accel: 14,           // exponential convergence lambda (high = snappy)
    dashTime: 0.18,
    dashSpeed: 690,
    dashCd: 1.75,
    dashIframeExtra: 0.06,
    hurtIframes: 0.7,
    knockback: 230,
    startWeapons: ['wand'],
    animFps: 8,
    ghostEvery: 0.035,  // dash ghost trail spacing (s)
  },

  camera: { follow: 9, lead: 0.14, shakeDecay: 3.4 },

  menu: {
    worldSeed: 20260820, // fixed seed for the menu backdrop world
    amp: 0.2,            // camera drift amplitude (× world size)
    speed: 0.1,          // camera drift angular speed (rad/s)
  },

  lighting: {
    base: '8,10,24', baseAlpha: 0.86, glowAlpha: 0.30,
    playerR: 170, playerRgb: '205,220,255', playerFlicker: 0.15,
    bossR: 240, bossRgb: '168,96,255', bossFlicker: 0.5,
  },

  weapons: {
    wand: {
      name: 'Moonbolt Wand',
      desc: 'Auto-fires spectral bolts at the nearest enemy.',
      icon: 'wand',
      levels: [
        { rate: 0.60, dmg: 12, count: 1, pierce: 0 },
        { rate: 0.50, dmg: 16, count: 1, pierce: 1 },
        { rate: 0.45, dmg: 20, count: 2, pierce: 1 },
        { rate: 0.38, dmg: 26, count: 2, pierce: 2 },
        { rate: 0.32, dmg: 34, count: 3, pierce: 2 },
      ],
    },
    garlic: {
      name: 'Wraith Garlic',
      desc: 'A pulsing aura that seeps into nearby foes.',
      icon: 'garlic',
      levels: [
        { r: 85, dmg: 7 }, { r: 100, dmg: 10 }, { r: 118, dmg: 14 }, { r: 138, dmg: 18 }, { r: 160, dmg: 24 },
      ],
    },
    axe: {
      name: 'Spectral Axe',
      desc: 'Hurls a boomerang that arcs out and back.',
      icon: 'axe',
      levels: [
        { cd: 1.40, dmg: 16, count: 1, size: 1.0 },
        { cd: 1.25, dmg: 22, count: 1, size: 1.1 },
        { cd: 1.10, dmg: 28, count: 1, size: 1.25 },
        { cd: 0.95, dmg: 36, count: 2, size: 1.3 },
        { cd: 0.80, dmg: 46, count: 2, size: 1.45 },
      ],
    },
    blades: {
      name: 'Aegis Blades',
      desc: 'Ghost blades orbit you, shearing attackers.',
      icon: 'blades',
      levels: [
        { n: 1, dmg: 10, rad: 64 }, { n: 2, dmg: 14, rad: 70 }, { n: 3, dmg: 18, rad: 76 },
        { n: 3, dmg: 24, rad: 82 }, { n: 4, dmg: 32, rad: 88 },
      ],
    },
  },

  passives: {
    speed:  { name: 'Celerity Boots', desc: '+10% movement speed', icon: 'boots', max: 3, val: 0.10 },
    hp:     { name: 'Heart of Oak',   desc: '+25 max HP, heal 25 now', icon: 'heart', max: 3, val: 25 },
    dmg:    { name: 'Rune of Might',  desc: '+12% weapon damage', icon: 'sword', max: 5, val: 0.12 },
    magnet: { name: 'Lodestone',      desc: '+60% pickup range', icon: 'magnet', max: 3, val: 0.60 },
    regen:  { name: 'Moon Sigil',     desc: 'Regenerate 0.8 HP/s', icon: 'sigil', max: 3, val: 0.8 },
  },

  gems: { magnetBase: 70, collectR: 16, maxAlive: 320, heartPool: 32, heartChance: 0.045, heartChanceLowHp: 0.08, heartHeal: 20, lowHpFrac: 0.3 },

  // XP needed to go from level L to L+1
  xpNeed: (L) => 4 + (L - 1) * 3,

  enemies: {
    rat:     { hp: 20,   speed: [110, 150], dmg: 8,  xp: 1,  r: 11, score: 10, fps: 4 },
    bat:     { hp: 14,   speed: [150, 185], dmg: 6,  xp: 1,  r: 11, score: 10, fly: true, weave: true, fps: 8 },
    goblin:  { hp: 42,   speed: [85, 105],  dmg: 12, xp: 2,  r: 13, score: 20, fps: 6 },
    wolf:    { hp: 65,   speed: [175, 205], dmg: 15, xp: 3,  r: 14, score: 30, fps: 8 },
    brute:   { hp: 280,  speed: [62, 78],   dmg: 25, xp: 5,  r: 22, score: 60, fps: 3 },
    cultist: { hp: 55,   speed: [75, 95],   dmg: 10, xp: 3,  r: 13, score: 30, ranged: true, fps: 4 },
    wraith:  { hp: 2400, speed: [55, 65],   dmg: 28, xp: 50, r: 30, score: 5000, boss: true, fps: 4 },
  },

  ai: {
    gridCell: 96,       // enemy spatial hash cell (px)
    steer: 7,           // chase velocity convergence lambda
    sepPad: 6,          // extra separation clearance (px)
    sepPush: 420,       // separation acceleration
    weaveAmp: 34,       // bat perpendicular weave (px/s)
    weaveFreq: 3.4,
    cultistRange: [230, 330],
    cultistShotCd: [1.6, 2.6],
    orbSpeed: 250,
    wraithWindup: 0.7,
    wraithCharge: 0.75,
    wraithChargeSpeed: 330,
    wraithChargeCd: [5.5, 8.5],
  },

  combat: {
    boltSpeed: 540, boltLife: 1.5, boltR: 5, boltKb: 170,
    wandRange: 560, wandSpread: 0.16,
    axeSpeed: 430, axeLife: 1.9, axeR: 10, axeKb: 130, axeTick: 0.30,
    orbitSpeed: 2.4, orbitR: 9, orbitTick: 0.35, orbitKb: 190, orbitSize: 26,
    garlicTick: 0.45,
    orbLife: 4.5, orbR: 7,
    hitStopKill: 0.05, hitStopBoss: 0.18, hitStopHurt: 0.07,
  },

  spawner: {
    firstSpawn: 1.2,
    // alive enemy cap over time
    aliveCap: (t) => Math.min(200, 60 + Math.floor(t / 12)),
    // seconds between spawn events
    interval: (t) => Math.max(0.35, 1.7 - t * 0.0047),
    // enemies per spawn event (batch 2 at t0 — a camped player must meet the swarm early)
    batch: (t) => Math.min(6, 2 + Math.floor(t / 55)),
    // type weights by time (s)
    weights: (t) => ({
      rat: 5,
      bat: t > 30 ? 3 : 0.5,
      goblin: t > 60 ? 4 : 0,
      wolf: t > 120 ? 3 : 0,
      brute: t > 150 ? 2 : 0,
      cultist: t > 90 ? 2.5 : 0,
    }),
  },

  audio: {
    musicVol: 0.20, sfxVol: 0.5, ambVol: 0.30,
    // Phase 5 — synth tuning (music/ambience)
    bpm: 92,
    schedAhead: 0.12, // scheduler lookahead (s)
    subGain: 0.5,
    padTone: 0.09, padCutoff: 780, padLfoHz: 0.05, padLfoDepth: 260,
    pluckGain: 0.22, pluckSend: 0.6, pluckDelay: 0.33, pluckFb: 0.35,
    windGain: 0.45, windLfoHz: 0.045, windCutoff: 420,
    howlEvery: [18, 40], // s between ambient wolf howls
    howlGain: 0.5,
  },

  scores: {
    max: 10,
    storageKey: 'qsurv.hiscores.v1',
    muteKey: 'qsurv.mute',
  },

  perf: {
    dprCapDesktop: 2,
    dprCapMobile: 1.5,
    particleCap: 512,
    snowCount: 90,
  },
};
