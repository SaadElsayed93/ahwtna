import {
  type BoardEnd,
  type BoardState,
  type ClientGameView,
  type GameMode,
  GameError,
  type MatchScore,
  type PlayerPublicView,
  type PlayerPassedEvent,
  type RoomPlayer,
  type RoundEndedEvent,
  type RoundPhase,
  type RoundResult,
  type SeatIndex,
  type Tile,
  type TileDrawnEvent,
  type TileId,
  type TilePlayedEvent,
  getNextSeat,
  getTileId,
} from '@ahwtna/shared';
import {
  calculateBlockedGameResult,
  calculateDominoOutResult,
  createEmptyBoard,
  createSeededRandom,
  dealInitialTiles,
  determineFirstRoundOpener,
  getPlayableEnds,
  hasAnyLegalMove,
  isGameBlocked,
  playTileOnBoard,
  validateBoardMove,
} from '@ahwtna/game-engine';

export interface AuthoritativeRoundOptions {
  mode: GameMode;
  roundNumber: number;
  previousWinnerSeat?: SeatIndex;
  previousRoundCloserSeat?: SeatIndex;
  previousRoundWasTie?: boolean;
  customSeed?: number;
}

export class AuthoritativeRound {
  public readonly mode: GameMode;
  public readonly roundNumber: number;
  public phase: RoundPhase = 'PLAYING';
  public board: BoardState = createEmptyBoard();
  public hands: Map<SeatIndex, Tile[]> = new Map();
  public boneyard: Tile[] = [];
  public currentTurnSeat: SeatIndex;
  public starterSeat: SeatIndex;
  public startingTile?: Tile;
  public lastPlayedTileId: TileId | null = null;
  public lastResult?: RoundResult;

  constructor(options: AuthoritativeRoundOptions) {
    this.mode = options.mode;
    this.roundNumber = options.roundNumber;

    const randomFn = options.customSeed !== undefined ? createSeededRandom(options.customSeed) : undefined;
    const deal = dealInitialTiles(this.mode, randomFn);

    const playerCount = this.mode === 'INDIVIDUAL_2P' ? 2 : 4;
    for (let s = 0; s < playerCount; s++) {
      const seat = s as SeatIndex;
      this.hands.set(seat, [...(deal.hands[seat] ?? [])]);
    }
    this.boneyard = [...deal.boneyard];

    // تحديد بادئ الجولة
    if (this.roundNumber === 1) {
      const opener = determineFirstRoundOpener(deal.hands);
      this.starterSeat = opener.starterSeat;
      this.startingTile = opener.startingTile;
      this.currentTurnSeat = opener.starterSeat;
    } else if (options.previousRoundWasTie && options.previousRoundCloserSeat !== undefined) {
      this.starterSeat = options.previousRoundCloserSeat;
      this.currentTurnSeat = options.previousRoundCloserSeat;
    } else if (options.previousWinnerSeat !== undefined) {
      this.starterSeat = options.previousWinnerSeat;
      this.currentTurnSeat = options.previousWinnerSeat;
    } else {
      this.starterSeat = 0;
      this.currentTurnSeat = 0;
    }
  }

  /**
   * تحويل أيدي اللاعبين إلى سجل جاهز لمحرك الحساب
   */
  public getHandsRecord(): Record<SeatIndex, readonly Tile[]> {
    return {
      0: this.hands.get(0) ?? [],
      1: this.hands.get(1) ?? [],
      2: this.hands.get(2) ?? [],
      3: this.hands.get(3) ?? [],
    };
  }

  /**
   * البلاطات القانونية للاعب صاحب المقعد
   */
  public getLegalMoves(seat: SeatIndex): readonly Tile[] {
    const hand = this.hands.get(seat) ?? [];
    if (this.board.nodes.length === 0) {
      if (this.roundNumber === 1 && this.startingTile) {
        return [this.startingTile];
      }
      return hand;
    }
    return hand.filter((t) => getPlayableEnds(t, this.board).length > 0);
  }

