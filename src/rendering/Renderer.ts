import { CONFIG, VehicleMode } from '../game/Config.js';
import { Camera } from '../game/Camera.js';
import { Player } from '../entities/Player.js';
import { Level } from '../level/Level.js';
import { Background } from './Background.js';
import { ParticleSystem } from './Particles.js';

const U = CONFIG.UNIT_SIZE;

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private readonly background: Background;

  private beatPulse = 0;
  private sectionHue = 200;
  /** Mode transition flash (decays from 1 to 0) */
  private modeFlash = 0;
  private modeFlashR = 0;
  private modeFlashG = 0;
  private modeFlashB = 0;

  /** Audio energy level 0-1 for dynamic color intensity */
  private audioEnergy = 0;
  /** Bass drop intensity 0-1 */
  private bassDropIntensity = 0;
  /** Shimmer animation phase */
  private shimmerPhase = 0;
  /** Menu transition alpha (fade in/out) */
  private menuAlpha = 0;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.background = new Background();
  }

  /** Trigger a colour flash when switching vehicle mode */
  triggerModeFlash(r: number, g: number, b: number): void {
    this.modeFlash = 1;
    this.modeFlashR = r;
    this.modeFlashG = g;
    this.modeFlashB = b;
  }

  /** Colour theme shifts through the level: cyan→purple→green→orange→pink→cyan */
  private computeSectionHue(progress: number): number {
    return (200 + progress * 240) % 360;
  }

  // --- Gradient with colour section + beat pulse ---

  private drawGradient(): void {
    const { ctx, canvas } = this;
    const hue = this.sectionHue;
    const bp = this.beatPulse;
    const energy = this.audioEnergy;
    const bassDrop = this.bassDropIntensity;

    // Dynamic saturation/lightness from audio energy
    const satBoost = energy * 15;
    const lightBoost = energy * 3 + bassDrop * 2;

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, `hsl(${hue}, ${70 + satBoost}%, ${2 + bp * 3 + lightBoost}%)`);
    grad.addColorStop(0.5, `hsl(${hue + 15}, ${80 + satBoost}%, ${4 + bp * 4 + lightBoost}%)`);
    grad.addColorStop(1, `hsl(${hue + 30}, ${75 + satBoost}%, ${6 + bp * 3 + lightBoost}%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Beat flash — whole screen brightens (enhanced with energy)
    if (bp > 0) {
      const flashIntensity = bp * (0.05 + energy * 0.03);
      ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  // --- Visual ceiling line (always visible, frames play area) ---

  private drawCeilingFrame(groundY: number): void {
    const { ctx, canvas } = this;
    const hue = this.sectionHue;
    const bp = this.beatPulse;
    // Ceiling at ~8 blocks above ground
    const ceilY = groundY - U * 8;

    ctx.strokeStyle = `hsla(${hue + 180}, 60%, 40%, ${0.15 + bp * 0.08})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = `hsl(${hue + 180}, 60%, 50%)`;
    ctx.shadowBlur = 6 + bp * 4;
    ctx.beginPath();
    ctx.moveTo(0, ceilY);
    ctx.lineTo(canvas.width, ceilY);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // --- Rich ground with checker, grid, decoration ---

  private drawGround(camX: number, groundY: number, level: Level): void {
    const { ctx, canvas } = this;
    const groundH = canvas.height - groundY;
    const bp = this.beatPulse;
    const hue = this.sectionHue;

    // Checkerboard fill
    for (const seg of level.groundSegments) {
      const startCol = Math.floor(seg.startPx / U);
      const endCol = Math.ceil(seg.endPx / U);

      for (let col = startCol; col < endCol; col++) {
        const wx = col * U;
        const sx = wx - camX;
        if (sx > canvas.width + U || sx + U < 0) continue;

        for (let row = 0; row * U < groundH; row++) {
          const even = (col + row) % 2 === 0;
          ctx.fillStyle = even ? '#0a1520' : '#0e1e30';
          ctx.fillRect(sx, groundY + row * U, U, U);
        }

        // Vertical grid line
        if (col % 2 !== 0) {
          ctx.strokeStyle = `hsla(${hue}, 50%, 40%, 0.04)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx, groundY);
          ctx.lineTo(sx, canvas.height);
          ctx.stroke();
        }
      }
    }

    // Horizontal grid lines
    ctx.strokeStyle = `hsla(${hue}, 50%, 40%, 0.05)`;
    ctx.lineWidth = 1;
    for (let row = 1; row * U < groundH; row++) {
      ctx.beginPath();
      ctx.moveTo(0, groundY + row * U);
      ctx.lineTo(canvas.width, groundY + row * U);
      ctx.stroke();
    }

    // Ground decoration: small downward triangles along ground line
    const startDeco = Math.floor(camX / (U * 4)) * 4;
    const endDeco = startDeco + Math.ceil(canvas.width / U) + 8;
    for (let col = startDeco; col < endDeco; col += 4) {
      const sx = col * U - camX;
      if (sx < -U || sx > canvas.width + U) continue;
      // Small downward triangle decoration
      ctx.fillStyle = `hsla(${hue}, 50%, 40%, 0.08)`;
      ctx.beginPath();
      ctx.moveTo(sx + U * 0.5, groundY + 2);
      ctx.lineTo(sx + U * 0.8, groundY + U * 0.5);
      ctx.lineTo(sx + U * 0.2, groundY + U * 0.5);
      ctx.closePath();
      ctx.fill();
    }

    // Glowing dots in ground at regular intervals
    for (let col = startDeco + 2; col < endDeco; col += 6) {
      const sx = col * U - camX + U / 2;
      if (sx < -U || sx > canvas.width + U) continue;
      ctx.fillStyle = `hsla(${hue}, 60%, 50%, ${0.06 + bp * 0.04})`;
      ctx.beginPath();
      ctx.arc(sx, groundY + U * 1.5, 2 + bp, 0, Math.PI * 2);
      ctx.fill();
    }

    // Thick glowing ground top line
    const glowBlur = 12 + bp * 18;
    ctx.strokeStyle = `hsl(${hue}, 80%, 55%)`;
    ctx.lineWidth = 3 + bp * 2;
    ctx.shadowColor = `hsl(${hue}, 80%, 55%)`;
    ctx.shadowBlur = glowBlur;
    for (const seg of level.groundSegments) {
      const sx = seg.startPx - camX;
      const ex = seg.endPx - camX;
      if (ex < 0 || sx > canvas.width) continue;
      ctx.beginPath();
      ctx.moveTo(Math.max(0, sx), groundY);
      ctx.lineTo(Math.min(canvas.width, ex), groundY);
      ctx.stroke();
    }
    // Double draw for stronger glow
    ctx.shadowBlur = glowBlur * 0.6;
    for (const seg of level.groundSegments) {
      const sx = seg.startPx - camX;
      const ex = seg.endPx - camX;
      if (ex < 0 || sx > canvas.width) continue;
      ctx.beginPath();
      ctx.moveTo(Math.max(0, sx), groundY);
      ctx.lineTo(Math.min(canvas.width, ex), groundY);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Gap edge lines
    ctx.strokeStyle = `hsl(${hue}, 80%, 55%)`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = `hsl(${hue}, 80%, 55%)`;
    ctx.shadowBlur = 8;
    for (const gap of level.gaps) {
      const lx = gap.startPx - camX;
      const rx = gap.endPx - camX;
      if (lx > -2 && lx < canvas.width + 2) {
        ctx.beginPath();
        ctx.moveTo(lx, groundY);
        ctx.lineTo(lx, canvas.height);
        ctx.stroke();
      }
      if (rx > -2 && rx < canvas.width + 2) {
        ctx.beginPath();
        ctx.moveTo(rx, groundY);
        ctx.lineTo(rx, canvas.height);
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
  }

  // --- Decorative background blocks (no collision, low opacity) ---

  private drawDecoBlocks(camX: number, groundY: number): void {
    const { ctx, canvas } = this;
    const hue = this.sectionHue;
    const bp = this.beatPulse;

    const startCol = Math.floor(camX / U) - 2;
    const endCol = startCol + Math.ceil(canvas.width / U) + 4;

    // Chevron patterns at regular intervals
    for (let col = startCol; col < endCol; col++) {
      const sx = col * U - camX;
      // Outlined deco blocks above play area using deterministic pattern
      const seed = ((col * 7919) & 0xFFFF);
      if (seed % 13 !== 0) continue; // ~1 in 13 columns get a deco block

      const row = (seed % 5) + 1; // rows 1-5 above ground
      const sy = groundY - row * U;

      // Outlined block (no fill)
      const alpha = 0.04 + bp * 0.02;
      ctx.strokeStyle = `hsla(${hue + 40}, 50%, 45%, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + 3, sy + 3, U - 6, U - 6);
    }

    // Chevron/V-shape decorations every ~30 blocks
    for (let col = startCol; col < endCol; col++) {
      if (((col + 5) * 3571) % 30 !== 0) continue;
      const sx = col * U - camX;
      const cy = groundY - U * 4;
      const alpha = 0.03 + bp * 0.015;

      ctx.strokeStyle = `hsla(${hue}, 40%, 50%, ${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx - U * 1.5, cy + U);
      ctx.lineTo(sx, cy - U);
      ctx.lineTo(sx + U * 1.5, cy + U);
      ctx.stroke();
    }
  }

  // --- Blocks: 3D beveled with variety (some outlined, some glowing) ---

  private drawBlocks(camX: number, groundY: number, level: Level): void {
    const { ctx, canvas } = this;
    const hue = this.sectionHue;
    const bp = this.beatPulse;

    for (let i = 0; i < level.blocks.length; i++) {
      const block = level.blocks[i]!;
      const sx = block.x - camX;
      if (sx > canvas.width + U) break;
      if (sx + U < -U) continue;

      const sy = groundY - block.y - U;
      const variety = (i * 7 + Math.floor(block.x / U)) % 5;

      // Beat-reactive scale — subtle size pulse on beat
      const beatScale = 1 + bp * 0.03;
      const offset = (U * (beatScale - 1)) / 2;

      ctx.save();
      ctx.translate(sx - offset, sy - offset);
      const bU = U * beatScale;

      switch (variety) {
        case 0:
          // Gradient fill block
          {
            const grad = ctx.createLinearGradient(0, 0, 0, bU);
            grad.addColorStop(0, `hsl(${hue}, 50%, 18%)`);
            grad.addColorStop(1, `hsl(${hue + 20}, 60%, 8%)`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, bU, bU);
            // Bevel edges
            ctx.fillStyle = `hsl(${hue}, 40%, 28%)`;
            ctx.fillRect(0, 0, bU, 3);
            ctx.fillRect(0, 0, 3, bU);
            ctx.fillStyle = `hsl(${hue + 20}, 60%, 4%)`;
            ctx.fillRect(0, bU - 3, bU, 3);
            ctx.fillRect(bU - 3, 0, 3, bU);
            // Outer border
            ctx.strokeStyle = `hsl(${hue}, 50%, 30%)`;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(0.5, 0.5, bU - 1, bU - 1);
          }
          break;

        case 1:
          // Circuit pattern block
          {
            ctx.fillStyle = '#0a1628';
            ctx.fillRect(0, 0, bU, bU);
            // Circuit traces
            ctx.strokeStyle = `hsla(${hue + 60}, 80%, 45%, 0.35 + bp * 0.15)`;
            ctx.lineWidth = 1.5;
            // Horizontal traces
            ctx.beginPath();
            ctx.moveTo(0, bU * 0.3);
            ctx.lineTo(bU * 0.4, bU * 0.3);
            ctx.lineTo(bU * 0.5, bU * 0.5);
            ctx.lineTo(bU, bU * 0.5);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, bU * 0.7);
            ctx.lineTo(bU * 0.3, bU * 0.7);
            ctx.lineTo(bU * 0.4, bU * 0.55);
            ctx.stroke();
            // Node dots
            ctx.fillStyle = `hsla(${hue + 60}, 90%, 55%, 0.5 + bp * 0.3)`;
            ctx.beginPath();
            ctx.arc(bU * 0.4, bU * 0.3, 2.5, 0, Math.PI * 2);
            ctx.arc(bU * 0.5, bU * 0.5, 2.5, 0, Math.PI * 2);
            ctx.fill();
            // Outer border
            ctx.strokeStyle = `hsl(${hue + 60}, 50%, 25%)`;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(0.5, 0.5, bU - 1, bU - 1);
          }
          break;

        case 2:
          // Crystalline block — diagonal facets
          {
            ctx.fillStyle = `hsl(${hue + 120}, 30%, 10%)`;
            ctx.fillRect(0, 0, bU, bU);
            // Facet lines
            ctx.strokeStyle = `hsla(${hue + 120}, 60%, 50%, 0.2 + bp * 0.1)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(bU, bU);
            ctx.moveTo(bU, 0); ctx.lineTo(0, bU);
            ctx.moveTo(bU / 2, 0); ctx.lineTo(bU, bU / 2);
            ctx.moveTo(0, bU / 2); ctx.lineTo(bU / 2, bU);
            ctx.stroke();
            // Center glow
            ctx.fillStyle = `hsla(${hue + 120}, 70%, 55%, ${0.08 + bp * 0.06})`;
            ctx.beginPath();
            ctx.arc(bU / 2, bU / 2, bU * 0.25, 0, Math.PI * 2);
            ctx.fill();
            // Outer border
            ctx.strokeStyle = `hsl(${hue + 120}, 40%, 30%)`;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(0.5, 0.5, bU - 1, bU - 1);
          }
          break;

        case 3:
          // Metallic sheen block
          {
            const grad = ctx.createLinearGradient(0, 0, bU, bU);
            grad.addColorStop(0, '#1a2a40');
            grad.addColorStop(0.45, '#2a4060');
            grad.addColorStop(0.55, '#3a5578');
            grad.addColorStop(1, '#0e1828');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, bU, bU);
            // Highlight streak
            ctx.fillStyle = `rgba(180, 210, 255, ${0.06 + bp * 0.04})`;
            ctx.beginPath();
            ctx.moveTo(bU * 0.1, 0);
            ctx.lineTo(bU * 0.35, 0);
            ctx.lineTo(bU * 0.15, bU);
            ctx.lineTo(bU * -0.1, bU);
            ctx.closePath();
            ctx.fill();
            // Bevel
            ctx.fillStyle = 'rgba(140, 180, 220, 0.2)';
            ctx.fillRect(0, 0, bU, 2);
            ctx.fillRect(0, 0, 2, bU);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, bU - 2, bU, 2);
            ctx.fillRect(bU - 2, 0, 2, bU);
            // Outer border
            ctx.strokeStyle = '#3a6090';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(0.5, 0.5, bU - 1, bU - 1);
          }
          break;

        case 4:
          // Glowing block (section-hue themed)
          {
            ctx.fillStyle = `hsla(${hue}, 60%, 20%, 0.9)`;
            ctx.fillRect(0, 0, bU, bU);
            ctx.shadowColor = `hsl(${hue}, 70%, 50%)`;
            ctx.shadowBlur = 8 + bp * 10;
            ctx.strokeStyle = `hsl(${hue}, 70%, 50%)`;
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, bU - 2, bU - 2);
            ctx.shadowBlur = 0;
            // Inner highlight
            ctx.strokeStyle = `hsla(${hue}, 60%, 60%, 0.25)`;
            ctx.lineWidth = 1;
            ctx.strokeRect(5, 5, bU - 10, bU - 10);
          }
          break;
      }

      ctx.restore();
    }
  }

  // --- Spikes with glow ---

  private drawSpikes(camX: number, groundY: number, level: Level): void {
    const { ctx, canvas } = this;
    const bp = this.beatPulse;

    for (const spike of level.spikes) {
      const sx = spike.x - camX;
      if (sx > canvas.width + U) break;
      if (sx + U < -U) continue;

      const baseY = groundY - spike.y;
      const tipY = groundY - spike.y - U;

      // Beat-reactive: scale spike slightly on beat
      const spikeScale = 1 + bp * 0.04;
      const cx = sx + U / 2;
      const cy = baseY;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(spikeScale, spikeScale);
      ctx.translate(-cx, -cy);

      // Outer glow intensifies on beat
      ctx.shadowColor = `rgb(255, ${50 + bp * 60}, ${50 + bp * 60})`;
      ctx.shadowBlur = 10 + bp * 14;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(sx + U / 2, tipY);
      ctx.lineTo(sx + U, baseY);
      ctx.lineTo(sx, baseY);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      // Inner fill pulses brighter on beat
      ctx.fillStyle = `rgb(${221 + bp * 34}, ${34 + bp * 30}, ${34 + bp * 30})`;
      ctx.beginPath();
      ctx.moveTo(sx + U / 2, tipY + 7);
      ctx.lineTo(sx + U - 6, baseY - 1);
      ctx.lineTo(sx + 6, baseY - 1);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = `rgba(255, ${100 + bp * 80}, ${100 + bp * 80}, ${0.6 + bp * 0.3})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx + U / 2, tipY + 1);
      ctx.lineTo(sx + U - 1, baseY);
      ctx.moveTo(sx + U / 2, tipY + 1);
      ctx.lineTo(sx + 1, baseY);
      ctx.stroke();

      ctx.restore();
    }
  }

  // --- Jump pads ---

  private drawJumpPads(camX: number, groundY: number, level: Level): void {
    const { ctx, canvas } = this;
    const padH = U * 0.4;
    const bp = this.beatPulse;

    for (const pad of level.jumpPads) {
      const sx = pad.x - camX;
      if (sx > canvas.width + U) break;
      if (sx + U < -U) continue;
      const sy = groundY - pad.y - padH;

      ctx.shadowColor = '#ffdd00';
      ctx.shadowBlur = 12 + bp * 14;
      ctx.fillStyle = `rgb(255, ${221 + bp * 34}, ${bp * 60})`;
      ctx.fillRect(sx + 2, sy, U - 4, padH);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#cc9900';
      ctx.fillRect(sx + 5, sy + 2, U - 10, padH - 6);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(sx + U / 2, sy + 3);
      ctx.lineTo(sx + U / 2 + 7, sy + padH - 4);
      ctx.lineTo(sx + U / 2 - 7, sy + padH - 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- Jump orbs ---

  private drawJumpOrbs(camX: number, groundY: number, level: Level, usedOrbs: Set<number>): void {
    const { ctx, canvas } = this;
    const now = Date.now();
    const bp = this.beatPulse;

    for (let i = 0; i < level.jumpOrbs.length; i++) {
      const orb = level.jumpOrbs[i]!;
      const sx = orb.x - camX;
      if (sx > canvas.width + U * 2) continue;
      if (sx + U < -U * 2) continue;

      const used = usedOrbs.has(i);
      const cx = sx + U / 2;
      const cy = groundY - orb.y - U / 2;
      const pulse = (Math.sin(now * 0.004 + i) * 0.1 + 1) + bp * 0.2;
      const radius = (U * 0.35) * pulse;
      const ringRadius = (U * 0.5) * pulse;

      ctx.save();
      ctx.globalAlpha = used ? 0.2 : 1;

      ctx.strokeStyle = '#ffdd00';
      ctx.lineWidth = 2.5 + bp * 2;
      ctx.shadowColor = '#ffdd00';
      ctx.shadowBlur = used ? 0 : 14 + bp * 12;
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffdd00';
      ctx.shadowBlur = used ? 0 : 20 + bp * 10;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(cx - radius * 0.25, cy - radius * 0.25, radius * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // --- Gravity portals ---

  private drawGravityPortals(camX: number, groundY: number, level: Level, particles?: ParticleSystem): void {
    const { ctx, canvas } = this;
    const portalW = U * 1.2;
    const portalH = U * 6;
    const now = Date.now();
    const bp = this.beatPulse;

    for (const portal of level.gravityPortals) {
      const sx = portal.x - camX - portalW / 2;
      if (sx > canvas.width + portalW) continue;
      if (sx + portalW < -portalW) continue;
      const sy = groundY - portalH;

      const grad = ctx.createLinearGradient(sx, sy, sx, sy + portalH);
      grad.addColorStop(0, `rgba(0, ${100 + bp * 60}, 255, ${0.7 + bp * 0.2})`);
      grad.addColorStop(0.4, `rgba(0, ${200 + bp * 55}, 255, ${0.8 + bp * 0.15})`);
      grad.addColorStop(0.6, `rgba(255, ${220 + bp * 35}, 0, ${0.8 + bp * 0.15})`);
      grad.addColorStop(1, `rgba(255, ${180 + bp * 40}, 0, ${0.7 + bp * 0.2})`);

      ctx.shadowColor = '#00aaff';
      ctx.shadowBlur = 22 + bp * 16;
      ctx.fillStyle = grad;
      ctx.fillRect(sx, sy, portalW, portalH);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + bp * 0.3})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, portalW, portalH);

      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 4;
      for (let p = 0; p < 6; p++) {
        const t = (now * 0.002 + p * 1.2) % 1;
        const px = sx + portalW * (0.2 + Math.sin(now * 0.001 + p * 2) * 0.3 + 0.3);
        const py = sy + portalH * t;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.sin(t * Math.PI) * 0.8})`;
        ctx.beginPath();
        ctx.arc(px, py, 2 + Math.sin(now * 0.003 + p), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Emit swirl particles around visible portals (throttled to ~every 4th frame)
      if (particles && Math.random() < 0.25) {
        particles.emitPortalSwirl(portal.x, groundY);
      }
    }
  }

  // --- Ceiling (gravity flip) ---

  private drawGravityCeiling(groundY: number): void {
    const { ctx, canvas } = this;
    const ceilScreenY = groundY - CONFIG.CEILING_HEIGHT;
    const bp = this.beatPulse;

    ctx.fillStyle = 'rgba(10, 18, 30, 0.85)';
    ctx.fillRect(0, 0, canvas.width, ceilScreenY);

    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 3 + bp * 2;
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 10 + bp * 12;
    ctx.beginPath();
    ctx.moveTo(0, ceilScreenY);
    ctx.lineTo(canvas.width, ceilScreenY);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // --- Player trail (enhanced with glow gradient and speed response) ---

  /** Mode-specific trail colours and shapes */
  private static readonly TRAIL_STYLES: Record<VehicleMode, { hue: number; sat: number; light: number; shape: 'square' | 'circle' | 'triangle' | 'diamond' | 'lightning' | 'web' }> = {
    [VehicleMode.Cube]:   { hue: 120, sat: 100, light: 50, shape: 'square' },
    [VehicleMode.Ship]:   { hue: 195, sat: 100, light: 55, shape: 'triangle' },   // engine exhaust
    [VehicleMode.Ball]:   { hue: 25,  sat: 100, light: 50, shape: 'circle' },     // rolling sparks
    [VehicleMode.UFO]:    { hue: 270, sat: 80,  light: 60, shape: 'diamond' },    // anti-grav shimmer
    [VehicleMode.Wave]:   { hue: 160, sat: 100, light: 50, shape: 'lightning' },  // lightning trail
    [VehicleMode.Spider]: { hue: 340, sat: 100, light: 55, shape: 'web' },        // web threads
  };

  private drawTrail(camX: number, groundY: number, player: Player, scrollSpeed: number): void {
    const { ctx } = this;
    const S = CONFIG.PLAYER_SIZE;
    const speedFactor = Math.min(2, scrollSpeed / CONFIG.SCROLL_SPEED);
    const style = Renderer.TRAIL_STYLES[player.mode];

    for (let i = 0; i < player.trail.length; i++) {
      const pos = player.trail[i]!;
      const t = (i + 1) / (player.trail.length + 1);
      const sx = pos.x - camX;
      const sy = groundY - pos.y - S;

      ctx.save();
      ctx.globalAlpha = t * 0.4 * Math.min(1.5, 0.7 + speedFactor * 0.4);
      ctx.translate(sx + S / 2, sy + S / 2);
      if (player.gravityFlipped) ctx.scale(1, -1);
      ctx.rotate(pos.rotation * Math.PI / 180);

      const col = `hsl(${style.hue}, ${style.sat}%, ${style.light}%)`;
      ctx.shadowColor = col;
      ctx.shadowBlur = (6 + t * 10) * speedFactor;
      ctx.fillStyle = col;

      const ts = S * (0.5 + t * 0.4);
      const hs = ts / 2;

      switch (style.shape) {
        case 'square':
          ctx.fillRect(-hs, -hs, ts, ts);
          break;
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, hs, 0, Math.PI * 2);
          ctx.fill();
          // Rolling spark dot
          ctx.fillStyle = `hsla(40, 100%, 70%, ${t * 0.6})`;
          ctx.beginPath();
          ctx.arc(hs * 0.5 * Math.cos(i * 1.2), hs * 0.5 * Math.sin(i * 1.2), 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'triangle':
          // Engine exhaust — wider at back
          ctx.beginPath();
          ctx.moveTo(hs * 0.3, 0);
          ctx.lineTo(-hs, -hs * 0.6);
          ctx.lineTo(-hs, hs * 0.6);
          ctx.closePath();
          ctx.fill();
          // Hot center
          ctx.fillStyle = `hsla(30, 100%, 70%, ${t * 0.5})`;
          ctx.beginPath();
          ctx.arc(-hs * 0.3, 0, hs * 0.25, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'diamond':
          // Anti-gravity shimmer
          ctx.beginPath();
          ctx.moveTo(0, -hs);
          ctx.lineTo(hs * 0.6, 0);
          ctx.lineTo(0, hs);
          ctx.lineTo(-hs * 0.6, 0);
          ctx.closePath();
          ctx.fill();
          break;
        case 'lightning':
          // Lightning bolt segment
          ctx.strokeStyle = col;
          ctx.lineWidth = 2 + t * 2;
          ctx.beginPath();
          ctx.moveTo(-hs, -hs * 0.4);
          ctx.lineTo(-hs * 0.2, hs * 0.1);
          ctx.lineTo(hs * 0.2, -hs * 0.1);
          ctx.lineTo(hs, hs * 0.4);
          ctx.stroke();
          break;
        case 'web':
          // Web thread cross
          ctx.strokeStyle = col;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-hs, -hs); ctx.lineTo(hs, hs);
          ctx.moveTo(hs, -hs); ctx.lineTo(-hs, hs);
          ctx.moveTo(0, -hs); ctx.lineTo(0, hs);
          ctx.stroke();
          break;
      }

      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Continuous glow line connecting trail positions
    if (player.trail.length > 1) {
      ctx.save();
      ctx.globalAlpha = 0.18 * speedFactor;
      const lineCol = `hsl(${style.hue}, ${style.sat}%, ${style.light}%)`;
      ctx.strokeStyle = lineCol;
      ctx.lineWidth = (style.shape === 'lightning' ? 3 : 2) * speedFactor;
      ctx.shadowColor = lineCol;
      ctx.shadowBlur = 8 * speedFactor;
      ctx.beginPath();
      for (let i = 0; i < player.trail.length; i++) {
        const pos = player.trail[i]!;
        const px = pos.x - camX + S / 2;
        const py = groundY - pos.y - S / 2;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.lineTo(player.x - camX + S / 2, groundY - player.y - S / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  // --- Player (all vehicle modes) ---

  private drawPlayer(camX: number, groundY: number, player: Player): void {
    const { ctx } = this;
    const S = CONFIG.PLAYER_SIZE;
    const sx = player.x - camX;
    const sy = groundY - player.y - S;

    ctx.save();
    ctx.translate(sx + S / 2, sy + S / 2);
    if (player.gravityFlipped) ctx.scale(1, -1);
    ctx.rotate(player.rotation * Math.PI / 180);
    // Squash/stretch: scale X wider when squashed, Y taller when stretched
    const sq = player.squash;
    ctx.scale(1 / sq, sq);

    switch (player.mode) {
      case VehicleMode.Cube:
        this.drawCubeShape(S);
        break;
      case VehicleMode.Ship:
        this.drawShipShape(S);
        break;
      case VehicleMode.Ball:
        this.drawBallShape(S);
        break;
      case VehicleMode.UFO:
        this.drawUFOShape(S);
        break;
      case VehicleMode.Wave:
        this.drawWaveShape(S);
        break;
      case VehicleMode.Spider:
        this.drawSpiderShape(S);
        break;
    }

    ctx.restore();
  }

  private drawCubeShape(S: number): void {
    const { ctx } = this;
    const VS = S + 6;

    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = 28;
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(-VS / 2, -VS / 2, VS, VS);
    ctx.shadowBlur = 16;
    ctx.fillRect(-VS / 2, -VS / 2, VS, VS);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#66ff66';
    ctx.fillRect(-VS / 2, -VS / 2, VS, 2);
    ctx.fillRect(-VS / 2, -VS / 2, 2, VS);
    ctx.fillStyle = '#009900';
    ctx.fillRect(-VS / 2, VS / 2 - 2, VS, 2);
    ctx.fillRect(VS / 2 - 2, -VS / 2, 2, VS);

    ctx.strokeStyle = '#80ffa0';
    ctx.lineWidth = 2;
    ctx.strokeRect(-VS / 2, -VS / 2, VS, VS);

    // Eye
    const eyeW = VS * 0.32;
    const eyeH = VS * 0.28;
    const eyeX = VS * 0.04;
    const eyeY = -VS * 0.04;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(eyeX - eyeW / 2, eyeY - eyeH / 2, eyeW, eyeH);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(eyeX - eyeW / 2, eyeY - eyeH / 2, eyeW, eyeH);
    ctx.fillStyle = '#000000';
    ctx.fillRect(eyeX + eyeW * 0.08, eyeY - eyeH * 0.275, eyeW * 0.45, eyeH * 0.55);
  }

  private drawShipShape(S: number): void {
    const { ctx } = this;
    const hs = S * 0.6;

    // Triangular ship body
    ctx.shadowColor = '#00ccff';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#00ccff';
    ctx.beginPath();
    ctx.moveTo(hs, 0);             // nose (right)
    ctx.lineTo(-hs, -hs * 0.7);    // top-left wing
    ctx.lineTo(-hs * 0.4, 0);      // indent
    ctx.lineTo(-hs, hs * 0.7);     // bottom-left wing
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Inner detail
    ctx.fillStyle = '#005580';
    ctx.beginPath();
    ctx.moveTo(hs * 0.5, 0);
    ctx.lineTo(-hs * 0.5, -hs * 0.35);
    ctx.lineTo(-hs * 0.2, 0);
    ctx.lineTo(-hs * 0.5, hs * 0.35);
    ctx.closePath();
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#66ddff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hs, 0);
    ctx.lineTo(-hs, -hs * 0.7);
    ctx.lineTo(-hs * 0.4, 0);
    ctx.lineTo(-hs, hs * 0.7);
    ctx.closePath();
    ctx.stroke();

    // Engine glow
    ctx.fillStyle = '#ff8800';
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(-hs * 0.5, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawBallShape(S: number): void {
    const { ctx } = this;
    const r = S * 0.48;

    // Ball body
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Inner ring
    ctx.strokeStyle = '#cc4400';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
    ctx.stroke();

    // Outline
    ctx.strokeStyle = '#ffaa44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    // Direction marker
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.45, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawUFOShape(S: number): void {
    const { ctx } = this;
    const w = S * 0.7;
    const h = S * 0.4;

    // Dome
    ctx.shadowColor = '#aa00ff';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#aa00ff';
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.2, w * 0.4, h * 0.6, 0, Math.PI, 0);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Saucer body
    ctx.fillStyle = '#7700cc';
    ctx.beginPath();
    ctx.ellipse(0, h * 0.1, w, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#cc66ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, h * 0.1, w, h * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Bottom glow
    ctx.fillStyle = '#cc66ff';
    ctx.shadowColor = '#cc66ff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.ellipse(0, h * 0.4, w * 0.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawWaveShape(S: number): void {
    const { ctx } = this;
    const hs = S * 0.45;

    // Diamond/arrow shape
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.moveTo(hs, 0);         // right point
    ctx.lineTo(0, -hs);        // top
    ctx.lineTo(-hs, 0);        // left
    ctx.lineTo(0, hs);         // bottom
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Inner detail
    ctx.fillStyle = '#008844';
    ctx.beginPath();
    ctx.moveTo(hs * 0.5, 0);
    ctx.lineTo(0, -hs * 0.5);
    ctx.lineTo(-hs * 0.5, 0);
    ctx.lineTo(0, hs * 0.5);
    ctx.closePath();
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#66ffbb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hs, 0);
    ctx.lineTo(0, -hs);
    ctx.lineTo(-hs, 0);
    ctx.lineTo(0, hs);
    ctx.closePath();
    ctx.stroke();
  }

  private drawSpiderShape(S: number): void {
    const { ctx } = this;
    const hs = S * 0.45;

    // Spider body (hexagonal)
    ctx.shadowColor = '#ff0066';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ff0066';
    ctx.beginPath();
    ctx.moveTo(hs * 0.8, -hs * 0.3);
    ctx.lineTo(hs * 0.8, hs * 0.3);
    ctx.lineTo(0, hs * 0.7);
    ctx.lineTo(-hs * 0.8, hs * 0.3);
    ctx.lineTo(-hs * 0.8, -hs * 0.3);
    ctx.lineTo(0, -hs * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Legs (4 lines)
    ctx.strokeStyle = '#ff3388';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI + Math.PI * 0.25;
      const lx = Math.cos(angle) * hs * 0.6;
      const ly = Math.sin(angle) * hs * 0.6;
      const ox = Math.cos(angle) * hs * 1.1;
      const oy = Math.sin(angle) * hs * 1.1;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(ox, oy);
      ctx.stroke();
    }

    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-hs * 0.2, -hs * 0.1, 4, 0, Math.PI * 2);
    ctx.arc(hs * 0.2, -hs * 0.1, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-hs * 0.15, -hs * 0.1, 2, 0, Math.PI * 2);
    ctx.arc(hs * 0.25, -hs * 0.1, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Mode portals ---

  private drawModePortals(camX: number, groundY: number, level: Level): void {
    const { ctx, canvas } = this;
    const portalW = U * 1.2;
    const portalH = U * 6;
    const now = Date.now();
    const bp = this.beatPulse;

    const MODE_COLORS: Record<VehicleMode, { main: string; glow: string; label: string }> = {
      [VehicleMode.Cube]: { main: '#00ff00', glow: '#00ff00', label: 'CUBE' },
      [VehicleMode.Ship]: { main: '#00ccff', glow: '#00ccff', label: 'SHIP' },
      [VehicleMode.Ball]: { main: '#ff6600', glow: '#ff6600', label: 'BALL' },
      [VehicleMode.UFO]: { main: '#aa00ff', glow: '#aa00ff', label: 'UFO' },
      [VehicleMode.Wave]: { main: '#00ff88', glow: '#00ff88', label: 'WAVE' },
      [VehicleMode.Spider]: { main: '#ff0066', glow: '#ff0066', label: 'SPIDER' },
    };

    for (const portal of level.modePortals) {
      const sx = portal.x - camX - portalW / 2;
      if (sx > canvas.width + portalW) continue;
      if (sx + portalW < -portalW) continue;
      const sy = groundY - portalH;

      const colors = MODE_COLORS[portal.mode];

      // Portal rectangle with mode color
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 22 + bp * 16;
      ctx.fillStyle = colors.main;
      ctx.globalAlpha = 0.3 + bp * 0.15;
      ctx.fillRect(sx, sy, portalW, portalH);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Border
      ctx.strokeStyle = colors.main;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 12 + bp * 8;
      ctx.strokeRect(sx, sy, portalW, portalH);
      ctx.shadowBlur = 0;

      // Mode label at top
      ctx.fillStyle = colors.main;
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 8;
      ctx.fillText(colors.label, sx + portalW / 2, sy - 4);
      ctx.shadowBlur = 0;

      // Floating particles inside portal
      for (let p = 0; p < 5; p++) {
        const t = (now * 0.002 + p * 1.4) % 1;
        const px = sx + portalW * (0.2 + Math.sin(now * 0.001 + p * 2.5) * 0.3 + 0.3);
        const py = sy + portalH * t;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.sin(t * Math.PI) * 0.7})`;
        ctx.beginPath();
        ctx.arc(px, py, 2 + Math.sin(now * 0.003 + p), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // --- Particles with rotation and shape variety ---

  private drawParticles(camX: number, groundY: number, particles: ParticleSystem): void {
    const { ctx } = this;

    for (const p of particles.particles) {
      const sx = p.x - camX;
      const sy = groundY - p.y - p.size;
      const alpha = p.converging
        ? (1 - p.life / p.maxLife) * 0.8 + 0.2 // converging: fade IN
        : (p.life / p.maxLife) * 0.9;           // normal: fade OUT

      ctx.save();
      ctx.translate(sx + p.size / 2, sy + p.size / 2);
      ctx.rotate(p.rot);
      ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${alpha})`;
      ctx.shadowColor = `rgba(${p.r}, ${p.g}, ${p.b}, ${alpha * 0.6})`;
      ctx.shadowBlur = 8;

      const hs = p.size / 2;
      switch (p.shape) {
        case 0: // square
          ctx.fillRect(-hs, -hs, p.size, p.size);
          break;
        case 1: // triangle
          ctx.beginPath();
          ctx.moveTo(0, -hs);
          ctx.lineTo(hs, hs);
          ctx.lineTo(-hs, hs);
          ctx.closePath();
          ctx.fill();
          break;
        case 2: // circle
          ctx.beginPath();
          ctx.arc(0, 0, hs, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 3: // diamond
          ctx.beginPath();
          ctx.moveTo(0, -hs);
          ctx.lineTo(hs, 0);
          ctx.lineTo(0, hs);
          ctx.lineTo(-hs, 0);
          ctx.closePath();
          ctx.fill();
          break;
      }

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  // --- HUD ---

  private drawHUD(progress: number, attempts: number): void {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const barH = 6;
    const bp = this.beatPulse;
    const hue = this.sectionHue;
    const energy = this.audioEnergy;
    const clampedProgress = Math.min(progress, 1);

    // --- Progress bar background ---
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(0, 0, w, barH);

    // --- Gradient fill ---
    const fillW = clampedProgress * w;
    if (fillW > 0) {
      const grad = ctx.createLinearGradient(0, 0, fillW, 0);
      grad.addColorStop(0, `hsl(${hue}, 80%, ${45 + energy * 15}%)`);
      grad.addColorStop(0.5, `hsl(${hue + 40}, 90%, ${55 + energy * 15}%)`);
      grad.addColorStop(1, `hsl(${hue + 80}, 85%, ${50 + energy * 15}%)`);
      ctx.fillStyle = grad;
      ctx.shadowColor = `hsl(${hue + 40}, 90%, 55%)`;
      ctx.shadowBlur = 6 + bp * 8;
      ctx.fillRect(0, 0, fillW, barH);
      ctx.shadowBlur = 0;

      // --- Shimmer effect (moving bright highlight) ---
      const shimmerX = ((this.shimmerPhase * 200) % (w + 120)) - 60;
      if (shimmerX < fillW) {
        const shimmerGrad = ctx.createLinearGradient(shimmerX - 40, 0, shimmerX + 40, 0);
        shimmerGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        shimmerGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.25 + bp * 0.15})`);
        shimmerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = shimmerGrad;
        ctx.fillRect(Math.max(0, shimmerX - 40), 0, 80, barH);
      }

      // --- Bright edge at fill position ---
      ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + bp * 0.3})`;
      ctx.fillRect(Math.max(0, fillW - 2), 0, 2, barH);
    }

    // --- Milestone markers at 25%, 50%, 75% ---
    for (const milestone of [0.25, 0.5, 0.75]) {
      const mx = milestone * w;
      const reached = clampedProgress >= milestone;
      ctx.fillStyle = reached
        ? `hsla(${hue + 40}, 80%, 70%, ${0.7 + bp * 0.2})`
        : 'rgba(255, 255, 255, 0.15)';
      // Small diamond marker
      ctx.beginPath();
      ctx.moveTo(mx, 0);
      ctx.lineTo(mx + 4, barH / 2);
      ctx.lineTo(mx, barH);
      ctx.lineTo(mx - 4, barH / 2);
      ctx.closePath();
      ctx.fill();
      if (reached) {
        ctx.shadowColor = `hsl(${hue + 40}, 80%, 70%)`;
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // --- Percentage text ---
    ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + bp * 0.15})`;
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`${Math.floor(clampedProgress * 100)}%`, w - 8, barH + 4);

    // --- Attempt counter ---
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '13px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Attempt ${attempts}`, 10, barH + 4);
  }

  // --- Level name fade-in display ---

  private drawLevelName(timer: number): void {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    // Fade in (0-60), hold (60-120), fade out (120-180)
    let alpha: number;
    if (timer < 60) {
      alpha = timer / 60;
    } else if (timer < 120) {
      alpha = 1;
    } else {
      alpha = 1 - (timer - 120) / 60;
    }
    alpha = Math.max(0, Math.min(1, alpha));

    // Slide up slightly during fade in
    const slideY = timer < 60 ? (1 - timer / 60) * 15 : 0;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Level title
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 20 * alpha;
    ctx.fillStyle = '#00e5ff';
    const titleSize = Math.floor(h / 12);
    ctx.font = `bold ${titleSize}px 'Arial Black', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('First Flight', w / 2, h * 0.42 + slideY);
    ctx.shadowBlur = 0;

    // Subtitle line
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    const subSize = Math.floor(h / 28);
    ctx.font = `${subSize}px Arial, sans-serif`;
    ctx.fillText('by Paperclip Games', w / 2, h * 0.42 + titleSize * 0.8 + slideY);

    // Decorative line under title
    const lineW = w * 0.15;
    const lineAlpha = alpha * 0.4;
    const lineY = h * 0.42 + titleSize * 1.3 + slideY;
    const lineGrad = ctx.createLinearGradient(w / 2 - lineW, lineY, w / 2 + lineW, lineY);
    lineGrad.addColorStop(0, `rgba(0, 229, 255, 0)`);
    lineGrad.addColorStop(0.5, `rgba(0, 229, 255, ${lineAlpha})`);
    lineGrad.addColorStop(1, `rgba(0, 229, 255, 0)`);
    ctx.fillStyle = lineGrad;
    ctx.fillRect(w / 2 - lineW, lineY, lineW * 2, 2);

    ctx.restore();
  }

  // --- Menu ---

  renderMenu(menuTime: number): void {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    // Fade in menu
    this.menuAlpha = Math.min(1, this.menuAlpha + 0.02);
    const ma = this.menuAlpha;

    // Animated gradient background
    const bgHue = (menuTime * 0.3) % 360;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `hsl(${260 + Math.sin(menuTime * 0.008) * 15}, 80%, 3%)`);
    grad.addColorStop(0.5, `hsl(${280 + Math.sin(menuTime * 0.006) * 10}, 70%, 4%)`);
    grad.addColorStop(1, `hsl(${300 + Math.sin(menuTime * 0.01) * 12}, 65%, 6%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    this.background.render(ctx, menuTime * 0.8, w, h);

    // Animated floating geometric particles
    ctx.save();
    ctx.globalAlpha = ma;
    for (let i = 0; i < 12; i++) {
      const t = menuTime * 0.012 + i * 0.8;
      const fx = w * (0.05 + ((i * 0.09 + Math.sin(t * 0.5 + i) * 0.05) % 0.9));
      const fy = h * (0.15 + ((i * 0.07 + Math.cos(t * 0.3 + i * 2) * 0.08) % 0.65));
      const s = 8 + i * 3 + Math.sin(t) * 4;
      const alpha = 0.04 + Math.sin(t * 0.7) * 0.025;
      const particleHue = (bgHue + i * 30) % 360;

      ctx.fillStyle = `hsla(${particleHue}, 70%, 55%, ${alpha})`;

      if (i % 3 === 0) {
        // Diamond
        ctx.beginPath();
        ctx.moveTo(fx, fy - s);
        ctx.lineTo(fx + s * 0.6, fy);
        ctx.lineTo(fx, fy + s);
        ctx.lineTo(fx - s * 0.6, fy);
        ctx.closePath();
        ctx.fill();
      } else if (i % 3 === 1) {
        // Circle
        ctx.beginPath();
        ctx.arc(fx, fy, s * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Triangle
        ctx.beginPath();
        ctx.moveTo(fx, fy - s);
        ctx.lineTo(fx + s * 0.7, fy + s * 0.5);
        ctx.lineTo(fx - s * 0.7, fy + s * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();

    // Horizontal glowing lines (animated)
    for (let i = 0; i < 3; i++) {
      const lineY = h * (0.25 + i * 0.2);
      const linePhase = menuTime * 0.01 + i * 2;
      const lineAlpha = (0.02 + Math.sin(linePhase) * 0.01) * ma;
      const lineGrad = ctx.createLinearGradient(0, lineY, w, lineY);
      lineGrad.addColorStop(0, `rgba(0, 229, 255, 0)`);
      lineGrad.addColorStop(0.3 + Math.sin(linePhase * 0.7) * 0.15, `rgba(0, 229, 255, ${lineAlpha})`);
      lineGrad.addColorStop(0.7 + Math.sin(linePhase * 0.5) * 0.1, `rgba(0, 229, 255, ${lineAlpha * 0.5})`);
      lineGrad.addColorStop(1, `rgba(0, 229, 255, 0)`);
      ctx.fillStyle = lineGrad;
      ctx.fillRect(0, lineY - 0.5, w, 1);
    }

    // Title with breathing glow
    ctx.save();
    ctx.globalAlpha = ma;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 30 + Math.sin(menuTime * 0.04) * 15;
    ctx.fillStyle = '#00e5ff';
    const ts = Math.floor(h / 7);
    ctx.font = `bold ${ts}px 'Arial Black', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const titleY = h * 0.3 + Math.sin(menuTime * 0.02) * 3;
    ctx.fillText('GEOMETRY DASH', w / 2, titleY);
    // Double glow
    ctx.shadowBlur = 15 + Math.sin(menuTime * 0.05) * 8;
    ctx.fillText('GEOMETRY DASH', w / 2, titleY);
    ctx.restore();

    // Decorative line under title
    ctx.save();
    ctx.globalAlpha = ma * 0.5;
    const underW = w * 0.25;
    const underY = titleY + ts * 0.6;
    const underGrad = ctx.createLinearGradient(w / 2 - underW, 0, w / 2 + underW, 0);
    underGrad.addColorStop(0, 'rgba(0, 229, 255, 0)');
    underGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.6)');
    underGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = underGrad;
    ctx.fillRect(w / 2 - underW, underY, underW * 2, 2);
    ctx.restore();

    // Level name with glow
    ctx.save();
    ctx.globalAlpha = ma * (0.35 + Math.sin(menuTime * 0.04) * 0.1);
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.floor(h / 24)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('~ First Flight ~', w / 2, h * 0.46);
    ctx.restore();

    // Play button area with animated border
    const btnW = w * 0.22;
    const btnH = h * 0.08;
    const btnX = w / 2 - btnW / 2;
    const btnY = h * 0.58;
    const btnPulse = Math.sin(menuTime * 0.06) * 0.3 + 0.7;

    ctx.save();
    ctx.globalAlpha = ma;

    // Button glow background
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 15 * btnPulse;
    ctx.strokeStyle = `rgba(0, 229, 255, ${0.3 + btnPulse * 0.3})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX, btnY, btnW, btnH);
    ctx.shadowBlur = 0;

    // Button fill
    ctx.fillStyle = `rgba(0, 229, 255, ${0.05 + btnPulse * 0.03})`;
    ctx.fillRect(btnX, btnY, btnW, btnH);

    // Button text
    ctx.globalAlpha = ma * btnPulse;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(h / 18)}px Arial, sans-serif`;
    ctx.fillText('Click to Play', w / 2, btnY + btnH / 2);
    ctx.restore();

    // Controls hint
    ctx.save();
    ctx.globalAlpha = ma * 0.25;
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.floor(h / 32)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Space / Click / Tap to jump', w / 2, h * 0.82);
    ctx.restore();

    // Version / credit
    ctx.save();
    ctx.globalAlpha = ma * 0.15;
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.floor(h / 42)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Paperclip Games', w / 2, h * 0.93);
    ctx.restore();
  }

  // --- Gameplay ---

  renderGameplay(
    camera: Camera,
    player: Player,
    level: Level,
    particles: ParticleSystem,
    progress: number,
    attempts: number,
    usedOrbs: Set<number>,
    beatProgress: number,
    scrollSpeed: number = CONFIG.SCROLL_SPEED,
    audioEnergy: number = 0,
    bassDropIntensity: number = 0,
    levelStartTimer: number = 999,
  ): void {
    const { ctx, canvas } = this;
    const groundY = camera.groundScreenY;
    const camX = camera.x;

    this.beatPulse = Math.max(0, 1 - beatProgress * 3.5);
    this.sectionHue = this.computeSectionHue(progress);
    this.audioEnergy = audioEnergy;
    this.bassDropIntensity = bassDropIntensity;
    this.shimmerPhase += 0.02;

    // --- Bass drop pre-effect: darken screen before burst ---
    if (bassDropIntensity > 0.5) {
      // Darken phase (first half of drop)
      const darken = (bassDropIntensity - 0.5) * 0.3;
      ctx.fillStyle = `rgba(0, 0, 0, ${darken})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    this.drawGradient();
    this.background.render(ctx, camX, canvas.width, canvas.height, beatProgress, progress, scrollSpeed);

    ctx.save();
    ctx.translate(camera.shakeX, camera.shakeY);

    this.drawCeilingFrame(groundY);
    this.drawDecoBlocks(camX, groundY);
    this.drawGround(camX, groundY, level);
    this.drawBlocks(camX, groundY, level);
    this.drawSpikes(camX, groundY, level);
    this.drawJumpPads(camX, groundY, level);
    this.drawJumpOrbs(camX, groundY, level, usedOrbs);
    this.drawGravityPortals(camX, groundY, level, particles);
    this.drawModePortals(camX, groundY, level);

    if (player.gravityFlipped) {
      this.drawGravityCeiling(groundY);
    }

    if (player.alive) {
      this.drawTrail(camX, groundY, player, scrollSpeed);
      this.drawPlayer(camX, groundY, player);
    }

    this.drawParticles(camX, groundY, particles);

    ctx.restore();

    // Mode transition flash overlay
    if (this.modeFlash > 0.01) {
      ctx.fillStyle = `rgba(${this.modeFlashR}, ${this.modeFlashG}, ${this.modeFlashB}, ${this.modeFlash * 0.35})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      this.modeFlash *= 0.88;
    }

    // --- Bass drop burst effect: color explosion ---
    if (bassDropIntensity > 0.01) {
      const hue = this.sectionHue;
      const burstAlpha = bassDropIntensity * 0.2;
      // Radial color burst from center
      const grad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.7,
      );
      grad.addColorStop(0, `hsla(${hue}, 100%, 70%, ${burstAlpha})`);
      grad.addColorStop(0.4, `hsla(${hue + 30}, 90%, 50%, ${burstAlpha * 0.5})`);
      grad.addColorStop(1, `hsla(${hue + 60}, 80%, 30%, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Edge vignette flash
      const vigAlpha = bassDropIntensity * 0.15;
      const vigGrad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.8,
      );
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vigGrad.addColorStop(1, `rgba(255, 255, 255, ${vigAlpha})`);
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // --- Dynamic color intensity overlay (saturation/brightness from energy) ---
    if (audioEnergy > 0.1) {
      const intensityAlpha = (audioEnergy - 0.1) * 0.06;
      const hue = this.sectionHue;
      ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${intensityAlpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    this.drawHUD(progress, attempts);

    // --- Level name fade-in display ---
    if (levelStartTimer < 180) {
      this.drawLevelName(levelStartTimer);
    }
  }

  // --- Death overlay ---

  renderDeathOverlay(deathTimer: number): void {
    const { ctx, canvas } = this;
    const elapsed = CONFIG.DEATH_PAUSE_TICKS - deathTimer;

    if (elapsed < 6) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, (1 - elapsed / 6) * 0.7)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // --- Complete overlay ---

  renderCompleteOverlay(
    completeTime: number,
    attempts: number = 1,
    jumpCount: number = 0,
    elapsedSeconds: number = 0,
  ): void {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    // Darken background
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.6, completeTime * 0.008)})`;
    ctx.fillRect(0, 0, w, h);

    if (completeTime <= 15) return;

    const fadeIn = Math.min(1, (completeTime - 15) * 0.04);

    // --- "Level Complete!" title with golden glow ---
    ctx.save();
    ctx.globalAlpha = fadeIn;
    const titleSize = Math.floor(h / 8);
    ctx.shadowColor = '#ffdd00';
    ctx.shadowBlur = 25 + Math.sin(completeTime * 0.05) * 10;
    ctx.fillStyle = '#ffdd00';
    ctx.font = `bold ${titleSize}px 'Arial Black', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Level Complete!', w / 2, h * 0.22);
    ctx.shadowBlur = 0;

    // Decorative line under title
    const lineW = w * 0.2;
    const lineY = h * 0.22 + titleSize * 0.6;
    const lineGrad = ctx.createLinearGradient(w / 2 - lineW, 0, w / 2 + lineW, 0);
    lineGrad.addColorStop(0, 'rgba(255, 221, 0, 0)');
    lineGrad.addColorStop(0.5, `rgba(255, 221, 0, ${fadeIn * 0.5})`);
    lineGrad.addColorStop(1, 'rgba(255, 221, 0, 0)');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(w / 2 - lineW, lineY, lineW * 2, 2);
    ctx.restore();

    // --- Star rating (based on attempts: 1=3 stars, 2-3=2 stars, 4+=1 star) ---
    if (completeTime > 30) {
      const starFade = Math.min(1, (completeTime - 30) * 0.04);
      const stars = attempts <= 1 ? 3 : attempts <= 3 ? 2 : 1;
      const starSize = Math.floor(h / 14);
      const starGap = starSize * 1.8;
      const starY = h * 0.36;

      ctx.save();
      ctx.globalAlpha = starFade * fadeIn;

      for (let i = 0; i < 3; i++) {
        const sx = w / 2 + (i - 1) * starGap;
        const filled = i < stars;
        // Stagger star appearance
        const starDelay = 30 + i * 12;
        if (completeTime < starDelay) continue;
        const starScale = Math.min(1, (completeTime - starDelay) * 0.08);
        // Bounce effect
        const bounce = starScale < 1 ? 1 + (1 - starScale) * 0.3 : 1;

        ctx.save();
        ctx.translate(sx, starY);
        ctx.scale(bounce, bounce);

        if (filled) {
          ctx.shadowColor = '#ffdd00';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#ffdd00';
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        }

        // Draw 5-point star
        this.drawStar(ctx, 0, 0, starSize * 0.5, starSize * 0.22, 5);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (filled) {
          // Inner highlight
          ctx.fillStyle = '#fff8cc';
          this.drawStar(ctx, 0, 0, starSize * 0.25, starSize * 0.1, 5);
          ctx.fill();
        }

        ctx.restore();
      }
      ctx.restore();
    }

    // --- Stats breakdown with animated counters ---
    if (completeTime > 50) {
      const statsFade = Math.min(1, (completeTime - 50) * 0.03);
      const statSize = Math.floor(h / 26);
      const labelSize = Math.floor(h / 36);
      const statY = h * 0.50;
      const statGap = h * 0.08;

      // Animated counter function
      const animCount = (target: number, delay: number): number => {
        const elapsed = Math.max(0, completeTime - delay);
        const duration = 40; // ticks to count up
        const t = Math.min(1, elapsed / duration);
        // Ease-out for counting
        const eased = 1 - (1 - t) * (1 - t);
        return Math.floor(target * eased);
      };

      ctx.save();
      ctx.globalAlpha = statsFade * fadeIn;

      // Stat items
      const stats = [
        { label: 'ATTEMPTS', value: `${animCount(attempts, 55)}`, delay: 55 },
        { label: 'JUMPS', value: `${animCount(jumpCount, 65)}`, delay: 65 },
        { label: 'TIME', value: this.formatTime(elapsedSeconds, completeTime, 75), delay: 75 },
      ];

      const totalWidth = stats.length * w * 0.2;
      const startX = w / 2 - totalWidth / 2 + w * 0.1;

      for (let i = 0; i < stats.length; i++) {
        const stat = stats[i]!;
        if (completeTime < stat.delay) continue;
        const itemFade = Math.min(1, (completeTime - stat.delay) * 0.05);
        const sx = startX + i * (totalWidth / stats.length);
        const slideUp = (1 - itemFade) * 10;

        ctx.save();
        ctx.globalAlpha = itemFade * statsFade * fadeIn;

        // Value
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${statSize}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(stat.value, sx, statY + i * statGap * 0.3 + slideUp);

        // Label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = `${labelSize}px Arial, sans-serif`;
        ctx.fillText(stat.label, sx, statY + i * statGap * 0.3 + statSize * 0.7 + slideUp);

        ctx.restore();
      }

      ctx.restore();
    }

    // --- "Click to continue" prompt ---
    if (completeTime > 120) {
      ctx.save();
      ctx.globalAlpha = Math.sin(completeTime * 0.06) * 0.3 + 0.7;
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.floor(h / 24)}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Click to continue', w / 2, h * 0.82);
      ctx.restore();
    }
  }

  /** Draw a 5-point star path */
  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    points: number,
  ): void {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  /** Format seconds as M:SS with animated counting */
  private formatTime(totalSeconds: number, completeTime: number, delay: number): string {
    const elapsed = Math.max(0, completeTime - delay);
    const duration = 40;
    const t = Math.min(1, elapsed / duration);
    const eased = 1 - (1 - t) * (1 - t);
    const animatedSeconds = totalSeconds * eased;
    const m = Math.floor(animatedSeconds / 60);
    const s = Math.floor(animatedSeconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
