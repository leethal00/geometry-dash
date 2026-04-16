/**
 * Phase 2 background system: dynamic themes, volumetric parallax layers,
 * animated elements (stars, clouds, mandalas, light beams), beat-reactive.
 * All Canvas 2D, no libraries, 60fps-safe.
 */

// --- Theme definitions ---

interface BGTheme {
  name: string;
  /** Sky gradient stops [top, mid, bottom] as HSL */
  skyTop: [number, number, number];
  skyMid: [number, number, number];
  skyBot: [number, number, number];
  /** Silhouette colour */
  silhouetteHue: number;
  silhouetteLightness: number;
  /** Fog colour */
  fogHue: number;
  fogAlpha: number;
  /** Star tint hue */
  starHue: number;
  /** Accent hue for mandalas/beams */
  accentHue: number;
}

const THEMES: BGTheme[] = [
  {
    // Neon City — cyan/magenta, bright silhouettes
    name: 'neon_city',
    skyTop: [260, 80, 3],
    skyMid: [280, 70, 5],
    skyBot: [300, 65, 8],
    silhouetteHue: 240,
    silhouetteLightness: 8,
    fogHue: 270,
    fogAlpha: 0.06,
    starHue: 200,
    accentHue: 300,
  },
  {
    // Deep Space — dark blue/purple, dim stars
    name: 'deep_space',
    skyTop: [230, 60, 2],
    skyMid: [240, 50, 3],
    skyBot: [250, 55, 5],
    silhouetteHue: 220,
    silhouetteLightness: 5,
    fogHue: 230,
    fogAlpha: 0.04,
    starHue: 220,
    accentHue: 180,
  },
  {
    // Crystal Cave — teal/emerald glow
    name: 'crystal_cave',
    skyTop: [170, 50, 3],
    skyMid: [160, 60, 5],
    skyBot: [150, 55, 7],
    silhouetteHue: 160,
    silhouetteLightness: 6,
    fogHue: 160,
    fogAlpha: 0.08,
    starHue: 150,
    accentHue: 120,
  },
  {
    // Sunset Horizon — orange/red warm
    name: 'sunset_horizon',
    skyTop: [20, 70, 4],
    skyMid: [10, 80, 6],
    skyBot: [0, 75, 9],
    silhouetteHue: 15,
    silhouetteLightness: 6,
    fogHue: 20,
    fogAlpha: 0.07,
    starHue: 30,
    accentHue: 40,
  },
];

// --- Background shape types ---

interface BGShape {
  x: number;
  y: number;
  size: number;
  opacity: number;
  type: number;
}

/** Silhouette for volumetric layer */
interface Silhouette {
  x: number;
  widthFrac: number;  // fraction of screen width
  heightFrac: number; // fraction of screen height
  shape: 'mountain' | 'building' | 'crystal' | 'arch';
}

export class Background {
  private readonly tileWidth = 2400;
  private readonly layers: BGShape[][] = [];
  private readonly speeds = [0.04, 0.12, 0.28];
  private readonly silhouettes: Silhouette[][] = []; // [far, mid, near]

