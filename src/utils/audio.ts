import { GameSettings } from '../types/game';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicInterval: number | null = null;
  private musicStep = 0;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play a quick retro jump sound (ascending frequency)
  playJump(settings: GameSettings) {
    if (!settings.soundEnabled || settings.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'square';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);

      const vol = (settings.soundVolume / 100) * 0.25;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // ignore audio context failures
    }
  }

  // Duck / swoosh sound
  playDuck(settings: GameSettings) {
    if (!settings.soundEnabled || settings.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.09);

      const vol = (settings.soundVolume / 100) * 0.2;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.11);
    } catch {}
  }

  // Score milestone chime (ping-ping!)
  playScoreMilestone(settings: GameSettings) {
    if (!settings.soundEnabled || settings.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const vol = (settings.soundVolume / 100) * 0.25;

      const playTone = (freq: number, start: number, duration: number) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + duration + 0.02);
      };

      playTone(587.33, now, 0.08); // D5
      playTone(880, now + 0.09, 0.14); // A5
    } catch {}
  }

  // Collision / Crash sound
  playCrash(settings: GameSettings) {
    if (!settings.soundEnabled || settings.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const vol = (settings.soundVolume / 100) * 0.35;

      // Descending noisy crunch
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  // Victory Fanfare for The Dino King!
  playVictory(settings: GameSettings) {
    if (!settings.soundEnabled || settings.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const notes = [
        { freq: 440, duration: 0.12 }, // A4
        { freq: 554.37, duration: 0.12 }, // C#5
        { freq: 659.25, duration: 0.14 }, // E5
        { freq: 880, duration: 0.4 } // A5
      ];
      let t = this.ctx.currentTime;
      const vol = (settings.soundVolume / 100) * 0.3;

      for (const n of notes) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.freq, t);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + n.duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + n.duration + 0.02);
        t += n.duration;
      }
    } catch {}
  }

  // Subtle UI click
  playClick(settings: GameSettings) {
    if (!settings.soundEnabled || settings.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
      gain.gain.setValueAtTime((settings.soundVolume / 100) * 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  // Retro 8-bit dynamic rhythmic background music
  startMusic(settings: GameSettings, speedMultiplier = 1) {
    this.stopMusic();
    if (!settings.musicEnabled || settings.musicVolume <= 0) return;

    this.initCtx();
    if (!this.ctx) return;

    const melody = [
      130.81, 0, 146.83, 164.81, 0, 130.81, 196.00, 164.81,
      146.83, 164.81, 130.81, 0, 164.81, 196.00, 220.00, 196.00
    ];

    const intervalMs = Math.max(90, Math.floor(160 / Math.max(1, speedMultiplier)));

    this.musicInterval = window.setInterval(() => {
      if (!this.ctx || !settings.musicEnabled || settings.musicVolume <= 0) return;
      const freq = melody[this.musicStep % melody.length];
      this.musicStep++;

      if (freq > 0) {
        try {
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);

          const vol = (settings.musicVolume / 100) * 0.08;
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + (intervalMs / 1000) * 0.85);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + intervalMs / 1000);
        } catch {}
      }
    }, intervalMs);
  }

  stopMusic() {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const soundEngine = new SoundEngine();
