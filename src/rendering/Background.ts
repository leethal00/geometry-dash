/**
 * 3-layer parallax scrolling background with geometric shapes.
 * Each layer scrolls at a different fraction of the camera speed.
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
        y: rand() * 0.75, // upper 75% of screen (above ground)
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
        type: 1 + Math.floor(rand() * 2), // diamond or triangle
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
        type: 0, // rendered as vertical bars
      });
    }
    return shapes;
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number, w: number, h: number): void {
    // Layer 0: distant stars/dots
    this.renderLayer(ctx, 0, cameraX, w, h, (ctx2, shape, sx, sy) => {
      ctx2.fillStyle = `rgba(180, 180, 255, ${shape.opacity})`;
      ctx2.beginPath();
      ctx2.arc(sx, sy, shape.size, 0, Math.PI * 2);
      ctx2.fill();
    });

    // Layer 1: geometric shapes
    this.renderLayer(ctx, 1, cameraX, w, h, (ctx2, shape, sx, sy) => {
      ctx2.fillStyle = `rgba(100, 60, 180, ${shape.opacity})`;
      const s = shape.size;
      if (shape.type === 1) {
        // Diamond
        ctx2.beginPath();
        ctx2.moveTo(sx, sy - s);
        ctx2.lineTo(sx + s * 0.6, sy);
        ctx2.lineTo(sx, sy + s);
        ctx2.lineTo(sx - s * 0.6, sy);
        ctx2.closePath();
        ctx2.fill();
      } else {
        // Triangle
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
      ctx2.fillStyle = `rgba(60, 40, 120, ${shape.opacity})`;
      ctx2.fillRect(sx - shape.size / 2, 0, shape.size, h * 0.78);
    });
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
      // Wrap x position within tile
      let sx = ((shape.x - offset) % tw + tw) % tw;
      const sy = shape.y * h;

      // Draw shape and its wrap-around copy
      if (sx < w + 60) drawFn(ctx, shape, sx, sy);
      sx -= tw;
      if (sx > -60 && sx < w + 60) drawFn(ctx, shape, sx, sy);
    }
  }
}