  constructor() {
    this.layers.push(this.generateDots(120));
    this.layers.push(this.generateShapes(28));
    this.layers.push(this.generateBars(18));
    this.generateSilhouettes();
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

  private generateSilhouettes(): void {
    // 3 parallax layers of silhouettes: far, mid, near
    const layerConfigs = [
      { count: 8, seed: 3001, maxH: 0.35, maxW: 0.25 },  // far
      { count: 6, seed: 3002, maxH: 0.45, maxW: 0.2 },   // mid
      { count: 5, seed: 3003, maxH: 0.55, maxW: 0.18 },  // near
    ];
    const shapeTypes: Silhouette['shape'][] = ['mountain', 'building', 'crystal', 'arch'];

    for (const cfg of layerConfigs) {
      const rand = this.seededRandom(cfg.seed);
      const sils: Silhouette[] = [];
      for (let i = 0; i < cfg.count; i++) {
        sils.push({
          x: rand() * this.tileWidth,
          widthFrac: 0.08 + rand() * cfg.maxW,
          heightFrac: 0.1 + rand() * cfg.maxH,
          shape: shapeTypes[Math.floor(rand() * shapeTypes.length)]!,
        });
      }
      this.silhouettes.push(sils);
    }
  }

  /** Get the current theme (blended) based on level progress */
  private getTheme(levelProgress: number): BGTheme {
    const idx = levelProgress * (THEMES.length - 1);
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, THEMES.length - 1);
    const t = idx - i0;
    const a = THEMES[i0]!;
    const b = THEMES[i1]!;

    const lerp = (v0: number, v1: number) => v0 + (v1 - v0) * t;
    const lerpHSL = (a: [number, number, number], b: [number, number, number]): [number, number, number] =>
      [lerp(a[0], b[0]), lerp(a[1], b[1]), lerp(a[2], b[2])];

    return {
      name: t < 0.5 ? a.name : b.name,
      skyTop: lerpHSL(a.skyTop, b.skyTop),
      skyMid: lerpHSL(a.skyMid, b.skyMid),
      skyBot: lerpHSL(a.skyBot, b.skyBot),
      silhouetteHue: lerp(a.silhouetteHue, b.silhouetteHue),
      silhouetteLightness: lerp(a.silhouetteLightness, b.silhouetteLightness),
      fogHue: lerp(a.fogHue, b.fogHue),
      fogAlpha: lerp(a.fogAlpha, b.fogAlpha),
      starHue: lerp(a.starHue, b.starHue),
      accentHue: lerp(a.accentHue, b.accentHue),
    };
  }

