import {
  injectAhwaStyles,
  AHWA_COLORS,
  DOMINO_VOCABULARY,
  getEgyptianTileName,
  renderTileSvg,
  renderAhwaButton,
  renderTurnIndicator,
  renderScoreBoard,
  renderAhwaModal,
  renderMatchFeed,
  type TileState,
} from '@ahwtna/ui';

import {
  type MatchScore2P,
  type MatchScore4P,
  type Tile,
  tileEquals,
} from '@ahwtna/shared';

import { getPlayableEnds, isBoardEmpty } from '@ahwtna/game-engine';
import { computeSnakeLayout } from './layout/snake-layout.js';
import { OfflineGameController, type SoundEffect } from './controllers/offline-game-controller.js';

// حقن الأنماط التراثية للقهوة المصرية
injectAhwaStyles();

const toTileId = (t: Tile): string => `${t[0]}|${t[1]}`;

// محرك المؤثرات الصوتية (Web Audio API)
class SoundEngine {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  playSlam() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.09);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playDraw() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.13);
  }

  playPass() {
    this.init();
    if (!this.ctx) return;
    // نقرة خشبية مزدوجة تحاكي خبطة اليد على الطاولة للتمرير
    [0, 0.08].forEach((delay) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, this.ctx!.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx!.currentTime + delay + 0.04);
      gain.gain.setValueAtTime(0.3, this.ctx!.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + delay + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(this.ctx!.currentTime + delay);
      osc.stop(this.ctx!.currentTime + delay + 0.05);
    });
  }

  playWin() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [440, 554, 659, 880].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.5, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.26);
    });
  }

  playBlock() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [120, 90, 60].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0.6, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.07 + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.16);
    });
  }
}

const sounds = new SoundEngine();

function playSoundByEvent(sound: SoundEffect) {
  switch (sound) {
    case 'slam':
      sounds.playSlam();
      break;
    case 'draw':
      sounds.playDraw();
      break;
    case 'pass':
      sounds.playPass();
      break;
    case 'win':
      sounds.playWin();
      break;
    case 'block':
      sounds.playBlock();
      break;
  }
}

// إنشاء متحكم اللعبة الأوفلاين
const controller = new OfflineGameController({
  onUpdate: () => render(),
  onSound: playSoundByEvent,
});

// بدء الماتش
controller.resetMatch();

