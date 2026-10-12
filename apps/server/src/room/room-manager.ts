import { GameError, type GameMode, type RoomPlayer, type SeatIndex } from '@ahwtna/shared';
import { generateRoomCode } from './code-generator.js';
import { GameRoom } from './game-room.js';

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();

  /**
   * إنشاء غرفة جديدة وتعيين المضيف
   */
  public createRoom(hostId: string, hostName: string, mode: GameMode): GameRoom {
    const roomId = generateRoomCode(this.rooms);
    const room = new GameRoom(roomId, mode, hostId, hostName);
    this.rooms.set(roomId, room);
    return room;
  }

  /**
   * جلب غرفة بكودها
   */
  public getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId.toUpperCase());
  }

  public getRoomOrThrow(roomId: string): GameRoom {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new GameError('ROOM_NOT_FOUND', `الغرفة برمز ${roomId} غير موجودة`);
    }
    return room;
  }

  /**
   * انضمام لاعب إلى غرفة موجودة
   */
  public joinRoom(
    roomId: string,
    playerId: string,
    playerName: string,
    preferredSeat?: SeatIndex
  ): { room: GameRoom; player: RoomPlayer } {
    const room = this.getRoomOrThrow(roomId);
    const player = room.joinPlayer(playerId, playerName, preferredSeat);
    return { room, player };
  }

  /**
   * تغيير مقعد اللاعب في الغرفة
   */
  public chooseSeat(roomId: string, playerId: string, seat: SeatIndex): { room: GameRoom; player: RoomPlayer } {
    const room = this.getRoomOrThrow(roomId);
    const player = room.chooseSeat(playerId, seat);
    return { room, player };
  }

  /**
   * تبديل جاهزية اللاعب
   */
  public setReady(
    roomId: string,
    playerId: string,
    isReady: boolean
  ): { room: GameRoom; player: RoomPlayer; roundStarted: boolean } {
    const room = this.getRoomOrThrow(roomId);
    const { player, roundStarted } = room.setReady(playerId, isReady);
    return { room, player, roundStarted };
  }

  /**
   * خروج لاعب من الغرفة
   */
  public leaveRoom(
    roomId: string,
    playerId: string
  ): { room?: GameRoom; newHostId?: string; isRoomAbandoned: boolean } {
    const room = this.getRoom(roomId);
    if (!room) {
      return { isRoomAbandoned: true };
    }

    const { newHostId, isRoomAbandoned } = room.leavePlayer(playerId);
    if (isRoomAbandoned) {
      this.rooms.delete(room.roomId);
      return { newHostId: undefined, isRoomAbandoned: true };
    }

    return { room, newHostId, isRoomAbandoned: false };
  }

  /**
   * البحث عن الغرفة التي يتواجد بها اللاعب
   */
  public findRoomByPlayerId(playerId: string): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.getPlayerById(playerId)) {
        return room;
      }
    }
    return undefined;
  }

  /**
   * البحث عن غرفة مفتوحة عشوائية في طور معين بحاجة للاعبين
   */
  public findAvailableRoom(mode: GameMode): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      if (
        room.status === 'LOBBY' &&
        room.mode === mode &&
        room.getPlayers().length < room.getMaxPlayers() &&
        room.getFirstAvailableSeat() !== undefined
      ) {
        return room;
      }
    }
    return undefined;
  }

  /**
   * الدخول السريع / التوفيق العشوائي الأونلاين:
   * يبحث عن غرفة مفتوحة شاغرة في نفس النمط، وإذا لم يجد، ينشئ غرفة جديدة ويكون هذا اللاعب مضيفها
   */
  public quickMatch(
    playerId: string,
    playerName: string,
    mode: GameMode,
    autoReady: boolean = true
  ): { room: GameRoom; player: RoomPlayer; isNewRoom: boolean; roundStarted: boolean } {
    const available = this.findAvailableRoom(mode);
    if (available) {
      const player = available.joinPlayer(playerId, playerName);
      let roundStarted = false;
      if (autoReady) {
        const readyRes = available.setReady(playerId, true);
        roundStarted = readyRes.roundStarted;
      }
      return { room: available, player, isNewRoom: false, roundStarted };
    }

    const room = this.createRoom(playerId, playerName, mode);
    let roundStarted = false;
    if (autoReady) {
      const readyRes = room.setReady(playerId, true);
      roundStarted = readyRes.roundStarted;
    }
    const player = room.getPlayerById(playerId)!;
    return { room, player, isNewRoom: true, roundStarted };
  }

  public getAllActiveRooms(): readonly GameRoom[] {
    return Array.from(this.rooms.values()).filter((r) => r.status !== 'ABANDONED');
  }

  public getRoomCount(): number {
    return this.rooms.size;
  }

  public clear(): void {
    this.rooms.clear();
  }
}
