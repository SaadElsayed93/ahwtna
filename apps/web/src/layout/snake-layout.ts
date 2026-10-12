import type { BoardState, ChainNode, PipValue, Tile } from '@ahwtna/shared';
import { isDouble } from '@ahwtna/shared';

export interface SnakeTilePosition {
  nodeIndex: number;
  tile: Tile;
  isDouble: boolean;
  orientation: 'horizontal' | 'vertical';
  /** القيم بالترتيب البصري (من الطرف الخارجي إلى الطرف الداخلي أو العكس) */
  displayValues: [PipValue, PipValue];
  row: number;
  col: number;
  rowDirection: 'ltr' | 'rtl';
  isFirst: boolean;
  isLast: boolean;
}

export interface SnakeBoardLayout {
  items: SnakeTilePosition[];
  totalRows: number;
  maxCols: number;
  leftOpenValue: PipValue | null;
  rightOpenValue: PipValue | null;
}

/**
 * حساب توزيع وتموضع سلسلة الدومينو بنمط الثعبان الملتف (Serpentine / Snake Layout)
 * يضمن عدم خروج القطع عن إطار الشاشة مع توجيه البلاطات المزدوجة (دبل) بشكل عمودي تقليدي
 * 
 * @param board حالة طاولة اللعب
 * @param tilesPerRow أقصى عدد بلاطات في السطر الواحد قبل الالتفاف (افتراضي: 6)
 */
export function computeSnakeLayout(
  board: BoardState,
  tilesPerRow: number = 6
): SnakeBoardLayout {
  const nodes = board.nodes;
  const safeTilesPerRow = Math.max(3, tilesPerRow);

  if (!nodes || nodes.length === 0) {
    return {
      items: [],
      totalRows: 0,
      maxCols: safeTilesPerRow,
      leftOpenValue: null,
      rightOpenValue: null,
    };
  }

  const items: SnakeTilePosition[] = [];
  let currentRow = 0;
  let currentColInRow = 0;

  for (let i = 0; i < nodes.length; i++) {
    const node: ChainNode = nodes[i]!;
    const double = isDouble(node.tile);
    const isFirst = i === 0;
    const isLast = i === nodes.length - 1;

    // إذا تجاوزنا عرض السطر الحالي، ننتقل للسطر التالي
    if (currentColInRow >= safeTilesPerRow) {
      currentRow++;
      currentColInRow = 0;
    }

    const rowDirection: 'ltr' | 'rtl' = currentRow % 2 === 0 ? 'ltr' : 'rtl';

    // حساب التوجيه البصري:
    // في الدومينو الأصيل: الدبل يُوضع معامداً لخط السير (Vertical في السطور الأفقية)
    // البلاطات المفردة توضع بموازاة خط السير (Horizontal)
    const orientation: 'horizontal' | 'vertical' = double ? 'vertical' : 'horizontal';

    // حساب ترتيب الأرقام بصرياً لكي تتطابق الأطراف المتلاصقة
    let displayValues: [PipValue, PipValue];
    if (double) {
      displayValues = [node.tile[0], node.tile[1]];
    } else {
      if (isFirst) {
        // البلاطة الأولى في السلسلة (الطرف الأيسر للطاولة)
        // نريد أن يكون openValue (leftValue) في البداية، وplacedValue متجهاً للبلاطة التالية
        if (node.openValue === node.tile[0]) {
          displayValues = [node.tile[0], node.tile[1]];
        } else {
          displayValues = [node.tile[1], node.tile[0]];
        }
      } else {
        // البلاطة تتصل بالبلاطة السابقة من جهة placedValue
        // نريد أن يكون placedValue هو الأول (المتصل بالسابقة)، والطرف الثاني يواجه التالية
        if (node.placedValue === node.tile[0]) {
          displayValues = [node.tile[0], node.tile[1]];
        } else {
          displayValues = [node.tile[1], node.tile[0]];
        }
      }
    }

    // موضع العمود حسب اتجاه السطر
    const visualCol = rowDirection === 'ltr' ? currentColInRow : safeTilesPerRow - 1 - currentColInRow;

    items.push({
      nodeIndex: i,
      tile: node.tile,
      isDouble: double,
      orientation,
      displayValues,
      row: currentRow,
      col: visualCol,
      rowDirection,
      isFirst,
      isLast,
    });

    currentColInRow++;
  }

  return {
    items,
    totalRows: currentRow + 1,
    maxCols: safeTilesPerRow,
    leftOpenValue: board.leftValue,
    rightOpenValue: board.rightValue,
  };
}
