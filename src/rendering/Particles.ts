import { CONFIG, VehicleMode } from '../game/Config.js';

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

  /** Death shatter — delegates to per-mode death effect */
  emitDeath(worldX: number, worldY: number, mode: VehicleMode = VehicleMode.Cube): void {
    switch (mode) {
      case VehicleMode.Cube:
        this.emitDeathCube(worldX, worldY);
        break;
      case VehicleMode.Ship:
        this.emitDeathShip(worldX, worldY);
        break;
      case VehicleMode.Ball:
        this.emitDeathBall(worldX, worldY);
        break;
      case VehicleMode.UFO:
        this.emitDeathUFO(worldX, worldY);
        break;
      case VehicleMode.Wave:
        this.emitDeathWave(worldX, worldY);
        break;
      case VehicleMode.Spider:
        this.emitDeathSpider(worldX, worldY);
        break;
    }
  }

  /** Cube death: green shards shattering outward like breaking glass */
  private emitDeathCube(worldX: number, worldY: number): void {
    const count = CONFIG.DEATH_PARTICLE_COUNT;
    const half = CONFIG.PLAYER_SIZE / 2;
    const cx = worldX + half;
    const cy = worldY + half;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 5 + Math.random() * 12;
      const life = CONFIG.PARTICLE_LIFETIME * (0.5 + Math.random() * 0.5);
      let r: number, g: number, b: number;
      const variant = i % 5;
      if (variant < 3) {
        r = 0; g = 180 + Math.floor(Math.random() * 75); b = Math.floor(Math.random() * 40);
      } else if (variant === 3) {
        r = 200 + Math.floor(Math.random() * 55); g = 220 + Math.floor(Math.random() * 35); b = 200 + Math.floor(Math.random() * 55);
      } else {
        r = 0; g = 180 + Math.floor(Math.random() * 75); b = 200 + Math.floor(Math.random() * 55);
      }
      const shape = i % 4;
      this.particles.push(this.createParticle(
        cx + (Math.random() - 0.5) * 14, cy + (Math.random() - 0.5) * 14,
        Math.cos(angle) * speed, Math.sin(angle) * speed + 5,
        CONFIG.DEATH_PARTICLE_SIZE_MIN + Math.random() * (CONFIG.DEATH_PARTICLE_SIZE_MAX - CONFIG.DEATH_PARTICLE_SIZE_MIN),
        life, r, g, b, shape,
      ));
    }
    // White spark burst
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 8 + Math.random() * 15;
      this.particles.push(this.createParticle(cx, cy, Math.cos(angle) * speed, Math.sin(angle) * speed + 3, 1 + Math.random() * 3, 15 + Math.random() * 15, 255, 255, 255, 2));
    }
  }

  /** Ship death: fiery explosion with orange/red expanding debris and engine sparks */
  private emitDeathShip(worldX: number, worldY: number): void {
    const half = CONFIG.PLAYER_SIZE / 2;
    const cx = worldX + half;
    const cy = worldY + half;

    // Main explosion — outward fireballs
    for (let i = 0; i < 35; i++) {
      const angle = (i / 35) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 4 + Math.random() * 14;
      const life = 30 + Math.random() * 30;
      const variant = i % 3;
      const r = variant === 0 ? 255 : variant === 1 ? 255 : 200;
      const g = variant === 0 ? 100 + Math.floor(Math.random() * 80) : variant === 1 ? 50 : 120;
      const b = variant === 0 ? 0 : variant === 1 ? 0 : 30;
      this.particles.push(this.createParticle(
        cx + (Math.random() - 0.5) * 20, cy + (Math.random() - 0.5) * 10,
        Math.cos(angle) * speed, Math.sin(angle) * speed + 2,
        4 + Math.random() * 10, life, r, g, b, 2, // circles for fire
      ));
    }
    // Engine trail sparks — shoot backward
    for (let i = 0; i < 15; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * 1.2;
      const speed = 6 + Math.random() * 10;
      this.particles.push(this.createParticle(
        cx - half, cy, Math.cos(angle) * speed, Math.sin(angle) * speed + 1,
        2 + Math.random() * 4, 20 + Math.random() * 20, 255, 200, 50, 2,
      ));
    }
    // Smoke puffs
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push(this.createParticle(
        cx + (Math.random() - 0.5) * 30, cy + (Math.random() - 0.5) * 20,
        Math.cos(angle) * speed, Math.sin(angle) * speed + 2,
        8 + Math.random() * 12, 40 + Math.random() * 20, 80, 80, 80, 2,
      ));
    }
  }

  /** Ball death: radial ring burst — orange segments spinning outward */
  private emitDeathBall(worldX: number, worldY: number): void {
    const half = CONFIG.PLAYER_SIZE / 2;
    const cx = worldX + half;
    const cy = worldY + half;

    // Ring segments spinning outward
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const speed = 6 + Math.random() * 10;
      const life = 25 + Math.random() * 30;
      this.particles.push(this.createParticle(
        cx + Math.cos(angle) * 8, cy + Math.sin(angle) * 8,
        Math.cos(angle) * speed, Math.sin(angle) * speed,
        3 + Math.random() * 6, life,
        255, 80 + Math.floor(Math.random() * 60), 0,
        i % 2 === 0 ? 2 : 3, // circles and diamonds alternating
      ));
    }
    // Inner hot core sparks
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 10 + Math.random() * 12;
      this.particles.push(this.createParticle(
        cx, cy, Math.cos(angle) * speed, Math.sin(angle) * speed,
        1.5 + Math.random() * 2.5, 15 + Math.random() * 10,
        255, 220, 100, 2,
      ));
    }
  }

  /** UFO death: anti-gravity implosion then explosion — particles pull in then burst out */
  private emitDeathUFO(worldX: number, worldY: number): void {
    const half = CONFIG.PLAYER_SIZE / 2;
    const cx = worldX + half;
    const cy = worldY + half;

    // Purple energy shards flying outward
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 3 + Math.random() * 10;
      const life = 30 + Math.random() * 30;
      const variant = i % 3;
      const r = variant === 0 ? 170 : variant === 1 ? 200 : 140;
      const g = variant === 0 ? 0 : variant === 1 ? 100 : 0;
      const b = variant === 0 ? 255 : variant === 1 ? 255 : 200;
      this.particles.push(this.createParticle(
        cx + (Math.random() - 0.5) * 16, cy + (Math.random() - 0.5) * 16,
        Math.cos(angle) * speed, Math.sin(angle) * speed + 3,
        3 + Math.random() * 7, life, r, g, b, 3, // diamonds
      ));
    }
    // Bottom beam discharge — particles shoot downward
    for (let i = 0; i < 10; i++) {
      const spread = (Math.random() - 0.5) * 2;
      this.particles.push(this.createParticle(
        cx + spread * 15, cy + half * 0.5,
        spread * 2, -(4 + Math.random() * 8),
        2 + Math.random() * 3, 18 + Math.random() * 12,
        200, 100, 255, 2,
      ));
    }
  }

  /** Wave death: electric discharge — lightning bolts radiating outward */
  private emitDeathWave(worldX: number, worldY: number): void {
    const half = CONFIG.PLAYER_SIZE / 2;
    const cx = worldX + half;
    const cy = worldY + half;

    // Lightning segments radiating out in 8 directions
    for (let dir = 0; dir < 8; dir++) {
      const baseAngle = (dir / 8) * Math.PI * 2;
      for (let seg = 0; seg < 4; seg++) {
        const dist = (seg + 1) * 12;
        const jitter = (Math.random() - 0.5) * 0.6;
        const angle = baseAngle + jitter;
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist;
        const speed = 2 + seg * 2 + Math.random() * 3;
        this.particles.push(this.createParticle(
          px, py,
          Math.cos(baseAngle) * speed, Math.sin(baseAngle) * speed + 2,
          2 + Math.random() * 3, 18 + Math.random() * 15,
          0, 255, 100 + Math.floor(Math.random() * 56), 0, // green squares — sharp
        ));
      }
    }
    // Central flash
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 8 + Math.random() * 12;
      this.particles.push(this.createParticle(
        cx, cy, Math.cos(angle) * speed, Math.sin(angle) * speed,
        1 + Math.random() * 2, 10 + Math.random() * 10,
        200, 255, 200, 2,
      ));
    }
  }

  /** Spider death: web shatter — threads collapse and scatter with red tint */
  private emitDeathSpider(worldX: number, worldY: number): void {
    const half = CONFIG.PLAYER_SIZE / 2;
    const cx = worldX + half;
    const cy = worldY + half;

    // Web strand fragments — long thin particles
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 5 + Math.random() * 10;
      const life = 25 + Math.random() * 25;
      this.particles.push(this.createParticle(
        cx + (Math.random() - 0.5) * 12, cy + (Math.random() - 0.5) * 12,
        Math.cos(angle) * speed, Math.sin(angle) * speed + 4,
        2 + Math.random() * 5, life,
        255, Math.floor(Math.random() * 50), 60 + Math.floor(Math.random() * 40),
        1, // triangles — sharp web fragments
      ));
    }
    // Leg segments — fly in 4 diagonal directions
    for (let leg = 0; leg < 4; leg++) {
      const angle = (leg / 4) * Math.PI + Math.PI * 0.25;
      const speed = 7 + Math.random() * 5;
      this.particles.push(this.createParticle(
        cx + Math.cos(angle) * 10, cy + Math.sin(angle) * 10,
        Math.cos(angle) * speed, Math.sin(angle) * speed + 2,
        6 + Math.random() * 4, 30 + Math.random() * 15,
        255, 0, 100, 0, // leg-coloured squares
      ));
    }
    // Red mist
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push(this.createParticle(
        cx + (Math.random() - 0.5) * 20, cy + (Math.random() - 0.5) * 20,
        Math.cos(angle) * speed, Math.sin(angle) * speed + 1,
        6 + Math.random() * 8, 35 + Math.random() * 20,
        180, 0, 40, 2,
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

  /** Landing dust — small particles at feet on ground contact */
  emitLanding(worldX: number, worldY: number): void {
    const cx = worldX + CONFIG.PLAYER_SIZE / 2;
    for (let i = 0; i < 8; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const speed = 2 + Math.random() * 4;
      this.particles.push(this.createParticle(
        cx + (Math.random() - 0.5) * CONFIG.PLAYER_SIZE * 0.8,
        worldY + 2,
        Math.cos(angle) * speed,
        Math.abs(Math.sin(angle)) * speed * 0.5 + 1,
        1.5 + Math.random() * 2.5,
        12 + Math.random() * 10,
        180, 200, 220,
        2, // circles
      ));
    }
  }

  /** Mode transition burst — ring of mode-colored particles */
  emitModeTransition(worldX: number, worldY: number, r: number, g: number, b: number): void {
    const cx = worldX + CONFIG.PLAYER_SIZE / 2;
    const cy = worldY + CONFIG.PLAYER_SIZE / 2;
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const speed = 4 + Math.random() * 6;
      this.particles.push(this.createParticle(
        cx, cy,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        3 + Math.random() * 5,
        20 + Math.random() * 15,
        r + Math.floor(Math.random() * 40),
        g + Math.floor(Math.random() * 40),
        b + Math.floor(Math.random() * 40),
        i % 4,
      ));
    }
  }

  /** Near-miss effect — glowing streak when player barely clears an obstacle */
  emitNearMiss(worldX: number, worldY: number): void {
    const cx = worldX + CONFIG.PLAYER_SIZE / 2;
    const cy = worldY + CONFIG.PLAYER_SIZE / 2;

    // Bright white/gold streak particles
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const speed = 3 + Math.random() * 5;
      this.particles.push(this.createParticle(
        cx + (Math.random() - 0.5) * CONFIG.PLAYER_SIZE,
        cy + (Math.random() - 0.5) * 8,
        Math.cos(angle) * speed * 0.3 - 2,  // trail backward
        Math.sin(angle) * speed,
        1.5 + Math.random() * 2.5,
        12 + Math.random() * 10,
        255, 230 + Math.floor(Math.random() * 25), 100 + Math.floor(Math.random() * 80),
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
