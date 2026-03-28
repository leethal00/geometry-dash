import { CONFIG } from './Config.js';
import { GameState, GameStateMachine } from './GameState.js';
import { InputHandler } from './Input.js';
import { Camera } from './Camera.js';

export class Game {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly stateMachine: GameStateMachine;
  readonly input: InputHandler;
  readonly camera: Camera;

  private lastTime = 0;
  private accumulator = 0;
  private animationFrameId = 0;
  private _running = false;
  private _tickCount = 0;
  private _fps = 0;
  private fpsAccumulator = 0;
  private fpsFrameCount = 0;

  get running(): boolean {
    return this._running;
  }

  get tickCount(): number {
    return this._tickCount;
  }

  get fps(): number {
    return this._fps;
  }

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.canvas = canvas;
    this.ctx = ctx;
    this.stateMachine = new GameStateMachine();
    this.input = new InputHandler(document);
    this.camera = new Camera(canvas.width, canvas.height);

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

    if (delta > CONFIG.MAX_DELTA) {
      delta = CONFIG.MAX_DELTA;
    }

    // FPS tracking
    this.fpsAccumulator += delta;
    this.fpsFrameCount++;
    if (this.fpsAccumulator >= 1) {
      this._fps = this.fpsFrameCount;
      this.fpsFrameCount = 0;
      this.fpsAccumulator -= 1;
    }

    this.accumulator += delta;

    while (this.accumulator >= CONFIG.FIXED_TIMESTEP) {
      this.fixedUpdate();
      this.accumulator -= CONFIG.FIXED_TIMESTEP;
      this._tickCount++;
    }

    this.render();
  }

  private fixedUpdate(): void {
    const inputState = this.input.poll();
    const state = this.stateMachine.state;

    switch (state) {
      case GameState.Menu:
        if (inputState.actionPressed) {
          this.stateMachine.transition(GameState.Playing);
        }
        break;

      case GameState.Playing:
        if (inputState.pausePressed) {
          this.stateMachine.transition(GameState.Paused);
        }
        this.camera.update();
        break;

      case GameState.Paused:
        if (inputState.pausePressed) {
          this.stateMachine.transition(GameState.Playing);
        }
        break;

      case GameState.Dead:
        if (inputState.actionPressed) {
          this.stateMachine.transition(GameState.Playing);
        }
        break;
    }
  }

  private render(): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const state = this.stateMachine.state;

    switch (state) {
      case GameState.Menu:
        this.renderMenu();
        break;
      case GameState.Playing:
        this.renderPlaying();
        break;
      case GameState.Paused:
        this.renderPlaying();
        this.renderPauseOverlay();
        break;
      case GameState.Dead:
        this.renderPlaying();
        this.renderDeadOverlay();
        break;
    }
  }

  private renderMenu(): void {
    const { ctx, canvas } = this;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#00d4ff';
    ctx.font = `bold ${Math.floor(canvas.height / 8)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Geometry Dash', canvas.width / 2, canvas.height / 3);

    // Prompt
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.floor(canvas.height / 20)}px sans-serif`;
    ctx.fillText('Click or press Space to start', canvas.width / 2, canvas.height * 0.6);
  }

  private renderPlaying(): void {
    const { ctx, canvas } = this;

    // Background gradient
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ground line
    const groundY = canvas.height * 0.75;
    ctx.fillStyle = '#0f3460';
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();

    // Placeholder player cube
    const cubeSize = 40;
    const cubeX = canvas.width * 0.2;
    const cubeY = groundY - cubeSize;
    ctx.fillStyle = '#00d4ff';
    ctx.fillRect(cubeX, cubeY, cubeSize, cubeSize);
  }

  private renderPauseOverlay(): void {
    const { ctx, canvas } = this;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(canvas.height / 10)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    ctx.font = `${Math.floor(canvas.height / 24)}px sans-serif`;
    ctx.fillText('Press Escape to resume', canvas.width / 2, canvas.height * 0.6);
  }

  private renderDeadOverlay(): void {
    const { ctx, canvas } = this;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(canvas.height / 10)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DEAD', canvas.width / 2, canvas.height / 2);
    ctx.font = `${Math.floor(canvas.height / 24)}px sans-serif`;
    ctx.fillText('Click or press Space to retry', canvas.width / 2, canvas.height * 0.6);
  }

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
