import { describe, expect, it } from 'vitest';
import { createTile, type Tile, TOTAL_TILES_COUNT } from '@ahwtna/shared';
import { dealInitialTiles, determineFirstRoundOpener } from '../src/deal.js';
import { createSeededRandom } from '../src/tile-set.js';

describe('Domino Deal Logic & Invariants (ENG-004, ENG-005, ENG-007, ENG-008)', () => {
  it('ENG-005 & ENG-007: deals 7 tiles to 2 players and leaves 14 in boneyard (Individual 2P)', () => {
    const random = createSeededRandom(42);
    const result = dealInitialTiles('INDIVIDUAL_2P', random);

    expect(result.hands[0].length).toBe(7);
    expect(result.hands[1].length).toBe(7);
    expect(result.hands[2].length).toBe(0);
    expect(result.hands[3].length).toBe(0);

    expect(result.boneyard.length).toBe(14);

    // ENG-004: Conservation of tiles (7 + 7 + 14 = 28)
    const total =
      result.hands[0].length +
      result.hands[1].length +
      result.boneyard.length;
    expect(total).toBe(TOTAL_TILES_COUNT);
  });

  it('ENG-005 & ENG-008: deals 7 tiles to all 4 players and leaves 0 in boneyard (Team 4P)', () => {
    const random = createSeededRandom(42);
    const result = dealInitialTiles('TEAM_4P', random);

    expect(result.hands[0].length).toBe(7);
    expect(result.hands[1].length).toBe(7);
    expect(result.hands[2].length).toBe(7);
    expect(result.hands[3].length).toBe(7);

    expect(result.boneyard.length).toBe(0);

    // ENG-004: Conservation of tiles (7 * 4 + 0 = 28)
    const total =
      result.hands[0].length +
      result.hands[1].length +
      result.hands[2].length +
      result.hands[3].length +
      result.boneyard.length;
    expect(total).toBe(TOTAL_TILES_COUNT);
  });

  describe('First Round Opener Determination', () => {
    it('chooses the player with the highest double (e.g. 6|6 over 5|5)', () => {
      const hands: Record<number, Tile[]> = {
        0: [createTile(0, 1), createTile(2, 3), createTile(5, 5)], // Has [5|5]
        1: [createTile(1, 2), createTile(4, 4), createTile(6, 6)], // Has [6|6] (Best)
      };

      const opener = determineFirstRoundOpener(hands);
      expect(opener.starterSeat).toBe(1);
      expect(opener.startingTile).toEqual([6, 6]);
    });

    it('falls back to the next highest double when 6|6 is not in play', () => {
      const hands: Record<number, Tile[]> = {
        0: [createTile(0, 0), createTile(3, 3)], // Has [3|3]
        1: [createTile(1, 2), createTile(2, 2)], // Has [2|2]
      };

      const opener = determineFirstRoundOpener(hands);
      expect(opener.starterSeat).toBe(0);
      expect(opener.startingTile).toEqual([3, 3]);
    });

    it('falls back to the highest sum tile when no players hold a double', () => {
      const hands: Record<number, Tile[]> = {
        0: [createTile(0, 1), createTile(2, 4)], // Max sum: 6 ([2|4])
        1: [createTile(1, 3), createTile(5, 6)], // Max sum: 11 ([5|6] - Best)
      };

      const opener = determineFirstRoundOpener(hands);
      expect(opener.starterSeat).toBe(1);
      expect(opener.startingTile).toEqual([5, 6]);
    });
  });
});
