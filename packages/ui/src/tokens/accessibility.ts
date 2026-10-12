/**
 * قهوتنا | ahwtna — فحص إمكانية الوصول وتباين الألوان (WCAG AA & AAA)
 * Accessibility contrast math based on W3C WCAG 2.1 specifications
 */

/**
 * تحويل كود اللون الست عشري (Hex) إلى قيم RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * حساب الإضاءة النسبية للون (Relative Luminance) حسب معادلة W3C
 */
export function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const transform = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const lr = transform(r);
  const lg = transform(g);
  const lb = transform(b);

  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/**
 * حساب نسبة التباين بين لونين (Contrast Ratio: 1:1 إلى 21:1)
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Number(ratio.toFixed(2));
}

/**
 * التحقق من استيفاء معايير WCAG AA:
 * - 4.5:1 للنص العادي
 * - 3.0:1 للنصوص الكبيرة (>= 18pt أو >= 14pt bold) وعناصر الواجهة
 */
export function meetsWcagAA(foreground: string, background: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
}

/**
 * التحقق من استيفاء معايير WCAG AAA الصارمة:
 * - 7.0:1 للنص العادي
 * - 4.5:1 للنصوص الكبيرة
 */
export function meetsWcagAAA(foreground: string, background: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 4.5 : ratio >= 7.0;
}
