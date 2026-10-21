export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  public isMuted: boolean = false;
  private lastFootstepTime: number = 0;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext(): boolean {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return true;
    }
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  public setVolume(vol: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, vol));
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.value = this.isMuted ? 0 : 0.5;
    }
    return this.isMuted;
  }

  // School Bell (Trililiiiim!) for round start/end
  public playSchoolBell() {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const bellFreqs = [587.33, 880.0, 1174.66]; // D5, A5, D6 harmonic chime
    bellFreqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.35 / (idx + 1), now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 1.4);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 1.5);
    });

    // Rapid double chime
    setTimeout(() => {
      if (!this.ctx || !this.masterGain) return;
      const t2 = this.ctx.currentTime;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, t2);
      gain2.gain.setValueAtTime(0.3, t2);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 1.2);
      osc2.connect(gain2);
      gain2.connect(this.masterGain);
      osc2.start(t2);
      osc2.stop(t2 + 1.2);
    }, 280);
  }

  // Weapon Disparos
  public playShoot(weaponId: string) {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    switch (weaponId) {
      case 'highlighter_pistol': {
        // High-pitched laser chirp
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(450, now + 0.09);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.11);
        break;
      }

      case 'stapler_heavy': {
        // Heavy metallic snap + low thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

        // Click transient
        const noise = this.createNoiseBuffer(0.04);
        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = noise;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

        noiseNode.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        noiseNode.start(now);
        osc.stop(now + 0.17);
        break;
      }

      case 'paper_rifle_m4': {
        // Rapid pneumatic pop + paper flutter
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(550, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

        const noise = this.createNoiseBuffer(0.05);
        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = noise;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, now);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        noiseNode.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        noiseNode.start(now);
        osc.stop(now + 0.1);
        break;
      }

      case 'telescopic_awp': {
        // Massive supersonic crack + brass twang
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        const noise = this.createNoiseBuffer(0.12);
        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = noise;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.9, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        noiseNode.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        noiseNode.start(now);
        osc.stop(now + 0.42);
        break;
      }

      case 'glue_shotgun': {
        // Dispersive glue explosion burst
        const noise = this.createNoiseBuffer(0.16);
        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = noise;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noiseNode.start(now);
        break;
      }

      case 'ruler_melee': {
        // Sharp ruler swoosh
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.12);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.13);
        break;
      }

      default: {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.1);
      }
    }
  }

  public playReload() {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Slide out
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(400, now);
    osc1.frequency.linearRampToValueAtTime(200, now + 0.15);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.17);

    // Click in (0.35s later)
    setTimeout(() => {
      if (!this.ctx || !this.masterGain) return;
      const t2 = this.ctx.currentTime;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(800, t2);
      osc2.frequency.linearRampToValueAtTime(450, t2 + 0.08);
      gain2.gain.setValueAtTime(0.25, t2);
      gain2.gain.exponentialRampToValueAtTime(0.01, t2 + 0.09);
      osc2.connect(gain2);
      gain2.connect(this.masterGain);
      osc2.start(t2);
      osc2.stop(t2 + 0.1);
    }, 350);
  }

  public playHit(isHeadshot: boolean = false) {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isHeadshot ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isHeadshot ? 1760 : 880, now);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + (isHeadshot ? 0.22 : 0.08));

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + (isHeadshot ? 0.25 : 0.09));
  }

  public playFootstep() {
    const now = Date.now();
    if (now - this.lastFootstepTime < 320) return;
    this.lastFootstepTime = now;

    if (this.isMuted || !this.initContext() || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.06);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  public playFlashbang() {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // High tinnitus ringing sound (3100Hz)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(3100, now);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 3.3);
  }

  private createNoiseBuffer(duration: number): AudioBuffer {
    const bufferSize = this.ctx!.sampleRate * duration;
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}

export const soundManager = new SoundManager();
