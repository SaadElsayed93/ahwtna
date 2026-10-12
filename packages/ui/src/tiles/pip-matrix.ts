import type { PipValue } from '@ahwtna/shared';
import { DOMINO_VOCABULARY } from '../tokens/rtl.js';

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

const ARABIC_DIGIT_NAMES: Record<PipValue, string> = {
  0: 'صفر (أبيض)',
  1: 'واحد (يك)',
  2: 'اتنين (دوجا)',
  3: 'تلاتة (سيه)',
  4: 'أربعة (جهار)',
  5: 'خمسة (بنج)',
  6: 'ستة (شيش)',
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
  let title = '';
  if (isDouble && DOMINO_VOCABULARY.doubleNames[left]) {
    title = DOMINO_VOCABULARY.doubleNames[left]!;
  } else {
    title = `بلاطة [${left}|${right}] — ${ARABIC_DIGIT_NAMES[left]} و ${ARABIC_DIGIT_NAMES[right]}`;
  }

  const ariaLabel = isDouble
    ? `دوبل ${left}، ${title}`
    : `بلاطة دومينو ${left} على ${right}`;

  return { title, ariaLabel, isDouble };
}
