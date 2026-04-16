import { CONFIG } from '../game/Config.js';
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

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.background = new Background();
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

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, `hsl(${hue}, 70%, ${2 + bp * 3}%)`);
    grad.addColorStop(0.5, `hsl(${hue + 15}, 80%, ${4 + bp * 4}%)`);
    grad.addColorStop(1, `hsl(${hue + 30}, 75%, ${6 + bp * 3}%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Beat flash — whole screen brightens
    if (bp > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${bp * 0.05})`;
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

      if (variety === 4) {
        // Glowing block (every 5th-ish block)
        ctx.fillStyle = `hsla(${hue}, 60%, 20%, 0.9)`;
        ctx.fillRect(sx, sy, U, U);
        ctx.shadowColor = `hsl(${hue}, 70%, 50%)`;
        ctx.shadowBlur = 8 + bp * 6;
        ctx.strokeStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1, sy + 1, U - 2, U - 2);
        ctx.shadowBlur = 0;
        // Inner highlight
        ctx.strokeStyle = `hsla(${hue}, 60%, 60%, 0.2)`;
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 5, sy + 5, U - 10, U - 10);
      } else {
        // Standard 3D beveled block
        ctx.fillStyle = '#0a1628';
        ctx.fillRect(sx, sy, U, U);

        // Light top + left edges
        ctx.fillStyle = '#2a5080';
        ctx.fillRect(sx, sy, U, 3);
        ctx.fillStyle = '#1e4070';
        ctx.fillRect(sx, sy, 3, U);

        // Dark bottom + right edges
        ctx.fillStyle = '#040a14';
        ctx.fillRect(sx, sy + U - 3, U, 3);
        ctx.fillStyle = '#060c1a';
        ctx.fillRect(sx + U - 3, sy, 3, U);

        // Inner cross detail
        ctx.strokeStyle = 'rgba(60, 120, 200, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx + 7, sy + U / 2);
        ctx.lineTo(sx + U - 7, sy + U / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx + U / 2, sy + 7);
        ctx.lineTo(sx + U / 2, sy + U - 7);
        ctx.stroke();

        // Inner border
        ctx.strokeStyle = 'rgba(80, 150, 220, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 5, sy + 5, U - 10, U - 10);

        // Outer border
        ctx.strokeStyle = '#2850a0';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(sx + 0.5, sy + 0.5, U - 1, U - 1);
      }
    }
  }

  // --- Spikes with glow ---

  private drawSpikes(camX: number, groundY: number, level: Level): void {
    const { ctx, canvas } = this;

    for (const spike of level.spikes) {
      const sx = spike.x - camX;
      if (sx > canvas.width + U) break;
      if (sx + U < -U) continue;

      const baseY = groundY - spike.y;
      const tipY = groundY - spike.y - U;

      ctx.shadowColor = '#ff3333';
      ctx.shadowBlur = 10;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(sx + U / 2, tipY);
      ctx.lineTo(sx + U, baseY);
      ctx.lineTo(sx, baseY);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#dd2222';
      ctx.beginPath();
      ctx.moveTo(sx + U / 2, tipY + 7);
      ctx.lineTo(sx + U - 6, baseY - 1);
      ctx.lineTo(sx + 6, baseY - 1);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx + U / 2, tipY + 1);
      ctx.lineTo(sx + U - 1, baseY);
      ctx.moveTo(sx + U / 2, tipY + 1);
      ctx.lineTo(sx + 1, baseY);
      ctx.stroke();
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

  private drawTrail(camX: number, groundY: number, player: Player, scrollSpeed: number): void {
    const { ctx } = this;
    const S = CONFIG.PLAYER_SIZE;
    const hue = this.sectionHue;
    // Speed factor: longer/brighter trail at higher speeds
    const speedFactor = Math.min(2, scrollSpeed / CONFIG.SCROLL_SPEED);

    for (let i = 0; i < player.trail.length; i++) {
      const pos = player.trail[i]!;
      const t = (i + 1) / (player.trail.length + 1);
      const sx = pos.x - camX;
      const sy = groundY - pos.y - S;

      ctx.save();
      ctx.globalAlpha = t * 0.35 * Math.min(1.5, 0.7 + speedFactor * 0.4);
      ctx.translate(sx + S / 2, sy + S / 2);
      if (player.gravityFlipped) ctx.scale(1, -1);
      ctx.rotate(pos.rotation * Math.PI / 180);

      // Trail glow — colour shifts with section hue
      const trailHue = (120 + (hue - 200) * 0.15) % 360; // green-ish shifted by section
      ctx.shadowColor = `hsl(${trailHue}, 100%, 50%)`;
      ctx.shadowBlur = (6 + t * 10) * speedFactor;
      ctx.fillStyle = `hsl(${trailHue}, 100%, 50%)`;

      // Trail shape: squares with slight size decay
      const trailSize = S * (0.6 + t * 0.4);
      ctx.fillRect(-trailSize / 2, -trailSize / 2, trailSize, trailSize);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Continuous glow line connecting trail positions for wave-like feel
    if (player.trail.length > 1) {
      ctx.save();
      ctx.globalAlpha = 0.15 * speedFactor;
      ctx.strokeStyle = `hsl(${(120 + (hue - 200) * 0.15) % 360}, 100%, 50%)`;
      ctx.lineWidth = 2 * speedFactor;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 8 * speedFactor;
      ctx.beginPath();
      for (let i = 0; i < player.trail.length; i++) {
        const pos = player.trail[i]!;
        const px = pos.x - camX + S / 2;
        const py = groundY - pos.y - S / 2;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      // Connect to current player position
      ctx.lineTo(player.x - camX + S / 2, groundY - player.y - S / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  // --- Player cube ---

  private drawPlayer(camX: number, groundY: number, player: Player): void {
    const { ctx } = this;
    const S = CONFIG.PLAYER_SIZE;
    const VS = S + 6;
    const sx = player.x - camX;
    const sy = groundY - player.y - S;

    ctx.save();
    ctx.translate(sx + S / 2, sy + S / 2);
    if (player.gravityFlipped) ctx.scale(1, -1);
    ctx.rotate(player.rotation * Math.PI / 180);

    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = 28;
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(-VS / 2, -VS / 2, VS, VS);
    ctx.shadowBlur = 16;
    ctx.fillRect(-VS / 2, -VS / 2, VS, VS);
    ctx.shadowBlur = 0;

    // Beveled edges
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

    ctx.restore();
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
    const barH = 4;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, 0, w, barH);

    const fillW = Math.min(progress, 1) * w;
    ctx.fillStyle = '#00ff00';
    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = 4;
    ctx.fillRect(0, 0, fillW, barH);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`${Math.floor(Math.min(progress, 1) * 100)}%`, w - 8, barH + 3);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '13px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Attempt ${attempts}`, 10, barH + 3);
  }

  // --- Menu ---

  renderMenu(menuTime: number): void {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#06000f');
    grad.addColorStop(0.5, '#0a0020');
    grad.addColorStop(1, '#0e0025');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    this.background.render(ctx, menuTime * 0.8, w, h);

    ctx.save();
    for (let i = 0; i < 6; i++) {
      const t = menuTime * 0.015 + i * 1.1;
      const fx = w * (0.1 + (i * 0.15) % 0.85);
      const fy = h * 0.3 + Math.sin(t) * 40;
      const s = 15 + i * 5;
      ctx.fillStyle = `rgba(0, 229, 255, ${0.06 + Math.sin(t * 0.7) * 0.03})`;
      ctx.beginPath();
      ctx.moveTo(fx, fy - s);
      ctx.lineTo(fx + s * 0.7, fy);
      ctx.lineTo(fx, fy + s);
      ctx.lineTo(fx - s * 0.7, fy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 40;
    ctx.fillStyle = '#00e5ff';
    const ts = Math.floor(h / 7);
    ctx.font = `bold ${ts}px 'Arial Black', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GEOMETRY DASH', w / 2, h * 0.33);
    ctx.shadowBlur = 20;
    ctx.fillText('GEOMETRY DASH', w / 2, h * 0.33);
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = `${Math.floor(h / 28)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('First Flight', w / 2, h * 0.45);

    const pulse = Math.sin(menuTime * 0.06) * 0.3 + 0.7;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.floor(h / 18)}px Arial, sans-serif`;
    ctx.fillText('Click to Play', w / 2, h * 0.62);
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = `${Math.floor(h / 32)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Space / Click / Tap to jump', w / 2, h * 0.82);
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
  ): void {
    const { ctx, canvas } = this;
    const groundY = camera.groundScreenY;
    const camX = camera.x;

    this.beatPulse = Math.max(0, 1 - beatProgress * 3.5);
    this.sectionHue = this.computeSectionHue(progress);

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

    if (player.gravityFlipped) {
      this.drawGravityCeiling(groundY);
    }

    if (player.alive) {
      this.drawTrail(camX, groundY, player, scrollSpeed);
      this.drawPlayer(camX, groundY, player);
    }

    this.drawParticles(camX, groundY, particles);

    ctx.restore();

    this.drawHUD(progress, attempts);
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

  renderCompleteOverlay(completeTime: number): void {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.5, completeTime * 0.008)})`;
    ctx.fillRect(0, 0, w, h);

    if (completeTime > 15) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (completeTime - 15) * 0.04);
      ctx.shadowColor = '#ffdd00';
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#ffdd00';
      ctx.font = `bold ${Math.floor(h / 7)}px 'Arial Black', Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Level Complete!', w / 2, h * 0.35);
      ctx.restore();

      if (completeTime > 40) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = `${Math.floor(h / 20)}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('100%', w / 2, h * 0.52);
      }
      if (completeTime > 90) {
        ctx.globalAlpha = Math.sin(completeTime * 0.06) * 0.3 + 0.7;
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.floor(h / 24)}px Arial, sans-serif`;
        ctx.fillText('Click to continue', w / 2, h * 0.68);
        ctx.globalAlpha = 1;
      }
    }
  }
}
