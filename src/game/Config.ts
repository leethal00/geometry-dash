/** Game constants — physics values in pixels per tick at 60fps unless noted. */

export const CONFIG = {
  /** Target frames per second */
  TARGET_FPS: 60,

  /** Fixed timestep in seconds (1/60) */
  FIXED_TIMESTEP: 1 / 60,

  /** Maximum delta time to prevent spiral of death (seconds) */
  MAX_DELTA: 0.25,

  /** Pixels per game unit (block size) */
  UNIT_SIZE: 40,

  /** Canvas default width */
  CANVAS_WIDTH: 1280,

  /** Canvas default height */
  CANVAS_HEIGHT: 720,

  /** Aspect ratio (16:9) */
  ASPECT_RATIO: 16 / 9,

  /** Player hitbox size in pixels (1 block) */
  PLAYER_SIZE: 40,

  /** Player horizontal position on screen (fraction from left) */
  PLAYER_SCREEN_X: 0.25,

  /** Horizontal scroll speed in px/tick (8.4 blocks/sec × 40px ÷ 60fps) */
  SCROLL_SPEED: 5.6,

  /** Gravity in px/tick² (subtracted from vy each tick) */
  GRAVITY: 1.4,

  /** Jump velocity in px/tick (positive = upward) */
  JUMP_VELOCITY: 18.2,

  /** Ground line position as fraction of canvas height from top */
  GROUND_Y_RATIO: 0.78,

  /** Ticks to wait after death before auto-restart */
  DEATH_PAUSE_TICKS: 50,

  /** Number of particles emitted on death */
  DEATH_PARTICLE_COUNT: 25,

  /** Particle lifetime in ticks */
  PARTICLE_LIFETIME: 50,

  /** Spike hitbox inset in pixels (makes collision more forgiving) */
  SPIKE_INSET: 6,

  /** Landing tolerance in pixels (how far below block top prevY can be) */
  LANDING_TOLERANCE: 4,

  /** Fall death threshold in pixels below ground */
  FALL_DEATH_Y: -300,
} as const;
