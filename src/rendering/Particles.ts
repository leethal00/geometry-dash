import { CONFIG } from '../game/Config.js';

export interface Particle {
  /** World position in pixels (y positive = up from ground) */
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
}

export class ParticleSystem {
  readonly particles: Particle[] = [];

  /** Emit a burst of particles at a world position (death effect) */
  emitDeath(worldX: number, worldY: number): void {
    const count = CONFIG.DEATH_PARTICLE_COUNT;
    const half = CONFIG.PLAYER_SIZE / 2;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 4 + Math.random() * 10;
      const life = CONFIG.PARTICLE_LIFETIME * (0.5 + Math.random() * 0.5);
      this.particles.push({
        x: worldX + half + (Math.random() - 0.5) * 16,
        y: worldY + half + (Math.random() - 0.5) * 16,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 5,
        size: 3 + Math.random() * 8,
        life,
        maxLife: life,
        // Green-cyan player color with variation
        r: 30 + Math.floor(Math.random() * 50),
        g: 180 + Math.floor(Math.random() * 75),
        b: 40 + Math.floor(Math.random() * 100),
      });
    }
  }

  /** Emit celebration particles (level complete) — big burst */
  emitCelebration(worldX: number, worldY: number): void {
    for (let i = 0; i < 55; i++) {
      const angle = (i / 55) * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      const life = 80 + Math.random() * 50;
      this.particles.push({
        x: worldX + Math.random() * 40,
        y: worldY + Math.random() * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 6,
        size: 3 + Math.random() * 7,
        life,
        maxLife: life,
        // Gold/yellow/white celebration rainbow
        r: 200 + Math.floor(Math.random() * 55),
        g: 150 + Math.floor(Math.random() * 105),
        b: Math.floor(Math.random() * 80),
      });
    }
  }

  update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.25; // gravity
      p.vx *= 0.97; // drag
      p.size *= 0.984;
      p.life--;
      if (p.life <= 0 || p.size < 0.5) {
        this.particles.splice(i, 1);
      }
    }
  }

  clear(): void {
    this.particles.length = 0;
  }
}