  public canDraw(seat: SeatIndex): boolean {
    if (this.phase !== 'PLAYING' || seat !== this.currentTurnSeat) return false;
    if (this.mode !== 'INDIVIDUAL_2P') return false;
    if (this.boneyard.length === 0) return false;
    const hand = this.hands.get(seat) ?? [];
    return !hasAnyLegalMove(hand, this.board);
  }

  public canPass(seat: SeatIndex): boolean {
    if (this.phase !== 'PLAYING' || seat !== this.currentTurnSeat) return false;
    const hand = this.hands.get(seat) ?? [];
    if (hasAnyLegalMove(hand, this.board)) return false;
    if (this.mode === 'INDIVIDUAL_2P' && this.boneyard.length > 0) return false;
    return true;
  }

  /**
   * تنفيذ حركة لعب بلاطة موثوقة
   */
  public playTile(
    seat: SeatIndex,
    tileId: TileId,
    targetEnd: BoardEnd,
    currentScore: MatchScore
  ): {
    tilePlayedEvent: TilePlayedEvent;
    roundEndedEvent?: RoundEndedEvent;
  } {
    if (this.phase !== 'PLAYING') {
      throw new GameError('INVALID_PHASE', 'الجولة ليست في حالة لعب نشطة');
    }

    if (seat !== this.currentTurnSeat) {
      throw new GameError('NOT_YOUR_TURN', `ليس دور اللاعب في المقعد ${seat}`);
    }

    const hand = this.hands.get(seat) ?? [];
    const tileIndex = hand.findIndex((t) => getTileId(t) === tileId);
    if (tileIndex === -1) {
      throw new GameError('TILE_NOT_IN_HAND', `البلاطة ${tileId} ليست في يد اللاعب`);
    }

    const tile = hand[tileIndex]!;

    // في الضربة الأولى للجولة الأولى، يجب لعب بلاطة البداية
    if (this.board.nodes.length === 0 && this.roundNumber === 1 && this.startingTile) {
      if (getTileId(tile) !== getTileId(this.startingTile)) {
        throw new GameError(
          'ILLEGAL_MOVE',
          `الضربة الأولى في الجولة الأولى يجب أن تكون بـ [${this.startingTile[0]}|${this.startingTile[1]}]`
        );
      }
    } else {
      validateBoardMove(tile, targetEnd, this.board);
    }

    // تطبيق الحركة على السلسلة وحذف البلاطة من يد اللاعب
    this.board = playTileOnBoard(tile, targetEnd, this.board);
    hand.splice(tileIndex, 1);
    this.lastPlayedTileId = tileId;

    const tilePlayedEvent: TilePlayedEvent = {
      type: 'TILE_PLAYED',
      seat,
      tileId,
      targetEnd,
      leftValue: this.board.leftValue,
      rightValue: this.board.rightValue,
      remainingHandCount: hand.length,
    };

    // فحص نهاية الجولة
    let roundEndedEvent: RoundEndedEvent | undefined;

    if (hand.length === 0) {
      // خروج دومينو (Domino Out)
      this.phase = 'ROUND_ENDED';
      const result = calculateDominoOutResult(seat, this.mode, this.getHandsRecord(), this.roundNumber);
      this.lastResult = result;
      roundEndedEvent = {
        type: 'ROUND_ENDED',
        result,
        updatedScore: currentScore,
      };
    } else if (isGameBlocked(this.board, this.getHandsRecord())) {
      // قفلة (Blocked Game)
      this.phase = 'ROUND_ENDED';
      const result = calculateBlockedGameResult(this.mode, this.getHandsRecord(), this.roundNumber);
      this.lastResult = result;
      roundEndedEvent = {
        type: 'ROUND_ENDED',
        result,
        updatedScore: currentScore,
      };
    } else {
      // استمرار اللعب والانتقال للمقعد التالي
      this.currentTurnSeat = getNextSeat(this.currentTurnSeat, this.mode);
    }

    return { tilePlayedEvent, roundEndedEvent };
  }

