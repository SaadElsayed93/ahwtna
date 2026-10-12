import {
  type ClientGameView,
  type GameCommand,
  type GameEvent,
  GameError,
  type GameMode,
  type MatchEndedEvent,
  type MatchScore,
  type RoomPlayer,
  type RoomPublicState,
  type RoomStatus,
  type RoundResult,
  type SeatIndex,
  getTeamForSeat,
} from '@ahwtna/shared';
import { applyRoundScoreAndCheckMatchEnd } from '@ahwtna/game-engine';
import { AuthoritativeRound } from './authoritative-round.js';

export class GameRoom {
  public readonly roomId: string;
  public readonly mode: GameMode;
  public hostId: string;
  public status: RoomStatus = 'LOBBY';
  public stateVersion: number = 0;
  public currentRoundNumber: number = 0;
  public matchScore: MatchScore;
  public activeRound?: AuthoritativeRound;
  public roundResults: RoundResult[] = [];
  public matchWinnerSeat?: SeatIndex;
  public matchWinnerTeam?: string;

  private players: Map<string, RoomPlayer> = new Map();
  private playerOrder: string[] = [];

  constructor(roomId: string, mode: GameMode, hostId: string, hostName: string) {
    this.roomId = roomId;
    this.mode = mode;
    this.hostId = hostId;
    this.matchScore =
      mode === 'INDIVIDUAL_2P'
        ? { seat0: 0, seat1: 0 }
        : { teamA: 0, teamB: 0 };

    // إضافة المضيف تلقائياً للمقعد 0
    this.joinPlayer(hostId, hostName, 0);
  }

  public getMaxPlayers(): number {
    return this.mode === 'INDIVIDUAL_2P' ? 2 : 4;
  }

  public getPlayers(): readonly RoomPlayer[] {
    return Array.from(this.players.values());
  }

  public getPlayerById(playerId: string): RoomPlayer | undefined {
    return this.players.get(playerId);
  }

  public getPlayerBySeat(seat: SeatIndex): RoomPlayer | undefined {
    for (const player of this.players.values()) {
      if (player.seat === seat) return player;
    }
    return undefined;
  }

  public getOccupiedSeats(): Set<SeatIndex> {
    const seats = new Set<SeatIndex>();
    for (const player of this.players.values()) {
      seats.add(player.seat);
    }
    return seats;
  }

  public getFirstAvailableSeat(): SeatIndex | undefined {
    const max = this.getMaxPlayers();
    const occupied = this.getOccupiedSeats();
    for (let s = 0; s < max; s++) {
      const seat = s as SeatIndex;
      if (!occupied.has(seat)) return seat;
    }
    return undefined;
  }

  /**
   * انضمام لاعب للغرفة
   */
  public joinPlayer(
    playerId: string,
    displayName: string,
    preferredSeat?: SeatIndex
  ): RoomPlayer {
    const existing = this.players.get(playerId);
    if (existing) {
      const reconnectedPlayer: RoomPlayer = {
        ...existing,
        displayName: displayName || existing.displayName,
        isConnected: true,
      };
      this.players.set(playerId, reconnectedPlayer);
      this.stateVersion++;
      return reconnectedPlayer;
    }

    if (this.players.size >= this.getMaxPlayers()) {
      throw new GameError('ROOM_FULL', 'الغرفة مكتملة بالكامل باللاعبين');
    }

    let assignedSeat: SeatIndex | undefined;
    const occupied = this.getOccupiedSeats();

    if (
      preferredSeat !== undefined &&
      preferredSeat >= 0 &&
      preferredSeat < this.getMaxPlayers() &&
      !occupied.has(preferredSeat)
    ) {
      assignedSeat = preferredSeat;
    } else {
      assignedSeat = this.getFirstAvailableSeat();
    }

    if (assignedSeat === undefined) {
      throw new GameError('ROOM_FULL', 'لا توجد مقاعد شاغرة في الغرفة');
    }

    const isHost = playerId === this.hostId;
    const player: RoomPlayer = {
      id: playerId,
      displayName,
      seat: assignedSeat,
      team: getTeamForSeat(assignedSeat, this.mode),
      isHost,
      isReady: false,
      isConnected: true,
    };

    this.players.set(playerId, player);
    this.playerOrder.push(playerId);
    this.stateVersion++;
    return player;
  }

