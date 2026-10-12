import { describe, it, expect } from 'vitest';
import {
  AHWA_RTL_CONFIG,
  AHWA_TYPOGRAPHY,
  DOMINO_VOCABULARY,
  renderAhwaButton,
  renderTurnIndicator,
  renderScoreBoard,
  renderAhwaModal,
  renderMatchFeed,
  getAhwaCss,
} from '../src/index.js';

describe('TEST-7.2: RTL Alignment, Typography & Arabic Components', () => {
  it('should enforce RTL direction, ar lang, and Cairo typography', () => {
    expect(AHWA_RTL_CONFIG.direction).toBe('rtl');
    expect(AHWA_RTL_CONFIG.lang).toBe('ar');
    expect(AHWA_RTL_CONFIG.locale).toBe('ar-EG');
    expect(AHWA_TYPOGRAPHY.fontFamily).toContain('Cairo');
    expect(AHWA_TYPOGRAPHY.weights.black).toBe(900);
  });

  it('should include full authentic Egyptian Domino vocabulary', () => {
    expect(DOMINO_VOCABULARY.domino).toBe('دومينو!');
    expect(DOMINO_VOCABULARY.blocked).toBe('القفلة!');
    expect(DOMINO_VOCABULARY.boneyard).toBe('البلاطة المخفية');
    expect(DOMINO_VOCABULARY.doubleNames[6]).toContain('الدوش');
    expect(DOMINO_VOCABULARY.doubleNames[3]).toContain('دوسة');
    expect(DOMINO_VOCABULARY.doubleNames[1]).toContain('هاب يك');
  });

  it('should render AhwaButton with proper variant, label, and accessible attributes', () => {
    const btn = renderAhwaButton({
      label: 'سحب بلاطة',
      variant: 'gold',
      size: 'lg',
      onClickAttr: 'handleDraw()',
    });

    expect(btn).toContain('ahwa-btn-gold');
    expect(btn).toContain('ahwa-btn-lg');
    expect(btn).toContain('سحب بلاطة');
    expect(btn).toContain('onclick="handleDraw()"');
  });

  it('should render TurnIndicator with player status, avatar, and active glow', () => {
    const indicator = renderTurnIndicator({
      playerName: 'عم شكشك',
      avatarChar: 'ش',
      isCurrentTurn: true,
      tileCount: 5,
      timerSeconds: 15,
      maxTimerSeconds: 30,
    });

    expect(indicator).toContain('is-active-turn');
    expect(indicator).toContain('عم شكشك');
    expect(indicator).toContain('الدور عليه');
    expect(indicator).toContain('معه 5 قطع');
    expect(indicator).toContain('ahwa-turn-glow');
    expect(indicator).toContain('ahwa-turn-timer-ring');
  });

  it('should render ScoreBoard notebook with 101 threshold tracking and critical alerts', () => {
    const scoreBoard = renderScoreBoard({
      roundNumber: 3,
      players: [
        { id: 'p1', name: 'أحمد', penaltyScore: 40 },
        { id: 'p2', name: 'كريم', penaltyScore: 92 }, // Critical (>85)
      ],
      matchLimit: 101,
    });

    expect(scoreBoard).toContain('نوتة الحساب');
    expect(scoreBoard).toContain('الجولة:');
    expect(scoreBoard).toContain('أحمد');
    expect(scoreBoard).toContain('كريم');
    expect(scoreBoard).toContain('في خطر!');
    expect(scoreBoard).toContain('101');
  });

  it('should render AhwaModal and MatchFeed with Arabic content and RTL styling', () => {
    const modal = renderAhwaModal({
      title: 'دومينو!',
      subtitle: 'أحمد أنهى ورقه أولاً!',
      bodyHtml: '<p>حصل على 24 نقطة جزاء ضد الخصم.</p>',
      primaryAction: {
        label: 'الجولة التالية',
        onClickAttr: 'startNextRound()',
      },
      variant: 'success',
    });

    expect(modal).toContain('دومينو!');
    expect(modal).toContain('الجولة التالية');
    expect(modal).toContain('variant-success');

    const feed = renderMatchFeed({
      events: [
        { id: '1', timestamp: '14:02', type: 'PLAY', text: 'أحمد لعب [6|6]' },
        { id: '2', timestamp: '14:03', type: 'DRAW', text: 'كريم سحب بلاطة' },
      ],
    });

    expect(feed).toContain('شريط أحداث الطاولة');
    expect(feed).toContain('أحمد لعب [6|6]');
    expect(feed).toContain('كريم سحب بلاطة');
  });

  it('should output complete master CSS containing all tokens and animations', () => {
    const css = getAhwaCss();
    expect(css).toContain('--ahwa-dark-green:');
    expect(css).toContain('--ahwa-warm-gold:');
    expect(css).toContain('--ahwa-tile-ivory:');
    expect(css).toContain('direction: rtl;');
    expect(css).toContain('@keyframes ahwa-tile-slam');
    expect(css).toContain('@keyframes ahwa-glow-pulse');
  });
});
