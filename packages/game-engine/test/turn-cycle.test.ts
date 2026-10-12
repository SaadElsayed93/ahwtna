import { describe, expect, it } from 'vitest';
import { createTile, GameError } from '@ahwtna/shared';
import { createEmptyBoard, playTileOnBoard } from '../src/board.js';
import {
  executeDraw,
  executePass,
  isGameBlocked,
  type TurnContext,
} from '../src/turn-cycle.js';

describe('Turn Cycle, Draw Policy & Blocked Detection (ENG-060 to ENG-069)', () => {
  it('ENG-060: rejects draw in team mode (CANNOT_DRAW_IN_TEAM_MODE)', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard(createTile(2, 4), 'RIGHT', board);

    const ctx: TurnContext = {
      mode: 'TEAM_4P',
      activeSeat: 0,
      hands: { 0: [createTile(0, 1)], 1: [], 2: [], 3: [] },
      boneyard: [],
      board,
    };

    expect(() => executeDraw(0, ctx)).toThrow(GameError);
    try {
      executeDraw(0, ctx);
    } catch (e) {
      expect((e as GameError).code).toBe('CANNOT_DRAW_IN_TEAM_MODE');
    }
  });

  it('ENG-068: allows draw in 2P mode when no legal move exists and boneyard has tiles', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard(createTile(2, 4), 'RIGHT', board); // ends: 2, 4

    const ctx: TurnContext = {
      mode: 'INDIVIDUAL_2P',
      activeSeat: 0,
      hands: {
        0: [createTile(0, 1)], // Cannot play on 2 or 4
        1: [createTile(2, 3)],
        2: [],
        3: [],
      },
      boneyard: [createTile(4, 5), createTile(6, 6)],
      board,
    };

    const result = executeDraw(0, ctx);
    expect(result.drawnTile).toEqual([4, 5]);
    expect(result.newHand.length).toBe(2);
    expect(result.newBoneyard.length).toBe(1);
  });

  it('prevents draw in 2P mode if player already has a legal move', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard(createTile(2, 4), 'RIGHT', board); // ends: 2, 4

    const ctx: TurnContext = {
      mode: 'INDIVIDUAL_2P',
      activeSeat: 0,
      hands: {
        0: [createTile(2, 5)], // Can play on 2!
        1: [],
        2: [],
        3: [],
      },
      boneyard: [createTile(6, 6)],
      board,
    };

    expect(() => executeDraw(0, ctx)).toThrow(GameError);
    try {
      executeDraw(0, ctx);
    } catch (e) {
      expect((e as GameError).code).toBe('CANNOT_DRAW_WHEN_MOVE_EXISTS');
    }
  });

  it('ENG-061: rejects pass when player has a legal move (CANNOT_PASS_WHEN_MOVE_EXISTS)', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard(createTile(3, 5), 'RIGHT', board);

    const ctx: TurnContext = {
      mode: 'TEAM_4P',
      activeSeat: 1,
      hands: {
        0: [],
        1: [createTile(3, 4)], // Has legal move on 3!
        2: [],
        3: [],
      },
      boneyard: [],
      board,
    };

    expect(() => executePass(1, ctx)).toThrow(GameError);
    try {
      executePass(1, ctx);
    } catch (e) {
      expect((e as GameError).code).toBe('CANNOT_PASS_WHEN_MOVE_EXISTS');
    }
  });

  it('ENG-063: accepts immediate pass in 4P team mode when no moves exist', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard(createTile(3, 5), 'RIGHT', board); // ends: 3, 5

    const ctx: TurnContext = {
      mode: 'TEAM_4P',
      activeSeat: 1,
      hands: {
        0: [createTile(3, 6)],
        1: [createTile(0, 1)], // No moves on 3 or 5
        2: [createTile(5, 5)],
        3: [createTile(2, 2)],
      },
      boneyard: [],
      board,
    };

    const pass = executePass(1, ctx);
    expect(pass.nextSeat).toBe(2);
    expect(pass.isBlocked).toBe(false); // Player 2 has [5|5]!
  });

  it('ENG-062 & ENG-069: in 2P mode, accepts pass only when boneyard is empty and no moves exist', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard(createTile(3, 5), 'RIGHT', board);

    // Context with non-empty boneyard -> must draw first!
    const ctxWithBoneyard: TurnContext = {
      mode: 'INDIVIDUAL_2P',
      activeSeat: 0,
      hands: { 0: [createTile(0, 1)], 1: [createTile(3, 4)], 2: [], 3: [] },
      boneyard: [createTile(6, 6)],
      board,
    };
    expect(() => executePass(0, ctxWithBoneyard)).toThrow(GameError);

    // Context with empty boneyard -> pass accepted!
    const ctxEmptyBoneyard: TurnContext = {
      ...ctxWithBoneyard,
      boneyard: [],
    };
    const pass = executePass(0, ctxEmptyBoneyard);
    expect(pass.nextSeat).toBe(1);
    expect(pass.isBlocked).toBe(false);
  });

  it('ENG-064 & ENG-066: detects blocked game when NO living player can make a move', () => {
    let board = createEmptyBoard();
    // Board open ends are 1 and 6
    board = playTileOnBoard(createTile(1, 6), 'RIGHT', board);

    // Neither player holds a 1 or a 6
    const hands = {
      0: [createTile(2, 3), createTile(4, 5)],
      1: [createTile(0, 2), createTile(3, 3)],
    };

    expect(isGameBlocked(board, hands)).toBe(true);
  });

  it('ENG-065: does NOT trigger blocked game if any player still has a move', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard(createTile(1, 6), 'RIGHT', board);

    const hands = {
      0: [createTile(2, 3)], // Cannot play
      1: [createTile(1, 4)], // CAN play on 1!
    };

    expect(isGameBlocked(board, hands)).toBe(false);
  });
});
