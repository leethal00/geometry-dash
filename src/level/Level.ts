import { CONFIG } from '../game/Config.js';

// --- Level definition types (grid units) ---

interface LevelDefinition {
  name: string;
  /** Total level length in grid units */
  length: number;
  /** Ground gap ranges [start, end) in grid units — ground is absent here */
  gaps: [number, number][];
  /** Block positions [x, y] in grid units (y=0 = ground level) */
  blocks: [number, number][];
  /** Spike positions [x, y] in grid units (pointing up) */
  spikes: [number, number][];
  /** Jump pad positions [x, y] in grid units */
  jumpPads: [number, number][];
  /** Jump orb positions [x, y] in grid units (floating in air) */
  jumpOrbs: [number, number][];
  /** Gravity portal x positions in grid units */
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

    // Convert gaps to pixels
    this.gaps = def.gaps.map(([s, e]) => ({ startPx: s * U, endPx: e * U }));

    // Compute ground segments (the inverse of gaps)
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

    // Convert blocks and spikes to pixels, sorted by x
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

  /** Check if the given x position (player center) is over solid ground */
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
// "First Flight" — Beat-synced at 128 BPM, 4 blocks per beat
//
// B(n) = grid position 2 + n×4.  382 blocks ≈ 95 beats ≈ 44.5s
//
// SECTION 1 (B0-B15):  Learn — flat ground, single spikes
// SECTION 2 (B16-B32): Blocks — platforms, staircase, pillar, gap
// SECTION 3 (B33-B48): Combos — spike-on-block, corridors, doubles
// SECTION 4 (B49-B64): Platform hop — elevated, pillar pairs, gaps
// SECTION 5 (B65-B80): Intense — 3-high wall, rapid blocks, gravity
// SECTION 6 (B81-B95): Finale — cooldown, last challenges, finish
// ============================================================

const FIRST_FLIGHT: LevelDefinition = {
  name: 'First Flight',
  length: 382,

  gaps: [
    // S2: first ground gap — 3 blocks
    [106, 109],
    // S3: platform hop gap, 3-block gap
    [149, 151],
    [174, 177],
    // S4: gaps between platforming
    [213, 215],
    [226, 229],
    // S5: after intense section, post-gravity
    [262, 265],
    [314, 317],
    // S6: final gap
    [354, 356],
  ],

  blocks: [
    // =============================================
    // SECTION 2: Blocks Intro (x≈66-130)
    // =============================================

    // 2-wide platform — jump onto, run along, jump off
    [74, 0], [75, 0],

    // Single block obstacle — jump over or onto
    [86, 0],

    // Step-up staircase: 1-high → 2-high
    [94, 0],
    [96, 0], [96, 1],

    // 2×2 elevated platform — jump onto, spike below after
    [114, 0], [115, 0], [114, 1], [115, 1],

    // 2-high pillar — jump over
    [122, 0], [122, 1],

    // =============================================
    // SECTION 3: Combos (x≈134-194)
    // =============================================

    // Spike-on-block: block with spike on top, jump over the 2-high
    [134, 0],

    // Platform hop: platform → gap → platform
    [146, 0], [147, 0],
    [152, 0], [153, 0],

    // Block corridor: block—spike—block (spike elevated between)
    [166, 0], [167, 0], [168, 0],

    // Step-up: 1-high → 2-high, spike after descent
    [182, 0],
    [184, 0], [184, 1],

    // Another spike-on-block
    [190, 0],

    // =============================================
    // SECTION 4: Platform Hopping (x≈198-258)
    // =============================================

    // 2×2 elevated platform (launch from pad)
    [202, 0], [203, 0], [202, 1], [203, 1],

    // Block before gap
    [210, 0],

    // Pillar pair: two 2-high pillars with gap between
    [218, 0], [218, 1],
    [222, 0], [222, 1],

    // Two spike-on-blocks in quick succession (one big jump clears both)
    [234, 0],
    [237, 0],

    // Block-spike combo
    [246, 0],

    // =============================================
    // SECTION 5: Intense (x≈262-322)
    // =============================================

    // 3-high wall — requires jump pad to clear!
    [270, 0], [270, 1], [270, 2],

    // Rapid block-spike-block-spike pattern
    [278, 0],
    [281, 0],

    // =============================================
    // SECTION 6: Finale (x≈326-378)
    // =============================================

    // Spike-on-block
    [334, 0],

    // 2-wide resting platform (brief safe spot)
    [346, 0], [347, 0],

    // 2-high pillar — final jump-over challenge
    [362, 0], [362, 1],
  ],

  spikes: [
    // =============================================
    // SECTION 1: Learn the Rhythm (4 single spikes)
    // =============================================
    [18, 0],       // B4
    [30, 0],       // B7
    [42, 0],       // B10
    [54, 0],       // B13

    // =============================================
    // SECTION 2: Blocks Intro
    // =============================================
    [66, 0],       // B16 — last easy spike
    [77, 0],       // after 2-wide platform, must jump off over it
    [87, 0],       // right after block [86] — jump-over combo
    [98, 0],       // after staircase descent
    [110, 0],      // after 3-block gap landing
    [117, 0],      // after 2×2 platform drop-off
    [126, 0],      // after pillar

    // =============================================
    // SECTION 3: Combos
    // =============================================
    [134, 1],      // spike ON TOP of block — 2-high obstacle
    [138, 0],      // standalone on beat
    [154, 0],      // after platform hop landing
    [158, 0], [160, 0],   // double spike with spacing
    [167, 1],      // elevated spike in block corridor
    [186, 0],      // after staircase descent
    [190, 1],      // spike ON TOP of block
    [194, 0],      // standalone on beat

    // =============================================
    // SECTION 4: Platform Hopping
    // =============================================
    [206, 0],      // after elevated platform drop
    [211, 0],      // after block, before gap
    [216, 0],      // after gap landing
    [234, 1],      // spike ON block (pair 1)
    [237, 1],      // spike ON block (pair 2)
    [242, 0],      // standalone
    [247, 0],      // after block [246]
    [254, 0], [256.5, 0],  // double spike

    // =============================================
    // SECTION 5: Intense
    // =============================================
    [266, 0],      // after 3-block gap
    [279, 0],      // rapid pattern: spike after block
    [282, 0],      // rapid pattern: spike after block
    [286, 0],      // before gravity section

    // =============================================
    // SECTION 6: Finale
    // =============================================
    [330, 0],      // standalone
    [334, 1],      // spike ON block
    [338, 0], [340, 0],   // double spike
    [350, 0],      // standalone
    [358, 0],      // after gap
    [366, 0],      // standalone
    [374, 0],      // final spike
  ],

  jumpPads: [
    [198, 0],      // S4: dramatic launch into platform section
    [267, 0],      // S5: essential — clears the 3-high wall at 270
  ],

  jumpOrbs: [
    [175, 3],      // S3: safety net over 3-block gap [174,177]
    [227, 3],      // S4: safety net over 3-block gap [226,229]
    [315, 3],      // S5: mid-air save after gravity flip, over [314,317]
  ],

  gravityPortals: [
    290,           // flip to ceiling
    306,           // flip back to ground
  ],
};
