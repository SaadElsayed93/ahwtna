import type { GameMode, SeatIndex, TeamId } from './player.js';
import type { MatchScore, BoardState, RoundResult, RoundPhase } from './game.js';
import type { Tile, TileId } from './tile.js';

export type RoomStatus =
  | 'LOBBY'
  | 'IN_ROUND'
  | 'ROUND_ENDED'
  | 'MATCH_ENDED'
  | 'ABANDONED';

export interface RoomPlayer {
  readonly id: string;
  readonly displayName: string;
  readonly seat: SeatIndex;
  readonly team?: TeamId;
  readonly isHost: boolean;
  readonly isReady: boolean;
  readonly isConnected: boolean;
}

export interface RoomPublicState {
  readonly roomId: string;
  readonly mode: GameMode;
  readonly hostId: string;
  readonly status: RoomStatus;
  readonly players: readonly RoomPlayer[];
  readonly stateVersion: number;
  readonly currentRoundNumber: number;
  readonly matchScore: MatchScore;
}

/**
 * بيانات اللاعب المنظورة للعميل (مع إخفاء تفاصيل أيدي الخصوم Zero-Knowledge)
 */
export interface PlayerPublicView {
  readonly seat: SeatIndex;
  readonly displayName: string;
  readonly team?: TeamId;
  readonly isConnected: boolean;
  readonly tileCount: number;
  readonly isCurrentTurn: boolean;
}

/**
 * حالة الجولة المسقطة للعميل حسب مقعده
 */
export interface ClientGameView {
  readonly roomId: string;
  readonly mode: GameMode;
  readonly roundNumber: number;
  readonly phase: RoundPhase;
  readonly mySeat: SeatIndex;
  readonly myHand: readonly Tile[];
  readonly legalMoveTileIds: readonly TileId[];
  readonly board: BoardState;
  readonly players: readonly PlayerPublicView[];
  readonly currentTurnSeat: SeatIndex;
  readonly boneyardCount: number;
  readonly canDraw: boolean;
  readonly canPass: boolean;
  readonly matchScore: MatchScore;
  readonly stateVersion: number;
  readonly lastResult?: RoundResult;
}
