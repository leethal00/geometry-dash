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
}

export class ParticleSystem {
  readonly particles: Particle[] = [];

  /** Death shatter — large rotating pieces flying in all directions */
  emitDeath(worldX: number, worldY: number): void {
    const count = CONFIG.DEATH_PARTICLE_COUNT;
    const half = CONFIG.PLAYER_SIZE / 2;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 5 + Math.random() * 12;
      const life = CONFIG.PARTICLE_LIFETIME * (0.5 + Math.random() * 0.5);
      this.particles.push({
        x: worldX + half + (Math.random() - 0.5) * 14,
        y: worldY + half + (Math.random() - 0.5) * 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 5,
        size: CONFIG.DEATH_PARTICLE_SIZE_MIN +
          Math.random() * (CONFIG.DEATH_PARTICLE_SIZE_MAX - CONFIG.DEATH_PARTICLE_SIZE_MIN),
        life,
        maxLife: life,
        r: 0,
        g: 200 + Math.floor(Math.random() * 55),
        b: 0,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.4,
      });
    }
  }

  /** Celebration burst */
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
        size: 4 + Math.random() * 8,
        life,
        maxLife: life,
        r: 200 + Math.floor(Math.random() * 55),
        g: 150 + Math.floor(Math.random() * 105),
        b: Math.floor(Math.random() * 80),
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
      });
    }
  }

  update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.25;
      p.vx *= 0.97;
      p.size *= 0.984;
      p.rot += p.rotSpeed;
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
