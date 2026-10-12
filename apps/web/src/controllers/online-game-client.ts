import { io, type Socket } from 'socket.io-client';
import {
  type ClientGameView,
  type GameCommand,
  type GameEvent,
  type GameMode,
  type RoomPlayer,
  type RoomPublicState,
  type SeatIndex,
  type TileId,
  type BoardEnd,
} from '@ahwtna/shared';
import { getEgyptianTileName, type MatchFeedEvent } from '@ahwtna/ui';

export type SoundEffect = 'slam' | 'draw' | 'pass' | 'win' | 'block';

export interface FeedMessage {
  id: string;
  text: string;
  timestamp: number;
  type?: MatchFeedEvent['type'];
}

export interface OnlineClientOptions {
  serverUrl?: string;
  autoConnect?: boolean;
  onSound?: (sound: SoundEffect) => void;
}

export class OnlineGameClient {
  public socket: Socket | null = null;
  public readonly serverUrl: string;
  public isConnected: boolean = false;
  public currentRoom: RoomPublicState | null = null;
  public myPlayer: RoomPlayer | null = null;
  public gameView: ClientGameView | null = null;
  public matchFeed: FeedMessage[] = [];
  public turnTimeRemaining: number = 30;

  private listeners: Set<() => void> = new Set();
  private timerInterval: NodeJS.Timeout | null = null;
  private onSound?: (sound: SoundEffect) => void;

  constructor(options?: OnlineClientOptions) {
    this.onSound = options?.onSound;
    // تحديد عنوان السيرفر تلقائياً
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    this.serverUrl = options?.serverUrl || `http://${host}:3001`;

    if (options?.autoConnect !== false) {
      this.connect();
    }
  }

  public connect(): void {
    if (this.socket) return;

    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.setupSocketListeners();
    this.startTurnCountdown();
  }

