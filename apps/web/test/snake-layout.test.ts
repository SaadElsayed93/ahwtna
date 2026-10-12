import { describe, it, expect } from 'vitest';
import { computeSnakeLayout } from '../src/layout/snake-layout.js';
import { createEmptyBoard, playTileOnBoard } from '@ahwtna/game-engine';
import type { BoardState } from '@ahwtna/shared';

describe('Snake Domino Layout (TEST-8.4)', () => {
  it('returns empty layout on an empty board', () => {
    const empty = createEmptyBoard();
    const layout = computeSnakeLayout(empty, 6);

    expect(layout.items).toHaveLength(0);
    expect(layout.totalRows).toBe(0);
    expect(layout.leftOpenValue).toBeNull();
    expect(layout.rightOpenValue).toBeNull();
  });

  it('correctly lays out first tile', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard([6, 6], 'LEFT', board);

    const layout = computeSnakeLayout(board, 6);
    expect(layout.items).toHaveLength(1);
    expect(layout.items[0]?.isDouble).toBe(true);
    expect(layout.items[0]?.orientation).toBe('vertical'); // Doubles are vertical
    expect(layout.items[0]?.isFirst).toBe(true);
    expect(layout.items[0]?.isLast).toBe(true);
    expect(layout.totalRows).toBe(1);
    expect(layout.leftOpenValue).toBe(6);
    expect(layout.rightOpenValue).toBe(6);
  });

  it('wraps onto subsequent rows when tiles exceed tilesPerRow limit', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard([6, 6], 'LEFT', board);
    board = playTileOnBoard([6, 5], 'RIGHT', board);
    board = playTileOnBoard([5, 4], 'RIGHT', board);
    board = playTileOnBoard([4, 3], 'RIGHT', board);
    board = playTileOnBoard([3, 2], 'RIGHT', board);
    board = playTileOnBoard([2, 1], 'RIGHT', board);
    board = playTileOnBoard([1, 0], 'RIGHT', board); // 7th tile

    // With tilesPerRow = 4, 7 tiles must wrap onto 2 rows
    const layout = computeSnakeLayout(board, 4);
    expect(layout.items).toHaveLength(7);
    expect(layout.totalRows).toBe(2);

    const row0Items = layout.items.filter(i => i.row === 0);
    const row1Items = layout.items.filter(i => i.row === 1);

    expect(row0Items).toHaveLength(4);
    expect(row1Items).toHaveLength(3);

    // Row 0 is ltr, Row 1 is rtl
    expect(row0Items[0]?.rowDirection).toBe('ltr');
    expect(row1Items[0]?.rowDirection).toBe('rtl');
  });

  it('keeps doubles vertical and non-doubles horizontal', () => {
    let board = createEmptyBoard();
    board = playTileOnBoard([6, 5], 'LEFT', board);
    board = playTileOnBoard([5, 5], 'RIGHT', board); // double [5|5]
    board = playTileOnBoard([5, 4], 'RIGHT', board);

    const layout = computeSnakeLayout(board, 5);
    expect(layout.items).toHaveLength(3);

    const tile0 = layout.items[0]!;
    const tile1 = layout.items[1]!;
    const tile2 = layout.items[2]!;

    expect(tile0.isDouble).toBe(false);
    expect(tile0.orientation).toBe('horizontal');

    expect(tile1.isDouble).toBe(true);
    expect(tile1.orientation).toBe('vertical');

    expect(tile2.isDouble).toBe(false);
    expect(tile2.orientation).toBe('horizontal');
  });
});
