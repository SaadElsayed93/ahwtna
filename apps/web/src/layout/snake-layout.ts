import type { BoardState, PipValue, Tile } from '@ahwtna/shared';
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
 * حساب تموضع سلسلة الدومينو المتصلة بمسافات آمنة تمنع أي تداخل نهائياً (Collision-Free Domino Chain)
 * 1. قطع الدبل (مثل 5-5) توضع متعامدة تماماً (بالعرض على الرقم) متمركزة في منتصف المسار
 * 2. المسارات الأفقية تفصل بينها مسافة رأسية واسعة (120px) تمنع أي تداخل بين الأسطر
 * 3. الانعطافات تستخدم وصلات رأسية مريحة تربط المسار العلوي بالمسار السفلي بسلاسة
 *
 * @param board حالة طاولة اللعب
 * @param tilesPerLeg عدد البلاطات في كل ضلع أفقي قبل الالتفاف (افتراضي: 4)
 * @param tileSize حجم البلاطة ('sm' أو 'md')
 */
export function computeConnectedSnakeLayout(
  board: BoardState,
  tilesPerLeg: number = 4,
  tileSize: 'sm' | 'md' = 'sm'
): ConnectedBoardLayout {
  const nodes = board.nodes;
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

  // W: عرض/سُمك البلاطة، L: طول البلاطة
  const W = tileSize === 'sm' ? 32 : 38;
  const L = W * 2; // 64px في sm، أو 76px في md
  const laneSpacing = L + W * 1.8; // مسافة رأسية كافية (120px) بين مراكز المسارات لمنع أي تداخل

  const safeTilesPerLeg = Math.max(3, tilesPerLeg);

  // استخراج تسلسل قيم الأطراف المتصلة (inPip و outPip)
  const connectingPips: { inPip: PipValue; outPip: PipValue }[] = [];
  let prevOut: PipValue = board.leftValue!;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const inPip = prevOut;
    const outPip = getOppositeValue(node.tile, inPip);
    connectingPips.push({ inPip, outPip });
    prevOut = outPip;
  }

  const resultTiles: ConnectedSnakeTile[] = [];

  let laneIndex = 0;
  let dir: 1 | -1 = 1; // 1: لليمين، -1: لليسار
  let curX = 40;
  let inTurn = false;
  let turnTilesRemaining = 0;
  let legTileCount = 0;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const double = isDouble(node.tile);
    const { inPip, outPip } = connectingPips[i]!;
    const isFirst = i === 0;
    const isLast = i === nodes.length - 1;

    const laneY = 40 + laneIndex * laneSpacing;

    if (inTurn) {
      // بلاطة داخل الانعطاف الرأسي لأسفل (Vertical Turn Connector)
      const orientation: 'horizontal' | 'vertical' = 'vertical';
      const width = W;
      const height = L;
      const x = dir === 1 ? curX - width : curX;
      // نضع البلاطة الرأسية في المسافة بين المسارين
      const topY = laneY - laneSpacing + (turnTilesRemaining === 2 ? W : W + L - 8);
      const y = topY;
      const displayValues: [PipValue, PipValue] = [inPip, outPip];

      resultTiles.push({
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

      turnTilesRemaining--;
      if (turnTilesRemaining <= 0) {
        inTurn = false;
        // عكس الاتجاه وبدء المسار الجديد
        dir = (dir === 1 ? -1 : 1) as 1 | -1;
        legTileCount = 0;
      }
    } else {
      // فحص هل حان وقت الانعطاف لأسفل
      const shouldStartTurn = legTileCount >= safeTilesPerLeg && i < nodes.length - 1;

      if (shouldStartTurn) {
        inTurn = true;
        turnTilesRemaining = 2; // نستخدم بلاطتين لتغطية الهبوط الرأسي الواسع
        laneIndex++;

        // أول بلاطة في الانعطاف
        const orientation: 'horizontal' | 'vertical' = 'vertical';
        const width = W;
        const height = L;
        const x = dir === 1 ? curX - width : curX;
        const topY = laneY + W * 0.5;
        const y = topY;
        const displayValues: [PipValue, PipValue] = [inPip, outPip];

        resultTiles.push({
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

        turnTilesRemaining--;
      } else {
        // بلاطة داخل المسار الأفقي
        if (double) {
          // في الدومينو الأصيل: الدبل يُوضع متعامداً (بالعرض على الرقم المطلوب)
          // متمركزاً تماماً في منتصف المسار الأفقي
          const orientation: 'horizontal' | 'vertical' = 'vertical';
          const width = W;
          const height = L;
          const x = dir === 1 ? curX : curX - width;
          const y = laneY - L / 2; // متمركز تماماً فوق وتحت خط المنتصف
          const displayValues: [PipValue, PipValue] = [inPip, outPip];

          resultTiles.push({
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
          const width = L;
          const height = W;
          const x = dir === 1 ? curX : curX - width;
          const y = laneY - W / 2; // متمركزة على خط المنتصف
          const displayValues: [PipValue, PipValue] = dir === 1
            ? [inPip, outPip]
            : [outPip, inPip];

          resultTiles.push({
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

        legTileCount++;
      }
    }
  }

  // حساب الصندوق المحيط لضبط المحاذاة الموجبة وتوسيط السلسلة
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const t of resultTiles) {
    minX = Math.min(minX, t.x);
    maxX = Math.max(maxX, t.x + t.width);
    minY = Math.min(minY, t.y);
    maxY = Math.max(maxY, t.y + t.height);
  }

  const offsetX = minX < 20 ? 30 - minX : 20;
  const offsetY = minY < 20 ? 30 - minY : 20;

  for (const t of resultTiles) {
    t.x += offsetX;
    t.y += offsetY;
  }

  const totalWidth = maxX - minX + 60;
  const totalHeight = maxY - minY + 60;

  // تحديد مواقع أهداف الأطراف المفتوحة
  const firstTile = resultTiles[0];
  const lastTile = resultTiles[resultTiles.length - 1];

  let leftTarget: { x: number; y: number; value: PipValue } | null = null;
  let rightTarget: { x: number; y: number; value: PipValue } | null = null;

  if (firstTile && board.leftValue !== null) {
    leftTarget = {
      x: Math.max(0, firstTile.x - 45),
      y: firstTile.y,
      value: board.leftValue,
    };
  }

  if (lastTile && board.rightValue !== null) {
    rightTarget = {
      x: lastTile.x + lastTile.width + 12,
      y: lastTile.y,
      value: board.rightValue,
    };
  }

  return {
    tiles: resultTiles,
    totalWidth,
    totalHeight,
    leftTarget,
    rightTarget,
    leftOpenValue: board.leftValue,
    rightOpenValue: board.rightValue,
  };
}

export const computeSnakeLayout = computeConnectedSnakeLayout;
