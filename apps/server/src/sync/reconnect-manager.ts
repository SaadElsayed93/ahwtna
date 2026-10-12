import type { RoomPlayer } from '@ahwtna/shared';
import type { GameRoom } from '../room/game-room.js';

export interface ReconnectManagerOptions {
  gracePeriodMs?: number;
}

export class ReconnectManager {
  public readonly gracePeriodMs: number;
  private pendingReconnections: Map<string, NodeJS.Timeout> = new Map();
  private disconnectTimes: Map<string, number> = new Map();

  constructor(options?: ReconnectManagerOptions) {
    this.gracePeriodMs = options?.gracePeriodMs ?? 45_000; // 45 ثانية افتراضياً
  }

  private getKey(roomId: string, playerId: string): string {
    return `${roomId}:${playerId}`;
  }

  /**
   * تسجيل انقطاع اتصال اللاعب وبدء نافذة الـ 45 ثانية لإعادة الاتصال
   */
  public handleDisconnect(
    room: GameRoom,
    playerId: string,
    onForfeit: (room: GameRoom, forfeitedPlayer: RoomPlayer) => void
  ): boolean {
    const player = room.getPlayerById(playerId);
    if (!player) return false;

    // تمييز حالة اللاعب كغير متصل
    const updated: RoomPlayer = {
      ...player,
      isConnected: false,
    };
    (room as unknown as { players: Map<string, RoomPlayer> }).players.set(playerId, updated);
    room.stateVersion++;

    const key = this.getKey(room.roomId, playerId);
    this.cancelPending(room.roomId, playerId);
    this.disconnectTimes.set(key, Date.now());

    // بدء مهلة الـ 45 ثانية
    const timer = setTimeout(() => {
      this.pendingReconnections.delete(key);
      this.disconnectTimes.delete(key);

      // إذا ظل غير متصل بعد 45 ثانية، يُعتبر منسحباً (Forfeit)
      const currentStatus = room.getPlayerById(playerId);
      if (currentStatus && !currentStatus.isConnected) {
        onForfeit(room, currentStatus);
      }
    }, this.gracePeriodMs);

    this.pendingReconnections.set(key, timer);
    return true;
  }

  /**
   * إعادة اتصال اللاعب بنجاح وإلغاء نافذة المهلة
   */
  public handleReconnect(
    room: GameRoom,
    playerId: string,
    newSocketId?: string
  ): RoomPlayer | undefined {
    this.cancelPending(room.roomId, playerId);

    const player = room.getPlayerById(playerId);
    if (!player) return undefined;

    // إعادة تفعيل الاتصال وتحديث معرف السوكت إذا تغير
    const reconnectedPlayer: RoomPlayer = {
      ...player,
      id: newSocketId || player.id,
      isConnected: true,
    };

    if (newSocketId && newSocketId !== playerId) {
      const roomInternal = room as unknown as {
        players: Map<string, RoomPlayer>;
        playerOrder: string[];
      };
      roomInternal.players.delete(playerId);
      roomInternal.players.set(newSocketId, reconnectedPlayer);
      const idx = roomInternal.playerOrder.indexOf(playerId);
      if (idx !== -1) roomInternal.playerOrder[idx] = newSocketId;
      if (room.hostId === playerId) room.hostId = newSocketId;
    } else {
      (room as unknown as { players: Map<string, RoomPlayer> }).players.set(playerId, reconnectedPlayer);
    }

    room.stateVersion++;
    return reconnectedPlayer;
  }

  /**
   * إلغاء مهلة إعادة الاتصال
   */
  public cancelPending(roomId: string, playerId: string): void {
    const key = this.getKey(roomId, playerId);
    const timer = this.pendingReconnections.get(key);
    if (timer) {
      clearTimeout(timer);
      this.pendingReconnections.delete(key);
      this.disconnectTimes.delete(key);
    }
  }

  public getRemainingGraceMs(roomId: string, playerId: string): number {
    const key = this.getKey(roomId, playerId);
    const disconnectTime = this.disconnectTimes.get(key);
    if (!disconnectTime) return 0;
    const elapsed = Date.now() - disconnectTime;
    return Math.max(0, this.gracePeriodMs - elapsed);
  }

  public clearAll(): void {
    for (const timer of this.pendingReconnections.values()) {
      clearTimeout(timer);
    }
    this.pendingReconnections.clear();
    this.disconnectTimes.clear();
  }
}
