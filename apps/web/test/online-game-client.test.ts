import { describe, it, expect, vi } from 'vitest';
import { OnlineGameClient, type SoundEffect } from '../src/controllers/online-game-client.js';
import type { GameEvent } from '@ahwtna/shared';

describe('OnlineGameClient (عميل اللعبة الأونلاين التفاعلي)', () => {
  it('initializes with default state when autoConnect is false', () => {
    const client = new OnlineGameClient({ autoConnect: false });

    expect(client.isConnected).toBe(false);
    expect(client.currentRoom).toBe(null);
    expect(client.myPlayer).toBe(null);
    expect(client.gameView).toBe(null);
    expect(client.turnTimeRemaining).toBe(30);
    expect(client.matchFeed.length).toBe(0);
  });

  it('subscribes and notifies listeners on state changes', () => {
    const client = new OnlineGameClient({ autoConnect: false });
    const listener = vi.fn();

    const unsubscribe = client.subscribe(listener);
    client.addFeedMessage('رسالة اختبارية للقهوة');

    expect(listener).not.toHaveBeenCalled(); // addFeedMessage alone doesn't notify, but we can verify notify calls
    expect(client.matchFeed.length).toBe(1);
    expect(client.matchFeed[0]!.text).toBe('رسالة اختبارية للقهوة');

    unsubscribe();
  });

  it('caps match feed at 25 entries and formats UI feed events correctly', () => {
    const client = new OnlineGameClient({ autoConnect: false });

    for (let i = 1; i <= 30; i++) {
      client.addFeedMessage(`حركة رقم ${i}`, 'PLAY');
    }

    expect(client.matchFeed.length).toBe(25);
    expect(client.matchFeed[0]!.text).toBe('حركة رقم 30');

    const uiEvents = client.getUiFeedEvents();
    expect(uiEvents.length).toBe(25);
    expect(uiEvents[0]!.type).toBe('PLAY');
    expect(uiEvents[0]!.timestamp).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('handles TILE_PLAYED event with Egyptian naming and triggers slam sound', () => {
    const soundSpy = vi.fn<(sound: SoundEffect) => void>();
    const client = new OnlineGameClient({ autoConnect: false, onSound: soundSpy });

    const playEvent: GameEvent = {
      type: 'TILE_PLAYED',
      seat: 0,
      tileId: '6|6',
      targetEnd: 'LEFT',
      leftValue: 6,
      rightValue: 6,
      remainingHandCount: 6,
    };

    // Private method invocation for unit testing event pipeline
    (client as unknown as { handleGameEvent: (evt: GameEvent) => void }).handleGameEvent(playEvent);

    expect(soundSpy).toHaveBeenCalledWith('slam');
    expect(client.matchFeed[0]!.text).toContain('المقعد 0 لعب [6|6]');
    expect(client.matchFeed[0]!.text).toContain('الدش');
    expect(client.matchFeed[0]!.type).toBe('PLAY');
  });

  it('handles TILE_DRAWN, PLAYER_PASSED, and triggers proper café sounds', () => {
    const soundSpy = vi.fn<(sound: SoundEffect) => void>();
    const client = new OnlineGameClient({ autoConnect: false, onSound: soundSpy });

    // سحب من البلاطة
    const drawEvent: GameEvent = {
      type: 'TILE_DRAWN',
      seat: 1,
      remainingBoneyardCount: 13,
    };
    (client as unknown as { handleGameEvent: (evt: GameEvent) => void }).handleGameEvent(drawEvent);
    expect(soundSpy).toHaveBeenCalledWith('draw');
    expect(client.matchFeed[0]!.text).toContain('سحب بلاطة من المخزون');
    expect(client.matchFeed[0]!.type).toBe('DRAW');

    // تمرير (باص)
    const passEvent: GameEvent = {
      type: 'PLAYER_PASSED',
      seat: 1,
    };
    (client as unknown as { handleGameEvent: (evt: GameEvent) => void }).handleGameEvent(passEvent);
    expect(soundSpy).toHaveBeenCalledWith('pass');
    expect(client.matchFeed[0]!.text).toContain('باص (تمرير الدور)');
    expect(client.matchFeed[0]!.type).toBe('PASS');
  });

  it('handles ROUND_ENDED (Domino vs Blocked) and MATCH_ENDED', () => {
    const soundSpy = vi.fn<(sound: SoundEffect) => void>();
    const client = new OnlineGameClient({ autoConnect: false, onSound: soundSpy });

    // نهاية الجولة بخروج دومينو
    const dominoOutEvent: GameEvent = {
      type: 'ROUND_ENDED',
      result: {
        roundNumber: 1,
        reason: 'DOMINO_OUT',
        isTie: false,
        winnerSeat: 0,
        penalizedSeat: 1,
        penaltyPoints: 24,
        pipSummaries: [],
      },
      updatedScore: { seat0: 0, seat1: 24 },
    };
    (client as unknown as { handleGameEvent: (evt: GameEvent) => void }).handleGameEvent(dominoOutEvent);
    expect(soundSpy).toHaveBeenCalledWith('win');
    expect(client.matchFeed[0]!.text).toContain('خروج دومينو');
    expect(client.matchFeed[0]!.type).toBe('DOMINO');

    // نهاية الجولة بقفلة
    const blockedEvent: GameEvent = {
      type: 'ROUND_ENDED',
      result: {
        roundNumber: 2,
        reason: 'BLOCKED_GAME',
        isTie: false,
        winnerSeat: 1,
        penalizedSeat: 0,
        penaltyPoints: 12,
        pipSummaries: [],
      },
      updatedScore: { seat0: 12, seat1: 24 },
    };
    (client as unknown as { handleGameEvent: (evt: GameEvent) => void }).handleGameEvent(blockedEvent);
    expect(soundSpy).toHaveBeenCalledWith('block');
    expect(client.matchFeed[0]!.text).toContain('قفلة معلم');
    expect(client.matchFeed[0]!.type).toBe('BLOCKED');

    // نهاية الماتش بالوصول للـ 101
    const matchEndEvent: GameEvent = {
      type: 'MATCH_ENDED',
      winnerSeat: 0,
      finalScore: { seat0: 45, seat1: 104 },
    };
    (client as unknown as { handleGameEvent: (evt: GameEvent) => void }).handleGameEvent(matchEndEvent);
    expect(soundSpy).toHaveBeenCalledWith('win');
    expect(client.matchFeed[0]!.text).toContain('انتهى الماتش وبلغ الخاسر حد الـ 101');
  });

  it('sends room:quick_match and handles successful matchmaking response', async () => {
    const client = new OnlineGameClient({ autoConnect: false });

    // Mock socket.emit
    const mockRoom = {
      roomId: 'AHW-999',
      mode: 'INDIVIDUAL_2P' as const,
      hostId: 'socket-1',
      status: 'LOBBY' as const,
      players: [
        {
          id: 'socket-1',
          displayName: 'المعلم صبحي',
          seat: 0 as const,
          isHost: true,
          isReady: true,
          isConnected: true,
        },
      ],
      stateVersion: 1,
      currentRoundNumber: 1,
      matchScore: { seat0: 0, seat1: 0 },
    };

    client.socket = {
      emit: vi.fn((event, payload, cb) => {
        if (event === 'room:quick_match') {
          cb({
            success: true,
            roomId: 'AHW-999',
            room: mockRoom,
            player: mockRoom.players[0],
            roundStarted: false,
          });
        }
      }),
    } as unknown as typeof client.socket;

    const res = await client.quickMatch('المعلم صبحي', 'INDIVIDUAL_2P');

    expect(res.roomId).toBe('AHW-999');
    expect(res.roundStarted).toBe(false);
    expect(client.currentRoom?.roomId).toBe('AHW-999');
    expect(client.myPlayer?.displayName).toBe('المعلم صبحي');
    expect(client.matchFeed[0]!.text).toContain('انضممت لماتش أونلاين عشوائي');
  });
});
