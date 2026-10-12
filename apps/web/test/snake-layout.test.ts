import { describe, it, expect } from 'vitest';
import { computeConnectedSnakeLayout } from '../src/layout/snake-layout.js';
import { createEmptyBoard, playTileOnBoard } from '@ahwtna/game-engine';

describe('Connected Snake Domino Layout (TEST-8.4)', () => {
  it('returns empty layout on an empty board', () => {
    const empty = createEmptyBoard();
    const layout = computeConnectedSnakeLayout(empty, 5);

    expect(layout.tiles).toHaveLength(0);
    expect(layout.totalWidth).toBe(0);
    expect(layout.totalHeight).toBe(0);
    expect(layout.leftOpenValue).toBeNull();
    expect(layout.rightOpenValue).toBeNull();
  });

  it('correctly lays out first tile with open ends', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard([6, 6], 'LEFT', board);

    const layout = computeConnectedSnakeLayout(board, 5);
    expect(layout.tiles).toHaveLength(1);
    expect(layout.tiles[0]?.isDouble).toBe(true);
    expect(layout.tiles[0]?.orientation).toBe('vertical');
    expect(layout.tiles[0]?.isFirst).toBe(true);
    expect(layout.tiles[0]?.isLast).toBe(true);
    expect(layout.leftOpenValue).toBe(6);
    expect(layout.rightOpenValue).toBe(6);
    expect(layout.leftTarget).not.toBeNull();
    expect(layout.rightTarget).not.toBeNull();
  });

  it('connects corner turn tile continuously between rows when row limit is reached', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard([6, 6], 'LEFT', board);
    board = playTileOnBoard([6, 5], 'RIGHT', board);
    board = playTileOnBoard([5, 4], 'RIGHT', board);
    board = playTileOnBoard([4, 3], 'RIGHT', board);
    board = playTileOnBoard([3, 2], 'RIGHT', board);
    board = playTileOnBoard([2, 1], 'RIGHT', board);
    board = playTileOnBoard([1, 0], 'RIGHT', board);

    // With tilesPerRow = 3, corner turns must be generated to snake around
    const layout = computeConnectedSnakeLayout(board, 3);
    expect(layout.tiles).toHaveLength(7);

    const cornerTurns = layout.tiles.filter(t => t.isCornerTurn);
    expect(cornerTurns.length).toBeGreaterThan(0);

    // Corner turn tiles are oriented vertically to physically link row to row
    for (const turn of cornerTurns) {
      expect(turn.orientation).toBe('vertical');
    }
  });

  it('preserves matching pips at every adjacent tile contact point', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard([6, 5], 'LEFT', board);
    board = playTileOnBoard([5, 5], 'RIGHT', board); // double
    board = playTileOnBoard([5, 4], 'RIGHT', board);
    board = playTileOnBoard([4, 3], 'RIGHT', board);

    const layout = computeConnectedSnakeLayout(board, 4);
    expect(layout.tiles).toHaveLength(4);

    // At tile 0: [6|5], right half is 5
    // At tile 1: [5|5], connects to 5
    // At tile 2: [5|4], connects to 5, other half is 4
    // At tile 3: [4|3], connects to 4, other half is 3
    expect(layout.leftOpenValue).toBe(6);
    expect(layout.rightOpenValue).toBe(3);
  });
});