  /**
   * تنفيذ سحب بلاطة من المخزون
   */
  public drawTile(seat: SeatIndex): TileDrawnEvent {
    if (this.phase !== 'PLAYING') {
      throw new GameError('INVALID_PHASE', 'الجولة ليست في حالة لعب نشطة');
    }

    if (seat !== this.currentTurnSeat) {
      throw new GameError('NOT_YOUR_TURN', `ليس دور اللاعب في المقعد ${seat}`);
    }

    if (this.mode === 'TEAM_4P') {
      throw new GameError('CANNOT_DRAW_IN_TEAM_MODE', 'لا يوجد سحب في النمط الزوجي');
    }

    const hand = this.hands.get(seat) ?? [];
    if (hasAnyLegalMove(hand, this.board)) {
      throw new GameError('CANNOT_DRAW_WHEN_MOVE_EXISTS', 'لا يمكن السحب ولديك نقلة قانونية متاحة');
    }

    if (this.boneyard.length === 0) {
      throw new GameError('BONEYARD_EMPTY', 'مخزون البلاطات فارغ تماماً');
    }

    const drawnTile = this.boneyard.shift()!;
    hand.push(drawnTile);

    return {
      type: 'TILE_DRAWN',
      seat,
      remainingBoneyardCount: this.boneyard.length,
    };
  }

  /**
   * تمرير الدور (Pass / باص)
   */
  public passTurn(
    seat: SeatIndex,
    currentScore: MatchScore
  ): {
    playerPassedEvent: PlayerPassedEvent;
    roundEndedEvent?: RoundEndedEvent;
  } {
    if (this.phase !== 'PLAYING') {
      throw new GameError('INVALID_PHASE', 'الجولة ليست في حالة لعب نشطة');
    }

    if (seat !== this.currentTurnSeat) {
      throw new GameError('NOT_YOUR_TURN', `ليس دور اللاعب في المقعد ${seat}`);
    }

    if (!this.canPass(seat)) {
      throw new GameError('CANNOT_PASS_WHEN_MOVE_EXISTS', 'لا يمكن التمرير وتوجد نقلة قانونية أو إمكانية سحب');
    }

    const playerPassedEvent: PlayerPassedEvent = {
      type: 'PLAYER_PASSED',
      seat,
    };

    // الانتقال للمقعد التالي
    this.currentTurnSeat = getNextSeat(this.currentTurnSeat, this.mode);

    // فحص ما إذا كان التمرير أدى إلى قفلة اللعب للجميع
    let roundEndedEvent: RoundEndedEvent | undefined;
    if (isGameBlocked(this.board, this.getHandsRecord())) {
      this.phase = 'ROUND_ENDED';
      const result = calculateBlockedGameResult(this.mode, this.getHandsRecord(), this.roundNumber);
      this.lastResult = result;
      roundEndedEvent = {
        type: 'ROUND_ENDED',
        result,
        updatedScore: currentScore,
      };
    }

    return { playerPassedEvent, roundEndedEvent };
  }

  /**
   * إسقاط حالة الجولة للعميل مع الحفاظ على الأمان الصارم (Zero-Knowledge Hands)
   */
  public projectPlayerView(
    viewerSeat: SeatIndex,
    players: readonly RoomPlayer[],
    matchScore: MatchScore,
    stateVersion: number,
    roomId: string
  ): ClientGameView {
    const myHand = this.hands.get(viewerSeat) ?? [];
    const legalMoves = this.currentTurnSeat === viewerSeat ? this.getLegalMoves(viewerSeat) : [];

    const publicPlayers: PlayerPublicView[] = players.map((p) => {
      const pHand = this.hands.get(p.seat) ?? [];
      return {
        seat: p.seat,
        displayName: p.displayName,
        team: p.team,
        isConnected: p.isConnected,
        tileCount: pHand.length,
        isCurrentTurn: this.currentTurnSeat === p.seat && this.phase === 'PLAYING',
      };
    });

    return {
      roomId,
      mode: this.mode,
      roundNumber: this.roundNumber,
      phase: this.phase,
      mySeat: viewerSeat,
      myHand: [...myHand],
      legalMoveTileIds: legalMoves.map(getTileId),
      board: this.board,
      players: publicPlayers,
      currentTurnSeat: this.currentTurnSeat,
      boneyardCount: this.boneyard.length,
      canDraw: this.canDraw(viewerSeat),
      canPass: this.canPass(viewerSeat),
      matchScore,
      stateVersion,
      lastResult: this.lastResult,
    };
  }
}
