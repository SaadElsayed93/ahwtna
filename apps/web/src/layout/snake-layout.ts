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
 * خوارزمية تموضع سلسلة الدومينو بنظام الشبكة الهندسية المنفصلة (Discrete Non-Overlapping Grid)
 * 1. تمنع التداخل نهائياً (0% Overlap) عبر حجز خلايا شبكية مستقلة لكل بلاطة
 * 2. وضع قطع الدبل (مثل 5-5) متعامدة تماماً (بالعرض على الرقم) في منتصف المسار
 * 3. مسافة أمان رأسية واسعة بين كل مسار والتالي (4 خلايا شبكية = 128px) لمنع أي تقاطع
 * 4. وصلات الانعطاف تنزل ببلاطتين رأسيتين لربط المسارات بتباعد مريح
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

  // S: حجم نصف البلاطة (32px في الوضع الصغير)
  const S = tileSize === 'sm' ? 32 : 40;
  const safeTilesPerLeg = Math.max(3, tilesPerLeg);

  // استخراج قيم الأطراف المتصلة (inPip و outPip) لكل بلاطة
  const connectingPips: { inPip: PipValue; outPip: PipValue }[] = [];
  let prevOut: PipValue = board.leftValue!;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const inPip = prevOut;
    const outPip = getOppositeValue(node.tile, inPip);
    connectingPips.push({ inPip, outPip });
    prevOut = outPip;
  }

  interface PlacedTile {
    nodeIndex: number;
    tile: Tile;
    isDouble: boolean;
    orientation: 'horizontal' | 'vertical';
    displayValues: [PipValue, PipValue];
    pixelX: number;
    pixelY: number;
    pixelW: number;
    pixelH: number;
    isCornerTurn: boolean;
    isFirst: boolean;
    isLast: boolean;
  }

  const placedTiles: PlacedTile[] = [];

  // تتبع الموضع على الشبكة (Grid Coordinates)
  let row = 0; // سطر الشبكة
  let col = 0; // عمود الشبكة
  let dir: 1 | -1 = 1; // 1: يمين، -1: يسار
  let legCount = 0;
  let inTurn = false;
  let turnStep = 0; // 1 أو 2 في الانعطاف

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const double = isDouble(node.tile);
    const { inPip, outPip } = connectingPips[i]!;
    const isFirst = i === 0;
    const isLast = i === nodes.length - 1;

    if (inTurn) {
      // بلاطات الانعطاف الرأسي لأسفل (Vertical Turn Connector)
      if (turnStep === 1) {
        // البلاطة الأولى في الانعطاف: رأسية تحتل [col, row+1] و [col, row+2]
        const pixelX = col * S;
        const pixelY = (row + 1) * S;
        const pixelW = S;
        const pixelH = 2 * S;
        const displayValues: [PipValue, PipValue] = [inPip, outPip];

        placedTiles.push({
          nodeIndex: i,
          tile: node.tile,
          isDouble: double,
          orientation: 'vertical',
          displayValues,
          pixelX,
          pixelY,
          pixelW,
          pixelH,
          isCornerTurn: true,
          isFirst,
          isLast,
        });

        turnStep = 2;
      } else {
        // البلاطة الثانية في الانعطاف: رأسية تحتل [col, row+3] و [col, row+4]
        const pixelX = col * S;
        const pixelY = (row + 3) * S;
        const pixelW = S;
        const pixelH = 2 * S;
        const displayValues: [PipValue, PipValue] = [inPip, outPip];

        placedTiles.push({
          nodeIndex: i,
          tile: node.tile,
          isDouble: double,
          orientation: 'vertical',
          displayValues,
          pixelX,
          pixelY,
          pixelW,
          pixelH,
          isCornerTurn: true,
          isFirst,
          isLast,
        });

        // انتهى الانعطاف: ننتقل للسطر الجديد row + 4
        row = row + 4;
        // نعكس الاتجاه
        if (dir === 1) {
          // كنا نتجه لليمين، الآن سنتجه لليسار
          // البلاطة الأفقية التالية تبدأ على يسار بلاطة الانعطاف (col - 1)
          col = col - 1;
          dir = -1;
        } else {
          // كنا نتجه لليسار، الآن سنتجه لليمين
          // البلاطة الأفقية التالية تبدأ على يمين بلاطة الانعطاف (col + 1)
          col = col + 1;
          dir = 1;
        }

        inTurn = false;
        turnStep = 0;
        legCount = 0;
      }
    } else {
      // فحص هل حان وقت الانعطاف
      const shouldTurn = legCount >= safeTilesPerLeg && i < nodes.length - 1;

      if (shouldTurn) {
        inTurn = true;
        turnStep = 1;

        // عمود الانعطاف هو نفس عمود آخر بلاطة أفقية
        const turnCol = dir === 1 ? col - 1 : col;
        col = turnCol;

        // أول بلاطة في الانعطاف: رأسية تحتل [col, row+1] و [col, row+2]
        const pixelX = col * S;
        const pixelY = (row + 1) * S;
        const pixelW = S;
        const pixelH = 2 * S;
        const displayValues: [PipValue, PipValue] = [inPip, outPip];

        placedTiles.push({
          nodeIndex: i,
          tile: node.tile,
          isDouble: double,
          orientation: 'vertical',
          displayValues,
          pixelX,
          pixelY,
          pixelW,
          pixelH,
          isCornerTurn: true,
          isFirst,
          isLast,
        });

        turnStep = 2;
      } else {
        // بلاطة داخل المسار الأفقي
        if (dir === 1) {
          // حركة لليمين
          if (double) {
            // دبل بالعرض (Vertical) في منتصف السطر الأفقي تماماً
            const pixelX = col * S;
            const pixelY = row * S - Math.floor(S / 2); // متمركزة رأسياً
            const pixelW = S;
            const pixelH = 2 * S;
            const displayValues: [PipValue, PipValue] = [inPip, outPip];

            placedTiles.push({
              nodeIndex: i,
              tile: node.tile,
              isDouble: true,
              orientation: 'vertical',
              displayValues,
              pixelX,
              pixelY,
              pixelW,
              pixelH,
              isCornerTurn: false,
              isFirst,
              isLast,
            });

            col += 1;
          } else {
            // بلاطة أفقية عادية
            const pixelX = col * S;
            const pixelY = row * S;
            const pixelW = 2 * S;
            const pixelH = S;
            const displayValues: [PipValue, PipValue] = [inPip, outPip];

            placedTiles.push({
              nodeIndex: i,
              tile: node.tile,
              isDouble: false,
              orientation: 'horizontal',
              displayValues,
              pixelX,
              pixelY,
              pixelW,
              pixelH,
              isCornerTurn: false,
              isFirst,
              isLast,
            });

            col += 2;
          }
        } else {
          // حركة لليسار
          if (double) {
            // دبل بالعرض (Vertical)
            const pixelX = col * S;
            const pixelY = row * S - Math.floor(S / 2); // متمركزة رأسياً
            const pixelW = S;
            const pixelH = 2 * S;
            const displayValues: [PipValue, PipValue] = [inPip, outPip];

            placedTiles.push({
              nodeIndex: i,
              tile: node.tile,
              isDouble: true,
              orientation: 'vertical',
              displayValues,
              pixelX,
              pixelY,
              pixelW,
              pixelH,
              isCornerTurn: false,
              isFirst,
              isLast,
            });

            col -= 1;
          } else {
            // بلاطة أفقية عادية متجهة لليسار: تحتل [col-1, col]
            const pixelX = (col - 1) * S;
            const pixelY = row * S;
            const pixelW = 2 * S;
            const pixelH = S;
            // نصفها الأيمن يلامس inPip، ونصفها الأيسر يخرج منه outPip
            const displayValues: [PipValue, PipValue] = [outPip, inPip];

            placedTiles.push({
              nodeIndex: i,
              tile: node.tile,
              isDouble: false,
              orientation: 'horizontal',
              displayValues,
              pixelX,
              pixelY,
              pixelW,
              pixelH,
              isCornerTurn: false,
              isFirst,
              isLast,
            });

            col -= 2;
          }
        }

        legCount++;
      }
    }
  }

  // حساب أبعاد الصندوق المحيط لتوسيط السلسلة بدقة
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const t of placedTiles) {
    minX = Math.min(minX, t.pixelX);
    maxX = Math.max(maxX, t.pixelX + t.pixelW);
    minY = Math.min(minY, t.pixelY);
    maxY = Math.max(maxY, t.pixelY + t.pixelH);
  }

  const padding = 24;
  const offsetX = minX < padding ? padding - minX : padding;
  const offsetY = minY < padding ? padding - minY : padding;

  const resultTiles: ConnectedSnakeTile[] = placedTiles.map((t) => ({
    nodeIndex: t.nodeIndex,
    tile: t.tile,
    isDouble: t.isDouble,
    orientation: t.orientation,
    displayValues: t.displayValues,
    x: t.pixelX + offsetX,
    y: t.pixelY + offsetY,
    width: t.pixelW,
    height: t.pixelH,
    isCornerTurn: t.isCornerTurn,
    isFirst: t.isFirst,
    isLast: t.isLast,
  }));

  const totalWidth = maxX - minX + padding * 2;
  const totalHeight = maxY - minY + padding * 2;

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
