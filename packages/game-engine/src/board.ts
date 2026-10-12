import {
  type BoardEnd,
  type BoardState,
  type ChainNode,
  GameError,
  getOppositeValue,
  isDouble,
  matchesValue,
  type Tile,
} from '@ahwtna/shared';

/**
 * إنشاء طاولة دومينو فارغة في بداية الجولة
 */
export function createEmptyBoard(): BoardState {
  return Object.freeze({
    nodes: Object.freeze([]),
    leftValue: null,
    rightValue: null,
  });
}

/**
 * فحص ما إذا كانت سلسلة الطاولة فارغة
 */
export function isBoardEmpty(board: BoardState): boolean {
  return board.nodes.length === 0;
}

/**
 * معرفة الأطراف المفتوحة التي تقبل هذه البلاطة حالياً
 */
export function getPlayableEnds(tile: Tile, board: BoardState): BoardEnd[] {
  if (isBoardEmpty(board)) {
    return ['LEFT', 'RIGHT'];
  }

  const ends: BoardEnd[] = [];
  if (board.leftValue !== null && matchesValue(tile, board.leftValue)) {
    ends.push('LEFT');
  }
  if (board.rightValue !== null && matchesValue(tile, board.rightValue)) {
    // تجنب إضافة الطرف الأيمن مرتين إذا كان نفس الطرف متاحاً
    if (!ends.includes('RIGHT')) {
      ends.push('RIGHT');
    }
  }
  return ends;
}

/**
 * فحص ما إذا كان لدى اللاعب أي نقلة قانونية على الطاولة
 */
export function hasAnyLegalMove(hand: readonly Tile[], board: BoardState): boolean {
  if (isBoardEmpty(board)) {
    return hand.length > 0;
  }
  return hand.some(tile => getPlayableEnds(tile, board).length > 0);
}

/**
 * التحقق من قانونية حركة وضع البلاطة على الطاولة
 */
export function validateBoardMove(
  tile: Tile,
  targetEnd: BoardEnd,
  board: BoardState
): void {
  if (isBoardEmpty(board)) {
    return; // أي بلاطة مقبولة على طاولة فارغة
  }

  const openValue = targetEnd === 'LEFT' ? board.leftValue : board.rightValue;
  if (openValue === null) {
    throw new GameError('INVALID_TARGET_END', `الطرف المستهدف ${targetEnd} غير متوفر.`);
  }

  if (!matchesValue(tile, openValue)) {
    throw new GameError(
      'ILLEGAL_MOVE',
      `لا يمكن وضع البلاطة [${tile[0]}|${tile[1]}] على الطرف ${targetEnd} لأن قيمته المفتوحة هي ${openValue}.`
    );
  }
}

/**
 * تطبيق وضع البلاطة على سلسلة الطاولة وإنتاج حالة جديدة مجمدة تماماً
 */
export function playTileOnBoard(
  tile: Tile,
  targetEnd: BoardEnd,
  board: BoardState
): BoardState {
  validateBoardMove(tile, targetEnd, board);

  // في حال كانت الطاولة فارغة (أول بلاطة في الجولة)
  if (isBoardEmpty(board)) {
    const node: ChainNode = {
      tile,
      placedValue: tile[0],
      openValue: tile[1],
      isDouble: isDouble(tile),
    };

    return Object.freeze({
      nodes: Object.freeze([node]),
      leftValue: tile[0],
      rightValue: tile[1],
    });
  }

  // إضافة البلاطة على الطرف الأيسر
  if (targetEnd === 'LEFT') {
    const matched = board.leftValue!;
    const newOpenValue = getOppositeValue(tile, matched);

    const node: ChainNode = {
      tile,
      placedValue: matched,
      openValue: newOpenValue,
      isDouble: isDouble(tile),
    };

    return Object.freeze({
      nodes: Object.freeze([node, ...board.nodes]),
      leftValue: newOpenValue,
      rightValue: board.rightValue,
    });
  }

  // إضافة البلاطة على الطرف الأيمن
  const matched = board.rightValue!;
  const newOpenValue = getOppositeValue(tile, matched);

  const node: ChainNode = {
    tile,
    placedValue: matched,
    openValue: newOpenValue,
    isDouble: isDouble(tile),
  };

  return Object.freeze({
    nodes: Object.freeze([...board.nodes, node]),
    leftValue: board.leftValue,
    rightValue: newOpenValue,
  });
}
