// All tuning in one place. World units = CSS pixels.

export const CFG = {
  world: { w: 4200, h: 3200, margin: 70, tile: 256, cullPad: 300 },

  run: {
    time: 300,          // survive this long (s) to win
    bossAt: 240,        // wraith spawn time
    victoryBonus: 10000,
    timeScorePerSec: 15,
    maxWeapons: 5,      // base standard-weapon slots per player (co-op cap = base − (N−1), 11.5)
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
    knockback: 76,
    animFps: 8,
    ghostEvery: 0.035,  // dash ghost trail spacing (s)
  },

  // Playable character roster (11.6, D28/D34/D56–D62). Data-driven (D60): adding a
  // character = one entry here + one frame builder in art/characters.js.
  // `hp`/`speed` are absolute bases (replace CFG.player when selected), `dmg` = weapon-
  // damage multiplier, `weapon` = pre-owned starting weapon (null = none → ghost gets 2
  // offers, D59), `cost` = Soulshard unlock price (D58; 0 = default/starter), `accent` =
  // UI theming color (11.8; ghost = null → per-seat Pac-Man tint, D62 channel).
  // STAT VALUES (O) user-approved 2026-08-22 (revisions: mage 60hp/275sp, ranger 110hp/320sp, warden 230sp).
  characters: {
    order: ['mage', 'warden', 'ranger', 'swash'],
    mage:    { name: 'Mage',         weapon: 'wand',   cost: 0,    hp: 60,  dmg: 1.35, speed: 275, accent: '#9fe8ff', desc: 'Glass cannon — +35% weapon damage, low max HP. Starts with the Moonbolt Wand.' },
    warden:  { name: 'Warden',       weapon: 'garlic', cost: 3500, hp: 150, dmg: 0.85, speed: 230, accent: '#ffb454', desc: 'Tanky, slowest move speed, lower-medium damage. Starts with the Wraith Garlic aura.' },
    ranger:  { name: 'Ranger',       weapon: 'blades', cost: 1500, hp: 110, dmg: 1.0,  speed: 320, accent: '#a4ffc9', desc: 'Fast and balanced. Starts with the Aegis Blades orbiters.' },
    swash:   { name: 'Swashbuckler', weapon: 'flame',  cost: 7500, hp: 90,  dmg: 1.15, speed: 300, accent: '#e8b45a', desc: 'Agile, upper-medium damage. Starts with the Pyre Lance stream.' },
    ghost:   { name: 'Ghost',        weapon: null,     cost: 0,    hp: 100, dmg: 1.0,  speed: 265, accent: null, desc: 'Faceless fallback — baseline stats, no starting weapon.' },
  },

  // Ghost per-player tints (D62): seat 0→3, Pac-Man ghost colors (Blinky/Pinky/Inky/Clyde).
  ghostColors: ['#ff4b4b', '#ff7bd9', '#4be3ff', '#ffa24b'],

  camera: { follow: 9, lead: 0.14, shakeDecay: 3.4 },

  // View zoom (13.8): camera-view factor — 0.80 = zoomed out (×1.56 area) / 1.0 = full view.
  // Touch default 0.80 (D13), persisted per-browser; HUD DOM + minimap always stay 1×.
  zoom: { touch: 0.8, full: 1.0, key: 'qsurv.zoom.v1' },
  ui: { bannerMs: 2600 }, // banner hold before the next queued banner shows (CSS bannerIn 2.6 s)

  menu: {
    // (menu backdrop seed moved to the level def: levels.js menuSeed, Phase 13)
    amp: 0.2,            // camera drift amplitude (× world size)
    speed: 0.1,          // camera drift angular speed (rad/s)
  },

  lighting: {
    base: '8,10,24', baseAlpha: 0.86, glowAlpha: 0.30,
    playerR: 510, playerRgb: '205,220,255', playerFlicker: 0.15,
    bossR: 240, bossRgb: '168,96,255', bossFlicker: 0.5,
  },

  weapons: {
    wand: {
      name: 'Moonbolt Wand',
      desc: 'Auto-fires spectral bolts at the nearest enemy.',
      icon: 'wand',
      levels: [
        { rate: 0.64, dmg: 12, count: 1, pierce: 0 },
        { rate: 0.54, dmg: 16, count: 1, pierce: 1 },
        { rate: 0.49, dmg: 20, count: 2, pierce: 1 },
        { rate: 0.42, dmg: 26, count: 2, pierce: 2 },
        { rate: 0.36, dmg: 34, count: 3, pierce: 2 },
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
    pistols: {
      name: 'Twin Fangs',
      desc: 'Twin pistols — each shot sends two rounds at the nearest foes.',
      icon: 'pistols',
      levels: [
        { rate: 0.55, dmg: 9, spread: 0.10 },
        { rate: 0.48, dmg: 11, spread: 0.10 },
        { rate: 0.42, dmg: 13, spread: 0.08 },
        { rate: 0.36, dmg: 15, spread: 0.08 },
        { rate: 0.30, dmg: 18, spread: 0.06 },
      ],
    },
    bombs: {
      name: 'Sunder Bombs',
      desc: 'Lob cartoon bombs that land, pause, then boom in an AOE.',
      icon: 'bombs',
      // 23.2 rework (user): blast radius ×1.5, base damage ×2 (scaling shape kept).
      levels: [
        { cd: 2.2, dmg: 80, r: 142, fuse: 1.1 },
        { cd: 2.0, dmg: 104, r: 157, fuse: 0.95 },
        { cd: 1.8, dmg: 132, r: 172, fuse: 0.8 },
        { cd: 1.6, dmg: 164, r: 192, fuse: 0.65 },
        { cd: 1.4, dmg: 200, r: 210, fuse: 0.5 },
      ],
    },
    flame: {
      name: 'Pyre Lance',
      desc: 'A streaming geyser of flame that ignites foes. Limited fuel, slow refill.',
      icon: 'flame',
      // range = aim/acquisition radius. Flat 150 at every level (2026-09-04): the
      // visible stream reaches ~85–200 px (mean ~136 incl. sprite extent), so the old
      // 300–380 ramp damaged enemies in an invisible gap far past the flame's end.
      // Level growth stays in tick/dot/fuel/recharge — never in range again.
      levels: [
        { tick: 6, dot: 4, dotDur: 2.5, range: 150, fuel: 4.0, recharge: 7.0 },
        { tick: 8, dot: 5, dotDur: 2.8, range: 150, fuel: 5.0, recharge: 6.5 },
        { tick: 10, dot: 6, dotDur: 3.0, range: 150, fuel: 6.0, recharge: 6.0 },
        { tick: 13, dot: 8, dotDur: 3.3, range: 150, fuel: 7.0, recharge: 5.5 },
        { tick: 16, dot: 10, dotDur: 3.6, range: 150, fuel: 8.0, recharge: 5.0 },
      ],
    },
    // 12.3 Snowball Launcher (weapon #9). Lobbed snowball → small impact AoE on the
    // targeted enemy + accumulating slow stacks; SLOW_FREEZE stacks → brief freeze.
    // `cd` = fire interval; `speed`/arc feed the lob flight (see combat.fireSnowball).
    snowball: {
      name: 'Snowball Launcher',
      desc: 'Lobs a packed snowball that bursts in a small blast, slowing foes. 3 slows → freeze.',
      icon: 'snowball',
      levels: [
        { cd: 1.60, dmg: 26, r: 95 },
        { cd: 1.45, dmg: 34, r: 102 },
        { cd: 1.30, dmg: 44, r: 110 },
        { cd: 1.15, dmg: 56, r: 118 },
        { cd: 1.00, dmg: 70, r: 128 },
      ],
    },
    ringLightning: {
      name: 'Ring of Chain Lightning',
      desc: 'A jeweled ring arcs lightning at nearby foes. 3 shocks → stun + chain burst.',
      icon: 'ringLightning',
      // `jumps` = enemies the chain burst leaps to when shock stacks hit max
      // (12.4: weapon levels increase the chain count).
      levels: [
        { cd: 1.70, dmg: 30, jumps: 2 },
        { cd: 1.55, dmg: 38, jumps: 3 },
        { cd: 1.40, dmg: 50, jumps: 4 },
        { cd: 1.25, dmg: 64, jumps: 5 },
        { cd: 1.10, dmg: 82, jumps: 6 },
      ],
    },
    bow: {
      name: 'Bow & Arrow',
      desc: 'Looses a fast arrow at the nearest foe.',
      icon: 'bow',
      // 23.1 (user): charge = the drawn-string wind-up before the arrow looses (s, flat
      // at every level). Cadence raised so bow > wand > pistols at EVERY level — the old
      // rate table was numerically identical to Twin Fangs (the "doesn't feel unique" bug).
      charge: 0.25,
      levels: [
        { rate: 0.68, dmg: 16 },
        { rate: 0.60, dmg: 21 },
        { rate: 0.53, dmg: 27 },
        { rate: 0.46, dmg: 34 },
        { rate: 0.39, dmg: 42 },
      ],
    },
  },

  // Weapon/passive synergies: a single-level card offered only when every
  // `requires` entry is at max (weapon: levels.length, passive: max).
  // Stored in player.synergies (does NOT count toward maxWeapons).
  synergies: {
    blight: {
      name: 'Blight Hex',
      desc: 'Moonbolts seep into foes, dealing blight damage over time.',
      icon: 'blight', requires: ['wand', 'garlic'],
      levels: [{ dps: 14, dur: 3.0 }],
    },
    tempest: {
      name: 'Tempest Blades',
      desc: 'Orbiting blades now hurl tangential bolts at the swarm.',
      icon: 'tempest', requires: ['axe', 'blades'],
      levels: [{ rate: 0.8, dmg: 12 }],
    },
    inferno: {
      name: 'Inferno Rounds',
      desc: 'Twin rounds now ignite foes, dealing burn damage over time.',
      icon: 'inferno', requires: ['pistols', 'flame'],
      levels: [{ dps: 12, dur: 2.5 }],
    },
    napalm: {
      name: 'Napalm Detonation',
      desc: 'Bomb blasts now ignite every foe caught in the radius.',
      icon: 'napalm', requires: ['bombs', 'flame'],
      levels: [{ dps: 18, dur: 3.0 }],
    },
    // 23.3 (user DECIDED): the old kill-heal effect is REPLACED in place by over-heal.
    // ceiling = fraction of CURRENT max HP the over-health bar may reach; decay = how
    // fast the bonus shrinks back to 100% (fraction of max HP per second).
    phoenix: {
      name: 'Phoenix Heart',
      desc: 'Hearts at full health grant over-health up to 200% max — decays 1%/s.',
      icon: 'phoenix', requires: ['hp', 'regen'],
      levels: [{ ceiling: 2, decay: 0.01 }],
    },
    // 12.6: the four spec'd synergies + Heart of Oak × Lodestone (user scoped in 2026-09-05).
    // All five are 5-level cards (PLAN Phase 12 rule) — offered when their OWN two sources max.
    flamingArrows: {
      name: 'Flaming Arrows',
      desc: 'Arrows leave the string alight, burning every foe they strike.',
      icon: 'flamingArrows', requires: ['bow', 'flame'],
      levels: [
        { dps: 8, dur: 2.0 }, { dps: 11, dur: 2.2 }, { dps: 14, dur: 2.5 },
        { dps: 18, dur: 2.8 }, { dps: 22, dur: 3.0 },
      ],
    },
    heartPiercer: {
      name: 'Heart-Piercer',
      desc: 'Channel your vitality into the bow — heavier arrows that skewer onward foes.',
      icon: 'heartPiercer', requires: ['bow', 'hp'],
      // bonus = flat extra damage per arrow; pierce = EXTRA enemies an arrow passes through
      levels: [
        { bonus: 10, pierce: 1 }, { bonus: 14, pierce: 2 }, { bonus: 18, pierce: 3 },
        { bonus: 22, pierce: 4 }, { bonus: 26, pierce: 5 },
      ],
    },
    blueFlame: {
      name: 'Blue Flame',
      desc: 'Snowball bursts flash-freeze foes while blue fire eats at them.',
      icon: 'blueFlame', requires: ['snowball', 'flame'],
      // freeze = seconds frozen in place; dps/dur = the simultaneous fire DoT (12.5 blue-flame half)
      levels: [
        // L5 freeze matches combat.freezeDur (0.8) — a card promising "freeze in place"
        // must actually lock the foe, not merely refresh under the slow-proc cap.
        { freeze: 0.3, dps: 8, dur: 2.0 }, { freeze: 0.4, dps: 11, dur: 2.2 },
        { freeze: 0.5, dps: 14, dur: 2.5 }, { freeze: 0.6, dps: 18, dur: 2.8 },
        { freeze: 0.8, dps: 22, dur: 3.0 },
      ],
    },
    stormVolley: {
      name: 'Storm Volley',
      desc: 'Every fourth round calls a lightning strike that arcs to nearby foes.',
      icon: 'stormVolley', requires: ['pistols', 'ringLightning'],
      // every = rounds per strike; jumps = chain links (also grants 1 shock stack each)
      levels: [
        { dmg: 45, jumps: 2 }, { dmg: 60, jumps: 3 }, { dmg: 75, jumps: 4 },
        { dmg: 90, jumps: 5 }, { dmg: 110, jumps: 6 },
      ],
    },
    heartMagnet: {
      name: 'Heart Compass',
      desc: 'Hearts feel the Lodestone — healing hearts are pulled to you.',
      icon: 'heartMagnet', requires: ['hp', 'magnet'],
      // pull = radius multiplier on the gem magnet range for HEARTS
      levels: [
        { pull: 1.0 }, { pull: 1.25 }, { pull: 1.5 }, { pull: 1.75 }, { pull: 2.0 },
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

  gems: { magnetBase: 70, collectR: 16, maxAlive: 320, heartPool: 32, heartChance: 0.045, heartChanceLowHp: 0.08, heartHeal: 20, lowHpFrac: 0.3, escapePad: 6 }, // escapePad (22.2): px beyond a spot's edge

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
    ryu:     { hp: 2400, speed: [55, 65],   dmg: 28, xp: 50, r: 30, score: 5000, boss: true, fps: 4 },
    shark:   { hp: 2400, speed: [55, 65],   dmg: 28, xp: 50, r: 30, score: 5000, boss: true, fps: 4 },
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
    spawnOriginFrac: 0.55, // 16.2: shared projectile spawn origin — fraction of the character sprite height above the feet (mid-torso); 1 = feet (legacy), 0 = head
    orbLife: 4.5, orbR: 7,
    hitStopKill: 0.05, hitStopBoss: 0.18, hitStopHurt: 0.07,
    // Twin Fangs rounds (small, fast, short-lived — distinct from the cyan bolt)
    bulletSpeed: 720, bulletLife: 0.8, bulletR: 4, bulletKb: 120, pistolRange: 520,
    // Sunder Bombs (lob arc + fuse pause before AOE)
    // bombKb 260→520 (23.2): "very strong push-back" — magnitude only; direction stays
    // radial from the blast centre (_explode dx/d, dy/d — unchanged).
    bombDist: 240, bombMin: 120, bombFly: 0.55, bombH: 70, bombKb: 520, bombFlash: 0.4,
    // Bow & Arrow (12.2): fast single-target arrow at the nearest foe — straight
    // flight, one hit (no pierce; Heart-Piercer 12.6 adds that), mid-torso origin (16.2)
    arrowSpeed: 640, arrowLife: 1.4, arrowR: 4, arrowKb: 150,
    // Snowball Launcher (12.3): lobbed snowball — arcs to the targeted enemy, bursts in a
    // small impact AoE there, applies slow stacks. Bomb-style flight (fly time + parabola),
    // NO fuse pause: it bursts ON impact.
    snowballSpeed: 460, snowballFlyK: 1 / 460, snowballH: 56, snowballR: 9, snowballKb: 90,
    // Status pipeline (12.5): slow/shock stacks with independent per-stack 5 s expiry
    // (config scalar — expected playtest tuning). slowPct = movement speed reduction per
    // stack (multiplicative: speed × (1 − slowPct·stacks)); SLOW_FREEZE stacks → freezeDur
    // movement lock. Shock/stun fields land with 12.4.
    statusStackTtl: 5,
    slowPct: 0.16, slowMaxStacks: 3, freezeDur: 0.8,
    // Shock → stun (12.4): the ring's bolts apply shock stacks; shockMaxStacks → stunDur
    // full lock + a branching chain burst (jumps from the weapon level) to nearby foes.
    shockMaxStacks: 3, stunDur: 0.6,
    // Ring of Chain Lightning (12.4): periodic bolt at the nearest foe + one shock stack;
    // on proc the burst chains to `jumps` fresh foes within jumpR of the last hit.
    ringCd: 0.9, ringDmg: 18, ringJumpR: 260, ringKb: 40, ringBeamDur: 0.16,
    // Pyre Lance flame sprites (flow-y drag/rise + wobble, grow-then-fade)
    // 16.3: front speed exactly 2x the pre-16.3 build (260/80) + lifetime trimmed
    // 0.65 -> 0.33 => mean stream reach exactly +33% (94.6 -> 125.8 px, drag
    // unchanged) and the jet extends toward the target 2x faster. flameMomentum =
    // the share of the owner's velocity the flame inherits (LEAD-while-moving —
    // the player's own momentum, D70 user hypothesis; 0 = trail behind).
    flameSpeed: 520, flameSpeedVar: 160, flameLife: 0.33, flameLifeVar: 0.075,
    flameSize: 18, flameR: 12, flameDrag: 2.0, flameRise: 140, flameMomentum: 0.5,
    flameWobAmp: 14, flameWobFreq: 9, flameHit: 0.22,
  },

  spawner: {
    firstSpawn: 1.2,
    // spawn placement: band just outside the view edge (px) + fallback offset when the band is out of world (px)
    spawnPad: 15,
    spawnFallback: 30,
    // alive enemy cap over time
    aliveCap: (t) => Math.min(200, 60 + Math.floor(t / 12)),
    // seconds between spawn events
    interval: (t) => Math.max(0.35, 1.7 - t * 0.0047),
    // enemies per spawn event (batch 2 at t0 — a camped player must meet the swarm early)
    batch: (t) => Math.min(6, 2 + Math.floor(t / 55)),
    // type weights by time moved to the per-level defs (levels.js, Phase 13)
  },

  audio: {
    musicVol: 0.20, sfxVol: 0.5, ambVol: 0.30,
    // 10.6 — eldritch track tuning (66 BPM, D-dim7 {D, F, Ab, B})
    bpm: 66,
    schedAhead: 0.12, // scheduler lookahead (s)
    subGain: 0.5,
    droneGain: 0.08, droneCutoff: 340, droneLfoHz: 0.05, droneLfoDepth: 120,
    pulseGain: 0.6,
    colorGain: 0.12, colorSend: 0.5,
    delayTime: 0.34, delayFb: 0.38,
    // 13.11 — per-level flavor voices + m03 muffle (level bus routes through a lowpass)
    bellGain: 0.05, chimeGain: 0.04, taikoGain: 0.09, bubbleGain: 0.03, whaleGain: 0.06,
    muffleOff: 12000, // pass-through cutoff (audibly a no-op) for m01/m02
    muffleM03: 600,   // The Drowned City — muffled, deep, underwater
    texGain: 0.05, texCutoff: 240, texLfoHz: 0.03, texLfoDepth: 120,
    // ambience (unchanged since Phase 5)
    windGain: 0.45, windLfoHz: 0.045, windCutoff: 420,
    howlEvery: [18, 40], // s between ambient wolf howls
    howlGain: 0.5,
  },

  // Co-op (Phase 11): 1 room = 1 run; host-authoritative; seats = join order.
  coop: {
    maxPlayers: 4,
    perPlayer: 0.33,  // 11.3: enemy HP/damage/spawn/boss ×(1 + perPlayer × added players)
    interpLag: 0.1,  // 11.2: client render lag for snapshot interpolation (s)
    leashR: 700,  // 11.4: co-op shared vision radius — every player pair held ≤ this; player light radius in co-op (solo keeps 510)
  },

  scores: {
    max: 10,
    storageKey: 'qsurv.hiscores.v1',
    muteKey: 'qsurv.mute',
  },

  // Persistent meta progression (Soulshards + between-run upgrades). localStorage.
  meta: {
    storageKey: 'qsurv.meta.v1',
    winsKey: 'qsurv.wins.v1',        // per-level cumulative victory counts (13.6)
    levelKey: 'qsurv.level.v1',      // last-selected level (13.7)
    charKey: 'qsurv.character.v1',   // last-selected playable character (11.6.2)
    charListKey: 'qsurv.chars.v1',   // unlocked character keys (11.6.2, D58)
    shardPerScore: 400,   // shards per score point
    victoryBonus: 25,     // flat bonus shards on victory
    upgrades: {
      maxHp: { name: 'Vitality',        desc: '+20 max HP',           icon: 'heart', max: 5, val: 20,     cost: [20, 40, 70, 110, 160] },
      dmg:   { name: 'Ferocity',        desc: '+8% weapon damage',    icon: 'sword', max: 5, val: 0.08,  cost: [25, 50, 85, 130, 190] },
      speed: { name: 'Swiftness',       desc: '+6% movement speed',   icon: 'boots', max: 5, val: 0.06,  cost: [20, 45, 80, 125, 180] },
      xp:    { name: 'Soul Attunement', desc: '+12% XP gain',         icon: 'gem',   max: 5, val: 0.12,  cost: [30, 55, 95, 145, 210] },
      dash:  { name: 'Phantom Step',    desc: '−8% dash cooldown',    icon: 'dash',  max: 5, val: -0.08, cost: [20, 40, 75, 120, 175] },
    },
  },

  perf: {
    dprCapDesktop: 2,
    dprCapMobile: 1.5,
    particleCap: 512,
    snowCount: 90,
    petalColor: '#f7b8c8', // sakura petal (m02 foreground)
    bubbleColor: 'rgba(205,240,255,0.8)', // rising bubble rim (m03 foreground, D49)
  },
};
