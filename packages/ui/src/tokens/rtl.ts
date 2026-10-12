/**
 * قهوتنا | ahwtna — إعدادات الواجهة العربية وقاموس مصطلحات الدومينو المصرية
 * RTL Layout specifications & authentic Egyptian Domino vocabulary
 */

export const AHWA_RTL_CONFIG = {
  direction: 'rtl' as const,
  locale: 'ar-EG' as const,
  lang: 'ar' as const,
  textAlign: 'right' as const,
  flexDirectionRow: 'row' as const,
} as const;

/**
 * قاموس مصطلحات الدومينو الشعبية المصرية
 */
export const DOMINO_VOCABULARY = {
  gameTitle: 'قهوتنا | دومينو 101',
  tagline: 'طاولة الدومينو المصرية على أصولها',

  // الأحداث والأوامر
  domino: 'دومينو!',
  blocked: 'القفلة!',
  draw: 'سحب بلاطة',
  pass: 'تمرير الدور',
  boneyard: 'البلاطة المخفية',
  table: 'طاولة اللعب',
  scoreboard: 'نوتة الحساب',
  yourTurn: 'دورك — العب بلاطة',
  opponentTurn: 'دور الخصم يفكر...',
  waitingPlayers: 'في انتظار اكتمال الطاولة...',

  // الفرق والأطراف
  teamA: 'فريق أ',
  teamB: 'فريق ب',
  player1: 'اللاعب 1',
  player2: 'اللاعب 2',
  shekShek: 'عم شكشك (الذكاء الاصطناعي)',

  // أطراف السلسلة
  leftEnd: 'الطرف الأيمن',
  rightEnd: 'الطرف الأيسر',

  // النتيجة والماتش
  round: 'جولة',
  matchLimit: 'حد الـ 101 نقطة',
  penaltyPoints: 'نقاط الجزاء',
  totalScore: 'الرصيد التراكمي',
  winner: 'الفائز بالمباراة',
  matchOver: 'انتهت المباراة!',
  matchOverSubtitle: 'تجاوز حد الـ 101 نقطة جزاء',
  newRound: 'الجولة التالية',
  newMatch: 'ماتش جديد',

  // أرقام الدومينو والنرد التراثية في القهوة المصرية
  singleNames: {
    0: 'أأبيض',
    1: 'يك',
    2: 'دو',
    3: 'سيه',
    4: 'جوهار',
    5: 'بنج',
    6: 'شيش',
  } as Record<number, string>,

  // أسماء قطع الدبل التراثية في القهاوي المصرية
  doubleNames: {
    0: 'بلاطين (أبيض)',
    1: 'هاب يك',
    2: 'دوبارة',
    3: 'دوسة',
    4: 'دورجي',
    5: 'دبش',
    6: 'الدش (الدوش)',
  } as Record<number, string>,
} as const;

/**
 * الحصول على الاسم الشعبي المصري التراثي لأي بلاطة دومينو
 * مثلاً: [6|6] -> الدش، [6|5] -> شيش بيش، [4|1] -> جوهار يك، [0|0] -> بلاطين (أبيض)
 */
export function getEgyptianTileName(a: number, b: number): string {
  const high = Math.max(a, b);
  const low = Math.min(a, b);

  if (high === low) {
    return DOMINO_VOCABULARY.doubleNames[high] ?? `دبل ${high}`;
  }

  const highName = DOMINO_VOCABULARY.singleNames[high] ?? String(high);
  const lowName = DOMINO_VOCABULARY.singleNames[low] ?? String(low);

  return `${highName} ${lowName}`;
}

export type DominoVocabularyKey = keyof typeof DOMINO_VOCABULARY;
