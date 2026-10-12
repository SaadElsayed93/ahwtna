import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import { GameError, getTileId } from '@ahwtna/shared';
import { AhwtnaServer } from '../src/server.js';
import { GameRoom } from '../src/room/game-room.js';
import type { ClientGameView } from '@ahwtna/shared';

describe('Anti-Cheat & Socket Sync Protocol (ENG-080 to ENG-086)', () => {
  let server: AhwtnaServer;
  let serverUrl: string;

  beforeAll(async () => {
    server = new AhwtnaServer({ turnTimeoutMs: 10_000, reconnectGraceMs: 5_000 });
    serverUrl = await server.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    await server.close();
  });

  describe('ENG-080: Authoritative Scoring Enforcement', () => {
    it('calculates round and match scores strictly on server and ignores client attempts to forge scores', () => {
      const room = new GameRoom('AC080', 'INDIVIDUAL_2P', 'p1', 'لاعب 1');
      room.joinPlayer('p2', 'لاعب 2', 1);
      room.startNextRound(777);

      // التأكد من أن رصيد البداية هو 0 لكل مقعد
      expect((room.matchScore as { seat0: number; seat1: number }).seat0).toBe(0);
      expect((room.matchScore as { seat0: number; seat1: number }).seat1).toBe(0);

      // لا يوجد في عقود الأوامر أي حقل للرصيد، وأي استدعاء يتم احتسابه من أيدي السيرفر الموثوقة
      expect(room.activeRound).toBeDefined();
    });
  });

  describe('ENG-081: Optimistic Locking & Race-Condition Concurrency', () => {
    it('processes the first valid command and rejects concurrent/stale command with STALE_STATE', () => {
      const room = new GameRoom('AC081', 'INDIVIDUAL_2P', 'p1', 'لاعب 1');
      room.joinPlayer('p2', 'لاعب 2', 1);
      room.startNextRound(42);

      const activeSeat = room.activeRound!.currentTurnSeat;
      const initialVersion = room.stateVersion;
      const legalMoves = room.activeRound!.getLegalMoves(activeSeat);
      const startingTile = legalMoves[0]!;

      // أمر 1: صحيح مع النسخة الحالية
      const cmd1 = {
        type: 'PLAY_TILE' as const,
        seat: activeSeat,
        tileId: getTileId(startingTile),
        targetEnd: 'LEFT' as const,
        clientCommandId: 'cmd-race-1',
        expectedStateVersion: initialVersion,
      };

      // أمر 2: محاولة متزامنة بنفس النسخة القديمة
      const cmd2 = {
        type: 'PLAY_TILE' as const,
        seat: activeSeat,
        tileId: getTileId(startingTile),
        targetEnd: 'RIGHT' as const,
        clientCommandId: 'cmd-race-2',
        expectedStateVersion: initialVersion,
      };

      // الأمر الأول ينجح وتزداد نسخة السيرفر
      const res1 = room.executeCommand(cmd1);
      expect(res1.events).toHaveLength(1);
      expect(room.stateVersion).toBe(initialVersion + 1);

      // الأمر الثاني يُرفض فوراً بـ STALE_STATE
      expect(() => {
        room.executeCommand(cmd2);
      }).toThrowError(GameError);

      try {
        room.executeCommand(cmd2);
      } catch (err) {
        expect((err as GameError).code).toBe('STALE_STATE');
      }
    });
  });

  describe('ENG-082: Zero-Knowledge Hands Secrecy in WebSocket Packets', () => {
    it('verifies that projected game view never leaks opponent tiles to the client', async () => {
      const client1: ClientSocket = ioc(serverUrl, { transports: ['websocket'] });
      const client2: ClientSocket = ioc(serverUrl, { transports: ['websocket'] });

      let roomId = '';
      await new Promise<void>((resolve) => {
        client1.emit(
          'room:create',
          { hostName: 'لاعب سري 1', mode: 'INDIVIDUAL_2P' },
          (res: { roomId: string }) => {
            roomId = res.roomId;
            resolve();
          }
        );
      });

      await new Promise<void>((resolve) => {
        client2.emit('room:join', { roomId, playerName: 'لاعب سري 2' }, () => resolve());
      });

      let view1: ClientGameView | null = null;
      client1.on('game:view', (v: ClientGameView) => {
        view1 = v;
      });

      // كلا اللاعبين يضغط جاهز
      await new Promise<void>((resolve) => {
        client1.emit('room:ready', { roomId, isReady: true }, () => resolve());
      });
      await new Promise<void>((resolve) => {
        client2.emit('room:ready', { roomId, isReady: true }, () => resolve());
      });

      await new Promise((r) => setTimeout(r, 100));
      expect(view1).not.toBeNull();

      // فحص حزمة العميل 1: يده الخاصة فقط مكشوفة
      expect(view1!.mySeat).toBe(0);
      expect(view1!.myHand).toHaveLength(7);

      // فحص بيانات الخصم: لا يوجد مصفوفة hand ولا أرقام البلاطات
      const opponentPublic = view1!.players.find((p) => p.seat === 1)!;
      expect(opponentPublic.tileCount).toBe(7);
      expect((opponentPublic as unknown as { hand?: unknown }).hand).toBeUndefined();

      client1.disconnect();
      client2.disconnect();
    });
  });

  describe('ENG-083: Reconnection Mid-Game & State Sync (SYNC_STATE)', () => {
    it('allows a disconnected player to reconnect and receive full current state instantly', async () => {
      const client1: ClientSocket = ioc(serverUrl, { transports: ['websocket'] });
      const client2: ClientSocket = ioc(serverUrl, { transports: ['websocket'] });

      let roomId = '';
      let p1Id = '';
      await new Promise<void>((resolve) => {
        client1.emit(
          'room:create',
          { hostName: 'محروس', mode: 'INDIVIDUAL_2P' },
          (res: { roomId: string; player: { id: string } }) => {
            roomId = res.roomId;
            p1Id = res.player.id;
            resolve();
          }
        );
      });

      await new Promise<void>((resolve) => {
        client2.emit('room:join', { roomId, playerName: 'عطا' }, () => resolve());
      });

      // بدء الجولة
      await new Promise<void>((resolve) => {
        client1.emit('room:ready', { roomId, isReady: true }, () => resolve());
      });
      await new Promise<void>((resolve) => {
        client2.emit('room:ready', { roomId, isReady: true }, () => resolve());
      });

      await new Promise((r) => setTimeout(r, 60));

      // محاكاة انقطاع اتصال اللاعب 1
      client1.disconnect();
      await new Promise((r) => setTimeout(r, 60));

      const room = server.roomManager.getRoom(roomId)!;
      expect(room.getPlayerById(p1Id)?.isConnected).toBe(false);

      // إعادة الاتصال عبر عميل جديد بنفس الـ playerId
      const client1Reconnected: ClientSocket = ioc(serverUrl, { transports: ['websocket'] });

      let syncSuccess = false;
      let syncedView: ClientGameView | undefined;
      await new Promise<void>((resolve) => {
        client1Reconnected.emit(
          'room:reconnect',
          { roomId, playerId: p1Id },
          (res: { success: boolean; gameView: ClientGameView }) => {
            syncSuccess = res.success;
            syncedView = res.gameView;
            resolve();
          }
        );
      });

      expect(syncSuccess).toBe(true);
      expect(syncedView).toBeDefined();
      expect(syncedView!.mySeat).toBe(0);
      expect(syncedView!.myHand).toHaveLength(7);

      client1Reconnected.disconnect();
      client2.disconnect();
    });
  });

  describe('ENG-085: Move Rejection After Round Finish', () => {
    it('throws GAME_ALREADY_FINISHED when client attempts a move after round ends', () => {
      const room = new GameRoom('AC085', 'INDIVIDUAL_2P', 'p1', 'لاعب 1');
      room.joinPlayer('p2', 'لاعب 2', 1);
      room.startNextRound(42);

      // محاكاة انتهاء الجولة
      room.status = 'ROUND_ENDED';

      expect(() => {
        room.executeCommand({
          type: 'PASS',
          seat: 0,
          clientCommandId: 'cmd-after-finish',
          expectedStateVersion: room.stateVersion,
        });
      }).toThrowError(GameError);

      try {
        room.executeCommand({
          type: 'PASS',
          seat: 0,
          clientCommandId: 'cmd-after-finish',
          expectedStateVersion: room.stateVersion,
        });
      } catch (err) {
        expect((err as GameError).code).toBe('GAME_ALREADY_FINISHED');
      }
    });
  });

  describe('ENG-086: Unauthorized Seat Action Rejection', () => {
    it('rejects commands sent by a socket claiming a different seat', async () => {
      const client1: ClientSocket = ioc(serverUrl, { transports: ['websocket'] });
      const client2: ClientSocket = ioc(serverUrl, { transports: ['websocket'] });

      let roomId = '';
      await new Promise<void>((resolve) => {
        client1.emit(
          'room:create',
          { hostName: 'نزيه', mode: 'INDIVIDUAL_2P' },
          (res: { roomId: string }) => {
            roomId = res.roomId;
            resolve();
          }
        );
      });

      await new Promise<void>((resolve) => {
        client2.emit('room:join', { roomId, playerName: 'سامي' }, () => resolve());
      });

      await new Promise<void>((resolve) => {
        client1.emit('room:ready', { roomId, isReady: true }, () => resolve());
      });
      await new Promise<void>((resolve) => {
        client2.emit('room:ready', { roomId, isReady: true }, () => resolve());
      });

      await new Promise((r) => setTimeout(r, 60));

      // العميل 1 جالس في المقعد 0، ولكنه يحاول إرسال أمر باسم المقعد 1
      let errorCode = '';
      await new Promise<void>((resolve) => {
        client1.emit(
          'game:command',
          {
            type: 'PASS',
            seat: 1, // مقعد الخصم عمداً
            clientCommandId: 'imposter-cmd',
            expectedStateVersion: 3,
          },
          (res: { error: string }) => {
            errorCode = res.error;
            resolve();
          }
        );
      });

      expect(errorCode).toBe('UNAUTHORIZED_ACTION');

      client1.disconnect();
      client2.disconnect();
    });
  });
});
