import {
  AHWA_COLORS,
  renderTileSvg,
} from '@ahwtna/ui';

export interface HomeScreenCallbacks {
  onStartOffline2P: (playerName: string) => void;
  onStartOffline4P: (playerName: string) => void;
  onCreateOnlineRoom: (mode: 'INDIVIDUAL_2P' | 'TEAM_4P') => void;
  onJoinOnlineRoom: (roomCode: string) => void;
}

export interface HomeScreenState {
  playerName: string;
  playerTitle: string;
  activeModal: 'NONE' | 'CHANGE_NAME' | 'CREATE_ROOM' | 'JOIN_ROOM' | 'VOCABULARY';
  generatedRoomCode?: string;
  joinInputCode?: string;
}

export const EGYPTIAN_TITLES = [
  'المعلم',
  'الباشا',
  'البرنس',
  'الأسطى',
  'الخواجة',
  'العمدة',
  'الحريف',
];

export function renderHomeScreen(
  state: HomeScreenState,
  _callbacks?: Partial<HomeScreenCallbacks>,
  audioControlsHtml?: string
): string {
  // كارت لعبة دومينو 101 الرئيسي مع بلاطتي الدش وشيش بنج
  const tileDoshSvg = renderTileSvg({
    left: 6,
    right: 6,
    orientation: 'vertical',
    size: 'md',
    state: 'playable',
  });

  const tileSheeshBangSvg = renderTileSvg({
    left: 6,
    right: 5,
    orientation: 'vertical',
    size: 'md',
    state: 'playable',
  });

  return `
    <div class="ahwa-home-container" style="min-height: 100vh; background: radial-gradient(circle at top, #164032 0%, #0D261E 45%, #081914 100%);
                display: flex; flex-direction: column; color: ${AHWA_COLORS.creamPaper};">
      
      <!-- هيدر القهوة التراثي -->
      <header style="background: rgba(13, 59, 46, 0.95); border-bottom: 2px solid ${AHWA_COLORS.warmGold};
                     padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;
                     box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
        
        <!-- شعار القهوة -->
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="font-size: 34px; line-height: 1; filter: drop-shadow(0 2px 8px rgba(212,175,55,0.6));">☕</div>
          <div>
            <div style="display: flex; align-items: baseline; gap: 8px;">
              <h1 style="color: ${AHWA_COLORS.warmGold}; font-weight: 900; font-size: 26px; margin: 0; letter-spacing: 0.5px;">
                قهوتنا
              </h1>
              <span style="font-size: 13px; color: ${AHWA_COLORS.paleGold}; opacity: 0.85; font-weight: 700;">ahwtna</span>
            </div>
            <p style="color: ${AHWA_COLORS.creamPaper}; opacity: 0.85; font-size: 13px; margin: 2px 0 0 0;">
              القهوة البلدي على أصولها — قعدة سلطنة ودومينو 101
            </p>
          </div>
        </div>

        <!-- أدوات الصوت والاهتزاز وكارت بروفايل اللاعب المصري -->
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          ${audioControlsHtml || ''}
          <div style="display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.45);
                      padding: 8px 16px; border-radius: 20px; border: 1.5px solid rgba(212,175,55,0.4);">
            <div style="font-size: 26px;">🧔🏻‍♂️</div>
            <div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="color: ${AHWA_COLORS.warmGold}; font-weight: 800; font-size: 14px;">
                  ${state.playerTitle} ${state.playerName}
                </span>
              <button id="btn-open-edit-name" style="background: transparent; border: none; color: ${AHWA_COLORS.paleGold}; cursor: pointer; font-size: 13px;" title="تعديل الاسم واللقب">
                ✏️
              </button>
            </div>
            <div style="font-size: 11px; color: #bbb; display: flex; gap: 8px;">
              <span>🏆 معلم طاولة</span>
              <span>•</span>
              <span style="color: ${AHWA_COLORS.paleGold};">☕ المشاريب علينا!</span>
            </div>
          </div>
        </div>
      </header>

      <!-- متن الشاشة الرئيسية -->
      <main style="flex: 1; max-width: 1200px; width: 100%; margin: 0 auto; padding: 24px 16px; display: flex; flex-direction: column; gap: 28px;">
        
        <!-- بانر الترحيب الشعبي -->
        <div style="background: linear-gradient(135deg, rgba(45, 26, 18, 0.9) 0%, rgba(13, 59, 46, 0.95) 100%);
                    border: 2px solid ${AHWA_COLORS.warmGold}; border-radius: 20px; padding: 20px 24px;
                    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;
                    box-shadow: 0 8px 30px rgba(0,0,0,0.6);">
          <div style="max-width: 680px;">
            <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(212,175,55,0.2); border: 1px solid ${AHWA_COLORS.warmGold}; border-radius: 12px; padding: 4px 12px; margin-bottom: 8px;">
              <span style="font-size: 14px;">🪑</span>
              <span style="font-size: 12px; font-weight: 700; color: ${AHWA_COLORS.warmGold};">يا هلا بيك في ترابيزة المعلمين</span>
            </div>
            <h2 style="font-size: 24px; font-weight: 900; color: ${AHWA_COLORS.warmGold}; margin: 4px 0 8px 0;">
              جاهز تدب الدش وتفرش الطاولة؟
            </h2>
            <p style="font-size: 14px; color: ${AHWA_COLORS.creamPaper}; opacity: 0.9; line-height: 1.6; margin: 0;">
              العب دومينو 101 بأصول اللعب المصري: الدش صاحب الافتتاح، بيض وبلاط ودوبارة، واللي يجمع 101 نقطة جزاء أولاً يشيل الشيلة ويدفع المشاريب!
            </p>
          </div>

          <div style="display: flex; gap: 10px; align-items: center;">
            <button id="btn-open-vocab-modal" class="ahwa-btn ahwa-btn-wood ahwa-btn-md" style="white-space: nowrap;">
              📖 معجم مسميات الدومينو
            </button>
          </div>
        </div>

        <!-- قسم اللعبة الحالية: ترابيزة دومينو 101 -->
        <section>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
            <span style="font-size: 22px;">🎲</span>
            <h3 style="font-size: 20px; font-weight: 900; color: ${AHWA_COLORS.warmGold}; margin: 0;">
              ترابيزة دومينو 101 (جاهزة للعب الآن)
            </h3>
            <span style="font-size: 11px; background: #2E7D32; color: #FFF; font-weight: 700; padding: 2px 8px; border-radius: 6px;">
              متاحة حالياً
            </span>
          </div>

          <!-- الكارت الكبير التفاعلي لدومينو 101 -->
          <div style="background: radial-gradient(circle at center, #195844 0%, #0F382B 70%, #0A261D 100%);
                      border: 3px solid ${AHWA_COLORS.walnutWood}; border-radius: 20px; padding: 24px;
                      box-shadow: inset 0 0 50px rgba(0,0,0,0.7), 0 10px 30px rgba(0,0,0,0.5);
                      display: flex; flex-direction: column; gap: 20px;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
              <div style="flex: 1; min-width: 280px;">
                <h4 style="font-size: 22px; font-weight: 900; color: ${AHWA_COLORS.warmGold}; margin: 0 0 6px 0;">
                  دومينو أمريكاني 101 الشعبية
                </h4>
                <p style="font-size: 14px; color: ${AHWA_COLORS.creamPaper}; opacity: 0.9; margin: 0; line-height: 1.5;">
                  العب ضد ذكاء اصطناعي محلي "عم شكشك" أو ادعُ أصحابك على ترابيزة خاصة أونلاين.
                </p>
              </div>

              <!-- استعراض البلاطات العاجية التراثية -->
              <div style="display: flex; gap: 14px; align-items: center; background: rgba(0,0,0,0.4); padding: 10px 18px; border-radius: 16px; border: 1px solid rgba(212,175,55,0.3);">
                <div style="text-align: center;">
                  ${tileDoshSvg}
                  <div style="font-size: 11px; font-weight: 700; color: ${AHWA_COLORS.warmGold}; margin-top: 4px;">الدش [6|6]</div>
                </div>
                <div style="text-align: center;">
                  ${tileSheeshBangSvg}
                  <div style="font-size: 11px; font-weight: 700; color: ${AHWA_COLORS.warmGold}; margin-top: 4px;">شيش بنج [6|5]</div>
                </div>
              </div>
            </div>

            <hr style="border: none; border-top: 1px solid rgba(212,175,55,0.25); margin: 0;">

            <!-- شبكة خيارات اللعب (أوفلاين وأونلاين) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">
              
              <!-- خيار 1: لعب فردي أوفلاين (2P) -->
              <div style="background: rgba(0,0,0,0.35); border: 2px solid ${AHWA_COLORS.warmGold}; border-radius: 16px; padding: 18px;
                          display: flex; flex-direction: column; justify-content: space-between; gap: 14px; transition: transform 0.2s ease;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-weight: 900; font-size: 17px; color: ${AHWA_COLORS.warmGold};">لعب فردي (2P)</span>
                    <span style="font-size: 11px; background: rgba(212,175,55,0.2); color: ${AHWA_COLORS.paleGold}; padding: 2px 6px; border-radius: 4px;">راسك براس عم شكشك</span>
                  </div>
                  <p style="font-size: 13px; color: #ccc; margin: 0; line-height: 1.4;">
                    7 قطع لكل لاعب و14 بالمخزون. سحب إجباري عند انعدام اللعب واحتساب كامل النقاط.
                  </p>
                </div>
                <button id="btn-start-offline-2p" class="ahwa-btn ahwa-btn-gold ahwa-btn-md" style="width: 100%; font-size: 15px; font-weight: 800;">
                  🎲 ابدأ لعب فردي الآن
                </button>
              </div>

              <!-- خيار 2: لعب زوجي أوفلاين (4P) -->
              <div style="background: rgba(0,0,0,0.35); border: 1.5px solid rgba(212,175,55,0.4); border-radius: 16px; padding: 18px;
                          display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-weight: 900; font-size: 17px; color: ${AHWA_COLORS.creamPaper};">لعب زوجي (4P)</span>
                    <span style="font-size: 11px; background: rgba(255,255,255,0.1); color: #aaa; padding: 2px 6px; border-radius: 4px;">فريقك ضد الخصمين</span>
                  </div>
                  <p style="font-size: 13px; color: #ccc; margin: 0; line-height: 1.4;">
                    أنت ومحروس كفريق ضد شكشك وفوزي. بدون سحب (كل القطع موزعة)، والتمرير فوري.
                  </p>
                </div>
                <button id="btn-start-offline-4p" class="ahwa-btn ahwa-btn-primary ahwa-btn-md" style="width: 100%; font-size: 15px; font-weight: 800;">
                  👥 ابدأ لعب زوجي الآن
                </button>
              </div>

              <!-- خيار 3: إنشاء ترابيزة أونلاين خاصة -->
              <div style="background: rgba(0,0,0,0.35); border: 1.5px solid rgba(212,175,55,0.4); border-radius: 16px; padding: 18px;
                          display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-weight: 900; font-size: 17px; color: ${AHWA_COLORS.paleGold};">افتح ترابيزة لأصحابك</span>
                    <span style="font-size: 11px; background: rgba(33, 150, 243, 0.2); color: #64B5F6; padding: 2px 6px; border-radius: 4px;">أونلاين</span>
                  </div>
                  <p style="font-size: 13px; color: #ccc; margin: 0; line-height: 1.4;">
                    أنشئ غرفة بكود سري وشارك الرابط مع أصحابك للعب معاً في الوقت الفعلي.
                  </p>
                </div>
                <button id="btn-open-create-room-modal" class="ahwa-btn ahwa-btn-wood ahwa-btn-md" style="width: 100%; font-size: 15px; font-weight: 800;">
                  🌐 أنشئ ترابيزة جديدة
                </button>
              </div>

              <!-- خيار 4: الانضمام بكود غرفة -->
              <div style="background: rgba(0,0,0,0.35); border: 1.5px solid rgba(212,175,55,0.4); border-radius: 16px; padding: 18px;
                          display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-weight: 900; font-size: 17px; color: ${AHWA_COLORS.paleGold};">ادخل بكود صاحبك</span>
                    <span style="font-size: 11px; background: rgba(33, 150, 243, 0.2); color: #64B5F6; padding: 2px 6px; border-radius: 4px;">انضمام سريع</span>
                  </div>
                  <p style="font-size: 13px; color: #ccc; margin: 0; line-height: 1.4;">
                    صاحبك باعتلك كود الغرفة؟ اكتبه هنا وادخل اقعد على الترابيزة مباشرة.
                  </p>
                </div>
                <button id="btn-open-join-room-modal" class="ahwa-btn ahwa-btn-wood ahwa-btn-md" style="width: 100%; font-size: 15px; font-weight: 800;">
                  🔑 انضمام بكود الغرفة
                </button>
              </div>

            </div>
          </div>
        </section>

        <!-- قسم ألعاب القهوة القادمة (Coming Soon) -->
        <section>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
            <span style="font-size: 22px;">⏳</span>
            <h3 style="font-size: 18px; font-weight: 900; color: ${AHWA_COLORS.paleGold}; margin: 0;">
              ألعاب القهوة تحت التجهيز (قريباً على قهوتنا)
            </h3>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">
            
            <!-- طاولة 31 -->
            <div style="background: rgba(0,0,0,0.3); border: 1px dashed rgba(212,175,55,0.35); border-radius: 16px; padding: 16px; opacity: 0.85;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: 900; font-size: 16px; color: ${AHWA_COLORS.warmGold};">🎲 طاولة 31 السكندري</span>
                <span style="font-size: 10px; background: rgba(212,175,55,0.15); color: ${AHWA_COLORS.warmGold}; padding: 2px 6px; border-radius: 4px;">قريباً</span>
              </div>
              <p style="font-size: 12px; color: #aaa; margin: 0; line-height: 1.4;">
                شيش بيش، دوبارة، دوسة.. لعبة الطاولة الكلاسيكية بمسمياتها وحماس رمي الزهر التراثي.
              </p>
            </div>

            <!-- استميشن -->
            <div style="background: rgba(0,0,0,0.3); border: 1px dashed rgba(212,175,55,0.35); border-radius: 16px; padding: 16px; opacity: 0.85;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: 900; font-size: 16px; color: ${AHWA_COLORS.warmGold};">🃏 استميشن (Estimation)</span>
                <span style="font-size: 10px; background: rgba(212,175,55,0.15); color: ${AHWA_COLORS.warmGold}; padding: 2px 6px; border-radius: 4px;">قريباً</span>
              </div>
              <p style="font-size: 12px; color: #aaa; margin: 0; line-height: 1.4;">
                كول، ويز، ساكولاي.. ليلة كوتشينة مصرية من العيار الثقيل وحساب الأكلات بالورقة والقلم.
              </p>
            </div>

            <!-- شطرنج القهوة -->
            <div style="background: rgba(0,0,0,0.3); border: 1px dashed rgba(212,175,55,0.35); border-radius: 16px; padding: 16px; opacity: 0.85;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: 900; font-size: 16px; color: ${AHWA_COLORS.warmGold};">♟️ شطرنج القهوة</span>
                <span style="font-size: 10px; background: rgba(212,175,55,0.15); color: ${AHWA_COLORS.warmGold}; padding: 2px 6px; border-radius: 4px;">قريباً</span>
              </div>
              <p style="font-size: 12px; color: #aaa; margin: 0; line-height: 1.4;">
                كش ملك.. صراع العقول والدهاء على رخام ترابيزة القهوة مع ساعة الشطرنج الشعبية.
              </p>
            </div>

          </div>
        </section>

      </main>

      <!-- فوتر القهوة البلدي -->
      <footer style="background: rgba(13, 59, 46, 0.95); border-top: 1.5px solid rgba(212,175,55,0.3);
                     padding: 14px 20px; text-align: center; font-size: 13px; color: ${AHWA_COLORS.paleGold};">
        ☕ قهوتنا | منصة ألعاب القهوة المصرية التراثية — دومينو 101 • صُنعت بروح مصرية أصيلة 🇪🇬
      </footer>

      <!-- النوافذ المنبثقة (Modals) -->
      ${renderActiveModal(state)}
    </div>
  `;
}

