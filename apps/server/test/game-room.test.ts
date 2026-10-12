import { describe, expect, it } from 'vitest';
import { GameError, getTileId } from '@ahwtna/shared';
import { GameRoom } from '../src/room/game-room.js';

describe('GameRoom & Authoritative Engine (TEST-9.4)', () => {
  it('automatically starts a round when all seats are occupied and all players toggle ready', () => {
    const room = new GameRoom('AHW101', 'INDIVIDUAL_2P', 'p1', 'اللاعب الأول');
    room.joinPlayer('p2', 'اللاعب الثاني', 1);

    expect(room.status).toBe('LOBBY');
    expect(room.currentRoundNumber).toBe(0);

    // الأول يضغط جاهز
    const res1 = room.setReady('p1', true);
    expect(res1.roundStarted).toBe(false);
    expect(room.status).toBe('LOBBY');

    // الثاني يضغط جاهز -> تبدأ الجولة فوراً
    const res2 = room.setReady('p2', true);
    expect(res2.roundStarted).toBe(true);
    expect(room.status).toBe('IN_ROUND');
    expect(room.currentRoundNumber).toBe(1);
    expect(room.activeRound).toBeDefined();
  });

  it('enforces zero-knowledge projection: masks opponents hands and provides only tileCount', () => {
    const room = new GameRoom('AHW102', 'INDIVIDUAL_2P', 'p1', 'أحمد');
    room.joinPlayer('p2', 'محمود', 1);
    room.setReady('p1', true);
    room.setReady('p2', true);

    const viewSeat0 = room.getClientGameView(0)!;
    expect(viewSeat0).toBeDefined();
    expect(viewSeat0.mySeat).toBe(0);
    expect(viewSeat0.myHand).toHaveLength(7);
    expect(viewSeat0.boneyardCount).toBe(14);

    // تفقد بيانات الخصم: تظهر فقط tileCount بدون كشف البلاطات
    const opponentView = viewSeat0.players.find((p) => p.seat === 1)!;
    expect(opponentView.displayName).toBe('محمود');
    expect(opponentView.tileCount).toBe(7);
    expect((opponentView as unknown as { hand?: unknown }).hand).toBeUndefined();
  });

  it('enforces optimistic locking: rejects stale commands with STALE_STATE', () => {
    const room = new GameRoom('AHW103', 'INDIVIDUAL_2P', 'p1', 'سعيد');
    room.joinPlayer('p2', 'خالد', 1);
    room.setReady('p1', true);
    room.setReady('p2', true);

    const currentVersion = room.stateVersion;

    expect(() => {
      room.executeCommand({
        type: 'PASS',
        seat: 0,
        clientCommandId: 'cmd-stale',
        expectedStateVersion: currentVersion - 1, // نسخة متقادمة عمداً
      });
    }).toThrowError(GameError);

    try {
      room.executeCommand({
        type: 'PASS',
        seat: 0,
        clientCommandId: 'cmd-stale',
        expectedStateVersion: currentVersion - 1,
      });
    } catch (err) {
      expect((err as GameError).code).toBe('STALE_STATE');
    }
  });

  it('enforces turn order: rejects moves from non-active players with NOT_YOUR_TURN', () => {
    const room = new GameRoom('AHW104', 'INDIVIDUAL_2P', 'p1', 'علي');
    room.joinPlayer('p2', 'حسن', 1);
    room.setReady('p1', true);
    room.setReady('p2', true);

    const activeSeat = room.activeRound!.currentTurnSeat;
    const nonActiveSeat = (activeSeat === 0 ? 1 : 0) as 0 | 1;

    expect(() => {
      room.executeCommand({
        type: 'PASS',
        seat: nonActiveSeat,
        clientCommandId: 'cmd-wrong-turn',
        expectedStateVersion: room.stateVersion,
      });
    }).toThrowError(GameError);

    try {
      room.executeCommand({
        type: 'PASS',
        seat: nonActiveSeat,
        clientCommandId: 'cmd-wrong-turn',
        expectedStateVersion: room.stateVersion,
      });
    } catch (err) {
      expect((err as GameError).code).toBe('NOT_YOUR_TURN');
    }
  });

  it('executes the authoritative first round opening move successfully', () => {
    // نستخدم seed ثابت لجعل التوزيع حتمياً
    const room = new GameRoom('AHW105', 'INDIVIDUAL_2P', 'p1', 'طارق');
    room.joinPlayer('p2', 'عمر', 1);
    room.startNextRound(42);

    const activeSeat = room.activeRound!.currentTurnSeat;
    const legalMoves = room.activeRound!.getLegalMoves(activeSeat);
    expect(legalMoves.length).toBeGreaterThan(0);

    const startingTile = legalMoves[0]!;
    const initialHandLength = room.activeRound!.hands.get(activeSeat)!.length;
    const initialVersion = room.stateVersion;

    const result = room.executeCommand({
      type: 'PLAY_TILE',
      seat: activeSeat,
      tileId: getTileId(startingTile),
      targetEnd: 'LEFT',
      clientCommandId: 'cmd-open',
      expectedStateVersion: initialVersion,
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.type).toBe('TILE_PLAYED');
    expect(room.activeRound!.hands.get(activeSeat)!.length).toBe(initialHandLength - 1);
    expect(room.activeRound!.board.nodes).toHaveLength(1);
    expect(room.stateVersion).toBe(initialVersion + 1);
  });
});
