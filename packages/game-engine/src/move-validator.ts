import {
  type BoardEnd,
  type BoardState,
  GameError,
  type RoundPhase,
  type SeatIndex,
  type Tile,
  tileEquals,
} from '@ahwtna/shared';
import { playTileOnBoard, validateBoardMove } from './board.js';

export interface MoveContext {
  readonly phase: RoundPhase;
  readonly activeSeat: SeatIndex;
  readonly hand: readonly Tile[];
  readonly board: BoardState;
}

export interface MoveResult {
  readonly newBoard: BoardState;
  readonly newHand: readonly Tile[];
}

/**
 * فحص شامل لقانونية حركة اللاعب مع الالتزام بجميع قواعد الدومينو
 */
export function validatePlayerMove(
  seat: SeatIndex,
  tile: Tile,
  targetEnd: BoardEnd,
  ctx: MoveContext
): void {
  if (ctx.phase !== 'PLAYING') {
    throw new GameError('INVALID_PHASE', `لا يمكن اللعب في المرحلة الحالية: ${ctx.phase}`);
  }

  if (seat !== ctx.activeSeat) {
    throw new GameError(
      'NOT_YOUR_TURN',
      `ليس دورك للعب! الدور الحالي للمقعد ${ctx.activeSeat} وليس ${seat}.`
    );
  }

  const hasTile = ctx.hand.some(t => tileEquals(t, tile));
  if (!hasTile) {
    throw new GameError(
      'TILE_NOT_IN_HAND',
      `البلاطة [${tile[0]}|${tile[1]}] غير موجودة في يد اللاعب صاحب المقعد ${seat}.`
    );
  }

  validateBoardMove(tile, targetEnd, ctx.board);
}

/**
 * تنفيذ حركة اللاعب بأمان وإرجاع اليد المحدثة والطاولة المحدثة ككائنات غير قابلة للتعديل
 */
export function executePlayerMove(
  seat: SeatIndex,
  tile: Tile,
  targetEnd: BoardEnd,
  ctx: MoveContext
): MoveResult {
  validatePlayerMove(seat, tile, targetEnd, ctx);

  const newBoard = playTileOnBoard(tile, targetEnd, ctx.board);

  // إزالة البلاطة الملعوبة من يد اللاعب
  const tileIndex = ctx.hand.findIndex(t => tileEquals(t, tile));
  const newHandArray = [...ctx.hand];
  newHandArray.splice(tileIndex, 1);

  return {
    newBoard,
    newHand: Object.freeze(newHandArray),
  };
}
