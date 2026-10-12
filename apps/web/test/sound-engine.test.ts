import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SoundEngine, type SoundEffectType, type HapticType } from '../src/audio/sound-engine.js';

describe('Egyptian Audio & Haptics Engine (SoundEngine)', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};

    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      }),
    });

    // Mock navigator.vibrate
    vi.stubGlobal('navigator', {
      vibrate: vi.fn(() => true),
    });
  });

  it('initializes with sensible defaults and respects empty localStorage', () => {
    const engine = new SoundEngine();

    expect(engine.getIsMuted()).toBe(false);
    expect(engine.getVolume()).toBe(0.8);
    expect(engine.getHapticsEnabled()).toBe(true);
  });

  it('restores settings from localStorage if present', () => {
    mockStorage['ahwtna_audio_muted'] = 'true';
    mockStorage['ahwtna_audio_volume'] = '0.5';
    mockStorage['ahwtna_audio_haptics_enabled'] = 'false';
    mockStorage['ahwtna_haptics_enabled'] = 'false';

    const engine = new SoundEngine();

    expect(engine.getIsMuted()).toBe(true);
    expect(engine.getVolume()).toBe(0.5);
    expect(engine.getHapticsEnabled()).toBe(false);
  });

  it('toggles and persists mute state correctly', () => {
    const engine = new SoundEngine();
    expect(engine.getIsMuted()).toBe(false);

    const muted = engine.toggleMute();
    expect(muted).toBe(true);
    expect(engine.getIsMuted()).toBe(true);
    expect(mockStorage['ahwtna_audio_muted']).toBe('true');

    const unmuted = engine.toggleMute();
    expect(unmuted).toBe(false);
    expect(engine.getIsMuted()).toBe(false);
    expect(mockStorage['ahwtna_audio_muted']).toBe('false');

    engine.setMuted(true);
    expect(engine.getIsMuted()).toBe(true);
    expect(mockStorage['ahwtna_audio_muted']).toBe('true');
  });

  it('clamps and persists volume values between 0.0 and 1.0', () => {
    const engine = new SoundEngine();

    engine.setVolume(0.4);
    expect(engine.getVolume()).toBe(0.4);
    expect(mockStorage['ahwtna_audio_volume']).toBe('0.4');

    // Values greater than 1 should clamp to 1
    engine.setVolume(1.5);
    expect(engine.getVolume()).toBe(1);

    // Negative values should clamp to 0
    engine.setVolume(-0.2);
    expect(engine.getVolume()).toBe(0);
  });

  it('toggles and persists haptics feedback state', () => {
    const engine = new SoundEngine();
    expect(engine.getHapticsEnabled()).toBe(true);

    const disabled = engine.toggleHaptics();
    expect(disabled).toBe(false);
    expect(engine.getHapticsEnabled()).toBe(false);
    expect(mockStorage['ahwtna_haptics_enabled']).toBe('false');

    const reenabled = engine.toggleHaptics();
    expect(reenabled).toBe(true);
    expect(engine.getHapticsEnabled()).toBe(true);
    expect(mockStorage['ahwtna_haptics_enabled']).toBe('true');
    expect(navigator.vibrate).toHaveBeenCalledWith(30); // light haptic on re-enable
  });

  it('notifies subscribers whenever settings are modified', () => {
    const engine = new SoundEngine();
    let notifyCount = 0;
    const unsubscribe = engine.subscribe(() => {
      notifyCount++;
    });

    engine.toggleMute();
    engine.setVolume(0.9);
    engine.toggleHaptics();

    expect(notifyCount).toBe(3);

    unsubscribe();
    engine.toggleMute();
    expect(notifyCount).toBe(3);
  });

  it('triggers mobile vibration patterns for each haptic category', () => {
    const engine = new SoundEngine();

    const types: HapticType[] = ['light', 'medium', 'heavy', 'turn', 'win'];
    types.forEach((type) => {
      engine.triggerHaptic(type);
    });

    expect(navigator.vibrate).toHaveBeenCalledWith(30); // light
    expect(navigator.vibrate).toHaveBeenCalledWith(50); // medium
    expect(navigator.vibrate).toHaveBeenCalledWith(80); // heavy
    expect(navigator.vibrate).toHaveBeenCalledWith([40, 50, 40]); // turn notification
    expect(navigator.vibrate).toHaveBeenCalledWith([80, 50, 80, 50, 160]); // win celebration
  });

  it('does not trigger vibrations when haptics are disabled', () => {
    const engine = new SoundEngine();
    engine.setHapticsEnabled(false);
    vi.mocked(navigator.vibrate).mockClear();

    engine.triggerHaptic('turn');
    expect(navigator.vibrate).not.toHaveBeenCalled();
  });

  it('safely handles play() invocations across all 7 Egyptian audio effects', () => {
    const engine = new SoundEngine();

    // Mock AudioContext to verify synthesized Web Audio API playback
    const mockAudioContext = {
      currentTime: 10,
      state: 'running',
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      createGain: vi.fn(() => ({
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      })),
      createOscillator: vi.fn(() => ({
        type: 'sine',
        frequency: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      })),
    };

    vi.stubGlobal('AudioContext', vi.fn(() => mockAudioContext));

    const soundEffects: SoundEffectType[] = [
      'slam',
      'shuffle',
      'draw',
      'pass',
      'win',
      'block',
      'teaClink',
    ];

    soundEffects.forEach((effect) => {
      expect(() => engine.play(effect)).not.toThrow();
    });

    // When muted, it should not trigger AudioContext creation/playback
    engine.setMuted(true);
    const prevCalls = vi.mocked(mockAudioContext.createGain).mock.calls.length;
    soundEffects.forEach((effect) => {
      engine.play(effect);
    });
    expect(vi.mocked(mockAudioContext.createGain).mock.calls.length).toBe(prevCalls);
  });
});
