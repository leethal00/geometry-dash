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

  // Per-frame state set in renderGameplay
  private beatPulse = 0;
  private levelProgress = 0;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.background = new Background();
  }

  // --- Dynamic background gradient with beat pulse and hue shift ---

  private drawGradient(): void {
    const { ctx, canvas } = this;
    const hue = 270 + this.levelProgress * 80;
    const bp = this.beatPulse;

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, `hsl(${hue}, 60%, ${3 + bp * 2}%)`);
    grad.addColorStop(0.6, `hsl(${hue + 10}, 70%, ${5 + bp * 3}%)`);
    grad.addColorStop(1, `hsl(${hue + 20}, 65%, ${7 + bp * 2}%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // --- Ground rendering with beat-pulsing glow ---

  private drawGround(camX: number, groundY: number, level: Level): void {
    const { ctx, canvas } = this;
    const groundH = canvas.height - groundY;
    const bp = this.beatPulse;

    // Draw solid ground segments with checker pattern
    for (const seg of level.groundSegments) {
      const startCol = Math.floor(seg.startPx / U);
      const endCol = Math.ceil(seg.endPx / U);

      for (let col = startCol; col < endCol; col++) {
        const wx = col * U;
        const sx = wx - camX;
        if (sx > canvas.width + U || sx + U < 0) continue;

        ctx.fillStyle = col % 2 === 0 ? '#0d1b2a' : '#0f2035';
        ctx.fillRect(sx, groundY, U, groundH);
      }
    }

    // Horizontal grid lines in ground
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let row = 1; row * U < groundH; row++) {
      const ly = groundY + row * U;
      ctx.beginPath();
      ctx.moveTo(0, ly);
      ctx.lineTo(canvas.width, ly);
      ctx.stroke();
    }

    // Neon ground top line — pulses on beat
    const glowBlur = 8 + bp * 14;
    const lineAlpha = 1;
    ctx.strokeStyle = `rgba(0, 229, 255, ${lineAlpha})`;
    ctx.lineWidth = 2 + bp * 1.5;
    ctx.shadowColor = '#00e5ff';
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
    ctx.shadowBlur = 0;

    // Vertical lines at gap edges
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 6;
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

  // --- Block rendering ---

  private drawBlocks(camX: number, groundY: number, level: Level): void {
    const { ctx, canvas } = this;

    for (const block of level.blocks) {
      const sx = block.x - camX;
      if (sx > canvas.width + U) break;
      if (sx + U < -U) continue;

      const sy = groundY - block.y - U;

      ctx.fillStyle = '#1a2a4a';
      ctx.fillRect(sx, sy, U, U);

      ctx.strokeStyle = '#3060a0';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx + 1, sy + 1, U - 2, U - 2);

      ctx.strokeStyle = 'rgba(80, 120, 200, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + 4, sy + 4, U - 8, U - 8);
    }
  }

  // --- Spike rendering ---

  private drawSpikes(camX: number, groundY: number, level: Level): void {
    const { ctx, canvas } = this;

    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 6;

    for (const spike of level.spikes) {
      const sx = spike.x - camX;
      if (sx > canvas.width + U) break;
      if (sx + U < -U) continue;

      const baseY = groundY - spike.y;
      const tipY = groundY - spike.y - U;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(sx + U / 2, tipY);
      ctx.lineTo(sx + U - 3, baseY);
      ctx.lineTo(sx + 3, baseY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#cc3333';
      ctx.beginPath();
      ctx.moveTo(sx + U / 2, tipY + 8);
      ctx.lineTo(sx + U - 9, baseY - 2);
      ctx.lineTo(sx + 9, baseY - 2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.shadowBlur = 0;
  }

  // --- Jump pad rendering (beat-enhanced glow) ---

  private drawJumpPads(camX: number, groundY: number, level: Level): void {
    const { ctx, canvas } = this;
    const padH = U * 0.4;
    const bp = this.beatPulse;

    for (const pad of level.jumpPads) {
      const sx = pad.x - camX;
      if (sx > canvas.width + U) break;
      if (sx + U < -U) continue;

      const sy = groundY - pad.y - padH;

      // Glow pulses on beat
      ctx.shadowColor = '#ffdd00';
      ctx.shadowBlur = 10 + bp * 12;
      ctx.fillStyle = `rgb(${255}, ${221 + bp * 34}, ${bp * 60})`;
      ctx.fillRect(sx + 2, sy, U - 4, padH);

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#cc9900';
      ctx.fillRect(sx + 5, sy + 2, U - 10, padH - 6);

      // Upward arrow
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      const cx = sx + U / 2;
      ctx.moveTo(cx, sy + 3);
      ctx.lineTo(cx + 7, sy + padH - 4);
      ctx.lineTo(cx - 7, sy + padH - 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- Jump orb rendering (beat-enhanced pulse) ---

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

      // Pulse synced to beat + gentle sine
      const pulse = (Math.sin(now * 0.004 + i) * 0.1 + 1) + bp * 0.15;
      const radius = (U * 0.35) * pulse;
      const ringRadius = (U * 0.5) * pulse;
      const alpha = used ? 0.2 : 1;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Outer ring
      ctx.strokeStyle = '#ffdd00';
      ctx.lineWidth = 2 + bp * 1.5;
      ctx.shadowColor = '#ffdd00';
      ctx.shadowBlur = used ? 0 : 12 + bp * 10;
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner circle
      ctx.fillStyle = '#ffdd00';
      ctx.shadowBlur = used ? 0 : 18 + bp * 8;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(cx - radius * 0.25, cy - radius * 0.25, radius * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // --- Gravity portal rendering (beat-enhanced) ---

  private drawGravityPortals(camX: number, groundY: number, level: Level): void {
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

      // Gradient body
      const grad = ctx.createLinearGradient(sx, sy, sx, sy + portalH);
      grad.addColorStop(0, `rgba(0, ${100 + bp * 60}, 255, ${0.7 + bp * 0.2})`);
      grad.addColorStop(0.4, `rgba(0, ${200 + bp * 55}, 255, ${0.8 + bp * 0.15})`);
      grad.addColorStop(0.6, `rgba(255, ${220 + bp * 35}, 0, ${0.8 + bp * 0.15})`);
      grad.addColorStop(1, `rgba(255, ${180 + bp * 40}, 0, ${0.7 + bp * 0.2})`);

      ctx.shadowColor = '#00aaff';
      ctx.shadowBlur = 20 + bp * 15;
      ctx.fillStyle = grad;
      ctx.fillRect(sx, sy, portalW, portalH);

      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + bp * 0.3})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, portalW, portalH);

      // Animated particles inside
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 4;
      for (let p = 0; p < 6; p++) {
        const t = (now * 0.002 + p * 1.2) % 1;
        const px = sx + portalW * (0.2 + Math.sin(now * 0.001 + p * 2) * 0.3 + 0.3);
        const py = sy + portalH * t;
        const pSize = 2 + Math.sin(now * 0.003 + p) * 1;
        const pAlpha = Math.sin(t * Math.PI) * 0.8;

        ctx.fillStyle = `rgba(255, 255, 255, ${pAlpha})`;
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
  }

  // --- Ceiling rendering (when gravity is flipped) ---

  private drawCeiling(groundY: number): void {
    const { ctx, canvas } = this;
    const ceilScreenY = groundY - CONFIG.CEILING_HEIGHT;

    ctx.fillStyle = 'rgba(13, 27, 42, 0.8)';
    ctx.fillRect(0, 0, canvas.width, ceilScreenY);

    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 2 + this.beatPulse * 1.5;
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 8 + this.beatPulse * 10;
    ctx.beginPath();
    ctx.moveTo(0, ceilScreenY);
    ctx.lineTo(canvas.width, ceilScreenY);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // --- Player trail ---

  private drawTrail(camX: number, groundY: number, player: Player): void {
    const { ctx } = this;
    const S = CONFIG.PLAYER_SIZE;
    const trail = player.trail;

    for (let i = 0; i < trail.length; i++) {
      const pos = trail[i]!;
      const alpha = ((i + 1) / (trail.length + 1)) * 0.25;
      const sx = pos.x - camX;
      const sy = groundY - pos.y - S;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(sx + S / 2, sy + S / 2);
      if (player.gravityFlipped) ctx.scale(1, -1);
      ctx.rotate(pos.rotation * Math.PI / 180);
      ctx.fillStyle = '#40ff40';
      ctx.fillRect(-S / 2, -S / 2, S, S);
      ctx.restore();
    }
  }

  // --- Player rendering ---

  private drawPlayer(camX: number, groundY: number, player: Player): void {
    const { ctx } = this;
    const S = CONFIG.PLAYER_SIZE;
    const sx = player.x - camX;
    const sy = groundY - player.y - S;

    ctx.save();
    ctx.translate(sx + S / 2, sy + S / 2);

    if (player.gravityFlipped) {
      ctx.scale(1, -1);
    }

    ctx.rotate(player.rotation * Math.PI / 180);

    // Glow
    ctx.shadowColor = '#40ff40';
    ctx.shadowBlur = 18;

    // Body
    ctx.fillStyle = '#40ff40';
    ctx.fillRect(-S / 2, -S / 2, S, S);

    // Border
    ctx.strokeStyle = '#80ffa0';
    ctx.lineWidth = 2;
    ctx.strokeRect(-S / 2, -S / 2, S, S);

    // Eye (face like GD cube)
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    const eyeSize = S * 0.28;
    const eyeX = S * 0.05;
    const eyeY = -S * 0.08;
    ctx.fillRect(eyeX - eyeSize / 2, eyeY - eyeSize / 2, eyeSize, eyeSize);

    // Pupil
    ctx.fillStyle = '#111111';
    const pupilSize = eyeSize * 0.5;
    ctx.fillRect(eyeX + 1, eyeY - pupilSize / 2, pupilSize, pupilSize);

    ctx.restore();
  }

  // --- Particle rendering ---

  private drawParticles(camX: number, groundY: number, particles: ParticleSystem): void {
    const { ctx } = this;

    for (const p of particles.particles) {
      const sx = p.x - camX;
      const sy = groundY - p.y - p.size;
      const alpha = (p.life / p.maxLife) * 0.9;

      ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${alpha})`;
      ctx.shadowColor = `rgba(${p.r}, ${p.g}, ${p.b}, ${alpha * 0.5})`;
      ctx.shadowBlur = 6;
      ctx.fillRect(sx, sy, p.size, p.size);
    }
    ctx.shadowBlur = 0;
  }

  // --- HUD ---

  private drawHUD(progress: number, attempts: number): void {
    const { ctx, canvas } = this;
    const w = canvas.width;

    const barY = 16;
    const barH = 6;
    const barPad = 40;
    const barW = w - barPad * 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(barPad, barY, barW, barH);

    const fillW = Math.min(progress, 1) * barW;
    ctx.fillStyle = '#40ff40';
    ctx.shadowColor = '#40ff40';
    ctx.shadowBlur = 6;
    ctx.fillRect(barPad, barY, fillW, barH);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '13px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`${Math.floor(Math.min(progress, 1) * 100)}%`, w - barPad, barY + barH + 4);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '14px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Attempt ${attempts}`, barPad, barY + barH + 4);
  }

  // --- Menu screen ---

  renderMenu(menuTime: number): void {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    // Static gradient for menu
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0015');
    grad.addColorStop(0.6, '#0d0028');
    grad.addColorStop(1, '#12002a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    this.background.render(ctx, menuTime * 0.8, w, h);

    // Floating geometric decorations
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

    // Title with glow
    ctx.save();
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 40;
    ctx.fillStyle = '#00e5ff';
    const titleSize = Math.floor(h / 7);
    ctx.font = `bold ${titleSize}px 'Arial Black', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GEOMETRY DASH', w / 2, h * 0.33);
    ctx.shadowBlur = 20;
    ctx.fillText('GEOMETRY DASH', w / 2, h * 0.33);
    ctx.restore();

    // Subtitle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = `${Math.floor(h / 28)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('First Flight', w / 2, h * 0.45);

    // Pulsing "Click to Play"
    const pulse = Math.sin(menuTime * 0.06) * 0.3 + 0.7;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.floor(h / 18)}px Arial, sans-serif`;
    ctx.fillText('Click to Play', w / 2, h * 0.62);
    ctx.restore();

    // Controls hint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = `${Math.floor(h / 32)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Space / Click / Tap to jump', w / 2, h * 0.82);
  }

  // --- Gameplay rendering ---

  renderGameplay(
    camera: Camera,
    player: Player,
    level: Level,
    particles: ParticleSystem,
    progress: number,
    attempts: number,
    usedOrbs: Set<number>,
    beatProgress: number,
  ): void {
    const { ctx, canvas } = this;
    const groundY = camera.groundScreenY;
    const camX = camera.x;

    // Store beat state for private methods
    this.beatPulse = Math.max(0, 1 - beatProgress * 3.5);
    this.levelProgress = progress;

    // Background with beat pulse and hue shift
    this.drawGradient();
    this.background.render(ctx, camX, canvas.width, canvas.height, beatProgress, progress);

    // World rendering with shake
    ctx.save();
    ctx.translate(camera.shakeX, camera.shakeY);

    this.drawGround(camX, groundY, level);
    this.drawBlocks(camX, groundY, level);
    this.drawSpikes(camX, groundY, level);
    this.drawJumpPads(camX, groundY, level);
    this.drawJumpOrbs(camX, groundY, level, usedOrbs);
    this.drawGravityPortals(camX, groundY, level);

    if (player.gravityFlipped) {
      this.drawCeiling(groundY);
    }

    if (player.alive) {
      this.drawTrail(camX, groundY, player);
      this.drawPlayer(camX, groundY, player);
    }

    this.drawParticles(camX, groundY, particles);

    ctx.restore();

    // HUD (no shake)
    this.drawHUD(progress, attempts);
  }

  // --- Death overlay: white flash then dim ---

  renderDeathOverlay(deathTimer: number): void {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    const elapsed = CONFIG.DEATH_PAUSE_TICKS - deathTimer;

    // White flash for first 6 ticks (~100ms)
    if (elapsed < 6) {
      const flashAlpha = Math.max(0, (1 - elapsed / 6) * 0.6);
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Slight background dim
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(0, 0, w, h);
  }

  // --- Complete overlay ---

  renderCompleteOverlay(completeTime: number): void {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    const alpha = Math.min(0.5, completeTime * 0.008);
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, w, h);

    if (completeTime > 15) {
      const textAlpha = Math.min(1, (completeTime - 15) * 0.04);
      ctx.save();
      ctx.globalAlpha = textAlpha;
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
        const pulse = Math.sin(completeTime * 0.06) * 0.3 + 0.7;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.floor(h / 24)}px Arial, sans-serif`;
        ctx.fillText('Click to continue', w / 2, h * 0.68);
        ctx.globalAlpha = 1;
      }
    }
  }
}
