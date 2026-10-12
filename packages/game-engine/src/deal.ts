import {
  BONEYARD_SIZE_2P,
  BONEYARD_SIZE_4P,
  type GameMode,
  getTileSum,
  isDouble,
  type SeatIndex,
  STARTING_HAND_SIZE,
  type Tile,
  TOTAL_TILES_COUNT,
} from '@ahwtna/shared';
import { generateDoubleSixSet, shuffleTiles } from './tile-set.js';

export interface DealResult {
  readonly hands: Readonly<Record<SeatIndex, readonly Tile[]>>;
  readonly boneyard: readonly Tile[];
}

/**
 * توزيع القطع لبداية جولة جديدة وفق قواعد النمط المعتمدة
 * فردي: 7 قطع لكل من اللاعبين 0 و 1، و 14 قطعة في المخزون
 * زوجي: 7 قطع لكل من اللاعبين 0 و 1 و 2 و 3، و 0 قطعة في المخزون
 */
export function dealInitialTiles(
  mode: GameMode,
  randomFn?: () => number
): DealResult {
  const fullSet = generateDoubleSixSet();
  const shuffled = shuffleTiles(fullSet, randomFn);

  const hands: Record<SeatIndex, Tile[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
  };

  const playerCount = mode === 'INDIVIDUAL_2P' ? 2 : 4;

  // توزيع 7 قطع لكل لاعب نشط
  for (let round = 0; round < STARTING_HAND_SIZE; round++) {
    for (let seat = 0; seat < playerCount; seat++) {
      const tile = shuffled.shift();
      if (!tile) {
        throw new Error('نفدت القطع أثناء التوزيع الأولي!');
      }
      hands[seat as SeatIndex].push(tile);
    }
  }

  const boneyard = Object.freeze([...shuffled]);

  // التحقق الرياضي الصارم من حفظ القطع (Conservation of Tiles)
  const totalInHands = Object.values(hands).reduce((acc, h) => acc + h.length, 0);
  const totalConservation = totalInHands + boneyard.length;

  if (totalConservation !== TOTAL_TILES_COUNT) {
    throw new Error(
      `خرق لقانون حفظ القطع: المجموع الحالي ${totalConservation} بدلاً من ${TOTAL_TILES_COUNT}`
    );
  }

  if (mode === 'INDIVIDUAL_2P' && boneyard.length !== BONEYARD_SIZE_2P) {
    throw new Error(
      `حجم المخزون في الفردي غير صحيح: ${boneyard.length} بدلاً من ${BONEYARD_SIZE_2P}`
    );
  }

  if (mode === 'TEAM_4P' && boneyard.length !== BONEYARD_SIZE_4P) {
    throw new Error(
      `حجم المخزون في الزوجي غير صحيح: ${boneyard.length} بدلاً من ${BONEYARD_SIZE_4P}`
    );
  }

  const frozenHands: Record<SeatIndex, readonly Tile[]> = {
    0: Object.freeze(hands[0]),
    1: Object.freeze(hands[1]),
    2: Object.freeze(hands[2]),
    3: Object.freeze(hands[3]),
  };

  return {
    hands: Object.freeze(frozenHands),
    boneyard,
  };
}

/**
 * تحديد البادئ في الجولة الأولى من الماتش وفق التقاليد المصرية:
 * 1. صاحب أعلى دوش: [6|6] ثم [5|5] ثم [4|4]...
 * 2. إذا لم يملك أي لاعب دوشاً: صاحب البلاطة ذات المجموع الأعلى: [6|5]، [6|4]...
 */
export function determineFirstRoundOpener(
  hands: Partial<Record<SeatIndex, readonly Tile[]>>
): { starterSeat: SeatIndex; startingTile: Tile } {
  const activeSeats = Object.keys(hands).map(s => parseInt(s, 10) as SeatIndex);
  if (activeSeats.length === 0) {
    throw new Error('لا توجد أيدي لاعبين لتحديد البادئ!');
  }

  // البحث عن أعلى دوش
  let bestDouble: { seat: SeatIndex; tile: Tile; val: number } | null = null;

  for (const seat of activeSeats) {
    const hand = hands[seat] ?? [];
    for (const tile of hand) {
      if (isDouble(tile)) {
        const val = tile[0];
        if (!bestDouble || val > bestDouble.val) {
          bestDouble = { seat, tile, val };
        }
      }
    }
  }

  if (bestDouble) {
    return {
      starterSeat: bestDouble.seat,
      startingTile: bestDouble.tile,
    };
  }

  // في حال لم يملك أي لاعب دوشاً، نبحث عن صاحب أعلى بلاطة مجموعاً
  let bestTile: { seat: SeatIndex; tile: Tile; sum: number; highPip: number } | null = null;

  for (const seat of activeSeats) {
    const hand = hands[seat] ?? [];
    for (const tile of hand) {
      const sum = getTileSum(tile);
      const highPip = tile[1];
      if (
        !bestTile ||
        sum > bestTile.sum ||
        (sum === bestTile.sum && highPip > bestTile.highPip)
      ) {
        bestTile = { seat, tile, sum, highPip };
      }
    }
  }

  if (!bestTile) {
    throw new Error('تعذر العثور على أي بلاطة لتحديد البادئ!');
  }

  return {
    starterSeat: bestTile.seat,
    startingTile: bestTile.tile,
  };
}
