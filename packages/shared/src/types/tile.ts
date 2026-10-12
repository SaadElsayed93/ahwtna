/**
 * نوع البلاطة في الدومينو السداسي المزدوج (Double-Six Domino Tile)
 * كل نصف بلاطة يحمل قيمة صحيحة بين 0 و 6.
 */
export type PipValue = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type TileId = `${PipValue}|${PipValue}`;

export type Tile = readonly [PipValue, PipValue];

/**
 * إنشاء بلاطة موحدة بحيث يكون النصف الأصغر أولاً دائماً للتماثل الرياضي
 */
export function createTile(a: number, b: number): Tile {
  if (a < 0 || a > 6 || b < 0 || b > 6 || !Number.isInteger(a) || !Number.isInteger(b)) {
    throw new Error(`قيم البلاطة غير صالحة: [${a}|${b}]. يجب أن تكون أرقاماً صحيحة بين 0 و 6.`);
  }
  const low = Math.min(a, b) as PipValue;
  const high = Math.max(a, b) as PipValue;
  return [low, high] as const;
}

/**
 * تحويل البلاطة إلى معرّف فريد بصيغة "a|b"
 */
export function getTileId(tile: Tile): TileId {
  return `${tile[0]}|${tile[1]}`;
}

/**
 * استخراج البلاطة من معرّف نصي مثل "3|5"
 */
export function parseTileId(id: string): Tile {
  const parts = id.split('|');
  if (parts.length !== 2) {
    throw new Error(`معرف البلاطة غير صالح: ${id}`);
  }
  const a = parseInt(parts[0]!, 10);
  const b = parseInt(parts[1]!, 10);
  return createTile(a, b);
}

/**
 * حساب مجموع نقاط البلاطة (Pips)
 */
export function getTileSum(tile: Tile): number {
  return tile[0] + tile[1];
}

/**
 * التحقق مما إذا كانت البلاطة دوشاً (مزدوجة)
 */
export function isDouble(tile: Tile): boolean {
  return tile[0] === tile[1];
}

/**
 * مقارنة بلاطتين للتأكد من تطابقهما الرياضي بصرف النظر عن الترتيب
 */
export function tileEquals(a: Tile, b: Tile): boolean {
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}

/**
 * فحص ما إذا كان أحد نصفي البلاطة يطابق قيمة معينة
 */
export function matchesValue(tile: Tile, value: number): boolean {
  return tile[0] === value || tile[1] === value;
}

/**
 * إرجاع قيمة النصف الآخر من البلاطة عند مطابقة أحد النصفين
 */
export function getOppositeValue(tile: Tile, matchedValue: number): PipValue {
  if (tile[0] === matchedValue) {
    return tile[1];
  }
  if (tile[1] === matchedValue) {
    return tile[0];
  }
  throw new Error(`البلاطة [${tile[0]}|${tile[1]}] لا تحتوي على القيمة ${matchedValue}`);
}
