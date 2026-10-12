import { describe, expect, it } from 'vitest';
import { createTile, GameError } from '@ahwtna/shared';
import {
  createEmptyBoard,
  getPlayableEnds,
  hasAnyLegalMove,
  isBoardEmpty,
  playTileOnBoard,
} from '../src/board.js';

describe('Board Topology & Chaining (ENG-010, ENG-011, ENG-016)', () => {
  it('ENG-016: placing first tile on empty board establishes left and right values', () => {
    const board = createEmptyBoard();
    expect(isBoardEmpty(board)).toBe(true);

    const firstTile = createTile(3, 5);
    const updated = playTileOnBoard(firstTile, 'LEFT', board);

    expect(isBoardEmpty(updated)).toBe(false);
    expect(updated.nodes.length).toBe(1);
    expect(updated.leftValue).toBe(3);
    expect(updated.rightValue).toBe(5);
  });

  it('ENG-010: placing matching tile on LEFT end extends chain and updates leftValue', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard(createTile(3, 5), 'LEFT', board); // left: 3, right: 5

    // Play [1|3] on LEFT
    const nextTile = createTile(1, 3);
    const updated = playTileOnBoard(nextTile, 'LEFT', board);

    expect(updated.nodes.length).toBe(2);
    expect(updated.leftValue).toBe(1); // 3 connected, 1 is open
    expect(updated.rightValue).toBe(5); // unchanged
  });

  it('ENG-011: placing matching tile on RIGHT end extends chain and updates rightValue', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard(createTile(3, 5), 'RIGHT', board); // left: 3, right: 5

    // Play [5|6] on RIGHT
    const nextTile = createTile(5, 6);
    const updated = playTileOnBoard(nextTile, 'RIGHT', board);

    expect(updated.nodes.length).toBe(2);
    expect(updated.leftValue).toBe(3); // unchanged
    expect(updated.rightValue).toBe(6); // 5 connected, 6 is open
  });

  it('ENG-012: throws ILLEGAL_MOVE when tile matches neither left nor right end', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard(createTile(2, 4), 'RIGHT', board); // left: 2, right: 4

    const unmatchable = createTile(0, 1);
    expect(() => playTileOnBoard(unmatchable, 'LEFT', board)).toThrow(GameError);
    expect(() => playTileOnBoard(unmatchable, 'RIGHT', board)).toThrow(GameError);

    try {
      playTileOnBoard(unmatchable, 'LEFT', board);
    } catch (e) {
      expect((e as GameError).code).toBe('ILLEGAL_MOVE');
    }
  });

  it('identifies playable ends accurately for a tile', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard(createTile(2, 4), 'RIGHT', board); // left: 2, right: 4

    expect(getPlayableEnds(createTile(2, 5), board)).toEqual(['LEFT']);
    expect(getPlayableEnds(createTile(4, 6), board)).toEqual(['RIGHT']);
    expect(getPlayableEnds(createTile(2, 4), board)).toEqual(['LEFT', 'RIGHT']);
    expect(getPlayableEnds(createTile(0, 1), board)).toEqual([]);
  });

  it('checks if a hand has any legal move', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard(createTile(2, 4), 'RIGHT', board);

    const playableHand = [createTile(0, 1), createTile(2, 5)];
    expect(hasAnyLegalMove(playableHand, board)).toBe(true);

    const unplayableHand = [createTile(0, 1), createTile(3, 5)];
    expect(hasAnyLegalMove(unplayableHand, board)).toBe(false);
  });
});
