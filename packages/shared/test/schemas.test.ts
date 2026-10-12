import { describe, expect, it } from 'vitest';
import {
  DrawTileCommandSchema,
  GameCommandSchema,
  PassCommandSchema,
  PlayTileCommandSchema,
} from '../src/schemas/commands.js';

describe('Game Command Zod Schemas (TEST-1.1)', () => {
  it('accepts valid PLAY_TILE command', () => {
    const valid = {
      type: 'PLAY_TILE',
      tileId: '3|5',
      targetEnd: 'LEFT',
      clientCommandId: 'cmd-12345',
      expectedStateVersion: 3,
      seat: 0,
    };
    const result = PlayTileCommandSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tileId).toBe('3|5');
      expect(result.data.targetEnd).toBe('LEFT');
    }
  });

  it('rejects malformed tile IDs in PLAY_TILE command', () => {
    const invalidTile = {
      type: 'PLAY_TILE',
      tileId: '7|2', // Out of bounds
      targetEnd: 'RIGHT',
      clientCommandId: 'cmd-1',
      expectedStateVersion: 0,
      seat: 1,
    };
    expect(PlayTileCommandSchema.safeParse(invalidTile).success).toBe(false);

    const malformedString = {
      type: 'PLAY_TILE',
      tileId: 'foo-bar',
      targetEnd: 'RIGHT',
      clientCommandId: 'cmd-1',
      expectedStateVersion: 0,
      seat: 1,
    };
    expect(PlayTileCommandSchema.safeParse(malformedString).success).toBe(false);
  });

  it('rejects invalid targetEnd or negative stateVersion', () => {
    const invalidEnd = {
      type: 'PLAY_TILE',
      tileId: '2|4',
      targetEnd: 'CENTER', // Not LEFT or RIGHT
      clientCommandId: 'cmd-1',
      expectedStateVersion: 0,
      seat: 0,
    };
    expect(PlayTileCommandSchema.safeParse(invalidEnd).success).toBe(false);

    const negativeVersion = {
      type: 'DRAW_TILE',
      clientCommandId: 'cmd-1',
      expectedStateVersion: -1,
      seat: 0,
    };
    expect(DrawTileCommandSchema.safeParse(negativeVersion).success).toBe(false);
  });

  it('accepts valid DRAW_TILE and PASS commands', () => {
    const draw = {
      type: 'DRAW_TILE',
      clientCommandId: 'cmd-draw-1',
      expectedStateVersion: 4,
      seat: 1,
    };
    expect(DrawTileCommandSchema.safeParse(draw).success).toBe(true);

    const pass = {
      type: 'PASS',
      clientCommandId: 'cmd-pass-1',
      expectedStateVersion: 5,
      seat: 2,
    };
    expect(PassCommandSchema.safeParse(pass).success).toBe(true);
  });

  it('correctly discriminates command types via GameCommandSchema', () => {
    const play = GameCommandSchema.safeParse({
      type: 'PLAY_TILE',
      tileId: '6|6',
      targetEnd: 'RIGHT',
      clientCommandId: 'c1',
      expectedStateVersion: 1,
      seat: 0,
    });
    expect(play.success).toBe(true);

    const pass = GameCommandSchema.safeParse({
      type: 'PASS',
      clientCommandId: 'c2',
      expectedStateVersion: 2,
      seat: 1,
    });
    expect(pass.success).toBe(true);

    const unknownType = GameCommandSchema.safeParse({
      type: 'UNKNOWN_MOVE',
      clientCommandId: 'c3',
      expectedStateVersion: 3,
      seat: 0,
    });
    expect(unknownType.success).toBe(false);
  });
});
