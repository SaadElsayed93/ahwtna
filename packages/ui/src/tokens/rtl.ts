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

  // أسماء قطع الدبل التراثية في القهاوي المصرية
  doubleNames: {
    0: 'بلاطين (0-0)',
    1: 'هاب يك (1-1)',
    2: 'دوبارة (2-2)',
    3: 'دوسة (3-3)',
    4: 'دورجي (4-4)',
    5: 'دبش (5-5)',
    6: 'الدوش (6-6)',
  } as Record<number, string>,
} as const;

export type DominoVocabularyKey = keyof typeof DOMINO_VOCABULARY;
