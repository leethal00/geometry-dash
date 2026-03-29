/**
 * Parallax background with beat-reactive pulsing and hue shifting.
 * 3 parallax layers + floating geometric particles.
 */

interface BGShape {
  x: number;     // position within tile (0..tileWidth)
  y: number;     // vertical position (0..1 fraction of canvas height)
  size: number;
  opacity: number;
  type: number;  // 0=dot, 1=diamond, 2=triangle
}

export class Background {
  private readonly tileWidth = 2400;
  private readonly layers: BGShape[][] = [];
  private readonly speeds = [0.04, 0.12, 0.28];

  constructor() {
    this.layers.push(this.generateDots(90));
    this.layers.push(this.generateShapes(20));
    this.layers.push(this.generateBars(14));
  }

  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  private generateDots(count: number): BGShape[] {
    const rand = this.seededRandom(42);
    const shapes: BGShape[] = [];
    for (let i = 0; i < count; i++) {
      shapes.push({
        x: rand() * this.tileWidth,
        y: rand() * 0.75,
        size: 1.5 + rand() * 2.5,
        opacity: 0.15 + rand() * 0.25,
        type: 0,
      });
    }
    return shapes;
  }

  private generateShapes(count: number): BGShape[] {
    const rand = this.seededRandom(137);
    const shapes: BGShape[] = [];
    for (let i = 0; i < count; i++) {
      shapes.push({
        x: rand() * this.tileWidth,
        y: rand() * 0.7,
        size: 12 + rand() * 28,
        opacity: 0.04 + rand() * 0.08,
        type: 1 + Math.floor(rand() * 2),
      });
    }
    return shapes;
  }

  private generateBars(count: number): BGShape[] {
    const rand = this.seededRandom(256);
    const shapes: BGShape[] = [];
    for (let i = 0; i < count; i++) {
      shapes.push({
        x: (i / count) * this.tileWidth + rand() * 80,
        y: 0,
        size: 1 + rand() * 2,
        opacity: 0.03 + rand() * 0.05,
        type: 0,
      });
    }
    return shapes;
  }

  render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    w: number,
    h: number,
    beatProgress: number = 0,
    levelProgress: number = 0,
  ): void {
    // Beat pulse: sharp peak at 0, decays quickly
    const beatPulse = Math.max(0, 1 - beatProgress * 3.5);

    // Hue shifts through the level: purple → blue → magenta
    const hue = 270 + levelProgress * 80;

    // Layer 0: distant stars/dots — tinted with current hue
    this.renderLayer(ctx, 0, cameraX, w, h, (ctx2, shape, sx, sy) => {
      const lum = 70 + beatPulse * 15;
      ctx2.fillStyle = `hsla(${hue + 30}, 40%, ${lum}%, ${shape.opacity + beatPulse * 0.08})`;
      ctx2.beginPath();
      ctx2.arc(sx, sy, shape.size + beatPulse * 0.5, 0, Math.PI * 2);
      ctx2.fill();
    });

    // Layer 1: geometric shapes — deeper hue tint
    this.renderLayer(ctx, 1, cameraX, w, h, (ctx2, shape, sx, sy) => {
      const alpha = shape.opacity + beatPulse * 0.04;
      ctx2.fillStyle = `hsla(${hue - 20}, 55%, 30%, ${alpha})`;
      const s = shape.size + beatPulse * 2;
      if (shape.type === 1) {
        ctx2.beginPath();
        ctx2.moveTo(sx, sy - s);
        ctx2.lineTo(sx + s * 0.6, sy);
        ctx2.lineTo(sx, sy + s);
        ctx2.lineTo(sx - s * 0.6, sy);
        ctx2.closePath();
        ctx2.fill();
      } else {
        ctx2.beginPath();
        ctx2.moveTo(sx, sy - s);
        ctx2.lineTo(sx + s * 0.8, sy + s * 0.6);
        ctx2.lineTo(sx - s * 0.8, sy + s * 0.6);
        ctx2.closePath();
        ctx2.fill();
      }
    });

    // Layer 2: vertical bars
    this.renderLayer(ctx, 2, cameraX, w, h, (ctx2, shape, sx, _sy) => {
      ctx2.fillStyle = `hsla(${hue + 10}, 45%, 25%, ${shape.opacity + beatPulse * 0.02})`;
      ctx2.fillRect(sx - shape.size / 2, 0, shape.size, h * 0.78);
    });

    // Floating particles — small drifting geometric shapes
    this.renderFloaters(ctx, cameraX, w, h, hue, beatPulse);

    // Speed lines — horizontal streaks in later sections
    this.renderSpeedLines(ctx, w, h, levelProgress, beatPulse);
  }

  private renderFloaters(
    ctx: CanvasRenderingContext2D,
    camX: number,
    w: number,
    h: number,
    hue: number,
    beatPulse: number,
  ): void {
    const now = Date.now() * 0.001;

    for (let i = 0; i < 20; i++) {
      const seed = i * 7919;
      const baseX = (seed * 13) % 2400;
      const phase = ((seed * 37) % 1000) / 1000;
      const speed = 0.15 + ((seed % 500) / 1000);
      const size = 3 + (seed % 600) / 200;

      // Wrap horizontally relative to camera
      let sx = ((baseX - camX * 0.06) % 900 + 900) % 900;
      if (sx > w + 20) continue;

      // Float upward over time
      const sy = ((1 - ((now * speed + phase) % 1)) * h * 0.72);

      const alpha = 0.05 + beatPulse * 0.04 + Math.sin(now * 2 + i) * 0.015;
      ctx.fillStyle = `hsla(${hue + i * 18}, 65%, 55%, ${Math.max(0, alpha)})`;

      // Small diamond
      ctx.beginPath();
      ctx.moveTo(sx, sy - size);
      ctx.lineTo(sx + size * 0.5, sy);
      ctx.lineTo(sx, sy + size);
      ctx.lineTo(sx - size * 0.5, sy);
      ctx.closePath();
      ctx.fill();
    }
  }

  private renderSpeedLines(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    levelProgress: number,
    beatPulse: number,
  ): void {
    if (levelProgress < 0.25) return; // Only in later sections
    const intensity = Math.min(1, (levelProgress - 0.25) * 1.5);
    const now = Date.now();

    for (let i = 0; i < 6; i++) {
      const seed = i * 2731;
      const baseY = ((seed % 650) / 650) * h * 0.7 + h * 0.04;
      const lineLen = 50 + (seed % 100);
      const speed = 0.6 + (seed % 400) / 500;
      const x = w - ((now * speed + seed * 50) % (w + lineLen * 2));
      const alpha = (0.03 + beatPulse * 0.05) * intensity;

      if (alpha < 0.005) continue;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(x, baseY, lineLen, 1.5);
    }
  }

  private renderLayer(
    ctx: CanvasRenderingContext2D,
    layerIdx: number,
    cameraX: number,
    w: number,
    h: number,
    drawFn: (ctx: CanvasRenderingContext2D, shape: BGShape, screenX: number, screenY: number) => void,
  ): void {
    const layer = this.layers[layerIdx]!;
    const speed = this.speeds[layerIdx]!;
    const offset = cameraX * speed;
    const tw = this.tileWidth;

    for (const shape of layer) {
      let sx = ((shape.x - offset) % tw + tw) % tw;
      const sy = shape.y * h;

      if (sx < w + 60) drawFn(ctx, shape, sx, sy);
      sx -= tw;
      if (sx > -60 && sx < w + 60) drawFn(ctx, shape, sx, sy);
    }
  }
}