// دالة تصيير الشاشة التفاعلية
function render() {
  const app = document.getElementById('app');
  if (!app) return;

  const userHand = controller.hands[0];
  const isUserTurn = controller.currentTurn === 0 && !controller.matchOver;

  // فحص النقلات القانونية المتاحة ليد اللاعب
  let hasLegalMove = false;
  if (isBoardEmpty(controller.board)) {
    hasLegalMove = controller.roundNumber === 1 && controller.openingTile
      ? userHand.some((t) => tileEquals(t, controller.openingTile!))
      : userHand.length > 0;
  } else {
    hasLegalMove = userHand.some((t) => getPlayableEnds(t, controller.board).length > 0);
  }

  const canDraw = isUserTurn && !hasLegalMove && controller.boneyard.length > 0 && controller.mode === 'INDIVIDUAL_2P';
  const canPass = isUserTurn && !hasLegalMove && (controller.boneyard.length === 0 || controller.mode === 'TEAM_4P');

  // شارات اللاعبين
  let playersLayoutHtml = '';
  if (controller.mode === 'INDIVIDUAL_2P') {
    const opp = controller.getPlayer(1);
    playersLayoutHtml = `
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        ${renderTurnIndicator({
          playerName: opp.name,
          avatarChar: opp.avatarChar,
          isCurrentTurn: controller.currentTurn === 1,
          tileCount: controller.hands[1].length,
          timerSeconds: controller.currentTurn === 1 ? 25 : undefined,
        })}
        <div style="font-size: 13px; color: ${AHWA_COLORS.paleGold}; background: rgba(0,0,0,0.4); padding: 4px 12px; border-radius: 20px; border: 1px solid rgba(212,175,55,0.3);">
          🎲 قطع المخزون المتبقية: <strong>${controller.boneyard.length}</strong>
        </div>
      </div>
    `;
  } else {
    // نمط الزوجي (4 لاعبين)
    const p1 = controller.getPlayer(1); // خصم (يسار)
    const p2 = controller.getPlayer(2); // زميل (فوق)
    const p3 = controller.getPlayer(3); // خصم (يمين)

    playersLayoutHtml = `
      <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
        <!-- الزميل (في الأعلى) -->
        <div style="display: flex; justify-content: center;">
          ${renderTurnIndicator({
            playerName: `${p2.name} (فريقك)`,
            avatarChar: p2.avatarChar,
            isCurrentTurn: controller.currentTurn === 2,
            tileCount: controller.hands[2].length,
            timerSeconds: controller.currentTurn === 2 ? 25 : undefined,
          })}
        </div>
        <!-- الخصمان (يمين ويسار) -->
        <div style="display: flex; justify-content: space-between; align-items: center;">
          ${renderTurnIndicator({
            playerName: `${p1.name} (خصم)`,
            avatarChar: p1.avatarChar,
            isCurrentTurn: controller.currentTurn === 1,
            tileCount: controller.hands[1].length,
            timerSeconds: controller.currentTurn === 1 ? 25 : undefined,
          })}
          <div style="font-size: 13px; color: ${AHWA_COLORS.paleGold}; background: rgba(0,0,0,0.4); padding: 4px 12px; border-radius: 20px; border: 1px solid rgba(212,175,55,0.3);">
            👥 لعب زوجي (بدون سحب)
          </div>
          ${renderTurnIndicator({
            playerName: `${p3.name} (خصم)`,
            avatarChar: p3.avatarChar,
            isCurrentTurn: controller.currentTurn === 3,
            tileCount: controller.hands[3].length,
            timerSeconds: controller.currentTurn === 3 ? 25 : undefined,
          })}
        </div>
      </div>
    `;
  }

  // نوتة الحساب
  let scoreBoardHtml = '';
  if (controller.mode === 'INDIVIDUAL_2P') {
    const s = controller.matchScore as MatchScore2P;
    scoreBoardHtml = renderScoreBoard({
      roundNumber: controller.roundNumber,
      players: [
        { id: 'p0', name: 'أنت', penaltyScore: s.seat0 },
        { id: 'p1', name: 'عم شكشك', penaltyScore: s.seat1 },
      ],
      matchLimit: 101,
    });
  } else {
    const s = controller.matchScore as MatchScore4P;
    scoreBoardHtml = renderScoreBoard({
      roundNumber: controller.roundNumber,
      players: [
        { id: 'teamA', name: 'فريقك (أنت ومحروس)', penaltyScore: s.teamA },
        { id: 'teamB', name: 'فريق شكشك وفوزي', penaltyScore: s.teamB },
      ],
      matchLimit: 101,
    });
  }

  // حساب توزيع سلسلة الدومينو الملتفة (Snake Layout)
  const snakeLayout = computeSnakeLayout(controller.board, 6);
  let chainContentHtml = '';

  if (isBoardEmpty(controller.board)) {
    chainContentHtml = `
      <div style="color: ${AHWA_COLORS.paleGold}; opacity: 0.9; font-size: 16px; margin: auto; text-align: center; background: rgba(0,0,0,0.35); padding: 18px 28px; border-radius: 14px; border: 1.5px dashed rgba(212,175,55,0.45); max-width: 480px;">
        <div style="font-size: 28px; margin-bottom: 8px;">🪑🎲</div>
        <div style="font-weight: 700; font-size: 18px; color: ${AHWA_COLORS.warmGold}; margin-bottom: 6px;">طاولة اللعب خالية</div>
        <div>${controller.statusMessage}</div>
      </div>
    `;
  } else {
    // رسم السلسلة مع إبراز الأطراف المفتوحة والالتفاف الذكي
    const rowsMap = new Map<number, typeof snakeLayout.items>();
    for (const item of snakeLayout.items) {
      if (!rowsMap.has(item.row)) {
        rowsMap.set(item.row, []);
      }
      rowsMap.get(item.row)!.push(item);
    }

    chainContentHtml = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; width: 100%; max-width: 100%; overflow-x: auto; padding: 12px 6px;">
        ${Array.from(rowsMap.entries()).map(([rowIndex, rowItems]) => {
          const isLtr = rowIndex % 2 === 0;
          return `
            <div style="display: flex; align-items: center; justify-content: center; gap: 6px; flex-direction: ${isLtr ? 'row' : 'row-reverse'}; flex-wrap: nowrap;">
              ${rowItems.map((item) => {
                const isSelectedEnd = !!(controller.selectedTile && (item.isFirst || item.isLast));
                const tileMarkup = renderTileSvg({
                  left: item.displayValues[0],
                  right: item.displayValues[1],
                  orientation: item.orientation,
                  size: 'md',
                  state: isSelectedEnd ? 'playable' : 'idle',
                  className: item.isFirst || item.isLast ? 'ahwa-tile-slam-animate' : '',
                });

                return `
                  <div style="display: flex; align-items: center; justify-content: center; transition: transform 0.2s ease; ${isSelectedEnd ? 'filter: drop-shadow(0 0 8px #D4AF37);' : ''}">
                    ${tileMarkup}
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // أهداف الأطراف المفتوحة على سطح الطاولة (Interactive Open End Slots)
  let tableOpenEndsHeaderHtml = '';
  if (!isBoardEmpty(controller.board)) {
    const leftVal = controller.board.leftValue!;
    const rightVal = controller.board.rightValue!;
    const canPlayLeft = controller.selectedTile && getPlayableEnds(controller.selectedTile, controller.board).includes('LEFT');
    const canPlayRight = controller.selectedTile && getPlayableEnds(controller.selectedTile, controller.board).includes('RIGHT');

    tableOpenEndsHeaderHtml = `
      <div style="position: absolute; top: 12px; left: 16px; right: 16px; display: flex; justify-content: space-between; align-items: center; z-index: 20; pointer-events: none;">
        <!-- الطرف الأيمن (LEFT end in logic) -->
        <button id="btn-target-left" class="ahwa-end-target ${canPlayLeft ? 'is-target-active' : ''}"
                style="pointer-events: auto; display: flex; align-items: center; gap: 8px; background: rgba(13,59,46,0.9);
                       border: 2px solid ${canPlayLeft ? AHWA_COLORS.warmGold : 'rgba(212,175,55,0.4)'};
                       border-radius: 20px; padding: 6px 14px; color: ${AHWA_COLORS.paleGold}; cursor: ${canPlayLeft ? 'pointer' : 'default'};
                       box-shadow: ${canPlayLeft ? '0 0 16px rgba(212,175,55,0.8)' : '0 4px 10px rgba(0,0,0,0.5)'};
                       transition: all 0.2s ease;">
          <span style="font-size: 13px; font-weight: 700;">الطرف الأيمن</span>
          <span style="font-size: 18px; font-weight: 900; color: ${AHWA_COLORS.warmGold}; background: rgba(0,0,0,0.5); padding: 2px 8px; border-radius: 8px;">
            ${leftVal}
          </span>
          ${canPlayLeft ? '<span style="font-size: 11px; background: #2E7D32; color: #fff; padding: 2px 6px; border-radius: 4px;">العب هنا</span>' : ''}
        </button>

        <!-- الطرف الأيسر (RIGHT end in logic) -->
        <button id="btn-target-right" class="ahwa-end-target ${canPlayRight ? 'is-target-active' : ''}"
                style="pointer-events: auto; display: flex; align-items: center; gap: 8px; background: rgba(13,59,46,0.9);
                       border: 2px solid ${canPlayRight ? AHWA_COLORS.warmGold : 'rgba(212,175,55,0.4)'};
                       border-radius: 20px; padding: 6px 14px; color: ${AHWA_COLORS.paleGold}; cursor: ${canPlayRight ? 'pointer' : 'default'};
                       box-shadow: ${canPlayRight ? '0 0 16px rgba(212,175,55,0.8)' : '0 4px 10px rgba(0,0,0,0.5)'};
                       transition: all 0.2s ease;">
          ${canPlayRight ? '<span style="font-size: 11px; background: #2E7D32; color: #fff; padding: 2px 6px; border-radius: 4px;">العب هنا</span>' : ''}
          <span style="font-size: 18px; font-weight: 900; color: ${AHWA_COLORS.warmGold}; background: rgba(0,0,0,0.5); padding: 2px 8px; border-radius: 8px;">
            ${rightVal}
          </span>
          <span style="font-size: 13px; font-weight: 700;">الطرف الأيسر</span>
        </button>
      </div>
    `;
  }

  // صينية ورق اللاعب
  const handHtml = userHand
    .map((tile) => {
      let isPlayable = false;
      if (isUserTurn) {
        if (isBoardEmpty(controller.board)) {
          isPlayable = controller.roundNumber === 1 && controller.openingTile
            ? tileEquals(tile, controller.openingTile)
            : true;
        } else {
          isPlayable = getPlayableEnds(tile, controller.board).length > 0;
        }
      }

      const isSelected = controller.selectedTile ? tileEquals(controller.selectedTile, tile) : false;
      const tileState: TileState = isSelected ? 'selected' : isPlayable ? 'playable' : 'disabled';
      const tileIdStr = toTileId(tile);
      const egyptianName = getEgyptianTileName(tile[0], tile[1]);

      const tileMarkup = renderTileSvg({
        left: tile[0],
        right: tile[1],
        orientation: 'vertical',
        size: 'lg',
        state: tileState,
        dataTileId: tileIdStr,
      });

      return `
        <div class="user-hand-tile-wrapper ${isPlayable ? 'is-clickable' : ''} ${isSelected ? 'is-active-selected' : ''}"
             data-id="${tileIdStr}"
             title="${egyptianName} [${tile[0]}|${tile[1]}]"
             style="display: flex; flex-direction: column; align-items: center; gap: 6px;
                    cursor: ${isPlayable ? 'pointer' : 'not-allowed'}; min-width: 56px;
                    touch-action: manipulation; transition: transform 0.15s ease, filter 0.2s ease;
                    transform: ${isSelected ? 'translateY(-10px) scale(1.05)' : 'translateY(0)'};">
          ${tileMarkup}
          <span style="font-size: 11px; font-weight: 700; color: ${isPlayable ? AHWA_COLORS.warmGold : '#aaa'};
                       background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 6px;
                       border: 1px solid ${isPlayable ? 'rgba(212,175,55,0.45)' : 'rgba(255,255,255,0.1)'};
                       white-space: nowrap;">
            ${egyptianName}
          </span>
        </div>
      `;
    })
    .join('');

  // شريط أزرار التحكم
  const drawButtonHtml = renderAhwaButton({
    label: `سحب (${controller.boneyard.length})`,
    variant: 'gold',
    size: 'md',
    disabled: !canDraw,
    id: 'btn-draw',
  });

  const passButtonHtml = renderAhwaButton({
    label: 'تمرير (باص)',
    variant: 'wood',
    size: 'md',
    disabled: !canPass,
    id: 'btn-pass',
  });

  const restartButtonHtml = renderAhwaButton({
    label: 'ماتش جديد',
    variant: 'ghost',
    size: 'sm',
    id: 'btn-restart',
  });

  // نافذة اختيار الطرف عند تحديد بلاطة تنفع للطرفين
  let chooseEndDialogHtml = '';
  if (controller.selectedTile && controller.board.leftValue !== null && controller.board.rightValue !== null) {
    const selectedName = getEgyptianTileName(controller.selectedTile[0], controller.selectedTile[1]);
    chooseEndDialogHtml = `
      <div style="position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%);
                  background: ${AHWA_COLORS.walnutWood}; padding: 14px 22px; border-radius: 16px;
                  border: 2px solid ${AHWA_COLORS.warmGold}; box-shadow: 0 10px 35px rgba(0,0,0,0.9);
                  display: flex; gap: 14px; align-items: center; z-index: 100; max-width: 90%;">
        <span style="font-weight: 700; color: ${AHWA_COLORS.creamPaper}; font-size: 15px; white-space: nowrap;">
          العب ${selectedName} [${controller.selectedTile[0]}|${controller.selectedTile[1]}] على:
        </span>
        <button id="btn-play-left" class="ahwa-btn ahwa-btn-gold ahwa-btn-md" style="min-height: 48px; min-width: 120px;">
          الطرف الأيمن (${controller.board.leftValue})
        </button>
        <button id="btn-play-right" class="ahwa-btn ahwa-btn-gold ahwa-btn-md" style="min-height: 48px; min-width: 120px;">
          الطرف الأيسر (${controller.board.rightValue})
        </button>
        <button id="btn-cancel-select" class="ahwa-btn ahwa-btn-wood ahwa-btn-sm" style="min-height: 48px;">
          إلغاء
        </button>
      </div>
    `;
  }

  // المودال
  let modalHtml = '';
  if (controller.modal) {
    modalHtml = renderAhwaModal({
      title: controller.modal.title,
      subtitle: controller.modal.subtitle,
      bodyHtml: controller.modal.body,
      primaryAction: {
        label: controller.modal.primaryLabel,
        onClickAttr: 'window.__ahwa_onModalPrimary()',
      },
      variant: controller.modal.variant,
      id: 'active-modal',
    });
    (window as unknown as { __ahwa_onModalPrimary: () => void }).__ahwa_onModalPrimary = controller.modal.onPrimary;
  }

  // شريط الأحداث
  const feedHtml = renderMatchFeed({
    events: controller.feedEvents,
    maxItems: 5,
  });

  // التركيب النهائي للواجهة
  app.innerHTML = `
    <!-- الهيدر الرئيسي -->
    <header style="background: rgba(13, 59, 46, 0.98); border-bottom: 2px solid ${AHWA_COLORS.warmGold};
                   padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <h1 style="color: ${AHWA_COLORS.warmGold}; font-weight: 900; font-size: 22px; margin: 0;">${DOMINO_VOCABULARY.gameTitle}</h1>
        <span style="color: ${AHWA_COLORS.creamPaper}; opacity: 0.8; font-size: 13px;">${DOMINO_VOCABULARY.tagline}</span>
      </div>

      <!-- محول نمط اللعب (فردي / زوجي) -->
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="background: rgba(0,0,0,0.4); padding: 3px; border-radius: 10px; display: flex; gap: 4px; border: 1px solid rgba(212,175,55,0.3);">
          <button id="btn-mode-2p" style="background: ${controller.mode === 'INDIVIDUAL_2P' ? AHWA_COLORS.warmGold : 'transparent'};
                                          color: ${controller.mode === 'INDIVIDUAL_2P' ? '#000' : AHWA_COLORS.creamPaper};
                                          border: none; border-radius: 7px; padding: 6px 12px; font-weight: 700; font-size: 12px; cursor: pointer;">
            فردي (2P)
          </button>
          <button id="btn-mode-4p" style="background: ${controller.mode === 'TEAM_4P' ? AHWA_COLORS.warmGold : 'transparent'};
                                          color: ${controller.mode === 'TEAM_4P' ? '#000' : AHWA_COLORS.creamPaper};
                                          border: none; border-radius: 7px; padding: 6px 12px; font-weight: 700; font-size: 12px; cursor: pointer;">
            زوجي (4P)
          </button>
        </div>
        ${restartButtonHtml}
      </div>
    </header>

    <!-- منطقة اللعب الرئيسية -->
    <main style="flex: 1; display: flex; flex-direction: column; padding: 12px; max-width: 1320px; width: 100%; margin: 0 auto; gap: 12px;">
      
      <!-- شريط معلومات اللاعبين ولوحة الحساب -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 300px;">
          ${playersLayoutHtml}
        </div>
        <div style="min-width: 280px;">
          ${scoreBoardHtml}
        </div>
      </div>

      <!-- بانر حالة الدور الحالي -->
      <div style="background: rgba(0,0,0,0.4); border: 1.5px solid ${isUserTurn ? AHWA_COLORS.warmGold : 'rgba(255,255,255,0.15)'};
                  border-radius: 10px; padding: 10px 16px; text-align: center; font-size: 15px; font-weight: 700;
                  color: ${isUserTurn ? AHWA_COLORS.paleGold : '#bbb'}; box-shadow: 0 4px 12px rgba(0,0,0,0.35);">
        📢 ${controller.statusMessage || (isUserTurn ? 'دورك للعب!' : 'دور الخصم...')}
      </div>

      <!-- طاولة الدومينو التراثية الكبرى (مع خوارزمية الالتفاف الذكي Snake Layout) -->
      <div style="flex: 1; min-height: 380px; background: radial-gradient(circle, ${AHWA_COLORS.tableGreen} 0%, ${AHWA_COLORS.darkGreen} 100%);
                  border: 8px solid ${AHWA_COLORS.walnutWood}; border-radius: 20px;
                  box-shadow: inset 0 0 60px rgba(0,0,0,0.85), 0 10px 30px rgba(0,0,0,0.6);
                  position: relative; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px;">
        
        ${tableOpenEndsHeaderHtml}

        <!-- حاوية السلسلة -->
        ${chainContentHtml}

        ${chooseEndDialogHtml}
      </div>

      <!-- صينية ورق اللاعب وأزرار السحب والتمرير -->
      <div style="background: rgba(0,0,0,0.4); border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 10px; border: 1.5px solid rgba(212, 175, 55, 0.3);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          ${renderTurnIndicator({
            playerName: 'أنت (معلم الطاولة)',
            avatarChar: 'أ',
            isCurrentTurn: isUserTurn,
            tileCount: userHand.length,
            timerSeconds: isUserTurn ? 30 : undefined,
          })}
          <div style="display: flex; gap: 10px; align-items: center;">
            ${drawButtonHtml}
            ${passButtonHtml}
          </div>
        </div>

        <!-- أوراق اليد مع أسمائها المصرية الشعبية وحجم مناسب للمس (Touch Targets) -->
        <div style="display: flex; gap: 12px; overflow-x: auto; padding: 10px 6px; justify-content: center; align-items: center; min-height: 145px; -webkit-overflow-scrolling: touch;">
          ${handHtml}
        </div>
      </div>

      <!-- شريط الأحداث المباشر -->
      <div>
        ${feedHtml}
      </div>
    </main>

    ${modalHtml}
  `;

  // ربط الأحداث
  document.getElementById('btn-mode-2p')?.addEventListener('click', () => {
    if (controller.mode !== 'INDIVIDUAL_2P') controller.setGameMode('INDIVIDUAL_2P');
  });

  document.getElementById('btn-mode-4p')?.addEventListener('click', () => {
    if (controller.mode !== 'TEAM_4P') controller.setGameMode('TEAM_4P');
  });

  document.getElementById('btn-draw')?.addEventListener('click', () => controller.handlePlayerDraw());
  document.getElementById('btn-pass')?.addEventListener('click', () => controller.handlePlayerPass());
  document.getElementById('btn-restart')?.addEventListener('click', () => controller.resetMatch());

  // النقر على بلاطات اليد
  document.querySelectorAll('.user-hand-tile-wrapper').forEach((el) => {
    const tileId = el.getAttribute('data-id');
    const tile = userHand.find((t) => toTileId(t) === tileId);
    if (!tile) return;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      controller.handlePlayerTileClick(tile);
    });
  });

  // النقر على أهداف الأطراف المفتوحة على سطح الطاولة مباشرة
  document.getElementById('btn-target-left')?.addEventListener('click', () => {
    if (controller.selectedTile) {
      controller.playPlayerMove(controller.selectedTile, 'LEFT');
    }
  });

  document.getElementById('btn-target-right')?.addEventListener('click', () => {
    if (controller.selectedTile) {
      controller.playPlayerMove(controller.selectedTile, 'RIGHT');
    }
  });

  // أزرار الحوار السفلي لاختيار الطرف
  document.getElementById('btn-play-left')?.addEventListener('click', () => {
    if (controller.selectedTile) controller.playPlayerMove(controller.selectedTile, 'LEFT');
  });

  document.getElementById('btn-play-right')?.addEventListener('click', () => {
    if (controller.selectedTile) controller.playPlayerMove(controller.selectedTile, 'RIGHT');
  });

  document.getElementById('btn-cancel-select')?.addEventListener('click', () => {
    controller.selectedTile = null;
    render();
  });
}

// بدء التصيير الأول
render();
