import {
  AHWA_COLORS,
} from '@ahwtna/ui';
import type { RoomPlayer, RoomPublicState, SeatIndex } from '@ahwtna/shared';

export interface LobbyScreenCallbacks {
  onToggleReady: (isReady: boolean) => void;
  onChooseSeat: (seat: SeatIndex) => void;
  onLeaveRoom: () => void;
  onCopyRoomCode: (code: string) => void;
}

export function renderLobbyScreen(
  room: RoomPublicState,
  myPlayer: RoomPlayer | null,
  _callbacks?: Partial<LobbyScreenCallbacks>
): string {
  const is2P = room.mode === 'INDIVIDUAL_2P';
  const totalSeats = is2P ? 2 : 4;
  const isMeReady = myPlayer?.isReady ?? false;

  // إعداد بطاقات المقاعد
  const seatCardsHtml: string[] = [];
  for (let s = 0; s < totalSeats; s++) {
    const seat = s as SeatIndex;
    const occupant = room.players.find((p) => p.seat === seat);
    const isMySeat = myPlayer?.seat === seat;

    let teamTitle = '';
    if (!is2P) {
      teamTitle = seat === 0 || seat === 2 ? 'فريق أ' : 'فريق ب';
    }

    if (occupant) {
      seatCardsHtml.push(`
        <div style="background: rgba(13, 59, 46, 0.9); border: 2px solid ${isMySeat ? AHWA_COLORS.warmGold : 'rgba(212,175,55,0.3)'};
                    border-radius: 16px; padding: 18px; display: flex; flex-direction: column; align-items: center; gap: 12px;
                    box-shadow: ${isMySeat ? '0 0 20px rgba(212,175,55,0.35)' : '0 4px 12px rgba(0,0,0,0.4)'};
                    position: relative; transition: all 0.2s ease;">
          
          ${occupant.isHost ? `
            <span style="position: absolute; top: -10px; right: 14px; background: ${AHWA_COLORS.warmGold}; color: #000;
                         font-size: 11px; font-weight: 900; padding: 2px 8px; border-radius: 8px;">👑 صاحب الطاولة</span>
          ` : ''}

          ${!is2P ? `
            <span style="position: absolute; top: -10px; left: 14px; background: ${seat === 0 || seat === 2 ? '#2E7D32' : '#C62828'};
                         color: #FFF; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 8px;">${teamTitle}</span>
          ` : ''}

          <div style="width: 58px; height: 58px; border-radius: 50%; background: radial-gradient(circle, #D4AF37 0%, #8C6D1F 100%);
                      display: flex; align-items: center; justify-content: center; font-size: 26px; border: 2px solid #FFF;
                      box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
            ${occupant.isHost ? '🧔🏻‍♂️' : '🧓🏼'}
          </div>

          <div style="text-align: center;">
            <div style="font-weight: 900; font-size: 16px; color: ${AHWA_COLORS.creamPaper};">
              ${occupant.displayName} ${isMySeat ? '<span style="color: ' + AHWA_COLORS.warmGold + '; font-size: 12px;">(أنت)</span>' : ''}
            </div>
            <div style="font-size: 12px; color: ${AHWA_COLORS.paleGold}; opacity: 0.8; margin-top: 2px;">
              المقعد رقم ${seat + 1}
            </div>
          </div>

          <div style="margin-top: 6px;">
            ${occupant.isReady ? `
              <span style="background: rgba(46, 125, 50, 0.35); color: #81C784; border: 1.5px solid #2E7D32;
                           padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 800; display: flex; align-items: center; gap: 4px;">
                ✅ جاهز يا معلم
              </span>
            ` : `
              <span style="background: rgba(255, 152, 0, 0.2); color: #FFB74D; border: 1.5px solid rgba(255,152,0,0.4);
                           padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                ⏳ بيولع الشيشة
              </span>
            `}
          </div>
        </div>
      `);
    } else {
      // مقعد شاغر
      seatCardsHtml.push(`
        <div style="background: rgba(0,0,0,0.3); border: 2px dashed rgba(212,175,55,0.35); border-radius: 16px;
                    padding: 18px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
                    min-height: 180px;">
          <div style="font-size: 32px; opacity: 0.6;">🪑</div>
          <div style="font-size: 14px; color: ${AHWA_COLORS.paleGold}; opacity: 0.7; font-weight: 700;">
            كرسي فاضي (${is2P ? `مقعد ${seat + 1}` : `${teamTitle} - مقعد ${seat + 1}`})
          </div>
          ${!isMySeat ? `
            <button class="btn-choose-seat" data-seat="${seat}"
                    style="background: rgba(212,175,55,0.15); color: ${AHWA_COLORS.warmGold}; border: 1.5px solid ${AHWA_COLORS.warmGold};
                           border-radius: 8px; padding: 6px 14px; font-size: 12px; font-weight: 800; cursor: pointer;
                           transition: all 0.2s ease;">
              اجلس هنا 🎯
            </button>
          ` : ''}
        </div>
      `);
    }
  }

  const allReady = room.players.length === totalSeats && room.players.every((p) => p.isReady);

  return `
    <div class="ahwa-lobby-container" style="min-height: 100vh; background: radial-gradient(circle at top, #164032 0%, #0D261E 50%, #081914 100%);
                display: flex; flex-direction: column; color: ${AHWA_COLORS.creamPaper}; font-family: 'Cairo', sans-serif;">
      
      <!-- هيدر اللوبي -->
      <header style="background: rgba(13, 59, 46, 0.95); border-bottom: 2px solid ${AHWA_COLORS.warmGold};
                     padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
                     box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
        
        <div style="display: flex; align-items: center; gap: 12px;">
          <button id="btn-leave-lobby" style="background: rgba(0,0,0,0.4); color: ${AHWA_COLORS.paleGold}; border: 1.5px solid rgba(212,175,55,0.4);
                         border-radius: 8px; padding: 6px 14px; font-size: 13px; font-weight: 800; cursor: pointer;">
            🚪 خروج من الغرفة
          </button>
          <div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: ${AHWA_COLORS.paleGold};">
              قهوتنا — غرفة المعازيم
            </h1>
            <span style="font-size: 12px; color: ${AHWA_COLORS.creamPaper}; opacity: 0.8;">
              ${is2P ? '🎲 نمط فردي (لاعبان - 101)' : '👥 نمط زوجي (4 لاعبين - شراكة فرق)'}
            </span>
          </div>
        </div>

        <!-- كود الغرفة وزر النسخ -->
        <div style="display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.5); padding: 6px 14px;
                    border-radius: 12px; border: 1.5px solid ${AHWA_COLORS.warmGold};">
          <span style="font-size: 12px; color: ${AHWA_COLORS.paleGold}; font-weight: 700;">كود الغرفة:</span>
          <span id="room-code-badge" style="font-family: monospace; font-size: 22px; font-weight: 900; letter-spacing: 2px;
                        color: #FFF; background: #0D3B2E; padding: 2px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2);">
            ${room.roomId}
          </span>
          <button id="btn-copy-code" style="background: ${AHWA_COLORS.warmGold}; color: #000; border: none; border-radius: 6px;
                         padding: 6px 12px; font-size: 12px; font-weight: 800; cursor: pointer; transition: transform 0.1s ease;">
            📋 نسخ
          </button>
        </div>
      </header>

      <!-- متن اللوبي وبطاقات المقاعد -->
      <main style="flex: 1; max-width: 960px; width: 100%; margin: 0 auto; padding: 28px 16px; display: flex; flex-direction: column; gap: 24px;">
        
        <!-- بانر الحالة الإرشادي -->
        <div style="background: rgba(0,0,0,0.4); border: 1.5px solid rgba(212,175,55,0.3); border-radius: 12px;
                    padding: 14px 20px; text-align: center;">
          <div style="font-size: 16px; font-weight: 800; color: ${AHWA_COLORS.warmGold};">
            ${allReady
              ? '🎉 اكتملت الطاولة والجميع جاهز! تبدأ الجولة الآن...'
              : `في انتظار اكتمال اللاعبين (${room.players.length}/${totalSeats}) وتأكيد الجاهزية`}
          </div>
          <div style="font-size: 12px; color: ${AHWA_COLORS.creamPaper}; opacity: 0.75; margin-top: 4px;">
            شارك كود الغرفة [${room.roomId}] مع أصحابك للدخول والجلوس على المقاعد المتاحة.
          </div>
        </div>

        <!-- شبكة المقاعد -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
          ${seatCardsHtml.join('')}
        </div>

        <!-- زر الجاهزية الرئيسي بالأسفل -->
        <div style="display: flex; justify-content: center; margin-top: 16px;">
          <button id="btn-toggle-ready" style="background: ${isMeReady ? '#2E7D32' : 'linear-gradient(135deg, #D4AF37 0%, #AA8010 100%)'};
                         color: ${isMeReady ? '#FFF' : '#000'}; border: 2px solid ${isMeReady ? '#81C784' : '#FFF'};
                         border-radius: 14px; padding: 14px 44px; font-size: 18px; font-weight: 900; cursor: pointer;
                         box-shadow: 0 6px 20px ${isMeReady ? 'rgba(46,125,50,0.5)' : 'rgba(212,175,55,0.5)'};
                         display: flex; align-items: center; gap: 10px; transition: all 0.2s ease;">
            <span>${isMeReady ? '✅ أنا جاهز يا معلم (اضغط للإلغاء)' : '⚡ اضغط هنا للتأكيد: أنا جاهز يا معلم!'}</span>
          </button>
        </div>
      </main>
    </div>
  `;
}
