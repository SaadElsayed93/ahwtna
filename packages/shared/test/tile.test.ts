import { describe, expect, it } from 'vitest';
import {
  createTile,
  getOppositeValue,
  getTileId,
  getTileSum,
  isDouble,
  matchesValue,
  parseTileId,
  tileEquals,
} from '../src/types/tile.js';

describe('Tile Domain & Invariants (TEST-1.2)', () => {
  it('creates valid tiles with normalized ordering [low, high]', () => {
    const tile1 = createTile(5, 2);
    expect(tile1).toEqual([2, 5]);

    const tile2 = createTile(0, 0);
    expect(tile2).toEqual([0, 0]);

    const tile3 = createTile(6, 6);
    expect(tile3).toEqual([6, 6]);
  });

  it('rejects invalid tile values outside 0-6 range or non-integers', () => {
    expect(() => createTile(-1, 4)).toThrow();
    expect(() => createTile(7, 2)).toThrow();
    expect(() => createTile(2.5, 3)).toThrow();
  });

  it('correctly compares tile equality regardless of input order', () => {
    const a = createTile(2, 5);
    const b = createTile(5, 2);
    const c = createTile(3, 4);

    expect(tileEquals(a, b)).toBe(true);
    expect(tileEquals(a, c)).toBe(false);
  });

  it('calculates tile pip sums accurately', () => {
    expect(getTileSum(createTile(0, 0))).toBe(0);
    expect(getTileSum(createTile(6, 6))).toBe(12);
    expect(getTileSum(createTile(2, 5))).toBe(7);
  });

  it('identifies double tiles correctly', () => {
    expect(isDouble(createTile(6, 6))).toBe(true);
    expect(isDouble(createTile(0, 0))).toBe(true);
    expect(isDouble(createTile(5, 6))).toBe(false);
  });

  it('matches open values and returns opposite half', () => {
    const tile = createTile(3, 5);
    expect(matchesValue(tile, 3)).toBe(true);
    expect(matchesValue(tile, 5)).toBe(true);
    expect(matchesValue(tile, 4)).toBe(false);

    expect(getOppositeValue(tile, 3)).toBe(5);
    expect(getOppositeValue(tile, 5)).toBe(3);
    expect(() => getOppositeValue(tile, 4)).toThrow();
  });

  it('serializes and parses tile IDs reliably', () => {
    const tile = createTile(1, 4);
    const id = getTileId(tile);
    expect(id).toBe('1|4');

    const parsed = parseTileId('1|4');
    expect(parsed).toEqual([1, 4]);
    expect(tileEquals(tile, parsed)).toBe(true);
  });
});
