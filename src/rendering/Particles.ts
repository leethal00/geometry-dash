import { CONFIG } from '../game/Config.js';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
  /** Rotation angle in radians (for shatter effect) */
  rot: number;
  /** Rotation speed in radians/tick */
  rotSpeed: number;
  /** Particle shape: 0=square, 1=triangle, 2=circle, 3=diamond */
  shape: number;
  /** Whether this particle is part of a respawn reassembly (converging) */
  converging: boolean;
  /** Target X for converging particles */
  targetX: number;
  /** Target Y for converging particles */
  targetY: number;
}

export class ParticleSystem {
  readonly particles: Particle[] = [];

  private createParticle(
    x: number, y: number, vx: number, vy: number,
    size: number, life: number, r: number, g: number, b: number,
    shape = 0, converging = false, targetX = 0, targetY = 0,
  ): Particle {
    return {
      x, y, vx, vy, size, life, maxLife: life,
      r, g, b,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.4,
      shape, converging, targetX, targetY,
    };
  }

  /** Death shatter — large rotating pieces flying in all directions */
  emitDeath(worldX: number, worldY: number): void {
    const count = CONFIG.DEATH_PARTICLE_COUNT;
    const half = CONFIG.PLAYER_SIZE / 2;
    const cx = worldX + half;
    const cy = worldY + half;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 5 + Math.random() * 12;
      const life = CONFIG.PARTICLE_LIFETIME * (0.5 + Math.random() * 0.5);
      // Mix of green shades with some white/cyan sparks
      let r: number, g: number, b: number;
      const variant = i % 5;
      if (variant < 3) {
        // Green shards (main)
        r = 0;
        g = 180 + Math.floor(Math.random() * 75);
        b = Math.floor(Math.random() * 40);
      } else if (variant === 3) {
        // White sparks
        r = 200 + Math.floor(Math.random() * 55);
        g = 220 + Math.floor(Math.random() * 35);
        b = 200 + Math.floor(Math.random() * 55);
      } else {
        // Cyan accent
        r = 0;
        g = 180 + Math.floor(Math.random() * 75);
        b = 200 + Math.floor(Math.random() * 55);
      }

      // Mix of shapes for visual variety
      const shape = i % 4;

      this.particles.push(this.createParticle(
        cx + (Math.random() - 0.5) * 14,
        cy + (Math.random() - 0.5) * 14,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed + 5,
        CONFIG.DEATH_PARTICLE_SIZE_MIN +
          Math.random() * (CONFIG.DEATH_PARTICLE_SIZE_MAX - CONFIG.DEATH_PARTICLE_SIZE_MIN),
        life, r, g, b, shape,
      ));
    }

    // Extra small spark burst for impact feel
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 8 + Math.random() * 15;
      this.particles.push(this.createParticle(
        cx, cy,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed + 3,
        1 + Math.random() * 3,
        15 + Math.random() * 15,
        255, 255, 255, 2, // tiny circles
      ));
    }
  }

  /** Respawn reassembly — particles converge to player position */
  emitRespawn(worldX: number, worldY: number): void {
    const half = CONFIG.PLAYER_SIZE / 2;
    const cx = worldX + half;
    const cy = worldY + half;

    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const dist = 60 + Math.random() * 80;
      const life = 18 + Math.random() * 10;

      this.particles.push(this.createParticle(
        cx + Math.cos(angle) * dist,
        cy + Math.sin(angle) * dist,
        0, 0,
        3 + Math.random() * 6,
        life,
        0, 200 + Math.floor(Math.random() * 55), Math.floor(Math.random() * 40),
        i % 3, // mixed shapes
        true, cx, cy,
      ));
    }
  }

  /** Celebration burst */
  emitCelebration(worldX: number, worldY: number): void {
    for (let i = 0; i < 55; i++) {
      const angle = (i / 55) * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      const life = 80 + Math.random() * 50;
      this.particles.push(this.createParticle(
        worldX + Math.random() * 40,
        worldY + Math.random() * 40,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed + 6,
        4 + Math.random() * 8,
        life,
        200 + Math.floor(Math.random() * 55),
        150 + Math.floor(Math.random() * 105),
        Math.floor(Math.random() * 80),
        i % 4,
      ));
    }
  }

  /** Pad activation burst — yellow particles shooting upward */
  emitPadBurst(worldX: number, worldY: number): void {
    const cx = worldX + CONFIG.UNIT_SIZE / 2;
    for (let i = 0; i < 14; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const speed = 4 + Math.random() * 8;
      this.particles.push(this.createParticle(
        cx + (Math.random() - 0.5) * 20,
        worldY + CONFIG.UNIT_SIZE * 0.2,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed + 4,
        2 + Math.random() * 4,
        20 + Math.random() * 15,
        255, 200 + Math.floor(Math.random() * 55), 0,
        2, // circles
      ));
    }
  }

  /** Orb activation ring — expanding ring of particles */
  emitOrbRing(worldX: number, worldY: number): void {
    const cx = worldX + CONFIG.UNIT_SIZE / 2;
    const cy = worldY + CONFIG.UNIT_SIZE / 2;
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const speed = 3 + Math.random() * 3;
      this.particles.push(this.createParticle(
        cx, cy,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        2 + Math.random() * 3,
        18 + Math.random() * 12,
        255, 220, Math.floor(Math.random() * 50),
        2, // circles
      ));
    }
  }

  /** Portal swirl — persistent swirling particles around portal frame */
  emitPortalSwirl(worldX: number, groundY: number): void {
    const portalH = CONFIG.UNIT_SIZE * 6;
    // Emit a few swirling particles per call
    for (let i = 0; i < 3; i++) {
      const t = Math.random();
      const py = groundY - portalH * t;
      const side = Math.random() > 0.5 ? 1 : -1;
      const isBlue = t < 0.5;

      this.particles.push(this.createParticle(
        worldX + side * (8 + Math.random() * 12),
        py,
        side * (0.5 + Math.random()),
        (Math.random() - 0.5) * 2 + (isBlue ? 2 : -2),
        1.5 + Math.random() * 2.5,
        25 + Math.random() * 15,
        isBlue ? 0 : 255,
        isBlue ? 150 + Math.floor(Math.random() * 105) : 180 + Math.floor(Math.random() * 75),
        isBlue ? 255 : 0,
        2,
      ));
    }
  }

  update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;

      if (p.converging) {
        // Converge toward target position
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const progress = 1 - (p.life / p.maxLife);
        const accel = 0.1 + progress * 0.4;
        p.vx += dx * accel;
        p.vy += dy * accel;
        p.vx *= 0.85;
        p.vy *= 0.85;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotSpeed;
        // Size grows as it converges
        p.size *= 1.01;
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.25;
        p.vx *= 0.97;
        p.size *= 0.984;
        p.rot += p.rotSpeed;
      }

      p.life--;
      if (p.life <= 0 || (!p.converging && p.size < 0.5)) {
        this.particles.splice(i, 1);
      }
    }
  }

  clear(): void {
    this.particles.length = 0;
  }
}
