import type { BoardState, ChainNode, PipValue, Tile } from '@ahwtna/shared';
import { getOppositeValue, isDouble } from '@ahwtna/shared';

export interface ConnectedSnakeTile {
  nodeIndex: number;
  tile: Tile;
  isDouble: boolean;
  orientation: 'horizontal' | 'vertical';
  /** القيم بالترتيب البصري (من الطرف الأيسر/العلوي إلى الطرف الأيمن/السفلي) */
  displayValues: [PipValue, PipValue];
  x: number;
  y: number;
  width: number;
  height: number;
  isCornerTurn: boolean;
  isFirst: boolean;
  isLast: boolean;
}

export interface ConnectedBoardLayout {
  tiles: ConnectedSnakeTile[];
  totalWidth: number;
  totalHeight: number;
  leftTarget: { x: number; y: number; value: PipValue } | null;
  rightTarget: { x: number; y: number; value: PipValue } | null;
  leftOpenValue: PipValue | null;
  rightOpenValue: PipValue | null;
}

/**
 * حساب تموضع سلسلة الدومينو المتصلة ببعضها هندسياً دون انقطاع
 * تلتف السلسلة عند أطراف الطاولة بحيث تكون آخر بلاطة في السطر متصلة بالبلاطة التالية
 * مع الحفاظ على تطابق أرقام البلاطات المتلاصقة بصرياً
 * 
 * @param board حالة طاولة اللعب
 * @param tilesPerRow عدد البلاطات الأفقية في السطر الواحد قبل الالتفاف (افتراضي: 5)
 * @param unitSize حجم النصف بلاطة بالبكسل (افتراضي: 34)
 */
