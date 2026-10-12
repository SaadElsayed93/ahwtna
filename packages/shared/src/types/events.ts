import type { BoardEnd, MatchScore, RoundResult } from './game.js';
import type { SeatIndex, TeamId } from './player.js';
import type { PipValue, TileId } from './tile.js';

export interface TilePlayedEvent {
  readonly type: 'TILE_PLAYED';
  readonly seat: SeatIndex;
  readonly tileId: TileId;
  readonly targetEnd: BoardEnd;
  readonly leftValue: PipValue | null;
  readonly rightValue: PipValue | null;
  readonly remainingHandCount: number;
}

export interface TileDrawnEvent {
  readonly type: 'TILE_DRAWN';
  readonly seat: SeatIndex;
  readonly remainingBoneyardCount: number;
}

export interface PlayerPassedEvent {
  readonly type: 'PLAYER_PASSED';
  readonly seat: SeatIndex;
}

export interface RoundEndedEvent {
  readonly type: 'ROUND_ENDED';
  readonly result: RoundResult;
  readonly updatedScore: MatchScore;
}

export interface MatchEndedEvent {
  readonly type: 'MATCH_ENDED';
  readonly winnerSeat?: SeatIndex;
  readonly winnerTeam?: TeamId;
  readonly finalScore: MatchScore;
}

export type GameEvent =
  | TilePlayedEvent
  | TileDrawnEvent
  | PlayerPassedEvent
  | RoundEndedEvent
  | MatchEndedEvent;
