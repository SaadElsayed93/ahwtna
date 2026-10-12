/**
 * أحرف وأرقام آمنة سهلة القراءة خالية من الحروف المتشابهة (O, 0, 1, I)
 */
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

/**
 * توليد كود غرفة عشوائي فريد مكون من 6 خانات
 */
export function generateRoomCode(existingCodes?: Set<string> | Map<string, unknown>): string {
  let attempts = 0;
  while (attempts < 1000) {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
      code += ROOM_CODE_ALPHABET[randomIndex];
    }

    if (!existingCodes || !existingCodes.has(code)) {
      return code;
    }
    attempts++;
  }

  // في أسوأ الظروف الرياضية
  return `AHW${Math.floor(100 + Math.random() * 900)}`;
}
