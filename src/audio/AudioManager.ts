/**
 * Procedural electronic music using Web Audio API.
 * 128 BPM with kick, snare, hi-hat, bass, and synth pad.
 * Exposes beat timing for visual sync.
 */

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private startTime = 0;
  private _playing = false;

  readonly BPM = 128;
  readonly beatDuration = 60 / 128; // ~0.469s per beat

  get playing(): boolean {
    return this._playing;
  }

  /** Continuous beat counter (e.g. 4.75 = three quarters through beat 4) */
  get currentBeat(): number {
    if (!this._playing || !this.ctx) return 0;
    const elapsed = this.ctx.currentTime - this.startTime;
    return Math.max(0, elapsed / this.beatDuration);
  }

  /** 0-1 progress within current beat (0 = beat start, 1 = next beat) */
  get beatProgress(): number {
    const b = this.currentBeat;
    return b - Math.floor(b);
  }

  start(): void {
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch {
      return; // Audio not available
    }

    // Kill previous audio instantly
    if (this.masterGain) {
      try {
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.masterGain.disconnect();
      } catch { /* ignore */ }
    }

    // Fresh output chain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.55, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.startTime = this.ctx.currentTime + 0.02;
    this._playing = true;
    this.scheduleTrack();
  }

  stop(): void {
    this._playing = false;
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.masterGain.disconnect();
      } catch { /* ignore */ }
      this.masterGain = null;
    }
  }

  // ================================================================
  // Track scheduling — pre-schedule all beats for the level
  // ================================================================

  private scheduleTrack(): void {
    const ctx = this.ctx!;
    const dest = this.masterGain!;
    const bd = this.beatDuration;
    const totalBeats = 100; // ~47s at 128BPM, covers full level

    // Chord progression: Cm → Ab → Eb → Bb (repeating every 4 bars / 16 beats)
    const bassRoots = [65.41, 51.91, 77.78, 58.27];
    const chords = [
      [130.81, 155.56, 196.00], // Cm: C3, Eb3, G3
      [103.83, 130.81, 155.56], // Ab: Ab2, C3, Eb3
      [155.56, 196.00, 233.08], // Eb: Eb3, G3, Bb3
      [116.54, 146.83, 174.61], // Bb: Bb2, D3, F3
    ];

    for (let beat = 0; beat < totalBeats; beat++) {
      const t = this.startTime + beat * bd;
      const inMeasure = beat % 4;
      const chordIdx = Math.floor(beat / 4) % 4;

      // Kick on beats 1 & 3
      if (inMeasure === 0 || inMeasure === 2) {
        this.kick(ctx, dest, t);
      }

      // Snare on beats 2 & 4
      if (inMeasure === 1 || inMeasure === 3) {
        this.snare(ctx, dest, t);
      }

      // Hi-hat on every beat + off-beat (8th notes)
      this.hihat(ctx, dest, t, 0.10);
      this.hihat(ctx, dest, t + bd / 2, 0.05);

      // Bass on every beat
      this.bass(ctx, dest, t, bassRoots[chordIdx]!);

      // Synth pad on measure start (every 4 beats)
      if (inMeasure === 0) {
        this.pad(ctx, dest, t, chords[chordIdx]!, bd * 4);
      }
    }
  }

  // ================================================================
  // Instrument voices
  // ================================================================

  private kick(ctx: AudioContext, dest: AudioNode, t: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);
    gain.gain.setValueAtTime(0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain).connect(dest);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  private snare(ctx: AudioContext, dest: AudioNode, t: number): void {
    // Tonal body
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(dest);
    osc.start(t);
    osc.stop(t + 0.12);

    // Noise-like component (high-freq sawtooth through bandpass)
    const noise = ctx.createOscillator();
    const nGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    noise.type = 'sawtooth';
    noise.frequency.setValueAtTime(6500, t);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4000, t);
    filter.Q.setValueAtTime(0.8, t);
    nGain.gain.setValueAtTime(0.15, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    noise.connect(filter).connect(nGain).connect(dest);
    noise.start(t);
    noise.stop(t + 0.1);
  }

  private hihat(ctx: AudioContext, dest: AudioNode, t: number, vol: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'square';
    osc.frequency.setValueAtTime(8500, t);
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(filter).connect(gain).connect(dest);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  private bass(ctx: AudioContext, dest: AudioNode, t: number, freq: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.2);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.setValueAtTime(0.25, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(filter).connect(gain).connect(dest);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  private pad(ctx: AudioContext, dest: AudioNode, t: number, freqs: number[], dur: number): void {
    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.045, t + 0.3);
      gain.gain.setValueAtTime(0.045, t + dur - 0.3);
      gain.gain.linearRampToValueAtTime(0.001, t + dur);
      osc.connect(filter).connect(gain).connect(dest);
      osc.start(t);
      osc.stop(t + dur + 0.01);
    }
  }
}
