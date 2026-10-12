/**
 * قهوتنا | ahwtna — إعدادات الخطوط والطباعة العربية
 * Arabic Typography Tokens: Cairo and Tajawal font scales for desktop & mobile
 */

export const AHWA_TYPOGRAPHY = {
  fontFamily: "'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontFamilyDecorative: "'Cairo', serif",

  weights: {
    regular: 400,
    medium: 500,
    semiBold: 600,
    bold: 700,
    black: 900,
  },

  sizes: {
    xs: '11px',       // تسميات ثانوية وملاحظات صغيرة
    sm: '13px',       // نصوص مساعدة وتفاصيل النوتة
    base: '15px',     // النص العادي للجسم والتعليمات
    md: '17px',       // عناوين القوائم والأزرار المتوسطة
    lg: '20px',       // أسماء اللاعبين ورؤوس الأقسام
    xl: '24px',       // عدادات النقاط وأرقام النوتة
    xxl: '32px',      // عناوين الشاشات وإعلانات الجولة
    hero: '42px',     // مانشيت الفوز ودومينو الكبير
  },

  lineHeights: {
    tight: 1.15,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.75,
  },

  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.03em',
  },
} as const;
