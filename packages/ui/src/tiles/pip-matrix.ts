import type { PipValue } from '@ahwtna/shared';
import { getEgyptianTileName } from '../tokens/rtl.js';

export interface PipCoordinate {
  x: number; // نسبة مئوية 0.0 إلى 1.0 بالنسبة لنصف البلاطة
  y: number; // نسبة مئوية 0.0 إلى 1.0 بالنسبة لنصف البلاطة
}

/**
 * مصفوفة التوزيع الهندسي لنقاط الدومينو (0 إلى 6)
 * Normalized coordinates inside a half-tile bounding box
 */
export const PIP_LAYOUTS: Record<PipValue, readonly PipCoordinate[]> = {
  0: [],
  1: [{ x: 0.5, y: 0.5 }],
  2: [
    { x: 0.25, y: 0.25 },
    { x: 0.75, y: 0.75 },
  ],
  3: [
    { x: 0.25, y: 0.25 },
    { x: 0.5, y: 0.5 },
    { x: 0.75, y: 0.75 },
  ],
  4: [
    { x: 0.25, y: 0.25 },
    { x: 0.75, y: 0.25 },
    { x: 0.25, y: 0.75 },
    { x: 0.75, y: 0.75 },
  ],
  5: [
    { x: 0.25, y: 0.25 },
    { x: 0.75, y: 0.25 },
    { x: 0.5, y: 0.5 },
    { x: 0.25, y: 0.75 },
    { x: 0.75, y: 0.75 },
  ],
  6: [
    { x: 0.25, y: 0.22 },
    { x: 0.25, y: 0.5 },
    { x: 0.25, y: 0.78 },
    { x: 0.75, y: 0.22 },
    { x: 0.75, y: 0.5 },
    { x: 0.75, y: 0.78 },
  ],
};

/**
 * الحصول على الاسم التراثي الشعبي المصري للبلاطة مع وصف ARIA
 */
export function getTileArabicDescription(left: PipValue, right: PipValue): {
  title: string;
  ariaLabel: string;
  isDouble: boolean;
} {
  const isDouble = left === right;
  const egyptianName = getEgyptianTileName(left, right);
  const title = `${egyptianName} [${left}|${right}]`;
  const ariaLabel = isDouble
    ? `دوبل ${left}، ${egyptianName}`
    : `بلاطة دومينو ${egyptianName} [${left}|${right}]`;

  return { title, ariaLabel, isDouble };
}
