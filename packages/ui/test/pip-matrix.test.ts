import { describe, it, expect } from 'vitest';
import type { PipValue } from '@ahwtna/shared';
import {
  PIP_LAYOUTS,
  getTileArabicDescription,
  renderTileSvg,
  renderTileHtml,
} from '../src/index.js';

describe('TEST-7.1: Domino Pip Matrix & Tile Rendering Engine', () => {
  it('should define exact geometric pip counts for all numbers 0 through 6', () => {
    for (let pip = 0; pip <= 6; pip++) {
      const layout = PIP_LAYOUTS[pip as PipValue];
      expect(layout).toBeDefined();
      expect(layout.length).toBe(pip);
    }
  });

  it('should ensure all normalized pip coordinates are within [0.1, 0.9] range', () => {
    for (let pip = 1; pip <= 6; pip++) {
      const layout = PIP_LAYOUTS[pip as PipValue];
      for (const coord of layout) {
        expect(coord.x).toBeGreaterThanOrEqual(0.1);
        expect(coord.x).toBeLessThanOrEqual(0.9);
        expect(coord.y).toBeGreaterThanOrEqual(0.1);
        expect(coord.y).toBeLessThanOrEqual(0.9);
      }
    }
  });

  it('should render all 28 tiles cleanly without syntax or NaN errors', () => {
    let tileCount = 0;
    for (let left = 0; left <= 6; left++) {
      for (let right = left; right <= 6; right++) {
        tileCount++;
        const l = left as PipValue;
        const r = right as PipValue;

        const svgVertical = renderTileSvg({ left: l, right: r, orientation: 'vertical' });
        expect(svgVertical).toContain('<svg');
        expect(svgVertical).toContain('</svg>');
        expect(svgVertical).not.toContain('NaN');

        const svgHorizontal = renderTileSvg({ left: l, right: r, orientation: 'horizontal' });
        expect(svgHorizontal).toContain('<svg');
        expect(svgHorizontal).not.toContain('NaN');

        // Total circle pips should equal left + right (+1 for brass center pin)
        const expectedCircles = l + r + 1;
        const circleMatches = (svgVertical.match(/<circle /g) || []).length;
        expect(circleMatches).toBe(expectedCircles);
      }
    }
    expect(tileCount).toBe(28);
  });

  it('should correctly render face-down tiles without exposing pips', () => {
    const faceDownSvg = renderTileSvg({
      left: 6,
      right: 6,
      faceDown: true,
    });

    expect(faceDownSvg).toContain('ahwa-tile-facedown');
    expect(faceDownSvg).toContain('بلاطة مقلوبة');
    // Must NOT contain the 12 pips
    expect(faceDownSvg).not.toContain('<circle cx=');
  });

  it('should provide authentic Egyptian Arabic titles and ARIA accessibility labels', () => {
    const dushDesc = getTileArabicDescription(6, 6);
    expect(dushDesc.isDouble).toBe(true);
    expect(dushDesc.title).toContain('الدوش');
    expect(dushDesc.ariaLabel).toContain('دوبل 6');

    const balateenDesc = getTileArabicDescription(0, 0);
    expect(balateenDesc.isDouble).toBe(true);
    expect(balateenDesc.title).toContain('بلاطين');

    const mixedDesc = getTileArabicDescription(3, 5);
    expect(mixedDesc.isDouble).toBe(false);
    expect(mixedDesc.title).toContain('تلاتة');
    expect(mixedDesc.title).toContain('خمسة');
  });

  it('should render HTML wrapper with accessible role and interactive tabindex when playable', () => {
    const htmlPlayable = renderTileHtml({
      left: 4,
      right: 2,
      state: 'playable',
    });
    expect(htmlPlayable).toContain('role="button"');
    expect(htmlPlayable).toContain('tabindex="0"');
    expect(htmlPlayable).toContain('state-playable');

    const htmlIdle = renderTileHtml({
      left: 4,
      right: 2,
      state: 'idle',
    });
    expect(htmlIdle).toContain('role="figure"');
    expect(htmlIdle).toContain('tabindex="-1"');
  });
});
