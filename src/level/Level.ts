import { CONFIG, VehicleMode } from '../game/Config.js';

// --- Level definition types (grid units) ---

interface ModePortalDef {
  x: number;         // grid x position
  mode: VehicleMode;  // target vehicle mode
}

interface LevelDefinition {
  name: string;
  length: number;
  gaps: [number, number][];
  blocks: [number, number][];
  spikes: [number, number][];
  jumpPads: [number, number][];
  jumpOrbs: [number, number][];
  gravityPortals: number[];
  modePortals?: ModePortalDef[];
}

// --- Loaded level (pixel coordinates) ---

export interface LevelObstacle {
  x: number;
  y: number;
}

export interface GroundSegment {
  startPx: number;
  endPx: number;
}

export interface GravityPortal {
  x: number;
}

export interface ModePortal {
  x: number;
  mode: VehicleMode;
}

export class Level {
  readonly name: string;
  readonly lengthPx: number;
  readonly gaps: { startPx: number; endPx: number }[];
  readonly groundSegments: GroundSegment[];
  readonly blocks: LevelObstacle[];
  readonly spikes: LevelObstacle[];
  readonly jumpPads: LevelObstacle[];
  readonly jumpOrbs: LevelObstacle[];
  readonly gravityPortals: GravityPortal[];
  readonly modePortals: ModePortal[];

  constructor(def: LevelDefinition) {
    const U = CONFIG.UNIT_SIZE;
    this.name = def.name;
    this.lengthPx = def.length * U;

    this.gaps = def.gaps.map(([s, e]) => ({ startPx: s * U, endPx: e * U }));

    this.groundSegments = [];
    let prev = 0;
    for (const [s, e] of def.gaps) {
      if (s * U > prev) {
        this.groundSegments.push({ startPx: prev, endPx: s * U });
      }
      prev = e * U;
    }
    if (prev < this.lengthPx) {
      this.groundSegments.push({ startPx: prev, endPx: this.lengthPx });
    }

    this.blocks = def.blocks
      .map(([x, y]) => ({ x: x * U, y: y * U }))
      .sort((a, b) => a.x - b.x);
    this.spikes = def.spikes
      .map(([x, y]) => ({ x: x * U, y: y * U }))
      .sort((a, b) => a.x - b.x);
    this.jumpPads = def.jumpPads
      .map(([x, y]) => ({ x: x * U, y: y * U }))
      .sort((a, b) => a.x - b.x);
    this.jumpOrbs = def.jumpOrbs
      .map(([x, y]) => ({ x: x * U, y: y * U }))
      .sort((a, b) => a.x - b.x);
    this.gravityPortals = def.gravityPortals
      .map(x => ({ x: x * U }))
      .sort((a, b) => a.x - b.x);
    this.modePortals = (def.modePortals ?? [])
      .map(p => ({ x: p.x * U, mode: p.mode }))
      .sort((a, b) => a.x - b.x);
  }

  isOverGround(centerX: number): boolean {
    for (const gap of this.gaps) {
      if (centerX >= gap.startPx && centerX < gap.endPx) return false;
    }
    return centerX >= 0 && centerX < this.lengthPx;
  }

  static firstLevel(): Level {
    return new Level(FIRST_FLIGHT);
  }
}

// ============================================================
// "First Flight" — 128 BPM, 4 blocks/beat, B(n) = 2 + n×4
//
// PHYSICS (verified every transition):
//   Ground jump: 26 ticks, 3.7 blocks horiz, peak 118px (3 blocks)
//   From y=40:   28 ticks, 4.0 blocks horiz, peak 158px
//   Pad launch:  34 ticks, 4.9 blocks horiz, peak 206px
//   Spike hitbox: y=12..28 (ground), y=52..68 (on block)
//
// SPACING RULE: minimum 4 blocks of clear ground after landing
// from any obstacle before the next obstacle begins. No
// frame-perfect inputs required. 10-20 attempts to complete.
//
// S1 (B0-15):  Learn — single spikes, 12 blocks apart
// S2 (B16-32): Blocks — walls, gap, pillar
// S3 (B33-48): Combos — spike-on-block, platform, pillar
// S4 (B49-64): Intensity — pad+platform, pillar, orb gap
// S5 (B65-80): Peak — 3-high wall, gravity flip, orb gap
// S6 (B81-95): Cooldown — spike-on-block, gap, pillar
// ============================================================