  /**
   * تغيير مقعد اللاعب
   */
  public chooseSeat(playerId: string, targetSeat: SeatIndex): RoomPlayer {
    if (this.status === 'IN_ROUND') {
      throw new GameError('ROUND_IN_PROGRESS', 'لا يمكن تغيير المقعد أثناء جولة نشطة');
    }

    const player = this.players.get(playerId);
    if (!player) {
      throw new GameError('PLAYER_NOT_FOUND', 'اللاعب غير موجود في هذه الغرفة');
    }

    if (targetSeat < 0 || targetSeat >= this.getMaxPlayers()) {
      throw new GameError('INVALID_SEAT', `المقعد ${targetSeat} غير متاح في نمط ${this.mode}`);
    }

    if (player.seat === targetSeat) {
      return player;
    }

    const occupant = this.getPlayerBySeat(targetSeat);
    if (occupant) {
      throw new GameError('SEAT_TAKEN', `المقعد ${targetSeat} مشغول باللاعب ${occupant.displayName}`);
    }

    const updated: RoomPlayer = {
      ...player,
      seat: targetSeat,
      team: getTeamForSeat(targetSeat, this.mode),
      isReady: false,
    };

    this.players.set(playerId, updated);
    this.stateVersion++;
    return updated;
  }

  /**
   * تبديل حالة الجاهزية (Ready)
   */
  public setReady(playerId: string, isReady: boolean): { player: RoomPlayer; roundStarted: boolean } {
    const player = this.players.get(playerId);
    if (!player) {
      throw new GameError('PLAYER_NOT_FOUND', 'اللاعب غير موجود في هذه الغرفة');
    }

    const updated: RoomPlayer = {
      ...player,
      isReady,
    };
    this.players.set(playerId, updated);
    this.stateVersion++;

    // فحص اكتمال الجاهزية لجميع المقاعد لبدء الجولة تلقائياً
    const max = this.getMaxPlayers();
    const allSeated = this.players.size === max;
    const allReady = Array.from(this.players.values()).every((p) => p.isReady);

    let roundStarted = false;
    if (allSeated && allReady && (this.status === 'LOBBY' || (this.status as RoomStatus) === 'ROUND_ENDED')) {
      this.startNextRound();
      roundStarted = true;
    }

    return { player: updated, roundStarted };
  }

  /**
   * خروج لاعب من الغرفة ومعالجة نقل شارة المضيف (Host Departure Handling)
   */
  public leavePlayer(playerId: string): { newHostId?: string; isRoomAbandoned: boolean } {
    const player = this.players.get(playerId);
    if (!player) {
      return { isRoomAbandoned: this.players.size === 0 };
    }

    this.players.delete(playerId);
    this.playerOrder = this.playerOrder.filter((id) => id !== playerId);

    if (this.players.size === 0) {
      this.status = 'ABANDONED';
      this.stateVersion++;
      return { isRoomAbandoned: true };
    }

    let newHostId: string | undefined;
    if (player.isHost) {
      const nextHostPlayerId = this.playerOrder[0]!;
      this.hostId = nextHostPlayerId;
      newHostId = nextHostPlayerId;

      const nextHost = this.players.get(nextHostPlayerId);
      if (nextHost) {
        this.players.set(nextHostPlayerId, {
          ...nextHost,
          isHost: true,
        });
      }
    }

    this.stateVersion++;
    return { newHostId, isRoomAbandoned: false };
  }

  /**
   * بدء الجولة التالية
   */
  public startNextRound(customSeed?: number): AuthoritativeRound {
    if (this.players.size < this.getMaxPlayers()) {
      throw new GameError('INVALID_PHASE', 'لا يمكن بدء الجولة قبل اكتمال جميع مقاعد الغرفة');
    }

    const lastResult = this.roundResults[this.roundResults.length - 1];
    const previousWinnerSeat = lastResult?.winnerSeat;
    const previousRoundWasTie = lastResult?.isTie ?? false;
    const previousRoundCloserSeat = this.activeRound?.currentTurnSeat;

    this.currentRoundNumber++;
    this.status = 'IN_ROUND';

    this.activeRound = new AuthoritativeRound({
      mode: this.mode,
      roundNumber: this.currentRoundNumber,
      previousWinnerSeat,
      previousRoundCloserSeat,
      previousRoundWasTie,
      customSeed,
    });

    this.stateVersion++;
    return this.activeRound;
  }

