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
// Beat N lands at grid position 2 + N×4 (player starts at x=2).
// 380 blocks ≈ 95 beats ≈ 44.5 seconds.
//
// Phase 1 (B4-B20,  x≈18-82):   Single spikes, learn rhythm
// Phase 2 (B25-B47, x≈102-190): Blocks, gaps, first pad
// Phase 3 (B49-B72, x≈198-290): Doubles, orbs, walls, pad
// Phase 4 (B73-B94, x≈294-378): Gravity flip, triple, finale
// ============================================================

const FIRST_FLIGHT: LevelDefinition = {
  name: 'First Flight',
  length: 380,

  gaps: [
    // Phase 2
    [134, 136],   // 2-block gap after pad launch
    [174, 176],   // 2-block gap
    // Phase 3
    [226, 228],   // 2-block gap with orb
    [262, 264],   // 2-block gap
    // Phase 4
    [322, 325],   // 3-block gap (hardest) with orb
    [354, 356],   // 2-block gap
  ],

  blocks: [
    // Phase 2: single blocks on beats
    [110, 0],     // B27
    [158, 0],     // B39
    // Phase 3: blocks + 2-high wall
    [202, 0],     // B50
    [242, 0],     // B60
    [270, 0], [270, 1],  // B67: 2-high wall
    // Phase 4
    [342, 0], [342, 1],  // B85: 2-high wall
  ],

  spikes: [
    // === Phase 1: Single spikes on beats — learn to jump ===
    [18, 0],      // B4
    [30, 0],      // B7
    [42, 0],      // B10
    [54, 0],      // B13
    [66, 0],      // B16
    [82, 0],      // B20

    // === Phase 2: Blocks, gaps, getting harder ===
    [102, 0],     // B25
    [118, 0],     // B29
    [126, 0],     // B31
    [142, 0],     // B35 (after gap landing)
    [150, 0],     // B37
    [166, 0],     // B41
    [182, 0],     // B45
    // Double spike on beat B47
    [190, 0], [192.5, 0],

    // === Phase 3: Combos, doubles, walls ===
    [198, 0],     // B49
    [210, 0],     // B52
    // Double spike B53
    [214, 0], [216.5, 0],
    [234, 0],     // B58
    [246, 0],     // B61
    // Double spike B63
    [254, 0], [256.5, 0],
    [274, 0],     // B68
    [282, 0],     // B70

    // === Phase 4: Gravity, triple, finale ===
    // Triple spike B82 — spaced with 1.5 block gaps
    [330, 0], [332.5, 0], [335, 0],
    [338, 0],     // B84
    [350, 0],     // B87
    // Double spike B90
    [362, 0], [364.5, 0],
    [370, 0],     // B92
    [374, 0],     // B93 (final obstacle)
  ],

  jumpPads: [
    [130, 0],     // Launch over gap [134,136]
    [222, 0],     // Before gap section
    [286, 0],     // Before gravity flip
    [346, 0],     // Before final gap
  ],

  jumpOrbs: [
    [135, 2.5],   // Over gap [134,136]
    [227, 2.5],   // Over gap [226,228]
    [323, 2.5],   // Over big gap [322,325]
  ],

  gravityPortals: [
    294,          // Flip to ceiling
    314,          // Flip back to ground
  ],
};
