import { CONFIG } from '../game/Config.js';

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

  reset(): void {
    this.x = 80; // start 2 blocks in
    this.y = 0;
    this.vy = 0;
    this.onGround = true;
    this.alive = true;
    this.rotation = 0;
    this.targetRotation = 0;
  }

  jump(): void {
    if (!this.onGround) return;
    this.vy = CONFIG.JUMP_VELOCITY;
    this.onGround = false;
    this.targetRotation += 90;
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
