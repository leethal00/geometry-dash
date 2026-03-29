import { CONFIG } from '../game/Config.js';

export interface TrailPoint {
  x: number;
  y: number;
  rotation: number;
}

export class Player {
  /** World position in pixels (bottom-left of hitbox, y positive = up from ground) */
  x = 0;
  y = 0;
  /** Vertical velocity in px/tick (positive = upward) */
  vy = 0;
  /** Whether the player is standing on a surface */
  onGround = true;
  /** Whether the player is alive */
  alive = true;
  /** Current visual rotation in degrees */
  rotation = 0;
  /** Target rotation (increments by 90 per jump) */
  targetRotation = 0;
  /** Whether gravity is currently flipped (running on ceiling) */
  gravityFlipped = false;
  /** Trail of recent positions for rendering */
  trail: TrailPoint[] = [];

  reset(): void {
    this.x = 80; // start 2 blocks in
    this.y = 0;
    this.vy = 0;
    this.onGround = true;
    this.alive = true;
    this.rotation = 0;
    this.targetRotation = 0;
    this.gravityFlipped = false;
    this.trail = [];
  }

  jump(): void {
    if (!this.onGround) return;
    this.vy = this.gravityFlipped ? -CONFIG.JUMP_VELOCITY : CONFIG.JUMP_VELOCITY;
    this.onGround = false;
    this.targetRotation += this.gravityFlipped ? -90 : 90;
  }

  padLaunch(): void {
    this.vy = this.gravityFlipped ? -CONFIG.PAD_LAUNCH_VELOCITY : CONFIG.PAD_LAUNCH_VELOCITY;
    this.onGround = false;
    this.targetRotation += this.gravityFlipped ? -90 : 90;
  }

  orbJump(): void {
    this.vy = this.gravityFlipped ? -CONFIG.ORB_JUMP_VELOCITY : CONFIG.ORB_JUMP_VELOCITY;
    this.onGround = false;
    this.targetRotation += this.gravityFlipped ? -90 : 90;
  }

  /** Record current position for trail rendering */
  recordTrail(): void {
    this.trail.push({ x: this.x, y: this.y, rotation: this.rotation });
    if (this.trail.length > CONFIG.TRAIL_LENGTH) {
      this.trail.shift();
    }
  }

  /** Smoothly interpolate visual rotation toward target */
  updateRotation(): void {
    const diff = this.targetRotation - this.rotation;
    if (Math.abs(diff) < 0.5) {
      this.rotation = this.targetRotation;
    } else {
      this.rotation += diff * 0.18;
    }
  }
}
