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
 * حساب تموضع سلسلة الدومينو المتصلة ببعضها هندسياً دون أي فواصل أو فراغات (Real Domino Snake Chain)
 * كل بلاطة تلامس البلاطة السابقة تلامساً حقيقياً طرفاً لطرف
 * وعند الالتفاف تنعطف السلسلة بزاوية قائمة (L-Turn) متصلة بالكامل كقطع الدومينو الحقيقية
 *
 * @param board حالة طاولة اللعب
 * @param tilesPerLeg عدد البلاطات في كل ضلع أفقي قبل الالتفاف (افتراضي: 4)
 * @param tileSize حجم البلاطة ('sm' بحجم 32px لكل نصف بلاطة أو 'md' بحجم 44px)
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

  // S هو حجم نصف البلاطة (Grid Cell Size)
  const S = tileSize === 'sm' ? 32 : 44;
  const safeTilesPerLeg = Math.max(2, tilesPerLeg);

  // استخراج قيم الأطراف المتصلة (inPip و outPip) لكل بلاطة على طول السلسلة
  const connectingPips: { inPip: PipValue; outPip: PipValue }[] = [];
  let prevOut: PipValue = board.leftValue!;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const inPip = prevOut;
    const outPip = getOppositeValue(node.tile, inPip);
    connectingPips.push({ inPip, outPip });
    prevOut = outPip;
  }

  interface RawTile {
    nodeIndex: number;
    tile: Tile;
    isDouble: boolean;
    orientation: 'horizontal' | 'vertical';
    displayValues: [PipValue, PipValue];
    gridX: number;
    gridY: number;
    gridW: number;
    gridH: number;
    isCornerTurn: boolean;
    isFirst: boolean;
    isLast: boolean;
  }

  const rawTiles: RawTile[] = [];

  // تتبع الإحداثيات على شبكة الدومينو (بوحدات S)
  let dir: 'RIGHT' | 'LEFT' = 'RIGHT';
  let curCol = 0;
  let curRow = 0;
  let legCount = 0;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const double = isDouble(node.tile);
    const { inPip, outPip } = connectingPips[i]!;
    const isFirst = i === 0;
    const isLast = i === nodes.length - 1;

    if (dir === 'RIGHT') {
      // هل حان وقت الالتفاف لأسفل؟
      if (legCount >= safeTilesPerLeg && i < nodes.length - 1) {
        // بلاطة زاوية رأسية تلتف لأسفل:
        // تتصل مباشرة بأسفل النصف الأيمن من البلاطة السابقة (الموجود عند [curCol - 1, curRow])
        const gridX = curCol - 1;
        const gridY = curRow + 1;
        const gridW = 1;
        const gridH = 2;
        const orientation: 'horizontal' | 'vertical' = 'vertical';
        // نصفها العلوي يلامس inPip، ونصفها السفلي يخرج منه outPip
        const displayValues: [PipValue, PipValue] = [inPip, outPip];

        rawTiles.push({
          nodeIndex: i,
          tile: node.tile,
          isDouble: double,
          orientation,
          displayValues,
          gridX,
          gridY,
          gridW,
          gridH,
          isCornerTurn: true,
          isFirst,
          isLast,
        });

        // الضلع التالي يتحرك لليسار ويتصل بأسفل بلاطة الزاوية (عند [curCol - 1, curRow + 2]):
        curRow = curRow + 2;
        curCol = curCol - 2;
        dir = 'LEFT';
        legCount = 0;
      } else {
        // بلاطة مستمرة لليمين (الدبل متعامد رأسياً، والمفرد أفقي)
        const gridX = curCol;
        const gridY = curRow;
        const gridW = double ? 1 : 2;
        const gridH = double ? 2 : 1;
        const orientation: 'horizontal' | 'vertical' = double ? 'vertical' : 'horizontal';
        const displayValues: [PipValue, PipValue] = [inPip, outPip];

        rawTiles.push({
          nodeIndex: i,
          tile: node.tile,
          isDouble: double,
          orientation,
          displayValues,
          gridX,
          gridY,
          gridW,
          gridH,
          isCornerTurn: false,
          isFirst,
          isLast,
        });

        curCol += gridW;
        legCount++;
      }
    } else {
      // dir === 'LEFT'
      // هل حان وقت الالتفاف لأسفل؟
      if (legCount >= safeTilesPerLeg && i < nodes.length - 1) {
        // بلاطة زاوية رأسية تلتف لأسفل:
        // تتصل مباشرة بأسفل النصف الأيسر من البلاطة السابقة (الموجود عند [curCol + 1, curRow])
        const gridX = curCol + 1;
        const gridY = curRow + 1;
        const gridW = 1;
        const gridH = 2;
        const orientation: 'horizontal' | 'vertical' = 'vertical';
        const displayValues: [PipValue, PipValue] = [inPip, outPip];

        rawTiles.push({
          nodeIndex: i,
          tile: node.tile,
          isDouble: double,
          orientation,
          displayValues,
          gridX,
          gridY,
          gridW,
          gridH,
          isCornerTurn: true,
          isFirst,
          isLast,
        });

        // الضلع التالي يتحرك لليمين ويتصل بأسفل بلاطة الزاوية:
        curRow = curRow + 2;
        curCol = curCol + 2;
        dir = 'RIGHT';
        legCount = 0;
      } else {
        // بلاطة مستمرة لليسار (الدبل متعامد رأسياً، والمفرد أفقي)
        const gridW = double ? 1 : 2;
        const gridH = double ? 2 : 1;
        const gridX = double ? curCol : curCol - 1;
        const gridY = curRow;
        const orientation: 'horizontal' | 'vertical' = double ? 'vertical' : 'horizontal';
        const displayValues: [PipValue, PipValue] = double ? [inPip, outPip] : [outPip, inPip];

        rawTiles.push({
          nodeIndex: i,
          tile: node.tile,
          isDouble: double,
          orientation,
          displayValues,
          gridX,
          gridY,
          gridW,
          gridH,
          isCornerTurn: false,
          isFirst,
          isLast,
        });

        curCol -= gridW;
        legCount++;
      }
    }
  }

  // حساب الصندوق المحيط لضبط المحاذاة الموجبة
  let minGridX = Infinity;
  let maxGridX = -Infinity;
  let minGridY = Infinity;
  let maxGridY = -Infinity;

  for (const t of rawTiles) {
    minGridX = Math.min(minGridX, t.gridX);
    maxGridX = Math.max(maxGridX, t.gridX + t.gridW);
    minGridY = Math.min(minGridY, t.gridY);
    maxGridY = Math.max(maxGridY, t.gridY + t.gridH);
  }

  const offsetX = minGridX < 0 ? -minGridX : 0;
  const offsetY = minGridY < 0 ? -minGridY : 0;

  const tiles: ConnectedSnakeTile[] = rawTiles.map((t) => {
    const finalGridX = t.gridX + offsetX;
    const finalGridY = t.gridY + offsetY;
    return {
      nodeIndex: t.nodeIndex,
      tile: t.tile,
      isDouble: t.isDouble,
      orientation: t.orientation,
      displayValues: t.displayValues,
      x: finalGridX * S,
      y: finalGridY * S,
      width: t.gridW * S,
      height: t.gridH * S,
      isCornerTurn: t.isCornerTurn,
      isFirst: t.isFirst,
      isLast: t.isLast,
    };
  });

  const totalWidth = (maxGridX - minGridX) * S;
  const totalHeight = (maxGridY - minGridY) * S;

  // تحديد مواقع أهداف الأطراف المفتوحة
  const firstTile = tiles[0];
  const lastTile = tiles[tiles.length - 1];

  let leftTarget: { x: number; y: number; value: PipValue } | null = null;
  let rightTarget: { x: number; y: number; value: PipValue } | null = null;

  if (firstTile && board.leftValue !== null) {
    leftTarget = {
      x: Math.max(0, firstTile.x - 40),
      y: firstTile.y,
      value: board.leftValue,
    };
  }

  if (lastTile && board.rightValue !== null) {
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

export const computeSnakeLayout = computeConnectedSnakeLayout;
