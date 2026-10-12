import { describe, expect, it } from 'vitest';
import { createTile } from '@ahwtna/shared';
import { chooseAIMove } from '../src/ai.js';
import { createEmptyBoard, playTileOnBoard, validateBoardMove } from '../src/board.js';

describe('Offline AI Player (ENG-070, ENG-071, ENG-072)', () => {
  it('ENG-070: AI always selects legal moves according to the board state', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard(createTile(2, 4), 'RIGHT', board); // ends: 2, 4

    const hand = [createTile(0, 1), createTile(2, 5), createTile(3, 4)];

    const action = chooseAIMove({
      seat: 0,
      hand,
      board,
      mode: 'INDIVIDUAL_2P',
      boneyardCount: 10,
    });

    expect(action.action).toBe('PLAY');
    if (action.action === 'PLAY') {
      // Must be a tile from the player's hand
      expect(hand).toContainEqual(action.tile);
      // Must be completely legal according to board validator
      expect(() => validateBoardMove(action.tile, action.targetEnd, board)).not.toThrow();
    }
  });

  it('ENG-071: strictly respects information boundary with no leak of opponent tiles', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard(createTile(3, 3), 'RIGHT', board);

    // AI is provided strictly its own 1 tile and a boneyard count (number only)
    const ownHand = [createTile(3, 6)];
    const action = chooseAIMove({
      seat: 1,
      hand: ownHand,
      board,
      mode: 'TEAM_4P',
      boneyardCount: 0,
    });

    expect(action.action).toBe('PLAY');
    if (action.action === 'PLAY') {
      expect(action.tile).toEqual([3, 6]);
    }
  });

  it('ENG-072: requests DRAW in 2P mode when no legal moves and boneyard is available', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard(createTile(2, 4), 'RIGHT', board); // ends: 2, 4

    const hand = [createTile(0, 1), createTile(3, 5)]; // No 2 or 4

    const action = chooseAIMove({
      seat: 0,
      hand,
      board,
      mode: 'INDIVIDUAL_2P',
      boneyardCount: 5,
    });

    expect(action.action).toBe('DRAW');
  });

  it('ENG-072: requests PASS in 4P team mode immediately when no legal moves exist', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard(createTile(2, 4), 'RIGHT', board); // ends: 2, 4

    const hand = [createTile(0, 1), createTile(3, 5)];

    const action = chooseAIMove({
      seat: 0,
      hand,
      board,
      mode: 'TEAM_4P',
      boneyardCount: 0,
    });

    expect(action.action).toBe('PASS');
  });
});