  public disconnect(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.notify();
    }
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.addFeedMessage('🟢 تم الاتصال بخادم القهوة بنجاح.');
      this.notify();
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.addFeedMessage('🔴 انقطع الاتصال بالخادم.. جاري إعادة التوصيل تلقائياً.');
      this.notify();
    });

    this.socket.on('room:updated', (payload: { room: RoomPublicState }) => {
      this.currentRoom = payload.room;
      // تحديث بيانات اللاعب الحالي من قائمة اللاعبين
      if (this.myPlayer) {
        const found = payload.room.players.find((p) => p.id === this.myPlayer!.id);
        if (found) {
          this.myPlayer = found;
        }
      }
      this.notify();
    });

    this.socket.on('game:view', (view: ClientGameView) => {
      this.gameView = view;
      this.turnTimeRemaining = 30; // إعادة ضبط المؤقت لـ 30 ثانية مع وصول تحديث المنظر
      this.notify();
    });

    this.socket.on('game:event', (event: GameEvent) => {
      this.handleGameEvent(event);
      this.notify();
    });

    this.socket.on('player:disconnected', (payload: { playerId: string; seat?: SeatIndex; gracePeriodMs: number }) => {
      const seatText = payload.seat !== undefined ? `المقعد ${payload.seat}` : '';
      this.addFeedMessage(`⚠️ انقطع اتصال اللاعب في ${seatText} (متبقي ${Math.round(payload.gracePeriodMs / 1000)} ثانية للعودة).`);
      this.notify();
    });

    this.socket.on('player:reconnected', (payload: { playerId: string; seat: SeatIndex }) => {
      this.addFeedMessage(`✅ عاد اللاعب في المقعد ${payload.seat} إلى الطاولة واستأنف اللعب.`);
      this.notify();
    });

    this.socket.on('player:forfeited', (payload: { playerId: string; seat: SeatIndex }) => {
      this.addFeedMessage(`🏁 انسحب اللاعب في المقعد ${payload.seat} لتجاوز مهلة الـ 45 ثانية!`);
      this.notify();
    });

    this.socket.on('game:timeout_action', (payload: { actionType: string; seat: SeatIndex }) => {
      this.addFeedMessage(`⏱️ انتهت مهلة الـ 30 ثانية للمقعد ${payload.seat}؛ نَفّذ الخادم حركة تلقائية ذكية.`);
      this.notify();
    });
  }

  private startTurnCountdown(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.gameView && this.gameView.phase === 'PLAYING') {
        if (this.turnTimeRemaining > 0) {
          this.turnTimeRemaining--;
          this.notify();
        }
      }
    }, 1000);
  }

  private handleGameEvent(event: GameEvent): void {
    if (event.type === 'TILE_PLAYED') {
      this.onSound?.('slam');
      const parts = event.tileId.split('|').map(Number);
      const tileName = parts.length === 2 && !isNaN(parts[0]!) && !isNaN(parts[1]!)
        ? getEgyptianTileName(parts[0]!, parts[1]!)
        : event.tileId;
      const endText = event.targetEnd === 'LEFT' ? 'اليمين' : 'الشمال';
      this.addFeedMessage(`🎲 المقعد ${event.seat} لعب [${event.tileId}] (${tileName}) على ${endText}.`, 'PLAY');
    } else if (event.type === 'TILE_DRAWN') {
      this.onSound?.('draw');
      this.addFeedMessage(`🎴 المقعد ${event.seat} سحب بلاطة من المخزون (المتبقي: ${event.remainingBoneyardCount}).`, 'DRAW');
    } else if (event.type === 'PLAYER_PASSED') {
      this.onSound?.('pass');
      this.addFeedMessage(`✋ المقعد ${event.seat}: باص (تمرير الدور).`, 'PASS');
    } else if (event.type === 'ROUND_ENDED') {
      if (event.result.reason === 'DOMINO_OUT') {
        this.onSound?.('win');
      } else {
        this.onSound?.('block');
      }
      const reasonText = event.result.reason === 'DOMINO_OUT' ? 'خروج دومينو' : 'قفلة معلم';
      const winner = event.result.isTie
        ? 'تعادل بدون نقاط'
        : event.result.winnerSeat !== undefined
          ? `المقعد ${event.result.winnerSeat}`
          : event.result.winnerTeam;
      this.addFeedMessage(
        `🏆 نهاية الجولة ${event.result.roundNumber}: ${reasonText}! الفائز: ${winner} (عقوبة: +${event.result.penaltyPoints}).`,
        event.result.reason === 'DOMINO_OUT' ? 'DOMINO' : 'BLOCKED'
      );
    } else if (event.type === 'MATCH_ENDED') {
      this.onSound?.('win');
      const winner = event.winnerSeat !== undefined ? `المقعد ${event.winnerSeat}` : event.winnerTeam;
      this.addFeedMessage(`👑 مبروك! انتهى الماتش وبلغ الخاسر حد الـ 101. الفائز بالماتش: ${winner}!`, 'DOMINO');
    }
  }

  public addFeedMessage(text: string, type: MatchFeedEvent['type'] = 'SYSTEM'): void {
    this.matchFeed.unshift({
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text,
      timestamp: Date.now(),
      type,
    });
    if (this.matchFeed.length > 25) {
      this.matchFeed.pop();
    }
  }

  public getUiFeedEvents(): MatchFeedEvent[] {
    return this.matchFeed.map((m) => {
      const d = new Date(m.timestamp);
      const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
      return {
        id: m.id,
        timestamp: time,
        type: m.type ?? 'SYSTEM',
        text: m.text,
      };
    });
  }

  // --- دوال الأوامر والتحكم ---

  public async createRoom(
    hostName: string,
    mode: GameMode
  ): Promise<{ roomId: string; room: RoomPublicState; player: RoomPlayer }> {
    if (!this.socket) this.connect();
    return new Promise((resolve, reject) => {
      let isSettled = false;
      const timeout = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          reject(new Error('تعذر الاتصال بخادم القهوة أونلاين. تأكد من تشغيل خادم اللعبة على منفذ 3001'));
        }
      }, 6000);

      this.socket?.emit(
        'room:create',
        { hostName, mode },
        (res: { success?: boolean; roomId: string; room: RoomPublicState; player: RoomPlayer; error?: string; message?: string }) => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(timeout);
          if (res.error) return reject(new Error(res.message || res.error));
          this.currentRoom = res.room;
          this.myPlayer = res.player;
          this.addFeedMessage(`✨ تم إنشاء الغرفة الخاصة بكود [${res.roomId}].`);
          this.notify();
          resolve(res);
        }
      );
    });
  }

  public async joinRoom(
    roomId: string,
    playerName: string,
    preferredSeat?: SeatIndex
  ): Promise<{ room: RoomPublicState; player: RoomPlayer }> {
    if (!this.socket) this.connect();
    return new Promise((resolve, reject) => {
      let isSettled = false;
      const timeout = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          reject(new Error('تعذر الاتصال بخادم القهوة أونلاين. تأكد من تشغيل خادم اللعبة على منفذ 3001'));
        }
      }, 6000);

      this.socket?.emit(
        'room:join',
        { roomId, playerName, preferredSeat },
        (res: { success?: boolean; room: RoomPublicState; player: RoomPlayer; error?: string; message?: string }) => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(timeout);
          if (res.error) return reject(new Error(res.message || res.error));
          this.currentRoom = res.room;
          this.myPlayer = res.player;
          this.addFeedMessage(`🚪 انضممت إلى الغرفة [${roomId}] في المقعد ${res.player.seat}.`);
          this.notify();
          resolve(res);
        }
      );
    });
  }

  public async quickMatch(
    playerName: string,
    mode: GameMode = 'INDIVIDUAL_2P'
  ): Promise<{ roomId: string; room: RoomPublicState; player: RoomPlayer; roundStarted: boolean }> {
    if (!this.socket) this.connect();
    return new Promise((resolve, reject) => {
      let isSettled = false;
      const timeout = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          reject(new Error('تعذر الاتصال بخادم القهوة أونلاين. تأكد من تشغيل خادم اللعبة على منفذ 3001'));
        }
      }, 6000);

      this.socket?.emit(
        'room:quick_match',
        { playerName, mode, autoReady: true },
        (res: {
          success?: boolean;
          roomId: string;
          room: RoomPublicState;
          player: RoomPlayer;
          roundStarted?: boolean;
          error?: string;
          message?: string;
        }) => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(timeout);
          if (res.error) return reject(new Error(res.message || res.error));
          this.currentRoom = res.room;
          this.myPlayer = res.player;
          this.addFeedMessage(`⚡ انضممت لماتش أونلاين عشوائي في ترابيزة [${res.roomId}].`);
          this.notify();
          resolve({
            roomId: res.roomId,
            room: res.room,
            player: res.player,
            roundStarted: !!res.roundStarted,
          });
        }
      );
    });
  }

  public async chooseSeat(seat: SeatIndex): Promise<void> {
    if (!this.currentRoom) return;
    return new Promise((resolve, reject) => {
      this.socket?.emit(
        'room:choose_seat',
        { roomId: this.currentRoom!.roomId, seat },
        (res: { success?: boolean; room: RoomPublicState; player: RoomPlayer; error?: string; message?: string }) => {
          if (res.error) return reject(new Error(res.message || res.error));
          this.currentRoom = res.room;
          this.myPlayer = res.player;
          this.notify();
          resolve();
        }
      );
    });
  }

  public async toggleReady(isReady: boolean): Promise<void> {
    if (!this.currentRoom) return;
    return new Promise((resolve, reject) => {
      this.socket?.emit(
        'room:ready',
        { roomId: this.currentRoom!.roomId, isReady },
        (res: { success?: boolean; room: RoomPublicState; player: RoomPlayer; error?: string; message?: string }) => {
          if (res.error) return reject(new Error(res.message || res.error));
          this.currentRoom = res.room;
          this.myPlayer = res.player;
          this.notify();
          resolve();
        }
      );
    });
  }

  public async leaveRoom(): Promise<void> {
    if (!this.currentRoom) return;
    const rId = this.currentRoom.roomId;
    return new Promise((resolve, reject) => {
      this.socket?.emit('room:leave', { roomId: rId }, (res: { success?: boolean; error?: string; message?: string }) => {
        if (res.error) return reject(new Error(res.message || res.error));
        this.currentRoom = null;
        this.myPlayer = null;
        this.gameView = null;
        this.notify();
        resolve();
      });
    });
  }

  public async sendPlayTile(tileId: TileId, targetEnd: BoardEnd): Promise<void> {
    if (!this.currentRoom || !this.myPlayer || !this.gameView) return;
    const command: GameCommand = {
      type: 'PLAY_TILE',
      seat: this.myPlayer.seat,
      tileId,
      targetEnd,
      clientCommandId: `cmd-play-${Date.now()}`,
      expectedStateVersion: this.gameView.stateVersion,
    };

    return new Promise((resolve, reject) => {
      this.socket?.emit('game:command', command, (res: { success?: boolean; error?: string; message?: string }) => {
        if (res.error) return reject(new Error(res.message || res.error));
        resolve();
      });
    });
  }

  public async sendDrawTile(): Promise<void> {
    if (!this.currentRoom || !this.myPlayer || !this.gameView) return;
    const command: GameCommand = {
      type: 'DRAW_TILE',
      seat: this.myPlayer.seat,
      clientCommandId: `cmd-draw-${Date.now()}`,
      expectedStateVersion: this.gameView.stateVersion,
    };

    return new Promise((resolve, reject) => {
      this.socket?.emit('game:command', command, (res: { success?: boolean; error?: string; message?: string }) => {
        if (res.error) return reject(new Error(res.message || res.error));
        resolve();
      });
    });
  }

  public async sendPass(): Promise<void> {
    if (!this.currentRoom || !this.myPlayer || !this.gameView) return;
    const command: GameCommand = {
      type: 'PASS',
      seat: this.myPlayer.seat,
      clientCommandId: `cmd-pass-${Date.now()}`,
      expectedStateVersion: this.gameView.stateVersion,
    };

    return new Promise((resolve, reject) => {
      this.socket?.emit('game:command', command, (res: { success?: boolean; error?: string; message?: string }) => {
        if (res.error) return reject(new Error(res.message || res.error));
        resolve();
      });
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