export function computeConnectedSnakeLayout(
  board: BoardState,
  tilesPerRow: number = 5,
  unitSize: number = 34
): ConnectedBoardLayout {
  const nodes = board.nodes;
  const u = unitSize;
  const tileLen = 2 * u; // طول البلاطة (68px)
  const tileThick = u;   // عرض البلاطة (34px)

  if (!nodes || nodes.length === 0) {
    return {
      tiles: [],
      totalWidth: 0,
      totalHeight: 0,
      leftTarget: null,
      rightTarget: null,
      leftOpenValue: null,
      rightOpenValue: null,
    };
  }

  const safeTilesPerRow = Math.max(3, tilesPerRow);
  const tiles: ConnectedSnakeTile[] = [];

  // تتبع الاتجاه والموقع الحالي
  // اتجاه الحركة: 1 لليمين، -1 لليسار
  let dir: 1 | -1 = 1;
  let curX = 0;
  let curY = 0;
  let tilesInCurrentRow = 0;

  // استخراج تسلسل قيم الأطراف المتصلة من أول السلسلة لآخرها
  const connectingPips: { inPip: PipValue; outPip: PipValue }[] = [];
  let prevOut: PipValue = board.leftValue!;

  for (let i = 0; i < nodes.length; i++) {
    const node: ChainNode = nodes[i]!;
    const inPip = prevOut;
    const outPip = getOppositeValue(node.tile, inPip);
    connectingPips.push({ inPip, outPip });
    prevOut = outPip;
  }

  for (let i = 0; i < nodes.length; i++) {
    const node: ChainNode = nodes[i]!;
    const double = isDouble(node.tile);
    const { inPip, outPip } = connectingPips[i]!;
    const isFirst = i === 0;
    const isLast = i === nodes.length - 1;

    // هل حان وقت الالتفاف للسطر التالي؟
    const shouldTurn = tilesInCurrentRow >= safeTilesPerRow && i < nodes.length - 1;

    if (shouldTurn) {
      // بلاطة الالتفاف (Corner Turn Tile):
      // توضع رأسياً (Vertical) لتربط بين السطر الحالي والسطر التالي مباشرة
      const orientation: 'horizontal' | 'vertical' = 'vertical';
      const width = tileThick;
      const height = tileLen;

      let x: number;
      let y: number;

      if (dir === 1) {
        // الالتفاف عند الطرف الأيمن:
        // البلاطة الرأسية تبدأ من نهاية البلاطة السابقة وتنزل لأسفل
        x = curX;
        y = curY;
        // الموقع للسطر التالي: الحركة تصبح لليسار
        curX = x - tileLen;
        curY = y + height;
        dir = -1;
      } else {
        // الالتفاف عند الطرف الأيسر:
        // البلاطة الرأسية تبدأ من نهاية البلاطة السابقة وتنزل لأسفل
        x = curX - width;
        y = curY;
        // الموقع للسطر التالي: الحركة تصبح لليمين
        curX = x + width;
        curY = y + height;
        dir = 1;
      }

      // في الالتفاف الرأسي لأسفل: النصف العلوي يستقبل inPip، والنصف السفلي يخرج منه outPip
      const displayValues: [PipValue, PipValue] = [inPip, outPip];

      tiles.push({
        nodeIndex: i,
        tile: node.tile,
        isDouble: double,
        orientation,
        displayValues,
        x,
        y,
        width,
        height,
        isCornerTurn: true,
        isFirst,
        isLast,
      });

      tilesInCurrentRow = 0;
    } else {
      // بلاطة أفقية عادية (أو دبل رأسي داخل السطر)
      if (double) {
        // قطع الدبل في القهاوي توضع متعامدة (Crosswise)
        const orientation: 'horizontal' | 'vertical' = 'vertical';
        const width = tileThick;
        const height = tileLen;
        // نضبط Y بحيث تكون متمركزة رأسياً على السطر
        const x = dir === 1 ? curX : curX - width;
        const y = curY - (tileLen - tileThick) / 2;

        const displayValues: [PipValue, PipValue] = [inPip, outPip];

        tiles.push({
          nodeIndex: i,
          tile: node.tile,
          isDouble: true,
          orientation,
          displayValues,
          x,
          y,
          width,
          height,
          isCornerTurn: false,
          isFirst,
          isLast,
        });

        curX += dir * width;
      } else {
        // بلاطة أفقية عادية
        const orientation: 'horizontal' | 'vertical' = 'horizontal';
        const width = tileLen;
        const height = tileThick;
        const x = dir === 1 ? curX : curX - width;
        const y = curY;

        // عند الحركة لليمين: اليسار هو inPip واليمين هو outPip
        // عند الحركة لليسار: اليمين هو inPip واليسار هو outPip
        const displayValues: [PipValue, PipValue] = dir === 1
          ? [inPip, outPip]
          : [outPip, inPip];

        tiles.push({
          nodeIndex: i,
          tile: node.tile,
          isDouble: false,
          orientation,
          displayValues,
          x,
          y,
          width,
          height,
          isCornerTurn: false,
          isFirst,
          isLast,
        });

        curX += dir * width;
      }

      tilesInCurrentRow++;
    }
  }

  // حساب أبعاد الصندوق المحيط (Bounding Box) لتوسيط السلسلة على الطاولة
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const t of tiles) {
    minX = Math.min(minX, t.x);
    maxX = Math.max(maxX, t.x + t.width);
    minY = Math.min(minY, t.y);
    maxY = Math.max(maxY, t.y + t.height);
  }

  // إزاحة جميع البلاطات لتكون الإحداثيات موجبة تبدأ من 0
  const offsetX = minX < 0 ? -minX : 0;
  const offsetY = minY < 0 ? -minY : 0;

  for (const t of tiles) {
    t.x += offsetX;
    t.y += offsetY;
  }

  const totalWidth = maxX - minX;
  const totalHeight = maxY - minY;

  // تحديد مواقع أهداف الأطراف المفتوحة (Left Target & Right Target)
  const firstTile = tiles[0];
  const lastTile = tiles[tiles.length - 1];

  let leftTarget: { x: number; y: number; value: PipValue } | null = null;
  let rightTarget: { x: number; y: number; value: PipValue } | null = null;

  if (firstTile && board.leftValue !== null) {
    // الطرف الأيسر (أول السلسلة)
    leftTarget = {
      x: Math.max(0, firstTile.x - 30),
      y: firstTile.y,
      value: board.leftValue,
    };
  }

  if (lastTile && board.rightValue !== null) {
    // الطرف الأيمن (آخر السلسلة)
    rightTarget = {
      x: lastTile.x + lastTile.width + 10,
      y: lastTile.y,
      value: board.rightValue,
    };
  }

  return {
    tiles,
    totalWidth,
    totalHeight,
    leftTarget,
    rightTarget,
    leftOpenValue: board.leftValue,
    rightOpenValue: board.rightValue,
  };
}

// للتوافق مع الاستيرادات الحالية
export const computeSnakeLayout = computeConnectedSnakeLayout;
