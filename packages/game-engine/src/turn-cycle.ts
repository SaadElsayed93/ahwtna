import {
  type BoardState,
  GameError,
  type GameMode,
  getNextSeat,
  type SeatIndex,
  type Tile,
} from '@ahwtna/shared';
import { hasAnyLegalMove } from './board.js';

export interface TurnContext {
  readonly mode: GameMode;
  readonly activeSeat: SeatIndex;
  readonly hands: Readonly<Record<SeatIndex, readonly Tile[]>>;
  readonly boneyard: readonly Tile[];
  readonly board: BoardState;
}

export interface DrawResult {
  readonly drawnTile: Tile;
  readonly newHand: readonly Tile[];
  readonly newBoneyard: readonly Tile[];
}

export interface PassResult {
  readonly nextSeat: SeatIndex;
  readonly isBlocked: boolean;
}

/**
 * فحص ما إذا كانت الجولة مغلقة (Blocked Game / قفلة)
 * يتحقق المحرك رياضياً من أيدي جميع اللاعبين؛ إذا لم يملك أي لاعب
 * في المباراة أي حركة قانونية على أي من طرفي السلسلة، تنتهي الجولة بالإغلاق.
 */
export function isGameBlocked(
  board: BoardState,
  hands: Partial<Record<SeatIndex, readonly Tile[]>>
): boolean {
  if (board.leftValue === null || board.rightValue === null) {
    return false; // لا يمكن أن تكون اللعبة مغلقة إذا لم توضع أي بلاطة بعد
  }

  // فحص يد كل لاعب على حدة
  for (const seatStr of Object.keys(hands)) {
    const seat = parseInt(seatStr, 10) as SeatIndex;
    const hand = hands[seat];
    if (hand && hand.length > 0) {
      if (hasAnyLegalMove(hand, board)) {
        return false; // وُجد لاعب واحد على الأقل قادر على وضع بلاطة!
      }
    }
  }

  // لا يوجد أي لاعب يملك أي حركة قانونية على الإطلاق
  return true;
}

/**
 * تنفيذ عملية السحب من المخزون في النمط الفردي (ENG-060, ENG-068)
 */
export function executeDraw(seat: SeatIndex, ctx: TurnContext): DrawResult {
  if (seat !== ctx.activeSeat) {
    throw new GameError('NOT_YOUR_TURN', `ليس دورك للسحب! الدور للمقعد ${ctx.activeSeat}.`);
  }

  if (ctx.mode === 'TEAM_4P') {
    throw new GameError(
      'CANNOT_DRAW_IN_TEAM_MODE',
      'غير مسموح بالسحب في النمط الزوجي! لا يوجد مخزون سحب.'
    );
  }

  const currentHand = ctx.hands[seat] ?? [];

  // إذا كان اللاعب يمتلك حركة قانونية بالفعل، يُمنع من السحب
  if (hasAnyLegalMove(currentHand, ctx.board)) {
    throw new GameError(
      'CANNOT_DRAW_WHEN_MOVE_EXISTS',
      'لا يمكنك السحب من المخزون لأن لديك نقلة قانونية بالفعل في يدك!'
    );
  }

  if (ctx.boneyard.length === 0) {
    throw new GameError('BONEYARD_EMPTY', 'مخزون السحب فارغ تماماً!');
  }

  const newBoneyard = [...ctx.boneyard];
  const drawnTile = newBoneyard.shift()!;
  const newHand = Object.freeze([...currentHand, drawnTile]);

  return {
    drawnTile,
    newHand,
    newBoneyard: Object.freeze(newBoneyard),
  };
}

/**
 * تنفيذ التمرير الإجباري عند غياب أي نقلة قانونية (ENG-061, ENG-062, ENG-063)
 */
export function executePass(seat: SeatIndex, ctx: TurnContext): PassResult {
  if (seat !== ctx.activeSeat) {
    throw new GameError('NOT_YOUR_TURN', `ليس دورك للتمرير! الدور للمقعد ${ctx.activeSeat}.`);
  }

  const currentHand = ctx.hands[seat] ?? [];

  // يُرفض التمرير قطعياً إذا كان اللاعب يمتلك نقلة قانونية في يده
  if (hasAnyLegalMove(currentHand, ctx.board)) {
    throw new GameError(
      'CANNOT_PASS_WHEN_MOVE_EXISTS',
      'لا يمكنك تمرير الدور وأنت تمتلك نقلة قانونية على الطاولة!'
    );
  }

  // في الفردي، لا يجوز التمرير طالما المخزون يحتوي على قطع
  if (ctx.mode === 'INDIVIDUAL_2P' && ctx.boneyard.length > 0) {
    throw new GameError(
      'CANNOT_PASS_WHEN_MOVE_EXISTS',
      'لا يمكنك تمرير الدور في النمط الفردي طالما مخزون السحب يحتوي على قطع؛ يجب عليك السحب أولاً.'
    );
  }

  // فحص ما إذا كان التمرير سيؤدي إلى قفلة اللعب الشاملة
  const blocked = isGameBlocked(ctx.board, ctx.hands);

  const nextSeat = getNextSeat(seat, ctx.mode);

  return {
    nextSeat,
    isBlocked: blocked,
  };
}
