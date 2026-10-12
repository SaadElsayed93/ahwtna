import { describe, it, expect, vi } from 'vitest';
import { OfflineGameController } from '../src/controllers/offline-game-controller.js';
import { tileEquals, type MatchScore2P } from '@ahwtna/shared';
import { getEgyptianTileName } from '@ahwtna/ui';

describe('Offline Game Controller (TEST-8.1, TEST-8.2, TEST-8.3)', () => {
  it('initializes 2P mode properly with 7 tiles each and 14 in boneyard', () => {
    const onUpdate = vi.fn();
    const ctrl = new OfflineGameController({ onUpdate });
    ctrl.resetMatch();

    expect(ctrl.mode).toBe('INDIVIDUAL_2P');
    expect(ctrl.roundNumber).toBe(1);
    expect(ctrl.hands[0]).toHaveLength(7);
    expect(ctrl.hands[1]).toHaveLength(7);
    expect(ctrl.boneyard).toHaveLength(14);
    expect(ctrl.openingTile).not.toBeNull();
    expect(ctrl.matchOver).toBe(false);
    expect((ctrl.matchScore as MatchScore2P).seat0).toBe(0);
    expect((ctrl.matchScore as MatchScore2P).seat1).toBe(0);
  });

  it('initializes 4P mode properly with 7 tiles for all 4 seats and 0 in boneyard', () => {
    const onUpdate = vi.fn();
    const ctrl = new OfflineGameController({ onUpdate });
    ctrl.setGameMode('TEAM_4P');

    expect(ctrl.mode).toBe('TEAM_4P');
    expect(ctrl.hands[0]).toHaveLength(7);
    expect(ctrl.hands[1]).toHaveLength(7);
    expect(ctrl.hands[2]).toHaveLength(7);
    expect(ctrl.hands[3]).toHaveLength(7);
    expect(ctrl.boneyard).toHaveLength(0);
    expect(ctrl.players).toHaveLength(4);
  });

  it('protects against illegal first round opening moves (TEST-8.3)', () => {
    const onUpdate = vi.fn();
    const ctrl = new OfflineGameController({ onUpdate });
    ctrl.resetMatch();

    // If human starts in round 1
    if (ctrl.currentTurn === 0 && ctrl.openingTile) {
      // Find a tile in human hand that is NOT the opening tile
      const wrongTile = ctrl.hands[0].find(t => !tileEquals(t, ctrl.openingTile!));
      if (wrongTile) {
        ctrl.handlePlayerTileClick(wrongTile);
        // Board should remain empty because opening move was illegal
        expect(ctrl.board.nodes).toHaveLength(0);
        expect(ctrl.statusMessage).toContain('أول جولة لازم تبدأ');
      }
    }
  });

  it('executes valid opening move and places tile on table', () => {
    const onUpdate = vi.fn();
    const ctrl = new OfflineGameController({ onUpdate });
    ctrl.resetMatch();

    // Manually ensure human turn
    ctrl.currentTurn = 0;
    const starterTile = ctrl.openingTile || [6, 6];
    ctrl.openingTile = starterTile;
    ctrl.hands[0] = [starterTile, [6, 5], [5, 4]];

    ctrl.handlePlayerTileClick(starterTile);

    expect(ctrl.board.nodes).toHaveLength(1);
    expect(ctrl.board.leftValue).toBe(starterTile[0]);
    expect(ctrl.board.rightValue).toBe(starterTile[1]);
    expect(ctrl.hands[0]).toHaveLength(2);
    // Turn should advance to next player (AI)
    expect(ctrl.currentTurn).toBe(1);
  });

  it('rejects playing a tile that does not match open ends', () => {
    const onUpdate = vi.fn();
    const ctrl = new OfflineGameController({ onUpdate });
    ctrl.resetMatch();

    // Setup board with [6|6]
    ctrl.currentTurn = 0;
    ctrl.openingTile = [6, 6];
    ctrl.hands[0] = [[6, 6], [1, 2]]; // [1|2] cannot connect to 6
    ctrl.handlePlayerTileClick([6, 6]);

    // Now turn moved to 1, let's force turn back to 0 to test illegal move
    ctrl.currentTurn = 0;
    ctrl.handlePlayerTileClick([1, 2]);

    // Board still only has 1 tile
    expect(ctrl.board.nodes).toHaveLength(1);
    expect(ctrl.statusMessage).toContain('لا تطابق أي طرف مفتوح');
  });

  it('handles draw action correctly in 2P mode', () => {
    const onUpdate = vi.fn();
    const ctrl = new OfflineGameController({ onUpdate });
    ctrl.resetMatch();

    ctrl.currentTurn = 0;
    const initialHandCount = ctrl.hands[0].length;
    const initialBoneyardCount = ctrl.boneyard.length;

    ctrl.handlePlayerDraw();

    expect(ctrl.hands[0].length).toBe(initialHandCount + 1);
    expect(ctrl.boneyard.length).toBe(initialBoneyardCount - 1);
  });

  it('disallows drawing in 4P team mode', () => {
    const onUpdate = vi.fn();
    const ctrl = new OfflineGameController({ onUpdate });
    ctrl.setGameMode('TEAM_4P');

    ctrl.currentTurn = 0;
    const initialHandCount = ctrl.hands[0].length;

    ctrl.handlePlayerDraw();

    expect(ctrl.hands[0].length).toBe(initialHandCount);
  });

  it('ends match when penalty score reaches or exceeds 101 (TEST-8.1)', () => {
    const onUpdate = vi.fn();
    const ctrl = new OfflineGameController({ onUpdate });
    ctrl.resetMatch();

    // Set penalty score close to 101
    ctrl.matchScore = { seat0: 95, seat1: 40 };

    // Simulate round end where human has [6|6] (12 points) and AI has empty hand
    ctrl.hands[0] = [[6, 6]];
    ctrl.hands[1] = [];

    const ended = ctrl.checkEndOfRound();
    expect(ended).toBe(true);
    expect(ctrl.matchOver).toBe(true);
    expect((ctrl.matchScore as MatchScore2P).seat0).toBe(107); // 95 + 12 = 107
    expect(ctrl.modal).not.toBeNull();
    expect(ctrl.modal?.title).toBe('نهاية المباراة!');
  });
});
