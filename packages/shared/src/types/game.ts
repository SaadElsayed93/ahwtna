import type { PipValue, Tile } from './tile.js';
import type { SeatIndex, TeamId } from './player.js';

export type RoundPhase = 
  | 'WAITING_FOR_PLAYERS'
  | 'ROUND_START'
  | 'PLAYING'
  | 'ROUND_ENDED'
  | 'MATCH_ENDED';

export type BoardEnd = 'LEFT' | 'RIGHT';

export interface ChainNode {
  readonly tile: Tile;
  readonly placedValue: PipValue; // القيمة التي تم إيصالها بالسلسلة
  readonly openValue: PipValue;   // القيمة التي أصبحت طرفاً مفتوحاً
  readonly isDouble: boolean;
}

export interface BoardState {
  readonly nodes: readonly ChainNode[];
  readonly leftValue: PipValue | null;
  readonly rightValue: PipValue | null;
}

export type RoundEndReason = 'DOMINO_OUT' | 'BLOCKED_GAME';

export interface HandPipSummary {
  readonly seat: SeatIndex;
  readonly sum: number;
  readonly tileCount: number;
}

export interface RoundResult {
  readonly roundNumber: number;
  readonly reason: RoundEndReason;
  readonly isTie: boolean;
  readonly winnerSeat?: SeatIndex;
  readonly winnerTeam?: TeamId;
  readonly penalizedSeat?: SeatIndex;
  readonly penalizedTeam?: TeamId;
  readonly penaltyPoints: number;
  readonly pipSummaries: readonly HandPipSummary[];
}

export interface MatchScore2P {
  readonly seat0: number;
  readonly seat1: number;
}

export interface MatchScore4P {
  readonly teamA: number;
  readonly teamB: number;
}

export type MatchScore = MatchScore2P | MatchScore4P;


