export type MusicTheme = 'menu' | 'forest' | 'caves' | 'castle' | 'boss';
export type SoundEffect =
  | 'ui'
  | 'step'
  | 'jump'
  | 'coin'
  | 'crystal'
  | 'enemyStomp'
  | 'hurt'
  | 'portalLocked'
  | 'portalOpen'
  | 'pause'
  | 'resume'
  | 'bossSpawn'
  | 'bossShoot'
  | 'bossHit'
  | 'bossDefeat'
  | 'levelComplete'
  | 'gameOver'
  | 'reset';

interface ThemeDefinition {
  bpm: number;
  lead: Array<number | null>;
  bass: Array<number | null>;
  leadWave: OscillatorType;
  kick: number[];
  hat: number[];
}

const AUDIO_SETTING_KEY = 'pixelquest.v1.muted';
const midiToFrequency = (note: number): number => 440 * Math.pow(2, (note - 69) / 12);

// Original compact chiptune phrases written specifically for Pixel Quest.
const THEMES: Record<MusicTheme, ThemeDefinition> = {
  menu: {
    bpm: 104,
    lead: [72, null, 76, null, 79, null, 76, 74, 72, null, 79, null, 81, 79, 76, null],
    bass: [48, null, null, null, 43, null, null, null, 45, null, null, null, 47, null, null, null],
    leadWave: 'triangle', kick: [0, 8], hat: [3, 7, 11, 15]
  },
  forest: {
    bpm: 138,
    lead: [72, 76, 79, null, 81, 79, 76, 74, 72, 74, 76, 79, 76, 74, 72, null],
    bass: [48, null, 48, null, 53, null, 55, null, 45, null, 48, null, 43, null, 47, null],
    leadWave: 'square', kick: [0, 4, 8, 12], hat: [2, 6, 10, 14]
  },
  caves: {
    bpm: 112,
    lead: [69, null, 72, 68, null, 65, 63, null, 69, 72, null, 74, 72, 68, 65, null],
    bass: [45, null, null, 44, null, null, 41, null, 45, null, null, 48, null, 44, null, null],
    leadWave: 'sine', kick: [0, 6, 8, 14], hat: [3, 7, 11, 15]
  },
  castle: {
    bpm: 150,
    lead: [76, 79, 83, 81, 79, 76, 74, 76, 79, 83, 86, 83, 81, 79, 76, null],
    bass: [52, null, 47, null, 48, null, 50, null, 52, null, 55, null, 50, null, 47, null],
    leadWave: 'square', kick: [0, 4, 8, 12], hat: [1, 3, 5, 7, 9, 11, 13, 15]
  },
  boss: {
    bpm: 174,
    lead: [64, 63, 64, 67, 66, 63, 61, 63, 64, 67, 68, 67, 64, 63, 59, 61],
    bass: [40, null, 40, 39, 40, null, 35, 39, 40, null, 43, 42, 40, null, 35, 37],
    leadWave: 'sawtooth', kick: [0, 3, 4, 8, 11, 12], hat: [2, 6, 10, 14]
  }
};

