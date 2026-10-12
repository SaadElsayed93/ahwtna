import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import { AhwtnaServer } from '../src/server.js';
import type { ClientGameView, RoomPlayer, RoomPublicState } from '@ahwtna/shared';

describe('AhwtnaServer HTTP & Socket.IO Integration (TEST-9.5)', () => {
  let server: AhwtnaServer;
  let serverUrl: string;
  let client1: ClientSocket;
  let client2: ClientSocket;

  beforeAll(async () => {
    server = new AhwtnaServer();
    // نستخدم port 0 لاختيار منفذ حر تلقائياً
    serverUrl = await server.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    client1?.disconnect();
    client2?.disconnect();
    await server.close();
  });

  describe('HTTP REST Endpoints', () => {
    it('GET /health returns healthy server status and version', async () => {
      const response = await server.fastify.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.server).toBe('Ahwtna Authoritative Game Server');
      expect(body.version).toBe('0.1.0');
    });

    it('POST /api/rooms creates a room and GET /api/rooms/:id retrieves it', async () => {
      const createRes = await server.fastify.inject({
        method: 'POST',
        url: '/api/rooms',
        payload: {
          hostName: 'المعلم رضا',
          mode: 'INDIVIDUAL_2P',
        },
      });

      expect(createRes.statusCode).toBe(201);
      const createBody = JSON.parse(createRes.body);
      expect(createBody.roomId).toHaveLength(6);
      expect(createBody.room.hostId).toBeDefined();

      const getRes = await server.fastify.inject({
        method: 'GET',
        url: `/api/rooms/${createBody.roomId}`,
      });

      expect(getRes.statusCode).toBe(200);
      const getBody = JSON.parse(getRes.body);
      expect(getBody.room.roomId).toBe(createBody.roomId);
      expect(getBody.room.mode).toBe('INDIVIDUAL_2P');
    });
  });

  describe('Socket.IO Real-time Gameplay & Zero-Knowledge Hand Masking', () => {
    it('connects two clients, creates room, joins, marks ready, and receives masked views', async () => {
      // اتصال العميلين عبر WebSocket
      client1 = ioc(serverUrl, { transports: ['websocket'] });
      client2 = ioc(serverUrl, { transports: ['websocket'] });

      await new Promise<void>((resolve) => {
        let connectedCount = 0;
        const check = () => {
          connectedCount++;
          if (connectedCount === 2) resolve();
        };
        client1.on('connect', check);
        client2.on('connect', check);
      });

      // 1. العميل 1 ينشئ غرفة خاصة
      let roomId = '';
      await new Promise<void>((resolve) => {
        client1.emit(
          'room:create',
          { hostName: 'الأسطى محروس', mode: 'INDIVIDUAL_2P' },
          (res: { success: boolean; roomId: string; room: RoomPublicState; player: RoomPlayer }) => {
            expect(res.success).toBe(true);
            expect(res.roomId).toHaveLength(6);
            expect(res.player.displayName).toBe('الأسطى محروس');
            expect(res.player.seat).toBe(0);
            roomId = res.roomId;
            resolve();
          }
        );
      });

      // 2. العميل 2 ينضم إلى الغرفة
      await new Promise<void>((resolve) => {
        client2.emit(
          'room:join',
          { roomId, playerName: 'المعلم حسونة' },
          (res: { success: boolean; room: RoomPublicState; player: RoomPlayer }) => {
            expect(res.success).toBe(true);
            expect(res.player.displayName).toBe('المعلم حسونة');
            expect(res.player.seat).toBe(1);
            expect(res.room.players).toHaveLength(2);
            resolve();
          }
        );
      });

      // إعداد مستمعي منظر اللعبة المسقطة لكلا العميلين
      let view1: ClientGameView | null = null;
      let view2: ClientGameView | null = null;

      const viewPromise1 = new Promise<void>((resolve) => {
        client1.on('game:view', (v: ClientGameView) => {
          view1 = v;
          resolve();
        });
      });

      const viewPromise2 = new Promise<void>((resolve) => {
        client2.on('game:view', (v: ClientGameView) => {
          view2 = v;
          resolve();
        });
      });

      // 3. العميلان يضغطان جاهز (Ready)
      await new Promise<void>((resolve) => {
        client1.emit('room:ready', { roomId, isReady: true }, () => resolve());
      });

      await new Promise<void>((resolve) => {
        client2.emit('room:ready', { roomId, isReady: true }, () => resolve());
      });

      // انتظار وصول المناظر المسقطة
      await Promise.all([viewPromise1, viewPromise2]);

      expect(view1).not.toBeNull();
      expect(view2).not.toBeNull();

      // التحقق من الأمان الصارم Zero-Knowledge
      // العميل 1 يرى يده فقط، والخصم يظهر كعدد قطع 7 بدون أوراق مكشوفة
      expect(view1!.mySeat).toBe(0);
      expect(view1!.myHand).toHaveLength(7);
      const opponentOf1 = view1!.players.find((p) => p.seat === 1)!;
      expect(opponentOf1.tileCount).toBe(7);
      expect((opponentOf1 as unknown as { hand?: unknown }).hand).toBeUndefined();

      // العميل 2 يرى يده فقط، والخصم يظهر كعدد قطع 7
      expect(view2!.mySeat).toBe(1);
      expect(view2!.myHand).toHaveLength(7);
      const opponentOf2 = view2!.players.find((p) => p.seat === 0)!;
      expect(opponentOf2.tileCount).toBe(7);
      expect((opponentOf2 as unknown as { hand?: unknown }).hand).toBeUndefined();
    });
  });
});
