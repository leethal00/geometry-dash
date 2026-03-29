/**
 * Dense neon parallax background with beat-reactive pulsing.
 * Layers: dots, shapes, bars, horizontal grid, giant rotating diamond, 45 floaters, speed lines.
 */

interface BGShape {
  x: number;
  y: number;
  size: number;
  opacity: number;
  type: number;
}

export class Background {
  private readonly tileWidth = 2400;
  private readonly layers: BGShape[][] = [];
  private readonly speeds = [0.04, 0.12, 0.28];

  constructor() {
    this.layers.push(this.generateDots(120));
    this.layers.push(this.generateShapes(28));
    this.layers.push(this.generateBars(18));
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
        size: 1 + rand() * 3,
        opacity: 0.2 + rand() * 0.35,
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
        size: 14 + rand() * 35,
        opacity: 0.04 + rand() * 0.1,
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
        x: (i / count) * this.tileWidth + rand() * 60,
        y: 0,
        size: 1 + rand() * 2.5,
        opacity: 0.04 + rand() * 0.06,
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
    const beatPulse = Math.max(0, 1 - beatProgress * 3.5);
    const hue = (200 + levelProgress * 240) % 360;

    // --- Giant slowly rotating diamond (background centerpiece) ---
    this.drawGiantDiamond(ctx, cameraX, w, h, hue, beatPulse);

    // --- Horizontal grid lines in play area ---
    this.drawHorizontalGrid(ctx, h, hue, beatPulse);

    // Layer 0: stars/dots
    this.renderLayer(ctx, 0, cameraX, w, h, (ctx2, shape, sx, sy) => {
      const lum = 70 + beatPulse * 20;
      ctx2.fillStyle = `hsla(${hue + 30}, 50%, ${lum}%, ${shape.opacity + beatPulse * 0.1})`;
      ctx2.beginPath();
      ctx2.arc(sx, sy, shape.size + beatPulse * 0.8, 0, Math.PI * 2);
      ctx2.fill();
    });

    // Layer 1: geometric shapes
    this.renderLayer(ctx, 1, cameraX, w, h, (ctx2, shape, sx, sy) => {
      const alpha = shape.opacity + beatPulse * 0.05;
      ctx2.fillStyle = `hsla(${hue - 20}, 60%, 35%, ${alpha})`;
      const s = shape.size + beatPulse * 3;
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
      ctx2.fillStyle = `hsla(${hue + 10}, 50%, 28%, ${shape.opacity + beatPulse * 0.03})`;
      ctx2.fillRect(sx - shape.size / 2, 0, shape.size, h * 0.78);
    });

    // 45 floating particles
    this.renderFloaters(ctx, cameraX, w, h, hue, beatPulse);

    // Speed lines
    this.renderSpeedLines(ctx, w, h, levelProgress, beatPulse);
  }

  private drawGiantDiamond(
    ctx: CanvasRenderingContext2D,
    camX: number,
    w: number,
    h: number,
    hue: number,
    beatPulse: number,
  ): void {
    const now = Date.now() * 0.001;
    const rotation = now * 0.08 + camX * 0.0001;
    const cx = w * 0.55;
    const cy = h * 0.35;
    const size = Math.min(w, h) * 0.38 + beatPulse * 8;
    const alpha = 0.035 + beatPulse * 0.02;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.fillStyle = `hsla(${hue}, 50%, 40%, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.7, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.7, 0);
    ctx.closePath();
    ctx.fill();

    // Inner diamond outline
    const inner = size * 0.6;
    ctx.strokeStyle = `hsla(${hue + 20}, 60%, 50%, ${alpha * 0.8})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -inner);
    ctx.lineTo(inner * 0.7, 0);
    ctx.lineTo(0, inner);
    ctx.lineTo(-inner * 0.7, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  private drawHorizontalGrid(
    ctx: CanvasRenderingContext2D,
    h: number,
    hue: number,
    beatPulse: number,
  ): void {
    const groundY = h * 0.78;
    const spacing = 80;
    ctx.strokeStyle = `hsla(${hue}, 40%, 30%, ${0.03 + beatPulse * 0.015})`;
    ctx.lineWidth = 1;

    for (let y = spacing; y < groundY; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ctx.canvas.width, y);
      ctx.stroke();
    }
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

    for (let i = 0; i < 45; i++) {
      const seed = i * 7919;
      const baseX = (seed * 13) % 2400;
      const phase = ((seed * 37) % 1000) / 1000;
      const speed = 0.12 + ((seed % 500) / 1200);
      const size = 2 + (seed % 900) / 150;

      let sx = ((baseX - camX * 0.06) % 1000 + 1000) % 1000;
      if (sx > w + 30) continue;

      const sy = ((1 - ((now * speed + phase) % 1)) * h * 0.72);

      const alpha = 0.06 + beatPulse * 0.05 + Math.sin(now * 2 + i) * 0.02;
      ctx.fillStyle = `hsla(${hue + i * 12}, 70%, 60%, ${Math.max(0, alpha)})`;

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
    if (levelProgress < 0.2) return;
    const intensity = Math.min(1, (levelProgress - 0.2) * 1.5);
    const now = Date.now();

    for (let i = 0; i < 8; i++) {
      const seed = i * 2731;
      const baseY = ((seed % 650) / 650) * h * 0.7 + h * 0.04;
      const lineLen = 60 + (seed % 120);
      const speed = 0.7 + (seed % 400) / 400;
      const x = w - ((now * speed + seed * 50) % (w + lineLen * 2));
      const alpha = (0.04 + beatPulse * 0.07) * intensity;

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
