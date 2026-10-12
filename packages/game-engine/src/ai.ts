import {
  type BoardEnd,
  type BoardState,
  type GameMode,
  getOppositeValue,
  getTileSum,
  isDouble,
  type SeatIndex,
  type Tile,
} from '@ahwtna/shared';
import { getPlayableEnds, isBoardEmpty } from './board.js';

export interface AIContext {
  readonly seat: SeatIndex;
  readonly hand: readonly Tile[];
  readonly board: BoardState;
  readonly mode: GameMode;
  readonly boneyardCount: number;
}

export interface PlayAction {
  readonly action: 'PLAY';
  readonly tile: Tile;
  readonly targetEnd: BoardEnd;
}

export interface DrawAction {
  readonly action: 'DRAW';
}

export interface PassAction {
  readonly action: 'PASS';
}

export type AIAction = PlayAction | DrawAction | PassAction;

export interface ScoredCandidate {
  readonly tile: Tile;
  readonly targetEnd: BoardEnd;
  readonly score: number;
}

/**
 * خوارزمية الذكاء الاصطناعي الأوفلاين التكتيكية (Tactical Heuristic AI)
 * تعمل تحت مبدأ المعرفة الصفرية (Zero-Knowledge): لا ترى إلا يدها الخاصة وحالة السلسلة العامة.
 */
export function chooseAIMove(ctx: AIContext): AIAction {
  // إذا كانت الطاولة فارغة (البداية)
  if (isBoardEmpty(ctx.board)) {
    if (ctx.hand.length === 0) {
      return { action: 'PASS' };
    }
    // اختيار أفضل بلاطة للبدء بها (أعلى دوش، أو أعلى مجموع)
    let bestStarter = ctx.hand[0]!;
    for (const tile of ctx.hand) {
      if (isDouble(tile)) {
        if (!isDouble(bestStarter) || tile[0] > bestStarter[0]) {
          bestStarter = tile;
        }
      } else if (!isDouble(bestStarter) && getTileSum(tile) > getTileSum(bestStarter)) {
        bestStarter = tile;
      }
    }
    return {
      action: 'PLAY',
      tile: bestStarter,
      targetEnd: 'LEFT',
    };
  }

  // استخراج كافة الحركات القانونية الممكنة
  const legalMoves: { tile: Tile; targetEnd: BoardEnd }[] = [];

  for (const tile of ctx.hand) {
    const ends = getPlayableEnds(tile, ctx.board);
    for (const targetEnd of ends) {
      legalMoves.push({ tile, targetEnd });
    }
  }

  // إذا لم توجد أي نقلة قانونية
  if (legalMoves.length === 0) {
    if (ctx.mode === 'INDIVIDUAL_2P' && ctx.boneyardCount > 0) {
      return { action: 'DRAW' };
    }
    return { action: 'PASS' };
  }

  // تقييم الحركات القانونية بالهيورستيك التكتيكي
  const scoredCandidates: ScoredCandidate[] = legalMoves.map(move => {
    let score = 0;

    const pipSum = getTileSum(move.tile);
    // معيار 1: التخلص من البلاطات الثقيلة لتقليل الخسارة في حال القفلة
    score += pipSum * 2;

    // معيار 2: التخلص من الدوش مبكراً لتجنب تعليقها
    if (isDouble(move.tile)) {
      score += 5;
    }

    // معيار 3: تقييم مرونة اليد المتبقية بعد لعب هذه البلاطة
    const remainingHand = ctx.hand.filter(t => t !== move.tile);
    const openValue =
      move.targetEnd === 'LEFT' ? ctx.board.leftValue! : ctx.board.rightValue!;
    const newOpenValue = getOppositeValue(move.tile, openValue);

    // كم بلاطة في يدي تطابق الطرف المفتوح الجديد الذي سأتركه على الطاولة؟
    const matchingNewOpen = remainingHand.filter(
      t => t[0] === newOpenValue || t[1] === newOpenValue
    ).length;
    score += matchingNewOpen * 3;

    return {
      tile: move.tile,
      targetEnd: move.targetEnd,
      score,
    };
  });

  // فرز النقلات بالأعلى نقاطاً
  scoredCandidates.sort((a, b) => b.score - a.score);

  const best = scoredCandidates[0]!;

  return {
    action: 'PLAY',
    tile: best.tile,
    targetEnd: best.targetEnd,
  };
}
