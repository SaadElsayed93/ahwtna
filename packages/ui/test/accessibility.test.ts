import { describe, it, expect } from 'vitest';
import {
  AHWA_COLORS,
  getLuminance,
  getContrastRatio,
  meetsWcagAA,
  meetsWcagAAA,
  hexToRgb,
} from '../src/index.js';

describe('TEST-7.3: Color Contrast & WCAG AA/AAA Accessibility Gate', () => {
  it('should parse hex colors to RGB accurately', () => {
    expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#0D3B2E')).toEqual({ r: 13, g: 59, b: 46 });
  });

  it('should compute relative luminance correctly according to W3C', () => {
    expect(getLuminance('#FFFFFF')).toBeCloseTo(1.0, 2);
    expect(getLuminance('#000000')).toBeCloseTo(0.0, 2);
    const greenLum = getLuminance(AHWA_COLORS.darkGreen);
    expect(greenLum).toBeGreaterThan(0);
    expect(greenLum).toBeLessThan(0.1);
  });

  it('should satisfy WCAG AAA for domino pips against ivory tile background (> 7:1)', () => {
    const ratio = getContrastRatio(AHWA_COLORS.pipDark, AHWA_COLORS.tileIvory);
    expect(ratio).toBeGreaterThan(12.0); // Extremely high readability
    expect(meetsWcagAAA(AHWA_COLORS.pipDark, AHWA_COLORS.tileIvory)).toBe(true);
  });

  it('should satisfy WCAG AAA for cream paper text on dark green table (> 7:1)', () => {
    const ratio = getContrastRatio(AHWA_COLORS.creamPaper, AHWA_COLORS.darkGreen);
    expect(ratio).toBeGreaterThan(8.0);
    expect(meetsWcagAAA(AHWA_COLORS.creamPaper, AHWA_COLORS.darkGreen)).toBe(true);
  });

  it('should satisfy WCAG AAA for walnut wood text on cream notebook (> 7:1)', () => {
    const ratio = getContrastRatio(AHWA_COLORS.walnutWood, AHWA_COLORS.creamPaper);
    expect(ratio).toBeGreaterThan(9.0);
    expect(meetsWcagAAA(AHWA_COLORS.walnutWood, AHWA_COLORS.creamPaper)).toBe(true);
  });

  it('should satisfy WCAG AA for warm gold on dark green (> 4.5:1)', () => {
    const ratio = getContrastRatio(AHWA_COLORS.warmGold, AHWA_COLORS.darkGreen);
    expect(ratio).toBeGreaterThan(4.5);
    expect(meetsWcagAA(AHWA_COLORS.warmGold, AHWA_COLORS.darkGreen)).toBe(true);
  });

  it('should satisfy WCAG AA for danger red text on light background and white text on danger button', () => {
    const whiteOnDanger = getContrastRatio('#FFFFFF', AHWA_COLORS.dangerRed);
    expect(whiteOnDanger).toBeGreaterThan(4.5);
    expect(meetsWcagAA('#FFFFFF', AHWA_COLORS.dangerRed)).toBe(true);

    const dangerOnPaper = getContrastRatio(AHWA_COLORS.dangerRed, AHWA_COLORS.creamPaper);
    expect(dangerOnPaper).toBeGreaterThan(4.5);
    expect(meetsWcagAA(AHWA_COLORS.dangerRed, AHWA_COLORS.creamPaper)).toBe(true);
  });
});