  render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    w: number,
    h: number,
    beatProgress: number = 0,
    levelProgress: number = 0,
    scrollSpeed: number = 0,
  ): void {
    const beatPulse = Math.max(0, 1 - beatProgress * 3.5);
    const theme = this.getTheme(levelProgress);
    const hue = (theme.skyTop[0] + levelProgress * 60) % 360;

    // --- Volumetric silhouette layers (far to near) ---
    this.drawSilhouetteLayer(ctx, 0, cameraX, w, h, theme, beatPulse, 0.02);
    this.drawFogLayer(ctx, w, h, theme, beatPulse, 0.3, 0.5);

    // --- Animated pulsing stars ---
    this.drawPulsingStars(ctx, cameraX, w, h, theme, beatPulse);

    // --- Giant slowly rotating diamond (background centerpiece) ---
    this.drawGiantDiamond(ctx, cameraX, w, h, hue, beatPulse);

    this.drawSilhouetteLayer(ctx, 1, cameraX, w, h, theme, beatPulse, 0.06);

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

    // Near silhouette layer (in front of particles)
    this.drawSilhouetteLayer(ctx, 2, cameraX, w, h, theme, beatPulse, 0.12);

    // --- Fog/mist near layer ---
    this.drawFogLayer(ctx, w, h, theme, beatPulse, 0.6, 0.8);

    // --- Drifting clouds ---
    this.drawDriftingClouds(ctx, cameraX, w, h, theme, beatPulse);

    // --- Rotating geometric mandala ---
    this.drawMandala(ctx, w, h, theme, beatPulse);

    // --- Light beams ---
    this.drawLightBeams(ctx, w, h, theme, beatPulse, levelProgress);

    // Rhythm-synced pulsing rings
    this.drawBeatRings(ctx, w, h, hue, beatPulse, beatProgress);

    // 45 floating particles
    this.renderFloaters(ctx, cameraX, w, h, hue, beatPulse);

    // Speed lines (enhanced: intensity scales with scroll speed)
    this.renderSpeedLines(ctx, w, h, levelProgress, beatPulse, scrollSpeed);
  }

  // --- Silhouette layers (volumetric depth) ---

  private drawSilhouetteLayer(
    ctx: CanvasRenderingContext2D,
    layerIdx: number,
    cameraX: number,
    w: number,
    h: number,
    theme: BGTheme,
    beatPulse: number,
    parallaxSpeed: number,
  ): void {
    const sils = this.silhouettes[layerIdx];
    if (!sils) return;

    const depth = layerIdx / 3; // 0=far, 0.33=mid, 0.67=near
    const alpha = 0.06 + depth * 0.08 + beatPulse * 0.02;
    const offset = cameraX * parallaxSpeed;
    const groundY = h * 0.78;

    ctx.fillStyle = `hsla(${theme.silhouetteHue}, 30%, ${theme.silhouetteLightness}%, ${alpha})`;

    for (const sil of sils) {
      let sx = ((sil.x - offset) % this.tileWidth + this.tileWidth) % this.tileWidth;
      // Draw at both tile positions for seamless wrapping
      for (let t = 0; t < 2; t++) {
        const x = sx - this.tileWidth * t;
        if (x > w + 200 || x + sil.widthFrac * w < -200) continue;

        const sw = sil.widthFrac * w;
        const sh = sil.heightFrac * h;
        const baseY = groundY;

        ctx.beginPath();
        switch (sil.shape) {
          case 'mountain':
            ctx.moveTo(x - sw * 0.1, baseY);
            ctx.lineTo(x + sw * 0.3, baseY - sh);
            ctx.lineTo(x + sw * 0.5, baseY - sh * 0.7);
            ctx.lineTo(x + sw * 0.7, baseY - sh * 0.9);
            ctx.lineTo(x + sw * 1.1, baseY);
            break;
          case 'building':
            ctx.moveTo(x, baseY);
            ctx.lineTo(x, baseY - sh * 0.8);
            ctx.lineTo(x + sw * 0.15, baseY - sh);
            ctx.lineTo(x + sw * 0.3, baseY - sh);
            ctx.lineTo(x + sw * 0.45, baseY - sh * 0.85);
            ctx.lineTo(x + sw * 0.45, baseY - sh * 0.6);
            ctx.lineTo(x + sw * 0.6, baseY - sh * 0.6);
            ctx.lineTo(x + sw * 0.6, baseY - sh * 0.75);
            ctx.lineTo(x + sw * 0.8, baseY - sh * 0.75);
            ctx.lineTo(x + sw * 0.8, baseY);
            break;
          case 'crystal':
            ctx.moveTo(x, baseY);
            ctx.lineTo(x + sw * 0.2, baseY - sh * 0.5);
            ctx.lineTo(x + sw * 0.35, baseY - sh);
            ctx.lineTo(x + sw * 0.5, baseY - sh * 0.6);
            ctx.lineTo(x + sw * 0.65, baseY - sh * 0.85);
            ctx.lineTo(x + sw * 0.8, baseY - sh * 0.4);
            ctx.lineTo(x + sw, baseY);
            break;
          case 'arch':
            ctx.moveTo(x, baseY);
            ctx.lineTo(x, baseY - sh * 0.7);
            ctx.quadraticCurveTo(x + sw * 0.5, baseY - sh * 1.2, x + sw, baseY - sh * 0.7);
            ctx.lineTo(x + sw, baseY);
            break;
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // --- Fog / mist layer ---

  private drawFogLayer(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    theme: BGTheme,
    beatPulse: number,
    yStart: number,
    yEnd: number,
  ): void {
    const now = Date.now() * 0.0003;
    const alpha = theme.fogAlpha + beatPulse * 0.015;
    const grad = ctx.createLinearGradient(0, h * yStart, 0, h * yEnd);
    grad.addColorStop(0, `hsla(${theme.fogHue}, 30%, 20%, 0)`);
    grad.addColorStop(0.3 + Math.sin(now) * 0.1, `hsla(${theme.fogHue}, 30%, 20%, ${alpha})`);
    grad.addColorStop(0.7 + Math.sin(now * 1.3) * 0.1, `hsla(${theme.fogHue}, 25%, 15%, ${alpha * 0.7})`);
    grad.addColorStop(1, `hsla(${theme.fogHue}, 30%, 20%, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, h * yStart, w, h * (yEnd - yStart));
  }

  // --- Pulsing stars ---

  private drawPulsingStars(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    w: number,
    h: number,
    theme: BGTheme,
    beatPulse: number,
  ): void {
    const now = Date.now() * 0.001;
    const starCount = 40;

    for (let i = 0; i < starCount; i++) {
      const seed = i * 5441;
      const baseX = (seed * 17) % 3000;
      const baseY = ((seed * 31) % 1000) / 1000 * h * 0.6;
      const baseSize = 1 + (seed % 300) / 150;

      let sx = ((baseX - cameraX * 0.015) % 1200 + 1200) % 1200;
      if (sx > w + 10) continue;

      // Pulsing: each star has its own phase
      const phase = (seed % 628) / 100;
      const pulse = Math.sin(now * 2 + phase) * 0.5 + 0.5;
      const size = baseSize * (0.6 + pulse * 0.6 + beatPulse * 0.4);
      const alpha = 0.15 + pulse * 0.35 + beatPulse * 0.15;

      // 4-point star shape
      ctx.fillStyle = `hsla(${theme.starHue + i * 3}, 60%, 75%, ${alpha})`;
      ctx.beginPath();
      const r = size;
      const ri = r * 0.3;
      for (let p = 0; p < 8; p++) {
        const angle = (p / 8) * Math.PI * 2 - Math.PI / 2;
        const rad = p % 2 === 0 ? r : ri;
        const px = sx + Math.cos(angle) * rad;
        const py = baseY + Math.sin(angle) * rad;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- Drifting clouds ---

  private drawDriftingClouds(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    w: number,
    h: number,
    theme: BGTheme,
    beatPulse: number,
  ): void {
    const now = Date.now() * 0.001;
    const cloudCount = 6;

    for (let i = 0; i < cloudCount; i++) {
      const seed = i * 8731;
      const speed = 0.008 + (seed % 100) / 5000;
      const baseY = h * (0.1 + ((seed % 400) / 400) * 0.4);
      const cloudW = w * (0.12 + (seed % 200) / 800);
      const cloudH = h * (0.03 + (seed % 100) / 2000);

      let cx = ((seed * 13 + now * speed * 1000 - cameraX * 0.03) % (w + cloudW * 2)) ;
      if (cx < -cloudW) cx += w + cloudW * 2;

      const alpha = 0.025 + beatPulse * 0.01;
      ctx.fillStyle = `hsla(${theme.fogHue}, 20%, 30%, ${alpha})`;

      // Multi-ellipse cloud
      ctx.beginPath();
      ctx.ellipse(cx, baseY, cloudW * 0.5, cloudH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - cloudW * 0.25, baseY + cloudH * 0.3, cloudW * 0.35, cloudH * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + cloudW * 0.3, baseY - cloudH * 0.2, cloudW * 0.3, cloudH * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Rotating geometric mandala ---

  private drawMandala(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    theme: BGTheme,
    beatPulse: number,
  ): void {
    const now = Date.now() * 0.001;
    const cx = w * 0.8;
    const cy = h * 0.25;
    const baseRadius = Math.min(w, h) * 0.12;
    const radius = baseRadius + beatPulse * 12;
    const rotation = now * 0.15 + beatPulse * 0.3;
    const alpha = 0.03 + beatPulse * 0.035;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    // Draw concentric rings of petals
    for (let ring = 0; ring < 3; ring++) {
      const r = radius * (0.4 + ring * 0.3);
      const petalCount = 6 + ring * 2;
      ctx.strokeStyle = `hsla(${theme.accentHue + ring * 30}, 50%, 50%, ${alpha * (1 - ring * 0.2)})`;
      ctx.lineWidth = 1 + beatPulse;

      for (let p = 0; p < petalCount; p++) {
        const angle = (p / petalCount) * Math.PI * 2;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        const nextAngle = ((p + 1) / petalCount) * Math.PI * 2;
        const nx = Math.cos(nextAngle) * r;
        const ny = Math.sin(nextAngle) * r;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(px, py);
        ctx.lineTo(nx, ny);
        ctx.closePath();
        ctx.stroke();
      }
    }

    // Center dot
    ctx.fillStyle = `hsla(${theme.accentHue}, 60%, 55%, ${alpha * 1.5})`;
    ctx.beginPath();
    ctx.arc(0, 0, 3 + beatPulse * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // --- Sweeping light beams ---

  private drawLightBeams(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    theme: BGTheme,
    beatPulse: number,
    levelProgress: number,
  ): void {
    const now = Date.now() * 0.001;
    const beamCount = 3;
    // Beams become more prominent as level progresses
    const intensity = Math.min(1, levelProgress * 1.5) * 0.5;
    if (intensity < 0.01) return;

    ctx.save();
    for (let i = 0; i < beamCount; i++) {
      const seed = i * 2399;
      const speed = 0.15 + (seed % 100) / 300;
      const angle = Math.sin(now * speed + seed) * 0.4 - 0.2;
      const originX = w * (0.2 + (seed % 600) / 1000);
      const beamW = w * (0.05 + (seed % 50) / 500);
      const alpha = (0.015 + beatPulse * 0.015) * intensity;

      ctx.fillStyle = `hsla(${theme.accentHue + i * 40}, 40%, 60%, ${alpha})`;

      ctx.save();
      ctx.translate(originX, 0);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(-beamW / 2, 0);
      ctx.lineTo(beamW * 1.5, h);
      ctx.lineTo(-beamW * 2, h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // --- Rhythm-synced pulsing rings ---

  private drawBeatRings(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    hue: number,
    beatPulse: number,
    beatProgress: number,
  ): void {
    if (beatProgress === 0) return;

    // Expanding ring on each beat
    const ringExpand = beatProgress; // 0 at beat start, 1 at next beat
    const ringAlpha = Math.max(0, (1 - ringExpand) * (0.06 + beatPulse * 0.03));
    if (ringAlpha < 0.003) return;

    const cx = w * 0.35;
    const cy = h * 0.5;
    const maxRadius = Math.min(w, h) * (0.5 + beatPulse * 0.05);
    const radius = maxRadius * (0.1 + ringExpand * 0.9);

    ctx.strokeStyle = `hsla(${hue + 60}, 60%, ${55 + beatPulse * 10}%, ${ringAlpha})`;
    ctx.lineWidth = 2 + (1 - ringExpand) * 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Second ring offset by half a beat
    const ring2Phase = (beatProgress + 0.5) % 1;
    const ring2Alpha = Math.max(0, (1 - ring2Phase) * 0.04);
    if (ring2Alpha > 0.003) {
      const r2 = maxRadius * (0.1 + ring2Phase * 0.9);
      ctx.strokeStyle = `hsla(${hue + 90}, 50%, 50%, ${ring2Alpha})`;
      ctx.lineWidth = 1.5 + (1 - ring2Phase) * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r2, 0, Math.PI * 2);
      ctx.stroke();
    }
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
    const size = Math.min(w, h) * 0.38 + beatPulse * 14;
    const alpha = 0.035 + beatPulse * 0.035;

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
    scrollSpeed: number = 0,
  ): void {
    const baseSpeed = (128 * 4 * 40) / (60 * 60);
    const speedMult = scrollSpeed > 0 ? scrollSpeed / baseSpeed : 1;

    const progressIntensity = levelProgress >= 0.2 ? Math.min(1, (levelProgress - 0.2) * 1.5) : 0;
    const highSpeedIntensity = speedMult >= 2 ? Math.min(1, (speedMult - 2) * 0.5 + 0.3) : 0;

    const totalIntensity = Math.min(1.5, progressIntensity + highSpeedIntensity);
    if (totalIntensity < 0.01) return;

    const now = Date.now();
    const lineCount = Math.floor(8 + highSpeedIntensity * 12);

    for (let i = 0; i < lineCount; i++) {
      const seed = i * 2731;
      const baseY = ((seed % 650) / 650) * h * 0.7 + h * 0.04;
      const lineLen = (60 + (seed % 120)) * (1 + highSpeedIntensity * 0.8);
      const speed = (0.7 + (seed % 400) / 400) * (1 + highSpeedIntensity * 1.5);
      const x = w - ((now * speed + seed * 50) % (w + lineLen * 2));
      const alpha = (0.04 + beatPulse * 0.07) * totalIntensity;

      if (alpha < 0.005) continue;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(x, baseY, lineLen, 1.5 + highSpeedIntensity);
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
