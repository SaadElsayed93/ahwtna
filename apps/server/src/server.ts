import fastify, { type FastifyInstance } from 'fastify';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import {
  AHWTNA_VERSION,
  type ClientGameView,
  CreateRoomSchema,
  GameCommandSchema,
  GameError,
  type GameCommand,
  JoinRoomSchema,
  ChooseSeatSchema,
  ToggleReadySchema,
  LeaveRoomSchema,
  ReconnectRoomSchema,
} from '@ahwtna/shared';
import { RoomManager } from './room/room-manager.js';
import type { GameRoom } from './room/game-room.js';
import { TurnTimerManager } from './sync/turn-timer.js';
import { ReconnectManager } from './sync/reconnect-manager.js';

export interface AhwtnaServerOptions {
  port?: number;
  host?: string;
  turnTimeoutMs?: number;
  reconnectGraceMs?: number;
}

export class AhwtnaServer {
  public readonly fastify: FastifyInstance;
  public readonly io: SocketIOServer;
  public readonly roomManager: RoomManager;
  public readonly turnTimer: TurnTimerManager;
  public readonly reconnectManager: ReconnectManager;
  private isListening = false;

  constructor(options?: AhwtnaServerOptions) {
    this.fastify = fastify({
      logger: false,
    });

    this.roomManager = new RoomManager();
    this.turnTimer = new TurnTimerManager({ timeoutMs: options?.turnTimeoutMs });
    this.reconnectManager = new ReconnectManager({ gracePeriodMs: options?.reconnectGraceMs });

    // إعداد Socket.IO مع دعم CORS المفتوح للعملاء
    this.io = new SocketIOServer(this.fastify.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.registerHttpRoutes();
    this.registerSocketEvents();
  }

  private registerHttpRoutes(): void {
    // نقطة فحص الصحة والحالة
    this.fastify.get('/health', async () => {
      return {
        status: 'ok',
        server: 'Ahwtna Authoritative Game Server',
        version: AHWTNA_VERSION,
        activeRooms: this.roomManager.getRoomCount(),
        serverTime: new Date().toISOString(),
      };
    });

    // إنشاء غرفة عبر الـ REST API
    this.fastify.post('/api/rooms', async (request, reply) => {
      const parsed = CreateRoomSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'INVALID_INPUT',
          message: parsed.error.issues[0]?.message ?? 'بيانات غير صالحة',
        });
      }

      const { hostName, mode } = parsed.data;
      const hostId = `rest_host_${Math.random().toString(36).substring(2, 9)}`;
      const room = this.roomManager.createRoom(hostId, hostName, mode);

      return reply.status(201).send({
        roomId: room.roomId,
        room: room.getPublicState(),
      });
    });

    // الاستعلام عن بيانات الغرفة
    this.fastify.get<{ Params: { roomId: string } }>('/api/rooms/:roomId', async (request, reply) => {
      const { roomId } = request.params;
      const room = this.roomManager.getRoom(roomId);
      if (!room) {
        return reply.status(404).send({
          error: 'ROOM_NOT_FOUND',
          message: `الغرفة برمز ${roomId} غير موجودة`,
        });
      }

      return reply.send({
        room: room.getPublicState(),
      });
    });
  }

  private registerSocketEvents(): void {
    this.io.on('connection', (socket: Socket) => {
      // 1. إنشاء غرفة خاصة
      socket.on('room:create', (payload, callback) => {
        try {
          const parsed = CreateRoomSchema.safeParse(payload);
          if (!parsed.success) {
            callback?.({ error: 'INVALID_INPUT', message: parsed.error.issues[0]?.message });
            return;
          }

          const { hostName, mode } = parsed.data;
          const room = this.roomManager.createRoom(socket.id, hostName, mode);
          socket.join(`room:${room.roomId}`);

          const player = room.getPlayerById(socket.id);
          callback?.({
            success: true,
            roomId: room.roomId,
            room: room.getPublicState(),
            player,
          });
        } catch (err: unknown) {
          this.handleSocketError(err, callback);
        }
      });

      // 2. الانضمام إلى غرفة بكود الـ 6 خانات
      socket.on('room:join', (payload, callback) => {
        try {
          const parsed = JoinRoomSchema.safeParse(payload);
          if (!parsed.success) {
            callback?.({ error: 'INVALID_INPUT', message: parsed.error.issues[0]?.message });
            return;
          }

          const { roomId, playerName, preferredSeat } = parsed.data;
          const { room, player } = this.roomManager.joinRoom(
            roomId,
            socket.id,
            playerName,
            preferredSeat
          );

          socket.join(`room:${room.roomId}`);
          this.broadcastRoomUpdate(room);

          callback?.({
            success: true,
            room: room.getPublicState(),
            player,
          });
        } catch (err: unknown) {
          this.handleSocketError(err, callback);
        }
      });

      // 3. اختيار وتغيير المقعد
      socket.on('room:choose_seat', (payload, callback) => {
        try {
          const parsed = ChooseSeatSchema.safeParse(payload);
          if (!parsed.success) {
            callback?.({ error: 'INVALID_INPUT', message: parsed.error.issues[0]?.message });
            return;
          }

          const { roomId, seat } = parsed.data;
          const { room, player } = this.roomManager.chooseSeat(roomId, socket.id, seat);
          this.broadcastRoomUpdate(room);

          callback?.({
            success: true,
            room: room.getPublicState(),
            player,
          });
        } catch (err: unknown) {
          this.handleSocketError(err, callback);
        }
      });

      // 4. تبديل حالة الجاهزية (Ready)
      socket.on('room:ready', (payload, callback) => {
        try {
          const parsed = ToggleReadySchema.safeParse(payload);
          if (!parsed.success) {
            callback?.({ error: 'INVALID_INPUT', message: parsed.error.issues[0]?.message });
            return;
          }

          const { roomId, isReady = true } = parsed.data;
          const { room, player, roundStarted } = this.roomManager.setReady(
            roomId,
            socket.id,
            isReady
          );

          this.broadcastRoomUpdate(room);

          if (roundStarted) {
            this.broadcastGameViews(room);
            this.startTurnTimerForRoom(room);
            this.io.to(`room:${room.roomId}`).emit('game:started', {
              roomId: room.roomId,
              roundNumber: room.currentRoundNumber,
            });
          }

          callback?.({
            success: true,
            room: room.getPublicState(),
            player,
            roundStarted,
          });
        } catch (err: unknown) {
          this.handleSocketError(err, callback);
        }
      });

      // 5. مغادرة الغرفة
      socket.on('room:leave', (payload, callback) => {
        try {
          const parsed = LeaveRoomSchema.safeParse(payload);
          if (!parsed.success) {
            callback?.({ error: 'INVALID_INPUT', message: parsed.error.issues[0]?.message });
            return;
          }

          const { roomId } = parsed.data;
          this.turnTimer.clearTurnTimer(roomId);
          this.reconnectManager.cancelPending(roomId, socket.id);

          const { room, newHostId, isRoomAbandoned } = this.roomManager.leaveRoom(
            roomId,
            socket.id
          );

          socket.leave(`room:${roomId}`);

          if (room && !isRoomAbandoned) {
            this.broadcastRoomUpdate(room);
            this.io.to(`room:${roomId}`).emit('player:left', {
              playerId: socket.id,
              newHostId,
            });
          }

          callback?.({ success: true, isRoomAbandoned });
        } catch (err: unknown) {
          this.handleSocketError(err, callback);
        }
      });

      // 6. إعادة الاتصال ومزامنة الحالة الحية (Reconnect & SYNC_STATE)
      socket.on('room:reconnect', (payload, callback) => {
        try {
          const parsed = ReconnectRoomSchema.safeParse(payload);
          if (!parsed.success) {
            callback?.({ error: 'INVALID_INPUT', message: parsed.error.issues[0]?.message });
            return;
          }

          const { roomId, playerId } = parsed.data;
          const room = this.roomManager.getRoom(roomId);
          if (!room) {
            callback?.({ error: 'ROOM_NOT_FOUND', message: 'الغرفة غير موجودة' });
            return;
          }

          const reconnectedPlayer = this.reconnectManager.handleReconnect(
            room,
            playerId,
            socket.id
          );

          if (!reconnectedPlayer) {
            callback?.({ error: 'PLAYER_NOT_FOUND', message: 'اللاعب غير مسجل في هذه الغرفة' });
            return;
          }

          socket.join(`room:${room.roomId}`);

          // إشعار الآخرين بعودة اللاعب
          this.io.to(`room:${room.roomId}`).emit('player:reconnected', {
            playerId: socket.id,
            seat: reconnectedPlayer.seat,
          });

          this.broadcastRoomUpdate(room);
          this.broadcastGameViews(room);

          const clientGameView = room.getClientGameView(reconnectedPlayer.seat);
          const remainingTurnMs = this.turnTimer.getTimeRemainingMs(room.roomId);

          callback?.({
            success: true,
            room: room.getPublicState(),
            player: reconnectedPlayer,
            gameView: clientGameView,
            remainingTurnMs,
          });
        } catch (err: unknown) {
          this.handleSocketError(err, callback);
        }
      });

      // 7. تنفيذ أمر لعب موثوق
      socket.on('game:command', (payload, callback) => {
        try {
          const parsed = GameCommandSchema.safeParse(payload);
          if (!parsed.success) {
            callback?.({ error: 'INVALID_COMMAND', message: parsed.error.issues[0]?.message });
            return;
          }

          const room = this.roomManager.findRoomByPlayerId(socket.id);
          if (!room) {
            callback?.({ error: 'ROOM_NOT_FOUND', message: 'لم يتم العثور على الغرفة المرتبطة باللاعب' });
            return;
          }

          const player = room.getPlayerById(socket.id);
          if (!player || player.seat !== parsed.data.seat) {
            callback?.({ error: 'UNAUTHORIZED_ACTION', message: 'المقعد المصرح به لا يطابق المرسل' });
            return;
          }

          const command = parsed.data as GameCommand;
          const { events, roundResult, isMatchOver } = room.executeCommand(command);

          // إعادة جدولة مؤقت الـ 30 ثانية إذا كانت الجولة مستمرة
          if (room.status === 'IN_ROUND') {
            this.startTurnTimerForRoom(room);
          } else {
            this.turnTimer.clearTurnTimer(room.roomId);
          }

          // بث الأحداث ومناظر اللعب المسقطة بأمان
          for (const ev of events) {
            this.io.to(`room:${room.roomId}`).emit('game:event', ev);
          }

          this.broadcastGameViews(room);
          this.broadcastRoomUpdate(room);

          callback?.({
            success: true,
            events,
            roundResult,
            isMatchOver,
            stateVersion: room.stateVersion,
          });
        } catch (err: unknown) {
          this.handleSocketError(err, callback);
        }
      });

      // معالجة انقطاع الاتصال مع نافذة الـ 45 ثانية
      socket.on('disconnect', () => {
        const room = this.roomManager.findRoomByPlayerId(socket.id);
        if (!room) return;

        if (room.status === 'IN_ROUND') {
          // بدء نافذة الـ 45 ثانية لإعادة الاتصال دون إيقاف الطاولة
          const player = room.getPlayerById(socket.id);
          this.reconnectManager.handleDisconnect(room, socket.id, (forfeitedRoom, forfeitedPlayer) => {
            // انقضاء الـ 45 ثانية دون عودة اللاعب -> انسحاب رسمي (Forfeit)
            const { matchEndedEvent } = forfeitedRoom.forfeitPlayer(forfeitedPlayer.seat);
            this.turnTimer.clearTurnTimer(forfeitedRoom.roomId);

            this.io.to(`room:${forfeitedRoom.roomId}`).emit('player:forfeited', {
              playerId: forfeitedPlayer.id,
              seat: forfeitedPlayer.seat,
            });
            this.io.to(`room:${forfeitedRoom.roomId}`).emit('game:event', matchEndedEvent);
            this.broadcastRoomUpdate(forfeitedRoom);
          });

          this.io.to(`room:${room.roomId}`).emit('player:disconnected', {
            playerId: socket.id,
            seat: player?.seat,
            gracePeriodMs: this.reconnectManager.gracePeriodMs,
          });

          this.broadcastRoomUpdate(room);
        } else {
          // خارج الجولة النشطة: يخرج اللاعب مباشرة
          const { newHostId, isRoomAbandoned } = this.roomManager.leaveRoom(
            room.roomId,
            socket.id
          );
          if (!isRoomAbandoned) {
            this.broadcastRoomUpdate(room);
            this.io.to(`room:${room.roomId}`).emit('player:left', {
              playerId: socket.id,
              newHostId,
            });
          }
        }
      });
    });
  }

  private handleSocketError(
    err: unknown,
    callback?: (response: { error: string; message: string }) => void
  ): void {
    if (err instanceof GameError) {
      callback?.({ error: err.code, message: err.message });
    } else {
      const message = err instanceof Error ? err.message : 'خطأ غير متوقع في الخادم';
      callback?.({ error: 'INTERNAL_ERROR', message });
    }
  }

  public startTurnTimerForRoom(room: GameRoom): void {
    this.turnTimer.startTurnTimer(room, ({ actionType, seat }) => {
      this.io.to(`room:${room.roomId}`).emit('game:timeout_action', {
        actionType,
        seat,
      });

      this.broadcastGameViews(room);
      this.broadcastRoomUpdate(room);

      if (room.status === 'IN_ROUND') {
        this.startTurnTimerForRoom(room);
      } else {
        this.turnTimer.clearTurnTimer(room.roomId);
      }
    });
  }

  public broadcastRoomUpdate(room: GameRoom): void {
    this.io.to(`room:${room.roomId}`).emit('room:updated', {
      room: room.getPublicState(),
    });
  }

  /**
   * بث المناظر المسقطة لكل لاعب بأمان تام (Zero-Knowledge Hands)
   */
  public broadcastGameViews(room: GameRoom): void {
    if (!room.activeRound) return;

    for (const player of room.getPlayers()) {
      const targetSocket = this.io.sockets.sockets.get(player.id);
      if (targetSocket) {
        const view: ClientGameView | undefined = room.getClientGameView(player.seat);
        if (view) {
          targetSocket.emit('game:view', view);
        }
      }
    }
  }

  public async listen(port: number = 3001, host: string = '0.0.0.0'): Promise<string> {
    const address = await this.fastify.listen({ port, host });
    this.isListening = true;
    return address;
  }

  public async close(): Promise<void> {
    this.turnTimer.clearAll();
    this.reconnectManager.clearAll();
    if (this.isListening) {
      this.io.close();
      await this.fastify.close();
      this.isListening = false;
    }
  }
}