export class PixelAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private musicBus?: GainNode;
  private sfxBus?: GainNode;
  private noiseBuffer?: AudioBuffer;
  private muted = localStorage.getItem(AUDIO_SETTING_KEY) === 'true';
  private theme?: MusicTheme;
  private musicTimer?: number;
  private musicStep = 0;
  private nextMusicNoteAt = 0;
  private ducked = false;

  get isMuted(): boolean { return this.muted; }

  async unlock(): Promise<void> {
    this.ensureContext();
    if (!this.context) return;
    if (this.context.state !== 'running') await this.context.resume();
    if (this.theme && this.musicTimer === undefined) this.startSequencer();
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    localStorage.setItem(AUDIO_SETTING_KEY, String(this.muted));
    this.updateMasterVolume();
    if (!this.muted) void this.unlock();
    return this.muted;
  }

  playMusic(theme: MusicTheme): void {
    if (this.theme === theme && this.musicTimer !== undefined) return;
    this.theme = theme;
    this.musicStep = 0;
    this.stopSequencer();
    void this.unlock().catch(() => undefined);
  }

  stopMusic(): void {
    this.theme = undefined;
    this.stopSequencer();
  }

  setDucked(ducked: boolean): void {
    this.ducked = ducked;
    if (!this.context || !this.musicBus) return;
    const now = this.context.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setTargetAtTime(ducked ? 0.055 : 0.2, now, 0.08);
  }

  play(effect: SoundEffect, variant = 0): void {
    this.ensureContext();
    if (!this.context || !this.sfxBus || this.muted || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    switch (effect) {
      case 'ui':
        this.tone(660, now, 0.055, 'triangle', 0.13, 790); break;
      case 'step':
        this.noise(now, 0.035, 0.035, 330 + variant * 90);
        this.tone(88 + variant * 8, now, 0.045, 'square', 0.025, 70); break;
      case 'jump':
        this.tone(270, now, 0.14, 'square', 0.12, 610); break;
      case 'coin':
        this.tone(920, now, 0.065, 'square', 0.11, 1160);
        this.tone(1450, now + 0.055, 0.095, 'square', 0.1, 1760); break;
      case 'crystal':
        this.sequence([659, 880, 1109, 1319], now, 0.075, 'triangle', 0.12); break;
      case 'enemyStomp':
        this.noise(now, 0.065, 0.12, 520);
        this.tone(170, now, 0.13, 'square', 0.15, 65); break;
      case 'hurt':
        this.noise(now, 0.12, 0.12, 900);
        this.tone(340, now, 0.27, 'sawtooth', 0.16, 82); break;
      case 'portalLocked':
        this.tone(154, now, 0.13, 'square', 0.1, 112);
        this.tone(122, now + 0.13, 0.13, 'square', 0.09, 96); break;
      case 'portalOpen':
        this.sequence([440, 659, 880, 1175], now, 0.085, 'triangle', 0.11); break;
      case 'pause':
        this.sequence([523, 392], now, 0.09, 'triangle', 0.1); break;
      case 'resume':
        this.sequence([392, 587], now, 0.08, 'triangle', 0.1); break;
      case 'bossSpawn':
        this.tone(190, now, 0.7, 'sawtooth', 0.14, 48);
        this.sequence([220, 185, 147], now + 0.08, 0.15, 'square', 0.09); break;
      case 'bossShoot':
        this.tone(150, now, 0.19, 'sawtooth', 0.095, 520); break;
      case 'bossHit':
        this.noise(now, 0.09, 0.15, 700);
        this.tone(145, now, 0.17, 'square', 0.16, 58); break;
      case 'bossDefeat':
        this.sequence([196, 247, 294, 392, 494, 659], now, 0.115, 'square', 0.12); break;
      case 'levelComplete':
        this.sequence([523, 659, 784, 1047, 784, 1047], now, 0.11, 'triangle', 0.13); break;
      case 'gameOver':
        this.sequence([392, 330, 262, 196], now, 0.19, 'square', 0.1); break;
      case 'reset':
        this.sequence([520, 390, 260], now, 0.075, 'triangle', 0.09); break;
    }
  }

  private ensureContext(): void {
    if (this.context) return;
    try {
      this.context = new AudioContext({ latencyHint: 'interactive' });
      this.master = this.context.createGain();
      this.musicBus = this.context.createGain();
      this.sfxBus = this.context.createGain();
      this.musicBus.gain.value = this.ducked ? 0.055 : 0.2;
      this.sfxBus.gain.value = 0.72;
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.context.destination);
      this.updateMasterVolume();
      this.noiseBuffer = this.makeNoiseBuffer();
    } catch {
      this.context = undefined;
    }
  }

  private updateMasterVolume(): void {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.muted ? 0.0001 : 0.78, now, 0.025);
  }

  private tone(frequency: number, start: number, duration: number, wave: OscillatorType, volume: number, endFrequency = frequency, destination = this.sfxBus): void {
    if (!this.context || !destination) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private sequence(frequencies: number[], start: number, noteLength: number, wave: OscillatorType, volume: number): void {
    frequencies.forEach((frequency, index) => this.tone(frequency, start + index * noteLength * 0.88, noteLength, wave, volume));
  }

  private makeNoiseBuffer(): AudioBuffer | undefined {
    if (!this.context) return undefined;
    const buffer = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index++) channel[index] = Math.random() * 2 - 1;
    return buffer;
  }

  private noise(start: number, duration: number, volume: number, frequency: number, destination = this.sfxBus): void {
    if (!this.context || !destination || !this.noiseBuffer) return;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 0.8;
    gain.gain.setValueAtTime(Math.max(0.0001, volume), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(start, Math.random() * 0.75, duration);
  }

  private startSequencer(): void {
    if (!this.context || !this.theme || this.musicTimer !== undefined) return;
    this.nextMusicNoteAt = this.context.currentTime + 0.04;
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 45);
    this.scheduleMusic();
  }

  private stopSequencer(): void {
    if (this.musicTimer !== undefined) window.clearInterval(this.musicTimer);
    this.musicTimer = undefined;
  }

  private scheduleMusic(): void {
    if (!this.context || !this.musicBus || !this.theme || this.muted || this.context.state !== 'running') return;
    const definition = THEMES[this.theme];
    const stepDuration = 60 / definition.bpm / 2;
    // After the app returns from the background or mute, skip elapsed beats
    // instead of trying to play the whole missed phrase at once.
    if (this.nextMusicNoteAt < this.context.currentTime - 0.2) this.nextMusicNoteAt = this.context.currentTime + 0.04;
    while (this.nextMusicNoteAt < this.context.currentTime + 0.14) {
      const index = this.musicStep % definition.lead.length;
      const lead = definition.lead[index];
      const bass = definition.bass[index % definition.bass.length];
      if (lead !== null) this.tone(midiToFrequency(lead), this.nextMusicNoteAt, stepDuration * 0.78, definition.leadWave, 0.12, midiToFrequency(lead), this.musicBus);
      if (bass !== null) this.tone(midiToFrequency(bass), this.nextMusicNoteAt, stepDuration * 0.86, 'triangle', 0.15, midiToFrequency(bass), this.musicBus);
      if (definition.kick.includes(index)) this.tone(105, this.nextMusicNoteAt, 0.09, 'sine', 0.16, 45, this.musicBus);
      if (definition.hat.includes(index)) this.noise(this.nextMusicNoteAt, 0.025, 0.035, 4200, this.musicBus);
      this.musicStep++;
      this.nextMusicNoteAt += stepDuration;
    }
  }
}

export const pixelAudio = new PixelAudio();
