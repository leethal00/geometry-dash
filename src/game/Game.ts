import { CONFIG } from './Config.js';
import { GameState, GameStateMachine } from './GameState.js';
import { InputHandler } from './Input.js';
import { Camera } from './Camera.js';
import { Player } from '../entities/Player.js';
import { Level } from '../level/Level.js';
import { Renderer } from '../rendering/Renderer.js';
import { ParticleSystem } from '../rendering/Particles.js';

const U = CONFIG.UNIT_SIZE;
const S = CONFIG.PLAYER_SIZE;
const INSET = CONFIG.SPIKE_INSET;

export class Game {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly stateMachine: GameStateMachine;
  readonly input: InputHandler;
  readonly camera: Camera;
  readonly player: Player;
  readonly particles: ParticleSystem;
  readonly renderer: Renderer;

  private level: Level;
  private lastTime = 0;
  private accumulator = 0;
  private animationFrameId = 0;
  private _running = false;

  // Game state
  private attempts = 0;
  private progress = 0;
  private deathTimer = 0;
  private completeTimer = 0;
  private menuTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D rendering context');

    this.canvas = canvas;
    this.ctx = ctx;
    this.stateMachine = new GameStateMachine();
    this.input = new InputHandler(document);
    this.camera = new Camera(canvas.width, canvas.height);
    this.player = new Player();
    this.particles = new ParticleSystem();
    this.renderer = new Renderer(canvas, ctx);
    this.level = Level.firstLevel();

    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas.bind(this));
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    this.input.attach();
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop(this.lastTime);
  }

  stop(): void {
    this._running = false;
    this.input.detach();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  private loop(currentTime: number): void {
    if (!this._running) return;
    this.animationFrameId = requestAnimationFrame(this.loop.bind(this));

    let delta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    if (delta > CONFIG.MAX_DELTA) delta = CONFIG.MAX_DELTA;

    this.accumulator += delta;
    while (this.accumulator >= CONFIG.FIXED_TIMESTEP) {
      this.fixedUpdate();
      this.accumulator -= CONFIG.FIXED_TIMESTEP;
    }

    this.render();
  }

  // ================================================================
  // Fixed update (60fps tick)
  // ================================================================

  private fixedUpdate(): void {
    const input = this.input.poll();
    const state = this.stateMachine.state;

    switch (state) {
      case GameState.Menu:
        this.menuTime++;
        if (input.actionPressed) {
          this.startLevel();
        }
        break;

      case GameState.Playing:
        this.updatePlaying(input.actionPressed);
        break;

      case GameState.Dead:
        this.updateDead();
        break;

      case GameState.Complete:
        this.updateComplete(input.actionPressed);
        break;

      case GameState.Paused:
        if (input.pausePressed) {
          this.stateMachine.transition(GameState.Playing);
        }
        break;
    }
  }

  private startLevel(): void {
    this.player.reset();
    this.camera.reset();
    this.particles.clear();
    this.progress = 0;
    this.attempts++;
    this.stateMachine.transition(GameState.Playing);
  }

  // ================================================================
  // Playing state update — physics, collision, progress
  // ================================================================

  private updatePlaying(actionPressed: boolean): void {
    const player = this.player;
    const level = this.level;

    // --- Input ---
    if (actionPressed) {
      player.jump();
    }

    // --- Physics ---
    const wasOnGround = player.onGround;
    if (!wasOnGround) {
      player.vy -= CONFIG.GRAVITY;
    }

    const prevY = player.y;
    player.x += CONFIG.SCROLL_SPEED;
    player.y += player.vy;

    // --- Ground collision ---
    player.onGround = false;
    const centerX = player.x + S / 2;

    if (level.isOverGround(centerX) && player.y <= 0 && prevY >= -2) {
      player.y = 0;
      player.vy = 0;
      player.onGround = true;
    }

    // --- Block collision ---
    let bestLanding = -Infinity;
    let hitSide = false;

    for (const block of level.blocks) {
      if (block.x > player.x + S + 80) break;
      if (block.x + U < player.x - 20) continue;

      // AABB overlap test
      if (
        player.x < block.x + U &&
        player.x + S > block.x &&
        player.y < block.y + U &&
        player.y + S > block.y
      ) {
        const blockTop = block.y + U;
        if (prevY >= blockTop - CONFIG.LANDING_TOLERANCE && player.vy <= 0) {
          bestLanding = Math.max(bestLanding, blockTop);
        } else {
          hitSide = true;
        }
      }
    }

    if (bestLanding > -Infinity) {
      player.y = bestLanding;
      player.vy = 0;
      player.onGround = true;
    } else if (hitSide) {
      this.die();
      return;
    }

    // --- Spike collision ---
    for (const spike of level.spikes) {
      if (spike.x > player.x + S + 80) break;
      if (spike.x + U < player.x - 20) continue;

      // Inset hitbox for fairness
      const hx = spike.x + INSET;
      const hy = spike.y + INSET;
      const hw = U - INSET * 2;
      const hh = U - INSET * 2;

      if (
        player.x < hx + hw &&
        player.x + S > hx &&
        player.y < hy + hh &&
        player.y + S > hy
      ) {
        this.die();
        return;
      }
    }

    // --- Fall death ---
    if (player.y < CONFIG.FALL_DEATH_Y) {
      this.die();
      return;
    }

    // --- Camera ---
    this.camera.follow(player.x);
    this.camera.update();

    // --- Player visual rotation ---
    player.updateRotation();

    // --- Progress ---
    this.progress = player.x / level.lengthPx;
    if (this.progress >= 1) {
      this.complete();
    }
  }

  // ================================================================
  // Death
  // ================================================================

  private die(): void {
    this.player.alive = false;
    this.deathTimer = CONFIG.DEATH_PAUSE_TICKS;
    this.camera.shake(14);
    this.particles.emitDeath(this.player.x, this.player.y);
    this.stateMachine.transition(GameState.Dead);
  }

  private updateDead(): void {
    this.particles.update();
    this.camera.update();
    this.deathTimer--;
    if (this.deathTimer <= 0) {
      this.startLevel();
    }
  }

  // ================================================================
  // Level complete
  // ================================================================

  private complete(): void {
    this.completeTimer = 0;
    this.particles.emitCelebration(this.player.x, this.player.y);
    this.stateMachine.transition(GameState.Complete);
  }

  private updateComplete(actionPressed: boolean): void {
    this.completeTimer++;
    this.particles.update();
    if (actionPressed && this.completeTimer > 120) {
      this.attempts = 0;
      this.stateMachine.transition(GameState.Menu);
    }
  }

  // ================================================================
  // Render
  // ================================================================

  private render(): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const state = this.stateMachine.state;

    switch (state) {
      case GameState.Menu:
        this.renderer.renderMenu(this.menuTime);
        break;

      case GameState.Playing:
      case GameState.Paused:
        this.renderer.renderGameplay(
          this.camera, this.player, this.level,
          this.particles, this.progress, this.attempts,
        );
        if (state === GameState.Paused) this.renderPauseOverlay();
        break;

      case GameState.Dead:
        this.renderer.renderGameplay(
          this.camera, this.player, this.level,
          this.particles, this.progress, this.attempts,
        );
        this.renderer.renderDeathOverlay(this.deathTimer);
        break;

      case GameState.Complete:
        this.renderer.renderGameplay(
          this.camera, this.player, this.level,
          this.particles, this.progress, this.attempts,
        );
        this.renderer.renderCompleteOverlay(this.completeTimer);
        break;
    }
  }

  private renderPauseOverlay(): void {
    const { ctx, canvas } = this;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(canvas.height / 10)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    ctx.font = `${Math.floor(canvas.height / 24)}px Arial, sans-serif`;
    ctx.fillText('Press Escape to resume', canvas.width / 2, canvas.height * 0.6);
  }

  // ================================================================
  // Canvas resize
  // ================================================================

  resizeCanvas(): void {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const windowAspect = windowWidth / windowHeight;

    let width: number;
    let height: number;

    if (windowAspect > CONFIG.ASPECT_RATIO) {
      height = windowHeight;
      width = height * CONFIG.ASPECT_RATIO;
    } else {
      width = windowWidth;
      height = width / CONFIG.ASPECT_RATIO;
    }

    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.camera.resize(width, height);
  }
}
