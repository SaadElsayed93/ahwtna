/**
 * قهوتنا | ahwtna — لوحة ألوان القهوة المصرية التراثية
 * Color Palette inspired by classic Egyptian Ahwa Baladi:
 * Emerald green felt, walnut wood trim, aged cream receipts, warm brass/gold, and ivory tiles.
 */

export const AHWA_COLORS = {
  // الألوان الأساسية للطاولة والأجواء
  darkGreen: '#0D3B2E',     // أخضر القهوة الداكن التراثي
  tableGreen: '#134B3B',    // أخضر لباد الطاولة الكلاسيكي
  deepEmerald: '#07241C',   // أخضر زمردي داكن جداً للعمق والإطارات

  // الورق والخلفيات المريحة
  creamPaper: '#F7F3E9',    // ورق شاي عتيق لنوتة الحساب والقوائم
  creamSoft: '#EFE9D9',     // درجة أهدأ للبطاقات والحدود الفاتحة
  parchment: '#E8E1CE',     // لون عتيق للألواح الثانوية

  // النحاس والذهب التراثي
  warmGold: '#D4AF37',      // ذهبي دافئ للتمييز والشارات
  brassGold: '#B8860B',     // نحاس عتيق لدبوس البلاطة المعدني
  paleGold: '#F3E5AB',      // ذهبي فاتح للتوهج والنصوص المميزة

  // الخشب والتفاصيل الداكنة
  walnutWood: '#2D1A12',    // خشب جوزي غامق لإطار الطاولة والصواني
  richWood: '#3E2723',      // خشب بني دافئ
  mahogany: '#4A2C1D',      // ماهوجني داكن للظلال والحواف

  // بلاطات الدومينو والنقاط
  tileIvory: '#FFFFF2',     // أبيض عاجي فاخر للبلاطة
  tileIvoryShade: '#ECE8D9', // تظليل حافة البلاطة لإحساس 3D
  pipDark: '#1A1A1A',       // حفر أسود ناصع لنقاط الدومينو
  tileBorder: '#C8C2B3',    // إطار دقيق للبلاطة

  // الحالات والتنبيهات
  dangerRed: '#C62828',     // أحمر تحذيري غني متوافق مع WCAG AA (الاقتراب من 101 أو الخسارة)
  dangerBg: '#FFEBEE',      // خلفية تحذيرية فاتحة
  successGreen: '#2E7D32',  // أخضر الفوز وإعلان الدومينو
  successBg: '#E8F5E9',     // خلفية فوز فاتحة
  warningAmber: '#ED6C02',  // برتقالي تحذيري للنقلات الحرجة
  infoBlue: '#0288D1',      // أزرق للإشعارات والمعلومات

  // الظلال والتراكب
  shadowDeep: 'rgba(0, 0, 0, 0.65)',
  shadowMedium: 'rgba(0, 0, 0, 0.40)',
  shadowSoft: 'rgba(0, 0, 0, 0.18)',
  goldGlow: 'rgba(212, 175, 55, 0.45)',
  greenGlow: 'rgba(19, 75, 59, 0.60)',
} as const;

export type AhwaColorName = keyof typeof AHWA_COLORS;
