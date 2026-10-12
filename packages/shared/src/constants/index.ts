export const TOTAL_TILES_COUNT = 28;
export const STARTING_HAND_SIZE = 7;
export const BONEYARD_SIZE_2P = 14;
export const BONEYARD_SIZE_4P = 0;

export const MATCH_LOSS_LIMIT = 101;
export const TURN_TIMEOUT_SECONDS = 30;
export const RECONNECT_WINDOW_SECONDS = 45;

/**
 * لوحة ألوان القهوة المصرية الرسمية
 */
export const AHWA_THEME_COLORS = {
  darkGreen: '#0D3B2E',
  creamPaper: '#F7F3E9',
  warmGold: '#D4AF37',
  walnutWood: '#3E2723',
  ivoryTile: '#FFFFF0',
  pipDark: '#1A1A1A',
  dangerRed: '#B71C1C',
} as const;

/**
 * رسائل الإعلانات الرسمية المعربة
 */
export const ARABIC_MESSAGES = {
  yourTurn: 'دورك — اختر قطعة للعب',
  drawAnnouncement: 'سحب — تم سحب قطعة من المخزون',
  passAnnouncement: 'تمرير — لا توجد نقلة قانونية',
  blockedGame: 'قفلة — تم إغلاق اللعب!',
  dominoOut: 'دومينو — خروج الفائز!',
  roundTie: 'تعادل في القفلة — 0 نقاط للجميع',
  matchWon: 'مبروك الفوز بالماتش! 🏆',
  matchLost: 'هارد لك! تجاوزت الـ 101 نقطة ☕',
} as const;
