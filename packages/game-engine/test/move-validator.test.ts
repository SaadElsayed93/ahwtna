import { describe, expect, it } from 'vitest';
import { createTile, GameError } from '@ahwtna/shared';
import { createEmptyBoard, playTileOnBoard } from '../src/board.js';
import { executePlayerMove, type MoveContext, validatePlayerMove } from '../src/move-validator.js';

describe('Player Move Validation & Invariance (ENG-012, ENG-013, ENG-014, ENG-015, ENG-019)', () => {
  it('ENG-014: rejects move when player is NOT the active player (NOT_YOUR_TURN)', () => {
    const board = createEmptyBoard();
    const ctx: MoveContext = {
      phase: 'PLAYING',
      activeSeat: 0,
      hand: [createTile(2, 4)],
      board,
    };

    expect(() =>
      validatePlayerMove(1, createTile(2, 4), 'LEFT', ctx)
    ).toThrow(GameError);

    try {
      validatePlayerMove(1, createTile(2, 4), 'LEFT', ctx);
    } catch (e) {
      expect((e as GameError).code).toBe('NOT_YOUR_TURN');
    }
  });

  it('ENG-013: rejects move when tile is NOT in player hand (TILE_NOT_IN_HAND)', () => {
    const board = createEmptyBoard();
    const ctx: MoveContext = {
      phase: 'PLAYING',
      activeSeat: 0,
      hand: [createTile(2, 4)],
      board,
    };

    expect(() =>
      validatePlayerMove(0, createTile(5, 5), 'LEFT', ctx)
    ).toThrow(GameError);

    try {
      validatePlayerMove(0, createTile(5, 5), 'LEFT', ctx);
    } catch (e) {
      expect((e as GameError).code).toBe('TILE_NOT_IN_HAND');
    }
  });

  it('ENG-015: rejects move when game is NOT in PLAYING phase (INVALID_PHASE)', () => {
    const board = createEmptyBoard();
    const ctx: MoveContext = {
      phase: 'ROUND_ENDED',
      activeSeat: 0,
      hand: [createTile(2, 4)],
      board,
    };

    expect(() =>
      validatePlayerMove(0, createTile(2, 4), 'LEFT', ctx)
    ).toThrow(GameError);

    try {
      validatePlayerMove(0, createTile(2, 4), 'LEFT', ctx);
    } catch (e) {
      expect((e as GameError).code).toBe('INVALID_PHASE');
    }
  });

  it('ENG-019: failed move maintains absolute immutability of context', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard(createTile(2, 4), 'RIGHT', board);

    const originalHand = Object.freeze([createTile(0, 1), createTile(3, 3)]);
    const ctx: MoveContext = {
      phase: 'PLAYING',
      activeSeat: 0,
      hand: originalHand,
      board,
    };

    // Attempt illegal move: [0|1] on board with ends 2 and 4
    expect(() =>
      executePlayerMove(0, createTile(0, 1), 'LEFT', ctx)
    ).toThrow(GameError);

    // Verify context hand and board are untouched
    expect(ctx.hand.length).toBe(2);
    expect(ctx.board.nodes.length).toBe(1);
    expect(ctx.board.leftValue).toBe(2);
    expect(ctx.board.rightValue).toBe(4);
  });

  it('executes legal move and removes tile from hand cleanly', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard(createTile(2, 4), 'RIGHT', board);

    const hand = [createTile(2, 6), createTile(0, 0)];
    const ctx: MoveContext = {
      phase: 'PLAYING',
      activeSeat: 0,
      hand,
      board,
    };

    const result = executePlayerMove(0, createTile(2, 6), 'LEFT', ctx);

    expect(result.newBoard.leftValue).toBe(6);
    expect(result.newBoard.rightValue).toBe(4);
    expect(result.newHand.length).toBe(1);
    expect(result.newHand[0]).toEqual([0, 0]);
  });
});
