import { CONFIG } from '../game/Config.js';

// --- Level definition types (grid units) ---

interface LevelDefinition {
  name: string;
  length: number;
  gaps: [number, number][];
  blocks: [number, number][];
  spikes: [number, number][];
  jumpPads: [number, number][];
  jumpOrbs: [number, number][];
  gravityPortals: number[];
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
// EVERY obstacle verified: jump = 3.7 blocks horiz, 3 blocks high.
// Min 3 blocks between obstacles requiring consecutive jumps.
// Gaps ≤2 blocks (safe) or 3 blocks with orb assist only.
// 3-high walls only with preceding jump pad.
//
// S1 (B0-15):  Learn — single spikes, flat ground
// S2 (B16-32): Blocks — platforms, walls, pillar, first gap
// S3 (B33-48): Combos — spike-on-block, platform hop, pillars
// S4 (B49-64): Intensity — pad, elevated platform, pillar pair
// S5 (B65-80): Peak — 3-high wall, spike-on-block, gravity flip
// S6 (B81-95): Cooldown — simpler patterns to the finish
// ============================================================

const FIRST_FLIGHT: LevelDefinition = {
  name: 'First Flight',
  length: 382,

  gaps: [
    [106, 108],   // S2: 2-block gap (safe jump)
    [150, 152],   // S3: 2-block gap (platform hop)
    [226, 229],   // S4: 3-block gap (orb assist)
    [262, 264],   // S5: 2-block gap
    [314, 317],   // S5: 3-block gap (orb assist after gravity)
    [358, 360],   // S6: 2-block gap
  ],

  blocks: [
    // === S2: Blocks Intro ===
    // 3-wide platform: jump on, run along, jump off
    [74, 0], [75, 0], [76, 0],
    // Single block wall
    [86, 0],
    // 1-high wall then 2-high wall, 4 blocks apart (jump each separately)
    [94, 0],
    [98, 0], [98, 1],
    // 2×2 elevated platform (wide landing target)
    [118, 0], [119, 0], [118, 1], [119, 1],
    // 2-high pillar
    [126, 0], [126, 1],

    // === S3: Combos ===
    // Spike-on-block (block base for spike at y=1)
    [134, 0],
    // 3-wide platform before gap
    [146, 0], [147, 0], [148, 0],
    // Spike-on-block
    [162, 0],
    // 2-high pillar
    [174, 0], [174, 1],
    // Single block obstacle
    [182, 0],
    // Spike-on-block
    [190, 0],

    // === S4: Platform Hopping ===
    // 3-wide 2-high elevated platform (from pad launch)
    [202, 0], [203, 0], [204, 0],
    [202, 1], [203, 1], [204, 1],
    // Pillar pair: 2-high, 4 blocks apart (land between, jump each)
    [214, 0], [214, 1],
    [218, 0], [218, 1],
    // Spike-on-block
    [238, 0],
    // Single block
    [246, 0],

    // === S5: Intense ===
    // 3-high wall (REQUIRES preceding jump pad)
    [275, 0], [275, 1], [275, 2],
    // Spike-on-block
    [286, 0],

    // === S6: Finale ===
    // Spike-on-block
    [334, 0],
    // 3-wide resting platform (safe breathing room)
    [346, 0], [347, 0], [348, 0],
    // 2-high pillar (final block challenge)
    [370, 0], [370, 1],
  ],

  spikes: [
    // === S1: Learn the Rhythm ===
    // Single spikes, 12 blocks apart — learn to jump on beat
    [18, 0],       // B4
    [30, 0],       // B7
    [42, 0],       // B10
    [54, 0],       // B13

    // === S2: Blocks Intro ===
    [66, 0],       // B16 — last easy spike
    [79, 0],       // 3 blocks after platform end (x=77) — jump off platform
    [88, 0],       // 2 blocks after block [86] — one jump clears both
    [101, 0],      // 3 blocks after 2-high wall end (x=99)
    [112, 0],      // 4 blocks after gap end (x=108) — safe landing room
    [123, 0],      // 3 blocks after 2×2 platform end (x=120)
    [130, 0],      // 4 blocks after pillar (x=127)

    // === S3: Combos ===
    [134, 1],      // spike ON TOP of block — 2-high obstacle
    [138, 0],      // 4 blocks later — standalone
    [155, 0],      // 3 blocks after gap end (x=152)
    [162, 1],      // spike ON TOP of block
    [166, 0],      // 4 blocks later — standalone
    [178, 0],      // 4 blocks after pillar end (x=175)
    [185, 0],      // 3 blocks after block [182]
    [190, 1],      // spike ON TOP of block
    [194, 0],      // 4 blocks later — standalone

    // === S4: Platform Hopping ===
    [208, 0],      // 4 blocks after platform end (x=205)
    [222, 0],      // 4 blocks after second pillar end (x=219)
    [232, 0],      // 3 blocks after gap end (x=229)
    [238, 1],      // spike ON block
    [242, 0],      // 4 blocks later
    [250, 0],      // 4 blocks after block [246]
    [254, 0], [256.5, 0],  // double spike (2.5 apart, one jump clears both)

    // === S5: Intense ===
    [267, 0],      // 3 blocks after gap end (x=264)
    [282, 0],      // safe distance after 3-high wall
    [286, 1],      // spike ON block — last challenge before gravity
    [320, 0],      // 3 blocks after gap end (x=317)

    // === S6: Finale ===
    [330, 0],      // standalone
    [334, 1],      // spike ON block
    [338, 0],      // 4 blocks later
    [352, 0],      // 4 blocks after platform end (x=349)
    [363, 0],      // 3 blocks after gap end (x=360)
    [374, 0],      // final spike
  ],

  jumpPads: [
    [198, 0],      // S4: dramatic launch onto 2-high platform
    [272, 0],      // S5: essential for 3-high wall at 275
  ],

  jumpOrbs: [
    [227, 3],      // S4: assist over 3-block gap [226,229]
    [315, 3],      // S5: mid-air save after gravity, over [314,317]
  ],

  gravityPortals: [
    290,           // flip to ceiling
    306,           // flip back to ground
  ],
};