const FIRST_FLIGHT: LevelDefinition = {
  name: 'First Flight',
  length: 382,

  gaps: [
    // S2: first gap — 2 blocks (easy jump)
    [106, 108],
    // S4: 3-block gap with orb assist
    [230, 233],
    // S5: 2-block gap
    [262, 264],
    // S5: 3-block gap after gravity (orb assist)
    [314, 317],
    // S6: 2-block gap
    [354, 356],
  ],

  blocks: [
    // === S2: Blocks Intro ===
    // 1-high wall — first block obstacle, just jump over it
    [78, 0],
    // 2-high wall — jump over (max height 118 > 80)
    [94, 0], [94, 1],
    // 2-high pillar
    [122, 0], [122, 1],

    // === S3: Combos ===
    // Spike-on-block base (spike at y=1 on top)
    [134, 0],
    // 4-wide platform — wide enough to land on comfortably
    [150, 0], [151, 0], [152, 0], [153, 0],
    // Spike-on-block base
    [168, 0],
    // 2-high pillar
    [178, 0], [178, 1],
    // Spike-on-block base
    [190, 0],

    // === S4: Intensity ===
    // 3×2 elevated platform (land from pad launch at y=80)
    [202, 0], [203, 0], [204, 0],
    [202, 1], [203, 1], [204, 1],
    // 2-high pillar
    [218, 0], [218, 1],
    // Spike-on-block base
    [242, 0],

    // === S5: Peak ===
    // 3-high wall — REQUIRES pad (peak 206 > top 120)
    [277, 0], [277, 1], [277, 2],
    // Spike-on-block base
    [288, 0],

    // === S6: Cooldown ===
    // Spike-on-block base
    [338, 0],
    // 2-high pillar — final block challenge
    [370, 0], [370, 1],
  ],

  spikes: [
    // === S1: Learn the Rhythm (12 blocks between each) ===
    [18, 0],       // B4 — first obstacle
    [30, 0],       // B7
    [42, 0],       // B10
    [54, 0],       // B13

    // === S2: Blocks Intro ===
    // After each obstacle: 4+ blocks of clear ground before next
    [66, 0],       // B16 — last easy spike (12 from [54])
    [86, 0],       // 8 from wall [78] end — jump over wall, land ~82, 4 clear
    [102, 0],      // 8 from wall [94] end — jump over, land ~98, 4 clear
    [114, 0],      // 6 from gap end (108) — land ~108, 6 clear
    [130, 0],      // 8 from pillar [122] end — jump over, land ~126, 4 clear

    // === S3: Combos ===
    [134, 1],      // spike ON block — 2-high obstacle (4 from [130])
    [142, 0],      // 4 from landing after [134] (land ~138)
    [160, 0],      // 6 from platform end (154) — fall/jump, safe either way
    [168, 1],      // spike ON block (8 from [160])
    [174, 0],      // 5 from landing after [168] (land ~172)
    [186, 0],      // 8 from pillar [178] end — jump over, land ~182, 4 clear
    [190, 1],      // spike ON block (4 from [186])

    // === S4: Intensity ===
    [212, 0],      // 7 from platform end (205) — safe after fall or jump
    [226, 0],      // 8 from pillar [218] end — land ~222, 4 clear
    [238, 0],      // 5 from gap end (233) — land ~233, 5 clear
    [242, 1],      // spike ON block (4 from [238])
    [250, 0],      // 7 from [242] spike-on-block — land ~246, 4 clear
    [254, 0],      // 4 from [250]
    [256, 0],      // double: 2 blocks from [254] — one jump clears both ✓

    // === S5: Peak ===
    [270, 0],      // 6 from gap end (264)
    [284, 0],      // 6 from 3-high wall end (278)
    [288, 1],      // spike ON block (4 from [284])
    [322, 0],      // 5 from gap end (317)

    // === S6: Cooldown ===
    [330, 0],      // 8 from [322]
    [338, 1],      // spike ON block (8 from [330])
    [346, 0],      // 7 from [338] spike-on-block — land ~342, 4+ clear
    [362, 0],      // 6 from gap end (356)
    // Clear run to finish after pillar [370] — no final spike, victory lap
  ],

  jumpPads: [
    [198, 0],      // S4: launches player onto 3×2 platform at [202]
    [274, 0],      // S5: essential for 3-high wall at [277]
  ],

  jumpOrbs: [
    [231, 3],      // S4: assist over 3-block gap [230,233]
    [315, 3],      // S5: assist over 3-block gap [314,317] after gravity
  ],

  gravityPortals: [
    292,           // flip to ceiling
    308,           // flip back to ground
  ],
};
