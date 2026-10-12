/**
 * محرك المؤثرات الصوتية والاهتزاز التفاعلي التراثي (Egyptian Ahwa Audio & Haptics Engine)
 * يعتمد على Web Audio API و Web Haptics API مع حفظ التفضيلات في localStorage
 */

export type SoundEffectType =
  | 'slam'       // خبطة الدومينو العاجية القوية على الخشب
  | 'shuffle'    // خشخشة وخلط البلاطات العاجية
  | 'draw'       // سحب بلاطة من المخزون
  | 'pass'       // نقرة خشبية مزدوجة للتمرير (باص)
  | 'win'        // احتفالية الفوز ورنة استكانة الشاي
  | 'block'      // قفلة معلم
  | 'teaClink';  // رنة كوباية الشاي بالملعقة

export type HapticType = 'light' | 'medium' | 'heavy' | 'turn' | 'win';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;
  private hapticsEnabled: boolean = true;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadSettings();
  }

  private loadSettings(): void {
    if (typeof localStorage !== 'undefined') {
      const savedMute = localStorage.getItem('ahwtna_audio_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }

      const savedVol = localStorage.getItem('ahwtna_audio_volume');
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          this.volume = parsed;
        }
      }

      const savedHaptics = localStorage.getItem('ahwtna_haptics_enabled');
      if (savedHaptics !== null) {
        this.hapticsEnabled = savedHaptics === 'true';
      }
    }
  }

  public saveSettings(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ahwtna_audio_muted', String(this.isMuted));
      localStorage.setItem('ahwtna_audio_volume', String(this.volume));
      localStorage.setItem('ahwtna_haptics_enabled', String(this.hapticsEnabled));
    }
    this.notify();
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.saveSettings();
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.saveSettings();
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    this.saveSettings();
  }

  public getHapticsEnabled(): boolean {
    return this.hapticsEnabled;
  }

  public toggleHaptics(): boolean {
    this.hapticsEnabled = !this.hapticsEnabled;
    this.saveSettings();
    if (this.hapticsEnabled) {
      this.triggerHaptic('light');
    }
    return this.hapticsEnabled;
  }

  public setHapticsEnabled(enabled: boolean): void {
    this.hapticsEnabled = enabled;
    this.saveSettings();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private initContext(): void {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * تشغيل مؤثر صوتي عام
   */
  public play(sound: SoundEffectType): void {
    if (this.isMuted) return;

    switch (sound) {
      case 'slam':
        this.playSlam();
        break;
      case 'shuffle':
        this.playShuffle();
        break;
      case 'draw':
        this.playDraw();
        break;
      case 'pass':
        this.playPass();
        break;
      case 'win':
        this.playWin();
        break;
      case 'block':
        this.playBlock();
        break;
      case 'teaClink':
        this.playTeaClink();
        break;
    }
  }

  /**
   * خبطة بلاطة الدومينو العاجية القوية على طاولة القهوة
   */
  public playSlam(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume, now);
    masterGain.connect(this.ctx.destination);

    // 1. نقرة الارتطام العاجية الأولية (High transient impact)
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(1400, now);
    clickOsc.frequency.exponentialRampToValueAtTime(300, now + 0.015);
    clickGain.gain.setValueAtTime(0.5, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
    clickOsc.connect(clickGain);
    clickGain.connect(masterGain);
    clickOsc.start(now);
    clickOsc.stop(now + 0.02);

    // 2. صدى خبطة الخشب العميق (Deep wood resonant thump)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.1);
    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  /**
   * خشخشة وخلط البلاطات عند بدء الجولة
   */
  public playShuffle(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.7, now);
    masterGain.connect(this.ctx.destination);

    // 5 نقرات متتالية تحاكي حك البلاطات ببعضها
    [0, 0.04, 0.09, 0.14, 0.2].forEach((delay, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      const freq = 320 + (idx % 3) * 60;
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(150, now + delay + 0.03);
      gain.gain.setValueAtTime(0.3, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.035);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.04);
    });
  }

  /**
   * سحب بلاطة من المخزون
   */
  public playDraw(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);
    gain.gain.setValueAtTime(0.45 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * نقرة خشبية مزدوجة تحاكي خبطة اليد للتمرير (باص)
   */
  public playPass(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [0, 0.08].forEach((delay) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now + delay);
      osc.frequency.exponentialRampToValueAtTime(80, now + delay + 0.04);
      gain.gain.setValueAtTime(0.3 * this.volume, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.05);
    });
  }

  /**
   * احتفالية الفوز (نغمات صاعدة مبهجة)
   */
  public playWin(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // C5, E5, G5, C6 arpeggio
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.5 * this.volume, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.36);
    });

    // رنة كوب الشاي بعد النغمة
    setTimeout(() => {
      this.playTeaClink();
    }, 450);
  }

  /**
   * قفلة معلم
   */
  public playBlock(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [130, 98, 65].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.6 * this.volume, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.19);
    });
  }

  /**
   * رنة استكانة وكوب الشاي بالنعناع
   */
  public playTeaClink(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [2489, 4978].forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.25 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now);
      osc.stop(now + 0.95);
    });
  }

  /**
   * تشغيل الاهتزاز التفاعلي على الموبايل عبر Web Haptics API
   */
  public triggerHaptic(type: HapticType): void {
    if (!this.hapticsEnabled) return;
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;

    try {
      switch (type) {
        case 'light':
          navigator.vibrate(30);
          break;
        case 'medium':
          navigator.vibrate(50);
          break;
        case 'heavy':
          navigator.vibrate(80);
          break;
        case 'turn':
          // نبضتان متتاليتان لتنبيه اللاعب بحلول دوره
          navigator.vibrate([40, 50, 40]);
          break;
        case 'win':
          // نبضة احتفالية
          navigator.vibrate([80, 50, 80, 50, 160]);
          break;
      }
    } catch {
      // تجاهل إذا لم يسمح المتصفح أو كان المستخدم لم يتفاعل مع الشاشة بعد
    }
  }
}

export const soundEngine = new SoundEngine();
