/**
 * Procedural electronic music using Web Audio API.
 * 128 BPM with kick, snare, hi-hat, bass, and synth pad.
 * Exposes beat timing for visual sync.
 */

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserData: Uint8Array<ArrayBuffer> | null = null;
  private startTime = 0;
  private _playing = false;

  readonly BPM = 128;
  readonly beatDuration = 60 / 128; // ~0.469s per beat

  /** Audio energy level 0-1 (smoothed RMS from analyser) */
  private _energy = 0;
  /** Bass energy level 0-1 (low frequency band) */
  private _bassEnergy = 0;
  /** Whether a bass drop is currently active */
  private _bassDropActive = false;
  /** Bass drop intensity 0-1 (decays after trigger) */
  private _bassDropIntensity = 0;
  /** Cooldown to prevent rapid bass drop triggers */
  private _bassDropCooldown = 0;
  /** Previous bass energy for drop detection */
  private _prevBassEnergy = 0;

  get playing(): boolean {
    return this._playing;
  }

  /** Overall audio energy 0-1 */
  get energy(): number {
    return this._energy;
  }

  /** Bass frequency energy 0-1 */
  get bassEnergy(): number {
    return this._bassEnergy;
  }

  /** Bass drop intensity 0-1, high when bass drop just hit */
  get bassDropIntensity(): number {
    return this._bassDropIntensity;
  }

  /** Whether a bass drop is currently active */
  get bassDropActive(): boolean {
    return this._bassDropActive;
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

  /** Update audio analysis — call once per frame */
  updateAnalysis(): void {
    if (!this._playing || !this.analyser || !this.analyserData) {
      this._energy = 0;
      this._bassEnergy = 0;
      this._bassDropIntensity *= 0.92;
      if (this._bassDropIntensity < 0.01) {
        this._bassDropIntensity = 0;
        this._bassDropActive = false;
      }
      return;
    }

    this.analyser.getByteFrequencyData(this.analyserData);
    const data = this.analyserData;
    const len = data.length;

    // Overall RMS energy
    let sum = 0;
    for (let i = 0; i < len; i++) {
      const v = data[i]! / 255;
      sum += v * v;
    }
    this._energy = Math.sqrt(sum / len);

    // Bass energy (first ~15% of frequency bins)
    const bassEnd = Math.floor(len * 0.15);
    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) {
      const v = data[i]! / 255;
      bassSum += v * v;
    }
    this._bassEnergy = Math.sqrt(bassSum / bassEnd);

    // Bass drop detection: sudden spike in bass energy
    if (this._bassDropCooldown > 0) {
      this._bassDropCooldown--;
    } else {
      const bassJump = this._bassEnergy - this._prevBassEnergy;
      // Trigger bass drop on strong kick beats (beat 0 and 2 of each measure)
      const beat = this.currentBeat;
      const inMeasure = beat % 4;
      const nearKick = (inMeasure < 0.15 || (inMeasure > 1.95 && inMeasure < 2.15));
      if (bassJump > 0.15 && this._bassEnergy > 0.4 && nearKick) {
        this._bassDropActive = true;
        this._bassDropIntensity = 1;
        this._bassDropCooldown = 30; // ~0.5s at 60fps
      }
    }

    this._prevBassEnergy = this._bassEnergy;

    // Decay bass drop
    if (this._bassDropIntensity > 0) {
      this._bassDropIntensity *= 0.92;
      if (this._bassDropIntensity < 0.01) {
        this._bassDropIntensity = 0;
        this._bassDropActive = false;
      }
    }
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

    // Fresh output chain with analyser
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.55, this.ctx.currentTime);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyserData = new Uint8Array(this.analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

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