  /**
   * تنفيذ أمر لعب موثوق مع التحقق بالقفل المتفائل (Optimistic Locking)
   */
  public executeCommand(command: GameCommand): {
    events: GameEvent[];
    roundResult?: RoundResult;
    isMatchOver: boolean;
  } {
    if (this.status !== 'IN_ROUND' || !this.activeRound) {
      throw new GameError('INVALID_PHASE', 'لا توجد جولة نشطة حالياً');
    }

    // فحص القفل المتفائل لرقم النسخة (Optimistic Concurrency Lock)
    if (command.expectedStateVersion !== this.stateVersion) {
      throw new GameError(
        'STALE_STATE',
        `أمر متقادم: النسخة المتوقعة ${command.expectedStateVersion} لا تطابق نسخة السيرفر ${this.stateVersion}`
      );
    }

    const events: GameEvent[] = [];
    let roundResult: RoundResult | undefined;
    let isMatchOver = false;

    if (command.type === 'PLAY_TILE') {
      const { tilePlayedEvent, roundEndedEvent } = this.activeRound.playTile(
        command.seat,
        command.tileId,
        command.targetEnd,
        this.matchScore
      );
      events.push(tilePlayedEvent);

      if (roundEndedEvent) {
        roundResult = roundEndedEvent.result;
        const endStatus = this.handleRoundEnd(roundEndedEvent.result, events);
        isMatchOver = endStatus.isMatchOver;
      }
    } else if (command.type === 'DRAW_TILE') {
      const tileDrawnEvent = this.activeRound.drawTile(command.seat);
      events.push(tileDrawnEvent);
    } else if (command.type === 'PASS') {
      const { playerPassedEvent, roundEndedEvent } = this.activeRound.passTurn(
        command.seat,
        this.matchScore
      );
      events.push(playerPassedEvent);

      if (roundEndedEvent) {
        roundResult = roundEndedEvent.result;
        const endStatus = this.handleRoundEnd(roundEndedEvent.result, events);
        isMatchOver = endStatus.isMatchOver;
      }
    }

    this.stateVersion++;
    return { events, roundResult, isMatchOver };
  }

  private handleRoundEnd(result: RoundResult, events: GameEvent[]): { isMatchOver: boolean } {
    this.roundResults.push(result);

    const matchUpdate = applyRoundScoreAndCheckMatchEnd(this.matchScore, result, this.mode);
    this.matchScore = matchUpdate.updatedScore;

    events.push({
      type: 'ROUND_ENDED',
      result,
      updatedScore: this.matchScore,
    });

    if (matchUpdate.isMatchOver) {
      this.status = 'MATCH_ENDED';
      this.matchWinnerSeat = matchUpdate.matchWinnerSeat;
      this.matchWinnerTeam = matchUpdate.matchWinnerTeam;

      const matchEndedEvent: MatchEndedEvent = {
        type: 'MATCH_ENDED',
        winnerSeat: matchUpdate.matchWinnerSeat,
        winnerTeam: matchUpdate.matchWinnerTeam,
        finalScore: this.matchScore,
      };
      events.push(matchEndedEvent);
      return { isMatchOver: true };
    } else {
      this.status = 'ROUND_ENDED';
      // تصفير الجاهزية للجولة القادمة
      for (const [id, player] of this.players.entries()) {
        this.players.set(id, { ...player, isReady: false });
      }
      return { isMatchOver: false };
    }
  }

  public getPublicState(): RoomPublicState {
    return {
      roomId: this.roomId,
      mode: this.mode,
      hostId: this.hostId,
      status: this.status,
      players: this.getPlayers(),
      stateVersion: this.stateVersion,
      currentRoundNumber: this.currentRoundNumber,
      matchScore: this.matchScore,
    };
  }

  public getClientGameView(seat: SeatIndex): ClientGameView | undefined {
    if (!this.activeRound) return undefined;
    return this.activeRound.projectPlayerView(
      seat,
      this.getPlayers(),
      this.matchScore,
      this.stateVersion,
      this.roomId
    );
  }
}
