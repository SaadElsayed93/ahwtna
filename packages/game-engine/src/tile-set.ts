import { createTile, type PipValue, type Tile, TOTAL_TILES_COUNT } from '@ahwtna/shared';

/**
 * توليد مجموعة الدومينو السداسية المزدوجة الكاملة (Double-Six)
 * تتكون رياضياً من 28 قطعة فريدة حيث: 0 <= a <= b <= 6
 */
export function generateDoubleSixSet(): readonly Tile[] {
  const tiles: Tile[] = [];
  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      tiles.push(createTile(a as PipValue, b as PipValue));
    }
  }

  if (tiles.length !== TOTAL_TILES_COUNT) {
    throw new Error(`خطأ في توليد مجموعة الدومينو: تم إنشاء ${tiles.length} قطعة بدلاً من ${TOTAL_TILES_COUNT}`);
  }

  return Object.freeze(tiles);
}

/**
 * مولد أرقام شبه عشوائي حتمي (Mulberry32 PRNG)
 * يقبل بذرة (seed) رقمية لإنتاج نفس تسلسل الأرقام العشوائية بدقة في الاختبارات
 */
export function createSeededRandom(seed: number): () => number {
  let s = Math.floor(seed) >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * خلط القطع باستخدام خوارزمية Fisher-Yates المعتمدة
 * تقبل دالة عشوائية اختيارية للخلط الحتمي
 */
export function shuffleTiles(
  tiles: readonly Tile[],
  randomFn: () => number = Math.random
): Tile[] {
  const copy = [...tiles];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    const temp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = temp;
  }
  return copy;
}
