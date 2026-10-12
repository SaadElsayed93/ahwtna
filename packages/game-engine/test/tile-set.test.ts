import { describe, expect, it } from 'vitest';
import { getTileId, TOTAL_TILES_COUNT } from '@ahwtna/shared';
import {
  createSeededRandom,
  generateDoubleSixSet,
  shuffleTiles,
} from '../src/tile-set.js';

describe('Domino Tile Set & Shuffling (ENG-001, ENG-002, ENG-003, ENG-006)', () => {
  it('ENG-001: generates exactly 28 unique tiles in Double-Six set', () => {
    const tiles = generateDoubleSixSet();
    expect(tiles.length).toBe(TOTAL_TILES_COUNT);
    expect(tiles.length).toBe(28);
  });

  it('ENG-002: verifies all half values are integers between 0 and 6', () => {
    const tiles = generateDoubleSixSet();
    for (const [a, b] of tiles) {
      expect(Number.isInteger(a)).toBe(true);
      expect(Number.isInteger(b)).toBe(true);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(6);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(6);
      expect(a).toBeLessThanOrEqual(b); // Normalized ordering
    }
  });

  it('ENG-003: ensures no duplicate tiles exist and all 28 types are distinct', () => {
    const tiles = generateDoubleSixSet();
    const ids = new Set<string>();

    for (const tile of tiles) {
      const id = getTileId(tile);
      expect(ids.has(id)).toBe(false);
      ids.add(id);
    }

    expect(ids.size).toBe(28);
  });

  it('ENG-006: reproducible PRNG with identical seed produces 100% identical shuffle', () => {
    const fullSet = generateDoubleSixSet();

    const random1 = createSeededRandom(123456);
    const shuffled1 = shuffleTiles(fullSet, random1);

    const random2 = createSeededRandom(123456);
    const shuffled2 = shuffleTiles(fullSet, random2);

    expect(shuffled1).toEqual(shuffled2);

    // Verify it actually shuffled and is not in identical original order
    expect(shuffled1).not.toEqual(fullSet);

    // Verify a different seed produces a different permutation
    const random3 = createSeededRandom(987654);
    const shuffled3 = shuffleTiles(fullSet, random3);
    expect(shuffled1).not.toEqual(shuffled3);
  });
});
