import type { Tile } from './tile.js';

export type SeatIndex = 0 | 1 | 2 | 3;

export type TeamId = 'TEAM_A' | 'TEAM_B';

export type GameMode = 'INDIVIDUAL_2P' | 'TEAM_4P';

/**
 * معلومات اللاعب العامة المعروضة للجميع
 */
export interface PlayerPublic {
  readonly id: string;
  readonly displayName: string;
  readonly seat: SeatIndex;
  readonly team?: TeamId;
  readonly tileCount: number;
  readonly isConnected: boolean;
}

/**
 * معلومات اللاعب الكاملة الموثوقة المحفوظة على السيرفر
 */
export interface PlayerAuthoritative extends PlayerPublic {
  readonly hand: readonly Tile[];
}

/**
 * تحديد الفريق للمقعد حسب نمط اللعبة
 * المقاعد 0 و 2 -> فريق أ
 * المقاعد 1 و 3 -> فريق ب
 */
export function getTeamForSeat(seat: SeatIndex, mode: GameMode): TeamId | undefined {
  if (mode === 'INDIVIDUAL_2P') {
    return undefined;
  }
  return seat === 0 || seat === 2 ? 'TEAM_A' : 'TEAM_B';
}

/**
 * تحديد المقعد التالي في الترتيب الدوراني (اتجاه عقارب الساعة)
 */
export function getNextSeat(currentSeat: SeatIndex, mode: GameMode): SeatIndex {
  if (mode === 'INDIVIDUAL_2P') {
    return (currentSeat === 0 ? 1 : 0) as SeatIndex;
  }
  return ((currentSeat + 1) % 4) as SeatIndex;
}

/**
 * معرفة مقعد الزميل في النمط الزوجي
 * زميل 0 هو 2، وزميل 1 هو 3
 */
export function getTeammateSeat(seat: SeatIndex): SeatIndex {
  return ((seat + 2) % 4) as SeatIndex;
}