function renderActiveModal(state: HomeScreenState): string {
  if (state.activeModal === 'NONE') return '';

  if (state.activeModal === 'CHANGE_NAME') {
    return `
      <div class="ahwa-modal-backdrop" id="modal-backdrop">
        <div class="ahwa-modal-card" style="max-width: 420px; text-align: right;">
          <h3 style="color: ${AHWA_COLORS.warmGold}; font-size: 20px; font-weight: 900; margin-bottom: 12px; text-align: center;">
            تعديل لقب واسم المعلم 🧔🏻‍♂️
          </h3>
          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
            <div>
              <label style="font-size: 13px; font-weight: 700; color: ${AHWA_COLORS.paleGold}; display: block; margin-bottom: 6px;">
                اللقب الشعبي:
              </label>
              <select id="input-player-title" style="width: 100%; padding: 10px; border-radius: 8px; background: #1B2E26; color: #FFF; border: 1.5px solid ${AHWA_COLORS.warmGold}; font-family: inherit; font-size: 14px;">
                ${EGYPTIAN_TITLES.map((t) => `<option value="${t}" ${t === state.playerTitle ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size: 13px; font-weight: 700; color: ${AHWA_COLORS.paleGold}; display: block; margin-bottom: 6px;">
                اسمك بالكامل:
              </label>
              <input type="text" id="input-player-name" value="${state.playerName}" maxlength="20"
                     style="width: 100%; padding: 10px; border-radius: 8px; background: #1B2E26; color: #FFF; border: 1.5px solid ${AHWA_COLORS.warmGold}; font-family: inherit; font-size: 14px;" />
            </div>
          </div>
          <div style="display: flex; justify-content: center; gap: 10px;">
            <button id="btn-save-name" class="ahwa-btn ahwa-btn-gold ahwa-btn-md">حفظ البيانات</button>
            <button id="btn-close-modal" class="ahwa-btn ahwa-btn-wood ahwa-btn-md">إلغاء</button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.activeModal === 'CREATE_ROOM') {
    const code = state.generatedRoomCode || 'AHW-709';
    return `
      <div class="ahwa-modal-backdrop" id="modal-backdrop">
        <div class="ahwa-modal-card" style="max-width: 440px; text-align: center;">
          <div style="font-size: 32px; margin-bottom: 6px;">🌐🎲</div>
          <h3 style="color: ${AHWA_COLORS.warmGold}; font-size: 22px; font-weight: 900; margin-bottom: 6px;">
            افتح ترابيزة أونلاين لأصحابك
          </h3>
          <p style="font-size: 13px; color: #ccc; margin-bottom: 16px;">
            شارك كود الترابيزة مع أصحابك للدخول واللعب معاً في الوقت الفعلي:
          </p>

          <div style="background: rgba(0,0,0,0.5); border: 2px dashed ${AHWA_COLORS.warmGold}; border-radius: 14px; padding: 16px; margin-bottom: 20px;">
            <div style="font-size: 12px; color: ${AHWA_COLORS.paleGold}; margin-bottom: 4px;">كود الترابيزة السري:</div>
            <div id="room-code-display" style="font-size: 28px; font-weight: 900; color: #FFF; letter-spacing: 3px; font-family: monospace;">
              ${code}
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button id="btn-copy-room-code" class="ahwa-btn ahwa-btn-gold ahwa-btn-md" style="width: 100%;">
              📋 نسخ كود الترابيزة
            </button>
            <div style="display: flex; gap: 8px;">
              <button id="btn-confirm-create-2p" class="ahwa-btn ahwa-btn-primary ahwa-btn-sm" style="flex: 1;">
                ابدأ فردي (2P)
              </button>
              <button id="btn-confirm-create-4p" class="ahwa-btn ahwa-btn-primary ahwa-btn-sm" style="flex: 1;">
                ابدأ زوجي (4P)
              </button>
            </div>
            <button id="btn-close-modal" class="ahwa-btn ahwa-btn-wood ahwa-btn-sm" style="margin-top: 6px;">
              إغلاق
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.activeModal === 'JOIN_ROOM') {
    return `
      <div class="ahwa-modal-backdrop" id="modal-backdrop">
        <div class="ahwa-modal-card" style="max-width: 420px; text-align: center;">
          <div style="font-size: 32px; margin-bottom: 6px;">🔑</div>
          <h3 style="color: ${AHWA_COLORS.warmGold}; font-size: 22px; font-weight: 900; margin-bottom: 6px;">
            ادخل ترابيزة صاحبك
          </h3>
          <p style="font-size: 13px; color: #ccc; margin-bottom: 16px;">
            اكتب كود الترابيزة المكون من 6 خانات اللي صاحبك بعتهولك:
          </p>

          <div style="margin-bottom: 20px;">
            <input type="text" id="input-join-code" placeholder="مثال: AHW-709" maxlength="10"
                   style="width: 100%; text-align: center; font-size: 22px; font-weight: 800; letter-spacing: 2px;
                          padding: 12px; border-radius: 12px; background: #1B2E26; color: ${AHWA_COLORS.warmGold};
                          border: 2px solid ${AHWA_COLORS.warmGold}; font-family: monospace;" />
          </div>

          <div style="display: flex; justify-content: center; gap: 10px;">
            <button id="btn-confirm-join" class="ahwa-btn ahwa-btn-gold ahwa-btn-md" style="min-width: 140px;">
              اقعد على الترابيزة 🪑
            </button>
            <button id="btn-close-modal" class="ahwa-btn ahwa-btn-wood ahwa-btn-md">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.activeModal === 'VOCABULARY') {
    return `
      <div class="ahwa-modal-backdrop" id="modal-backdrop">
        <div class="ahwa-modal-card" style="max-width: 540px; text-align: right; max-height: 85vh; overflow-y: auto;">
          <h3 style="color: ${AHWA_COLORS.warmGold}; font-size: 22px; font-weight: 900; margin-bottom: 6px; text-align: center;">
            📖 معجم مسميات الدومينو في القهاوي المصرية
          </h3>
          <p style="font-size: 12px; color: #bbb; text-align: center; margin-bottom: 16px;">
            المصطلحات الشعبية التراثية المتداولة بين حريفة الدومينو في مصر
          </p>

          <!-- جدول الدبل -->
          <div style="background: rgba(0,0,0,0.35); border-radius: 12px; padding: 12px; margin-bottom: 14px; border: 1px solid rgba(212,175,55,0.3);">
            <div style="font-weight: 800; color: ${AHWA_COLORS.warmGold}; font-size: 14px; margin-bottom: 8px;">
              🎲 البلاطات المزدوجة (الدبل):
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 13px;">
              <div>[6|6] : <strong>الدش (صاحب البداية)</strong></div>
              <div>[5|5] : <strong>دبش</strong></div>
              <div>[4|4] : <strong>دورجي</strong></div>
              <div>[3|3] : <strong>دوسة</strong></div>
              <div>[2|2] : <strong>دوبارة</strong></div>
              <div>[1|1] : <strong>هاب يك</strong></div>
              <div>[0|0] : <strong>بلاطين (بيض)</strong></div>
            </div>
          </div>

          <!-- الأرقام المفردة -->
          <div style="background: rgba(0,0,0,0.35); border-radius: 12px; padding: 12px; margin-bottom: 14px; border: 1px solid rgba(212,175,55,0.3);">
            <div style="font-weight: 800; color: ${AHWA_COLORS.warmGold}; font-size: 14px; margin-bottom: 8px;">
              🔢 الأرقام الفردية والمركبة:
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 13px;">
              <div>0 = بيض / بلاط</div>
              <div>1 = يك</div>
              <div>2 = دوجا</div>
              <div>3 = سيه</div>
              <div>4 = جهار</div>
              <div>5 = بنج</div>
              <div>6 = شيش</div>
              <div>[6|5] = شيش بنج</div>
              <div>[6|4] = شيش جهار</div>
              <div>[5|4] = بنج جهار</div>
              <div>[4|3] = جهار سيه</div>
              <div>[3|1] = سيه يك</div>
            </div>
          </div>

          <!-- مصطلحات القفلة واللعب -->
          <div style="background: rgba(0,0,0,0.35); border-radius: 12px; padding: 12px; margin-bottom: 18px; border: 1px solid rgba(212,175,55,0.3);">
            <div style="font-weight: 800; color: ${AHWA_COLORS.warmGold}; font-size: 14px; margin-bottom: 8px;">
              ⚡ حركات وتركات الطاولة:
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #ddd;">
              <div>• <strong>دومينو:</strong> عندما يُنهي أحد اللاعبين جميع ورقه أولاً.</div>
              <div>• <strong>القفلة (تسكيك الطاولة):</strong> عندما يستحيل اللعب على الطرفين من قِبل أي لاعب.</div>
              <div>• <strong>حساب القفلة:</strong> الفائز صاحب أقل مجموع نقاط في يده، والخصم تُحسب عليه نقاط الجميع.</div>
              <div>• <strong>الـ 101 نقطة:</strong> حد الخسارة في الماتش، من يتجاوز 101 نقطة جزاء يخسر الماتش ويدفع المشاريب!</div>
            </div>
          </div>

          <div style="text-align: center;">
            <button id="btn-close-modal" class="ahwa-btn ahwa-btn-gold ahwa-btn-md" style="min-width: 140px;">
              فهمت يا معلم 👍
            </button>
          </div>
        </div>
      </div>
    `;
  }

  return '';
}
