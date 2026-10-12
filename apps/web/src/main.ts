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
  type TileId,
  type SeatIndex,
  tileEquals,
} from '@ahwtna/shared';

import { getPlayableEnds, isBoardEmpty } from '@ahwtna/game-engine';
import { computeSnakeLayout } from './layout/snake-layout.js';
import { OfflineGameController, type SoundEffect } from './controllers/offline-game-controller.js';
import { OnlineGameClient } from './controllers/online-game-client.js';
import { renderHomeScreen, type HomeScreenState } from './screens/home-screen.js';
import { renderLobbyScreen } from './screens/lobby-screen.js';

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

// إدارة شاشات التطبيق
type AppScreen = 'HOME' | 'LOBBY' | 'DOMINO_TABLE';
let currentScreen: AppScreen = 'HOME';
let gameModeType: 'OFFLINE' | 'ONLINE' = 'OFFLINE';
let isScoreBoardOpen = false;
let onlineSelectedTile: Tile | null = null;

const homeState: HomeScreenState = {
  playerName: typeof localStorage !== 'undefined' ? (localStorage.getItem('ahwtna_player_name') || 'صبحي') : 'صبحي',
  playerTitle: typeof localStorage !== 'undefined' ? (localStorage.getItem('ahwtna_player_title') || 'المعلم') : 'المعلم',
  activeModal: 'NONE',
  generatedRoomCode: 'AHW-709',
};

// إنشاء متحكم اللعبة الأوفلاين
const controller = new OfflineGameController({
  onUpdate: () => render(),
  onSound: playSoundByEvent,
});

// بدء الماتش
controller.resetMatch();

// إنشاء عميل اللعبة الأونلاين
const onlineClient = new OnlineGameClient({
  autoConnect: false,
  onSound: playSoundByEvent,
});

onlineClient.subscribe(() => {
  if (gameModeType === 'ONLINE') {
    if (currentScreen === 'LOBBY' && onlineClient.gameView && onlineClient.gameView.phase === 'PLAYING') {
      currentScreen = 'DOMINO_TABLE';
    }
    render();
  }
});

// دالة الموزع الرئيسي للشاشات
function render() {
  const app = document.getElementById('app');
  if (!app) return;

  if (currentScreen === 'HOME') {
    renderHomeView(app);
  } else if (currentScreen === 'LOBBY') {
    renderLobbyView(app);
  } else {
    if (gameModeType === 'OFFLINE') {
      renderDominoTableView(app);
    } else {
      renderOnlineDominoTableView(app);
    }
  }
}

// دالة تصيير الشاشة الرئيسية (بوابة القهوة المصرية)
function renderHomeView(app: HTMLElement) {
  app.innerHTML = renderHomeScreen(homeState, {
    onStartOffline2P: () => {
      gameModeType = 'OFFLINE';
      controller.setGameMode('INDIVIDUAL_2P');
      controller.resetMatch();
      currentScreen = 'DOMINO_TABLE';
      render();
    },
    onStartOffline4P: () => {
      gameModeType = 'OFFLINE';
      controller.setGameMode('TEAM_4P');
      controller.resetMatch();
      currentScreen = 'DOMINO_TABLE';
      render();
    },
    onCreateOnlineRoom: async (mode) => {
      try {
        gameModeType = 'ONLINE';
        await onlineClient.createRoom(homeState.playerName, mode);
        homeState.activeModal = 'NONE';
        currentScreen = 'LOBBY';
        render();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : String(err));
      }
    },
    onJoinOnlineRoom: async (code) => {
      try {
        gameModeType = 'ONLINE';
        await onlineClient.joinRoom(code, homeState.playerName);
        homeState.activeModal = 'NONE';
        currentScreen = 'LOBBY';
        render();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : String(err));
      }
    },
  });

  // ربط أحداث الشاشة الرئيسية
  document.getElementById('btn-open-edit-name')?.addEventListener('click', () => {
    homeState.activeModal = 'CHANGE_NAME';
    render();
  });

  document.getElementById('btn-open-vocab-modal')?.addEventListener('click', () => {
    homeState.activeModal = 'VOCABULARY';
    render();
  });

  document.getElementById('btn-open-create-room-modal')?.addEventListener('click', () => {
    homeState.generatedRoomCode = `AHW-${Math.floor(100 + Math.random() * 900)}`;
    homeState.activeModal = 'CREATE_ROOM';
    render();
  });

  document.getElementById('btn-open-join-room-modal')?.addEventListener('click', () => {
    homeState.activeModal = 'JOIN_ROOM';
    render();
  });

  document.getElementById('btn-close-modal')?.addEventListener('click', () => {
    homeState.activeModal = 'NONE';
    render();
  });

  document.getElementById('modal-backdrop')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'modal-backdrop') {
      homeState.activeModal = 'NONE';
      render();
    }
  });

  document.getElementById('btn-save-name')?.addEventListener('click', () => {
    const titleEl = document.getElementById('input-player-title') as HTMLSelectElement | null;
    const nameEl = document.getElementById('input-player-name') as HTMLInputElement | null;
    if (titleEl && nameEl) {
      homeState.playerTitle = titleEl.value;
      homeState.playerName = nameEl.value.trim() || 'صبحي';
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ahwtna_player_title', homeState.playerTitle);
        localStorage.setItem('ahwtna_player_name', homeState.playerName);
      }
    }
    homeState.activeModal = 'NONE';
    render();
  });

  document.getElementById('btn-copy-room-code')?.addEventListener('click', () => {
    const code = homeState.generatedRoomCode || 'AHW-709';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    const btn = document.getElementById('btn-copy-room-code');
    if (btn) btn.innerText = 'تم نسخ الكود بنجاح! ✓';
  });

  document.getElementById('btn-start-offline-2p')?.addEventListener('click', () => {
    controller.setGameMode('INDIVIDUAL_2P');
    controller.resetMatch();
    currentScreen = 'DOMINO_TABLE';
    render();
  });

  document.getElementById('btn-start-offline-4p')?.addEventListener('click', () => {
    controller.setGameMode('TEAM_4P');
    controller.resetMatch();
    currentScreen = 'DOMINO_TABLE';
    render();
  });

  document.getElementById('btn-confirm-create-2p')?.addEventListener('click', async () => {
    try {
      gameModeType = 'ONLINE';
      await onlineClient.createRoom(homeState.playerName, 'INDIVIDUAL_2P');
      homeState.activeModal = 'NONE';
      currentScreen = 'LOBBY';
      render();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  });

  document.getElementById('btn-confirm-create-4p')?.addEventListener('click', async () => {
    try {
      gameModeType = 'ONLINE';
      await onlineClient.createRoom(homeState.playerName, 'TEAM_4P');
      homeState.activeModal = 'NONE';
      currentScreen = 'LOBBY';
      render();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  });

  document.getElementById('btn-confirm-join')?.addEventListener('click', async () => {
    const input = document.getElementById('input-join-code') as HTMLInputElement | null;
    const code = input?.value.trim().toUpperCase();
    if (!code) {
      alert('من فضلك اكتب كود الترابيزة أولاً!');
      return;
    }
    try {
      gameModeType = 'ONLINE';
      await onlineClient.joinRoom(code, homeState.playerName);
      homeState.activeModal = 'NONE';
      currentScreen = 'LOBBY';
      render();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  });
}

// دالة تصيير شاشة صالة الانتظار (اللوبي) للغرف الأونلاين
function renderLobbyView(app: HTMLElement) {
  if (!onlineClient.currentRoom) {
    currentScreen = 'HOME';
    render();
    return;
  }

  app.innerHTML = renderLobbyScreen(onlineClient.currentRoom, onlineClient.myPlayer);

  document.getElementById('btn-leave-lobby')?.addEventListener('click', async () => {
    try {
      await onlineClient.leaveRoom();
    } catch {
      // تجاهل أي خطأ عند مغادرة الغرفة
    }
    currentScreen = 'HOME';
    render();
  });

  document.getElementById('btn-copy-code')?.addEventListener('click', () => {
    if (onlineClient.currentRoom) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(onlineClient.currentRoom.roomId).catch(() => {});
      }
      const btn = document.getElementById('btn-copy-code');
      if (btn) btn.innerText = '✓ تم النسخ!';
    }
  });

  document.getElementById('btn-toggle-ready')?.addEventListener('click', async () => {
    const currentReady = onlineClient.myPlayer?.isReady ?? false;
    try {
      await onlineClient.toggleReady(!currentReady);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  });

  document.querySelectorAll('.btn-choose-seat').forEach((el) => {
    el.addEventListener('click', async (e) => {
      const seatStr = (e.currentTarget as HTMLElement).getAttribute('data-seat');
      if (seatStr !== null) {
        const seat = parseInt(seatStr, 10) as SeatIndex;
        try {
          await onlineClient.chooseSeat(seat);
        } catch (err: unknown) {
          alert(err instanceof Error ? err.message : String(err));
        }
      }
    });
  });
}

// دالة تصيير شاشة طاولة الدومينو التفاعلية
function renderDominoTableView(app: HTMLElement) {

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
      <div style="display: flex; align-items: center; width: 100%;">
        ${renderTurnIndicator({
          playerName: opp.name,
          avatarChar: opp.avatarChar,
          isCurrentTurn: controller.currentTurn === 1,
          tileCount: controller.hands[1].length,
          timerSeconds: controller.currentTurn === 1 ? 25 : undefined,
        })}
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

  // كومة ورق المخزون المقلوب على ضهره (يسار الطاولة)
  let boneyardPileHtml = '';
  if (controller.mode === 'INDIVIDUAL_2P') {
    const boneyardCount = controller.boneyard.length;
    if (boneyardCount > 0) {
      const stackDepth = Math.min(Math.max(1, Math.ceil(boneyardCount / 3)), 5);
      let shadowLayers = '';
      for (let s = 1; s < stackDepth; s++) {
        shadowLayers += `
          <div style="position: absolute; left: ${s * 2}px; top: ${s * 2}px; width: 32px; height: 64px;
                      border-radius: 6px; background: ${AHWA_COLORS.walnutWood}; border: 1px solid rgba(212,175,55,0.4);
                      box-shadow: 1px 1px 3px rgba(0,0,0,0.5); pointer-events: none;"></div>
        `;
      }

      const faceDownTileSvg = renderTileSvg({
        left: 0,
        right: 0,
        orientation: 'vertical',
        size: 'sm',
        faceDown: true,
      });

      boneyardPileHtml = `
        <div id="boneyard-pile-container"
             title="${canDraw ? 'اضغط هنا لسحب بلاطة من المخزون' : `المخزون (${boneyardCount})`}"
             style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); z-index: 35;
                    display: flex; flex-direction: column; align-items: center; gap: 6px;
                    background: rgba(0,0,0,0.55); padding: 8px 10px; border-radius: 14px;
                    border: 1.5px solid ${canDraw ? AHWA_COLORS.warmGold : 'rgba(212,175,55,0.3)'};
                    box-shadow: ${canDraw ? '0 0 18px rgba(212,175,55,0.7)' : '0 6px 16px rgba(0,0,0,0.5)'};
                    cursor: ${canDraw ? 'pointer' : 'default'}; transition: all 0.2s ease;">
          <span style="font-size: 11px; font-weight: 800; color: ${AHWA_COLORS.warmGold}; white-space: nowrap;">
            🎲 المخزون: <strong style="font-size: 15px; color: #FFF;">${boneyardCount}</strong>
          </span>

          <div style="position: relative; width: 36px; height: 68px; margin: 4px 0;">
            ${shadowLayers}
            <div style="position: absolute; left: 0; top: 0; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.8));">
              ${faceDownTileSvg}
            </div>
          </div>

          ${canDraw ? `
            <span style="font-size: 10px; font-weight: 800; color: #FFF; background: #2E7D32; padding: 2px 6px; border-radius: 4px; animation: ahwa-pulse 1.3s infinite ease-in-out; white-space: nowrap;">
              اسحب 👆
            </span>
          ` : `
            <span style="font-size: 10px; color: #aaa; white-space: nowrap;">
              على ضهره
            </span>
          `}
        </div>
      `;
    } else {
      boneyardPileHtml = `
        <div style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); z-index: 35;
                    display: flex; flex-direction: column; align-items: center; gap: 4px;
                    background: rgba(0,0,0,0.35); padding: 8px 10px; border-radius: 14px;
                    border: 1.5px dashed rgba(212,175,55,0.35);">
          <span style="font-size: 10px; color: #aaa; font-weight: 700;">المخزون خلص</span>
          <div style="width: 32px; height: 64px; border: 1.5px dashed #555; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #888;">
            خالي
          </div>
        </div>
      `;
    }
  }

  // حساب توزيع سلسلة الدومينو المتصلة ببعضها (Connected Snake Layout)
  const snakeLayout = computeSnakeLayout(controller.board, 4, 'sm');
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
    // رسم السلسلة المتصلة هندسياً بالكامل حيث كل بلاطة تلمس البلاطة التالية وتلف معها عند الحواف
    const ghostSlotsHtml = (() => {
      if (!controller.selectedTile || isBoardEmpty(controller.board)) return '';
      const playableEnds = getPlayableEnds(controller.selectedTile, controller.board);
      let slots = '';

      if (playableEnds.includes('LEFT') && snakeLayout.leftTarget) {
        slots += `
          <button id="ghost-slot-left" class="ahwa-dashed-ghost-slot"
                  title="العب على هذا الطرف (${snakeLayout.leftTarget.value})"
                  style="position: absolute; left: ${snakeLayout.leftTarget.x}px; top: ${snakeLayout.leftTarget.y}px;
                         width: ${snakeLayout.leftTarget.width}px; height: ${snakeLayout.leftTarget.height}px;
                         display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
                         z-index: 60; cursor: pointer; border-radius: 8px; animation: ahwa-pulse-slot 1.3s infinite ease-in-out;">
            <span style="font-weight: 900; font-size: 16px; color: ${AHWA_COLORS.warmGold}; text-shadow: 0 1px 4px #000;">
              ${snakeLayout.leftTarget.value}
            </span>
            <span style="font-size: 9px; font-weight: 700; color: #FFF; background: #2E7D32; padding: 1px 5px; border-radius: 4px; pointer-events: none;">
              العب هنا
            </span>
          </button>
        `;
      }

      if (playableEnds.includes('RIGHT') && snakeLayout.rightTarget) {
        slots += `
          <button id="ghost-slot-right" class="ahwa-dashed-ghost-slot"
                  title="العب على هذا الطرف (${snakeLayout.rightTarget.value})"
                  style="position: absolute; left: ${snakeLayout.rightTarget.x}px; top: ${snakeLayout.rightTarget.y}px;
                         width: ${snakeLayout.rightTarget.width}px; height: ${snakeLayout.rightTarget.height}px;
                         display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
                         z-index: 60; cursor: pointer; border-radius: 8px; animation: ahwa-pulse-slot 1.3s infinite ease-in-out;">
            <span style="font-weight: 900; font-size: 16px; color: ${AHWA_COLORS.warmGold}; text-shadow: 0 1px 4px #000;">
              ${snakeLayout.rightTarget.value}
            </span>
            <span style="font-size: 9px; font-weight: 700; color: #FFF; background: #2E7D32; padding: 1px 5px; border-radius: 4px; pointer-events: none;">
              العب هنا
            </span>
          </button>
        `;
      }

      return slots;
    })();

    chainContentHtml = `
      <div style="width: 100%; height: 100%; overflow: auto; display: flex; align-items: center; justify-content: center; padding: 20px 10px;">
        <div class="ahwa-board-canvas" style="position: relative; width: ${Math.max(snakeLayout.totalWidth, 280)}px; height: ${Math.max(snakeLayout.totalHeight, 160)}px; min-width: ${Math.max(snakeLayout.totalWidth, 280)}px; min-height: ${Math.max(snakeLayout.totalHeight, 160)}px; transition: all 0.3s ease;">
          ${snakeLayout.tiles.map((item) => {
            const isSelectedEnd = !!(controller.selectedTile && (item.isFirst || item.isLast));
            const tileMarkup = renderTileSvg({
              left: item.displayValues[0],
              right: item.displayValues[1],
              orientation: item.orientation,
              size: 'sm',
              state: isSelectedEnd ? 'playable' : 'idle',
              className: item.isFirst || item.isLast ? 'ahwa-tile-slam-animate' : '',
            });

            return `
              <div style="position: absolute; left: ${item.x}px; top: ${item.y}px; width: ${item.width}px; height: ${item.height}px;
                          display: flex; align-items: center; justify-content: center;
                          transition: all 0.25s ease; ${isSelectedEnd ? 'filter: drop-shadow(0 0 12px #D4AF37); z-index: 10;' : ''}">
                ${tileMarkup}
              </div>
            `;
          }).join('')}
          ${ghostSlotsHtml}
        </div>
      </div>
    `;
  }

  // شارات الأطراف المفتوحة أعلى الطاولة للعلم بالقيم المفتوحة
  let tableOpenEndsHeaderHtml = '';
  if (!isBoardEmpty(controller.board)) {
    const leftVal = controller.board.leftValue!;
    const rightVal = controller.board.rightValue!;

    tableOpenEndsHeaderHtml = `
      <div style="position: absolute; top: 12px; left: 16px; right: 16px; display: flex; justify-content: space-between; align-items: center; z-index: 20; pointer-events: none;">
        <div style="display: flex; align-items: center; gap: 8px; background: rgba(13,59,46,0.92);
                    border: 1.5px solid rgba(212,175,55,0.45); border-radius: 16px; padding: 4px 12px; color: ${AHWA_COLORS.paleGold};">
          <span style="font-size: 12px; font-weight: 700;">طرف الطاولة:</span>
          <span style="font-size: 16px; font-weight: 900; color: ${AHWA_COLORS.warmGold}; background: rgba(0,0,0,0.5); padding: 1px 7px; border-radius: 6px;">
            ${leftVal}
          </span>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; background: rgba(13,59,46,0.92);
                    border: 1.5px solid rgba(212,175,55,0.45); border-radius: 16px; padding: 4px 12px; color: ${AHWA_COLORS.paleGold};">
          <span style="font-size: 16px; font-weight: 900; color: ${AHWA_COLORS.warmGold}; background: rgba(0,0,0,0.5); padding: 1px 7px; border-radius: 6px;">
            ${rightVal}
          </span>
          <span style="font-size: 12px; font-weight: 700;">طرف الطاولة:</span>
        </div>
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

      <!-- زر الرجوع للقهوة وشارة نمط اللعب وزر ماتش جديد -->
      <div style="display: flex; align-items: center; gap: 10px;">
        <button id="btn-back-to-home" style="background: rgba(0,0,0,0.5); color: ${AHWA_COLORS.warmGold};
                border: 1.5px solid rgba(212,175,55,0.45); border-radius: 9px; padding: 6px 14px; font-weight: 800;
                font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s ease;">
          🏠 العودة للقهوة
        </button>
        <div style="background: rgba(0,0,0,0.5); color: ${AHWA_COLORS.paleGold}; border: 1.5px solid rgba(212,175,55,0.4);
                    border-radius: 20px; padding: 5px 14px; font-size: 13px; font-weight: 800; display: flex; align-items: center; gap: 6px;">
          <span>${controller.mode === 'INDIVIDUAL_2P' ? '🎲 فردي (2P)' : '👥 زوجي (4P)'}</span>
        </div>
        ${restartButtonHtml}
      </div>
    </header>

    <!-- منطقة اللعب الرئيسية -->
    <main style="flex: 1; display: flex; flex-direction: column; padding: 12px; max-width: 1320px; width: 100%; margin: 0 auto; gap: 12px;">
      
      <!-- شريط معلومات اللاعبين وزر نوتة الحساب القابلة للفتح والغلق -->
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 260px;">
          ${playersLayoutHtml}
        </div>
        <div>
          <button id="btn-toggle-scoreboard" style="display: flex; align-items: center; gap: 8px; background: rgba(13, 59, 46, 0.95);
                         border: 1.5px solid ${AHWA_COLORS.warmGold}; border-radius: 14px; padding: 6px 14px; color: ${AHWA_COLORS.paleGold};
                         cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.4); transition: all 0.2s ease;">
            <span style="font-size: 18px;">📝</span>
            <span style="font-weight: 800; font-size: 13px;">نوتة الحساب (101)</span>
            <span style="font-size: 11px; background: rgba(0,0,0,0.5); color: ${AHWA_COLORS.warmGold}; padding: 2px 8px; border-radius: 6px; font-weight: 800;">
              ${controller.mode === 'INDIVIDUAL_2P'
                ? `أنت: ${(controller.matchScore as MatchScore2P).seat0} | شكشك: ${(controller.matchScore as MatchScore2P).seat1}`
                : `فريقك: ${(controller.matchScore as MatchScore4P).teamA} | الخصم: ${(controller.matchScore as MatchScore4P).teamB}`}
            </span>
            <span style="font-size: 12px; color: ${AHWA_COLORS.warmGold}; font-weight: 700;">${isScoreBoardOpen ? '▲ إغلاق' : '▼ فتح'}</span>
          </button>
        </div>
      </div>

      <!-- نوتة الحساب المنبثقة عند النقر -->
      ${isScoreBoardOpen ? `
        <div id="scoreboard-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 999;
                    display: flex; align-items: center; justify-content: center; padding: 16px;">
          <div style="position: relative; max-width: 360px; width: 100%; animation: ahwa-tile-slam 0.2s ease;">
            <button id="btn-close-scoreboard" style="position: absolute; top: -12px; left: -12px; background: #C62828; color: #FFF;
                           border: 2px solid #FFF; border-radius: 50%; width: 32px; height: 32px; font-size: 16px; cursor: pointer;
                           font-weight: 900; z-index: 20; box-shadow: 0 4px 10px rgba(0,0,0,0.6);">✕</button>
            ${scoreBoardHtml}
          </div>
        </div>
      ` : ''}

      <!-- بانر حالة الدور الحالي -->
      <div style="background: rgba(0,0,0,0.4); border: 1.5px solid ${isUserTurn ? AHWA_COLORS.warmGold : 'rgba(255,255,255,0.15)'};
                  border-radius: 10px; padding: 10px 16px; text-align: center; font-size: 15px; font-weight: 700;
                  color: ${isUserTurn ? AHWA_COLORS.paleGold : '#bbb'}; box-shadow: 0 4px 12px rgba(0,0,0,0.35);">
        📢 ${controller.statusMessage || (isUserTurn ? 'دورك للعب!' : 'دور الخصم...')}
      </div>

      <!-- طاولة الدومينو التراثية الكبرى (مع خوارزمية الالتفاف الذكي Snake Layout والمربعات المنقطة) -->
      <div class="ahwa-board-felt" style="flex: 1; min-height: 380px; background: radial-gradient(circle, ${AHWA_COLORS.tableGreen} 0%, ${AHWA_COLORS.darkGreen} 100%);
                  border: 8px solid ${AHWA_COLORS.walnutWood}; border-radius: 20px;
                  box-shadow: inset 0 0 60px rgba(0,0,0,0.85), 0 10px 30px rgba(0,0,0,0.6);
                  position: relative; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; cursor: default;">
        
        ${tableOpenEndsHeaderHtml}

        <!-- كومة ورق المخزون المقلوب على ضهره (يسار الطاولة) -->
        ${boneyardPileHtml}

        <!-- حاوية السلسلة مع المربعات المنقطة على الطاولة مباشرة -->
        ${chainContentHtml}
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
  document.getElementById('btn-draw')?.addEventListener('click', () => controller.handlePlayerDraw());
  document.getElementById('btn-pass')?.addEventListener('click', () => controller.handlePlayerPass());
  document.getElementById('btn-restart')?.addEventListener('click', () => controller.resetMatch());

  // نوتة الحساب القابلة للفتح والغلق
  document.getElementById('btn-toggle-scoreboard')?.addEventListener('click', () => {
    isScoreBoardOpen = !isScoreBoardOpen;
    render();
  });

  document.getElementById('btn-close-scoreboard')?.addEventListener('click', () => {
    isScoreBoardOpen = false;
    render();
  });

  document.getElementById('scoreboard-backdrop')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'scoreboard-backdrop') {
      isScoreBoardOpen = false;
      render();
    }
  });

  // النقر على كومة المخزون على شمال الطاولة للسحب المباشر
  document.getElementById('boneyard-pile-container')?.addEventListener('click', () => {
    if (canDraw) {
      controller.handlePlayerDraw();
    }
  });

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

  // النقر على المربعات المنقطة على الطاولة مباشرة (Dashed Ghost Slots on Table)
  document.getElementById('ghost-slot-left')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (controller.selectedTile) {
      controller.playPlayerMove(controller.selectedTile, 'LEFT');
    }
  });

  document.getElementById('ghost-slot-right')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (controller.selectedTile) {
      controller.playPlayerMove(controller.selectedTile, 'RIGHT');
    }
  });

  // زر العودة للشاشة الرئيسية
  document.getElementById('btn-back-to-home')?.addEventListener('click', () => {
    currentScreen = 'HOME';
    render();
  });

  // النقر على أرضية الطاولة لإلغاء التحديد
  document.querySelector('.ahwa-board-felt')?.addEventListener('click', () => {
    if (controller.selectedTile) {
      controller.selectedTile = null;
      render();
    }
  });
}

// دالة تصيير طاولة الدومينو الأونلاين (Multiplayer Online Domino Table)
function renderOnlineDominoTableView(app: HTMLElement) {
  if (!onlineClient.gameView) {
    app.innerHTML = `
      <div style="min-height: 100vh; background: radial-gradient(circle at top, #164032 0%, #0D261E 50%, #081914 100%);
                  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; color: ${AHWA_COLORS.creamPaper}; font-family: 'Cairo', sans-serif;">
        <div style="font-size: 40px; animation: ahwa-pulse 1.2s infinite ease-in-out;">⏳🪑</div>
        <h2 style="color: ${AHWA_COLORS.warmGold}; margin: 0;">في انتظار بداية الجولة...</h2>
        <p style="opacity: 0.8; margin: 0;">يقوم خادم القهوة بتجهيز الورق وتوزيعه بالعدل والسرية التامة</p>
        <button id="btn-back-to-lobby" style="background: rgba(0,0,0,0.5); color: ${AHWA_COLORS.paleGold}; border: 1.5px solid rgba(212,175,55,0.4);
                       border-radius: 8px; padding: 8px 20px; font-weight: 800; cursor: pointer;">
          العودة للغرفة
        </button>
      </div>
    `;
    document.getElementById('btn-back-to-lobby')?.addEventListener('click', () => {
      currentScreen = 'LOBBY';
      render();
    });
    return;
  }

  const view = onlineClient.gameView;
  const mySeat = view.mySeat;
  const userHand = view.myHand;
  const isUserTurn = view.currentTurnSeat === mySeat && view.phase === 'PLAYING';
  const is2P = (onlineClient.currentRoom?.mode ?? 'INDIVIDUAL_2P') === 'INDIVIDUAL_2P';

  const canDraw = isUserTurn && view.canDraw;
  const canPass = isUserTurn && view.canPass;

  // شارات اللاعبين
  let playersLayoutHtml = '';
  if (is2P) {
    const opp = view.players.find((p) => p.seat !== mySeat);
    const oppName = opp?.displayName || 'الخصم';
    const isOppTurn = view.currentTurnSeat === opp?.seat && view.phase === 'PLAYING';
    const oppTileCount = opp?.tileCount ?? 0;

    playersLayoutHtml = `
      <div style="display: flex; align-items: center; width: 100%;">
        ${renderTurnIndicator({
          playerName: oppName,
          avatarChar: oppName.charAt(0) || 'خ',
          isCurrentTurn: isOppTurn,
          tileCount: oppTileCount,
          timerSeconds: isOppTurn ? onlineClient.turnTimeRemaining : undefined,
        })}
      </div>
    `;
  } else {
    const pPartnerSeat = ((mySeat + 2) % 4) as SeatIndex;
    const pLeftSeat = ((mySeat + 1) % 4) as SeatIndex;
    const pRightSeat = ((mySeat + 3) % 4) as SeatIndex;

    const partnerPlayer = view.players.find((p) => p.seat === pPartnerSeat);
    const leftPlayer = view.players.find((p) => p.seat === pLeftSeat);
    const rightPlayer = view.players.find((p) => p.seat === pRightSeat);

    playersLayoutHtml = `
      <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
        <!-- الزميل (في الأعلى) -->
        <div style="display: flex; justify-content: center;">
          ${renderTurnIndicator({
            playerName: `${partnerPlayer?.displayName || 'زميلك'} (فريقك)`,
            avatarChar: (partnerPlayer?.displayName || 'ز').charAt(0),
            isCurrentTurn: view.currentTurnSeat === pPartnerSeat && view.phase === 'PLAYING',
            tileCount: partnerPlayer?.tileCount ?? 0,
            timerSeconds: view.currentTurnSeat === pPartnerSeat && view.phase === 'PLAYING' ? onlineClient.turnTimeRemaining : undefined,
          })}
        </div>
        <!-- الخصمان (يمين ويسار) -->
        <div style="display: flex; justify-content: space-between; align-items: center;">
          ${renderTurnIndicator({
            playerName: `${leftPlayer?.displayName || 'خصم'} (خصم)`,
            avatarChar: (leftPlayer?.displayName || 'خ').charAt(0),
            isCurrentTurn: view.currentTurnSeat === pLeftSeat && view.phase === 'PLAYING',
            tileCount: leftPlayer?.tileCount ?? 0,
            timerSeconds: view.currentTurnSeat === pLeftSeat && view.phase === 'PLAYING' ? onlineClient.turnTimeRemaining : undefined,
          })}
          <div style="font-size: 13px; color: ${AHWA_COLORS.paleGold}; background: rgba(0,0,0,0.4); padding: 4px 12px; border-radius: 20px; border: 1px solid rgba(212,175,55,0.3);">
            👥 لعب زوجي أونلاين (بدون سحب)
          </div>
          ${renderTurnIndicator({
            playerName: `${rightPlayer?.displayName || 'خصم'} (خصم)`,
            avatarChar: (rightPlayer?.displayName || 'خ').charAt(0),
            isCurrentTurn: view.currentTurnSeat === pRightSeat && view.phase === 'PLAYING',
            tileCount: rightPlayer?.tileCount ?? 0,
            timerSeconds: view.currentTurnSeat === pRightSeat && view.phase === 'PLAYING' ? onlineClient.turnTimeRemaining : undefined,
          })}
        </div>
      </div>
    `;
  }

  // نوتة الحساب
  let scoreBoardHtml = '';
  if (is2P) {
    const s = view.matchScore as MatchScore2P;
    const p0Name = view.players.find((p) => p.seat === 0)?.displayName || 'المقعد 1';
    const p1Name = view.players.find((p) => p.seat === 1)?.displayName || 'المقعد 2';
    scoreBoardHtml = renderScoreBoard({
      roundNumber: view.roundNumber,
      players: [
        { id: 'p0', name: p0Name, penaltyScore: s.seat0 },
        { id: 'p1', name: p1Name, penaltyScore: s.seat1 },
      ],
      matchLimit: 101,
    });
  } else {
    const s = view.matchScore as MatchScore4P;
    scoreBoardHtml = renderScoreBoard({
      roundNumber: view.roundNumber,
      players: [
        { id: 'teamA', name: 'فريق أ (مقعد 1 و 3)', penaltyScore: s.teamA },
        { id: 'teamB', name: 'فريق ب (مقعد 2 و 4)', penaltyScore: s.teamB },
      ],
      matchLimit: 101,
    });
  }

  // كومة ورق المخزون (فقط في نمط الفردي 2P)
  let boneyardPileHtml = '';
  if (is2P) {
    const bCount = view.boneyardCount;
    if (bCount > 0) {
      const faceDownTileSvg = renderTileSvg({
        left: 0,
        right: 0,
        orientation: 'vertical',
        size: 'sm',
        faceDown: true,
      });

      boneyardPileHtml = `
        <div id="online-boneyard-pile"
             title="${canDraw ? 'اضغط هنا لسحب بلاطة من المخزون' : `المخزون (${bCount})`}"
             style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); z-index: 35;
                    display: flex; flex-direction: column; align-items: center; gap: 6px;
                    background: rgba(0,0,0,0.55); padding: 8px 10px; border-radius: 14px;
                    border: 1.5px solid ${canDraw ? AHWA_COLORS.warmGold : 'rgba(212,175,55,0.3)'};
                    box-shadow: ${canDraw ? '0 0 18px rgba(212,175,55,0.7)' : '0 6px 16px rgba(0,0,0,0.5)'};
                    cursor: ${canDraw ? 'pointer' : 'default'}; transition: all 0.2s ease;">
          <span style="font-size: 11px; font-weight: 800; color: ${AHWA_COLORS.warmGold}; white-space: nowrap;">
            🎲 المخزون: <strong style="font-size: 15px; color: #FFF;">${bCount}</strong>
          </span>

          <div style="position: relative; width: 36px; height: 68px; margin: 4px 0;">
            <div style="position: absolute; left: 0; top: 0; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.8));">
              ${faceDownTileSvg}
            </div>
          </div>

          ${canDraw ? `
            <span style="font-size: 10px; font-weight: 800; color: #FFF; background: #2E7D32; padding: 2px 6px; border-radius: 4px; animation: ahwa-pulse 1.3s infinite ease-in-out; white-space: nowrap;">
              اسحب 👆
            </span>
          ` : `
            <span style="font-size: 10px; color: #aaa; white-space: nowrap;">
              على ضهره
            </span>
          `}
        </div>
      `;
    }
  }

  // حساب توزيع سلسلة الدومينو المتصلة ببعضها (Connected Snake Layout)
  const snakeLayout = computeSnakeLayout(view.board, 4, 'sm');
  let ghostSlotsHtml = '';

  if (onlineSelectedTile && !isBoardEmpty(view.board)) {
    const playableEnds = getPlayableEnds(onlineSelectedTile, view.board);

    if (playableEnds.includes('LEFT') && snakeLayout.leftTarget) {
      ghostSlotsHtml += `
        <button id="online-ghost-slot-left" class="ahwa-dashed-ghost-slot"
                title="العب على هذا الطرف (${snakeLayout.leftTarget.value})"
                style="position: absolute; left: ${snakeLayout.leftTarget.x}px; top: ${snakeLayout.leftTarget.y}px;
                       width: ${snakeLayout.leftTarget.width}px; height: ${snakeLayout.leftTarget.height}px;
                       display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
                       z-index: 60; cursor: pointer; border-radius: 8px; animation: ahwa-pulse-slot 1.3s infinite ease-in-out;">
          <span style="font-weight: 900; font-size: 16px; color: ${AHWA_COLORS.warmGold}; text-shadow: 0 1px 4px #000;">
            ${snakeLayout.leftTarget.value}
          </span>
          <span style="font-size: 9px; font-weight: 700; color: #FFF; background: #2E7D32; padding: 1px 5px; border-radius: 4px; pointer-events: none;">
            العب هنا
          </span>
        </button>
      `;
    }

    if (playableEnds.includes('RIGHT') && snakeLayout.rightTarget) {
      ghostSlotsHtml += `
        <button id="online-ghost-slot-right" class="ahwa-dashed-ghost-slot"
                title="العب على هذا الطرف (${snakeLayout.rightTarget.value})"
                style="position: absolute; left: ${snakeLayout.rightTarget.x}px; top: ${snakeLayout.rightTarget.y}px;
                       width: ${snakeLayout.rightTarget.width}px; height: ${snakeLayout.rightTarget.height}px;
                       display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
                       z-index: 60; cursor: pointer; border-radius: 8px; animation: ahwa-pulse-slot 1.3s infinite ease-in-out;">
          <span style="font-weight: 900; font-size: 16px; color: ${AHWA_COLORS.warmGold}; text-shadow: 0 1px 4px #000;">
            ${snakeLayout.rightTarget.value}
          </span>
          <span style="font-size: 9px; font-weight: 700; color: #FFF; background: #2E7D32; padding: 1px 5px; border-radius: 4px; pointer-events: none;">
            العب هنا
          </span>
        </button>
      `;
    }
  }

  let chainContentHtml = '';
  if (isBoardEmpty(view.board)) {
    chainContentHtml = `
      <div style="color: ${AHWA_COLORS.paleGold}; opacity: 0.9; font-size: 16px; margin: auto; text-align: center; background: rgba(0,0,0,0.35); padding: 18px 28px; border-radius: 14px; border: 1.5px dashed rgba(212,175,55,0.45); max-width: 480px;">
        <div style="font-size: 28px; margin-bottom: 8px;">🪑🎲</div>
        <div style="font-weight: 700; font-size: 18px; color: ${AHWA_COLORS.warmGold}; margin-bottom: 6px;">طاولة اللعب خالية</div>
        <div>${isUserTurn ? 'طاولة اللعب خالية — دورك لافتتاح اللعب!' : 'طاولة اللعب خالية — في انتظار أول حركة...'}</div>
      </div>
    `;
  } else {
    chainContentHtml = `
      <div style="width: 100%; height: 100%; overflow: auto; display: flex; align-items: center; justify-content: center; padding: 20px 10px;">
        <div class="ahwa-board-canvas" style="position: relative; width: ${Math.max(snakeLayout.totalWidth, 280)}px; height: ${Math.max(snakeLayout.totalHeight, 160)}px; min-width: ${Math.max(snakeLayout.totalWidth, 280)}px; min-height: ${Math.max(snakeLayout.totalHeight, 160)}px; transition: all 0.3s ease;">
          ${snakeLayout.tiles.map((item) => {
            const isSelectedEnd = !!(onlineSelectedTile && (item.isFirst || item.isLast));
            const tileMarkup = renderTileSvg({
              left: item.displayValues[0],
              right: item.displayValues[1],
              orientation: item.orientation,
              size: 'sm',
              state: isSelectedEnd ? 'playable' : 'idle',
              className: item.isFirst || item.isLast ? 'ahwa-tile-slam-animate' : '',
            });

            return `
              <div style="position: absolute; left: ${item.x}px; top: ${item.y}px; width: ${item.width}px; height: ${item.height}px;
                          display: flex; align-items: center; justify-content: center;
                          transition: all 0.25s ease; ${isSelectedEnd ? 'filter: drop-shadow(0 0 12px #D4AF37); z-index: 10;' : ''}">
                ${tileMarkup}
              </div>
            `;
          }).join('')}
          ${ghostSlotsHtml}
        </div>
      </div>
    `;
  }

  // شارات الأطراف المفتوحة أعلى الطاولة
  let tableOpenEndsHeaderHtml = '';
  if (!isBoardEmpty(view.board)) {
    const leftVal = view.board.leftValue!;
    const rightVal = view.board.rightValue!;

    tableOpenEndsHeaderHtml = `
      <div style="position: absolute; top: 12px; left: 16px; right: 16px; display: flex; justify-content: space-between; align-items: center; z-index: 20; pointer-events: none;">
        <div style="display: flex; align-items: center; gap: 8px; background: rgba(13,59,46,0.92);
                    border: 1.5px solid rgba(212,175,55,0.45); border-radius: 16px; padding: 4px 12px; color: ${AHWA_COLORS.paleGold};">
          <span style="font-size: 12px; font-weight: 700;">طرف الطاولة:</span>
          <span style="font-size: 16px; font-weight: 900; color: ${AHWA_COLORS.warmGold}; background: rgba(0,0,0,0.5); padding: 1px 7px; border-radius: 6px;">
            ${leftVal}
          </span>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; background: rgba(13,59,46,0.92);
                    border: 1.5px solid rgba(212,175,55,0.45); border-radius: 16px; padding: 4px 12px; color: ${AHWA_COLORS.paleGold};">
          <span style="font-size: 16px; font-weight: 900; color: ${AHWA_COLORS.warmGold}; background: rgba(0,0,0,0.5); padding: 1px 7px; border-radius: 6px;">
            ${rightVal}
          </span>
          <span style="font-size: 12px; font-weight: 700;">طرف الطاولة:</span>
        </div>
      </div>
    `;
  }

  // صينية ورق اللاعب
  const handHtml = userHand
    .map((tile) => {
      const tileIdStr = toTileId(tile) as TileId;
      const isPlayable = isUserTurn && view.legalMoveTileIds.includes(tileIdStr);
      const isSelected = onlineSelectedTile ? tileEquals(onlineSelectedTile, tile) : false;
      const tileState: TileState = isSelected ? 'selected' : isPlayable ? 'playable' : 'disabled';
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
        <div class="online-hand-tile-wrapper ${isPlayable ? 'is-clickable' : ''} ${isSelected ? 'is-active-selected' : ''}"
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
    label: `سحب (${view.boneyardCount})`,
    variant: 'gold',
    size: 'md',
    disabled: !canDraw,
    id: 'btn-online-draw',
  });

  const passButtonHtml = renderAhwaButton({
    label: 'تمرير (باص)',
    variant: 'wood',
    size: 'md',
    disabled: !canPass,
    id: 'btn-online-pass',
  });

  // المودال عند نهاية الجولة أو الماتش
  let modalHtml = '';
  if (view.phase === 'ROUND_ENDED') {
    modalHtml = renderAhwaModal({
      title: 'نهاية الجولة!',
      subtitle: 'تم احتساب نقاط الجولة رسمياً عبر الخادم',
      bodyHtml: `
        <div style="text-align: center; font-size: 15px; color: ${AHWA_COLORS.paleGold}; line-height: 1.8;">
          ${is2P
            ? `النتيجة الحالية: مقعد 1 (${(view.matchScore as MatchScore2P).seat0}) | مقعد 2 (${(view.matchScore as MatchScore2P).seat1})`
            : `النتيجة الحالية: فريق أ (${(view.matchScore as MatchScore4P).teamA}) | فريق ب (${(view.matchScore as MatchScore4P).teamB})`}
          <div style="margin-top: 10px; font-size: 13px; color: #FFF; opacity: 0.85;">
            اضغط على الزر أدناه لتأكيد الجاهزية للجولة القادمة
          </div>
        </div>
      `,
      primaryAction: {
        label: 'أنا جاهز للجولة القادمة ⚡',
        onClickAttr: 'window.__ahwa_onOnlineReadyNext()',
      },
      variant: 'gold',
      id: 'active-modal',
    });
    (window as unknown as { __ahwa_onOnlineReadyNext: () => void }).__ahwa_onOnlineReadyNext = () => {
      onlineClient.toggleReady(true);
    };
  } else if (view.phase === 'MATCH_ENDED') {
    modalHtml = renderAhwaModal({
      title: '👑 نهاية الماتش!',
      subtitle: 'تجاوز أحد الأطراف حد الـ 101 نقطة جزاء',
      bodyHtml: `
        <div style="text-align: center; font-size: 16px; color: ${AHWA_COLORS.warmGold}; font-weight: 800; line-height: 1.8;">
          مبروك للفائزين وهارد لك للخاسرين في قهوتنا!
        </div>
      `,
      primaryAction: {
        label: 'العودة للقهوة 🏠',
        onClickAttr: 'window.__ahwa_onOnlineBackHome()',
      },
      variant: 'gold',
      id: 'active-modal',
    });
    (window as unknown as { __ahwa_onOnlineBackHome: () => void }).__ahwa_onOnlineBackHome = async () => {
      await onlineClient.leaveRoom();
      currentScreen = 'HOME';
      render();
    };
  }

  // شريط الأحداث
  const feedHtml = renderMatchFeed({
    events: onlineClient.getUiFeedEvents(),
    maxItems: 5,
  });

  // اسم اللاعب الحالي في شارة الدور
  const myDisplayName = onlineClient.myPlayer?.displayName || 'أنت';

  app.innerHTML = `
    <!-- الهيدر الرئيسي -->
    <header style="background: rgba(13, 59, 46, 0.98); border-bottom: 2px solid ${AHWA_COLORS.warmGold};
                   padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <h1 style="color: ${AHWA_COLORS.warmGold}; font-weight: 900; font-size: 22px; margin: 0;">${DOMINO_VOCABULARY.gameTitle}</h1>
        <span style="color: ${AHWA_COLORS.creamPaper}; opacity: 0.8; font-size: 13px;">طاولة أونلاين (${onlineClient.currentRoom?.roomId || ''})</span>
      </div>

      <div style="display: flex; align-items: center; gap: 10px;">
        <button id="btn-online-back-home" style="background: rgba(0,0,0,0.5); color: ${AHWA_COLORS.warmGold};
                border: 1.5px solid rgba(212,175,55,0.45); border-radius: 9px; padding: 6px 14px; font-weight: 800;
                font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s ease;">
          🏠 مغادرة الطاولة
        </button>
        <div style="background: rgba(0,0,0,0.5); color: ${AHWA_COLORS.paleGold}; border: 1.5px solid rgba(212,175,55,0.4);
                    border-radius: 20px; padding: 5px 14px; font-size: 13px; font-weight: 800; display: flex; align-items: center; gap: 6px;">
          <span>${is2P ? '🎲 أونلاين فردي (2P)' : '👥 أونلاين زوجي (4P)'}</span>
        </div>
      </div>
    </header>

    <!-- منطقة اللعب الرئيسية -->
    <main style="flex: 1; display: flex; flex-direction: column; padding: 12px; max-width: 1320px; width: 100%; margin: 0 auto; gap: 12px;">
      
      <!-- شريط معلومات اللاعبين وزر نوتة الحساب -->
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 260px;">
          ${playersLayoutHtml}
        </div>
        <div>
          <button id="btn-toggle-scoreboard" style="display: flex; align-items: center; gap: 8px; background: rgba(13, 59, 46, 0.95);
                         border: 1.5px solid ${AHWA_COLORS.warmGold}; border-radius: 14px; padding: 6px 14px; color: ${AHWA_COLORS.paleGold};
                         cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.4); transition: all 0.2s ease;">
            <span style="font-size: 18px;">📝</span>
            <span style="font-weight: 800; font-size: 13px;">نوتة الحساب (101)</span>
            <span style="font-size: 11px; background: rgba(0,0,0,0.5); color: ${AHWA_COLORS.warmGold}; padding: 2px 8px; border-radius: 6px; font-weight: 800;">
              ${is2P
                ? `مقعد 1: ${(view.matchScore as MatchScore2P).seat0} | مقعد 2: ${(view.matchScore as MatchScore2P).seat1}`
                : `فريق أ: ${(view.matchScore as MatchScore4P).teamA} | فريق ب: ${(view.matchScore as MatchScore4P).teamB}`}
            </span>
            <span style="font-size: 12px; color: ${AHWA_COLORS.warmGold}; font-weight: 700;">${isScoreBoardOpen ? '▲ إغلاق' : '▼ فتح'}</span>
          </button>
        </div>
      </div>

      <!-- نوتة الحساب المنبثقة -->
      ${isScoreBoardOpen ? `
        <div id="scoreboard-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 999;
                    display: flex; align-items: center; justify-content: center; padding: 16px;">
          <div style="position: relative; max-width: 360px; width: 100%; animation: ahwa-tile-slam 0.2s ease;">
            <button id="btn-close-scoreboard" style="position: absolute; top: -12px; left: -12px; background: #C62828; color: #FFF;
                           border: 2px solid #FFF; border-radius: 50%; width: 32px; height: 32px; font-size: 16px; cursor: pointer;
                           font-weight: 900; z-index: 20; box-shadow: 0 4px 10px rgba(0,0,0,0.6);">✕</button>
            ${scoreBoardHtml}
          </div>
        </div>
      ` : ''}

      <!-- بانر حالة الدور الحالي -->
      <div style="background: rgba(0,0,0,0.4); border: 1.5px solid ${isUserTurn ? AHWA_COLORS.warmGold : 'rgba(255,255,255,0.15)'};
                  border-radius: 10px; padding: 10px 16px; text-align: center; font-size: 15px; font-weight: 700;
                  color: ${isUserTurn ? AHWA_COLORS.paleGold : '#bbb'}; box-shadow: 0 4px 12px rgba(0,0,0,0.35);">
        📢 ${isUserTurn ? `دورك للعب يا معلم! (متبقي ${onlineClient.turnTimeRemaining} ثانية)` : `في انتظار دور الخصم... (متبقي ${onlineClient.turnTimeRemaining} ثانية)`}
      </div>

      <!-- طاولة الدومينو التراثية -->
      <div class="ahwa-board-felt" style="flex: 1; min-height: 380px; background: radial-gradient(circle, ${AHWA_COLORS.tableGreen} 0%, ${AHWA_COLORS.darkGreen} 100%);
                  border: 8px solid ${AHWA_COLORS.walnutWood}; border-radius: 20px;
                  box-shadow: inset 0 0 60px rgba(0,0,0,0.85), 0 10px 30px rgba(0,0,0,0.6);
                  position: relative; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; cursor: default;">
        
        ${tableOpenEndsHeaderHtml}
        ${boneyardPileHtml}
        ${chainContentHtml}
      </div>

      <!-- صينية ورق اللاعب وأزرار السحب والتمرير -->
      <div style="background: rgba(0,0,0,0.4); border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 10px; border: 1.5px solid rgba(212, 175, 55, 0.3);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          ${renderTurnIndicator({
            playerName: `${myDisplayName} (أنت)`,
            avatarChar: myDisplayName.charAt(0) || 'أ',
            isCurrentTurn: isUserTurn,
            tileCount: userHand.length,
            timerSeconds: isUserTurn ? onlineClient.turnTimeRemaining : undefined,
          })}
          <div style="display: flex; gap: 10px; align-items: center;">
            ${drawButtonHtml}
            ${passButtonHtml}
          </div>
        </div>

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

  // ربط أحداث الأزرار الأونلاين
  document.getElementById('btn-online-draw')?.addEventListener('click', async () => {
    try {
      await onlineClient.sendDrawTile();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  });

  document.getElementById('btn-online-pass')?.addEventListener('click', async () => {
    try {
      await onlineClient.sendPass();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  });

  document.getElementById('online-boneyard-pile')?.addEventListener('click', async () => {
    if (canDraw) {
      try {
        await onlineClient.sendDrawTile();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : String(err));
      }
    }
  });

  document.getElementById('btn-online-back-home')?.addEventListener('click', async () => {
    try {
      await onlineClient.leaveRoom();
    } catch {
      // ignore
    }
    currentScreen = 'HOME';
    render();
  });

  // نوتة الحساب
  document.getElementById('btn-toggle-scoreboard')?.addEventListener('click', () => {
    isScoreBoardOpen = !isScoreBoardOpen;
    render();
  });

  document.getElementById('btn-close-scoreboard')?.addEventListener('click', () => {
    isScoreBoardOpen = false;
    render();
  });

  document.getElementById('scoreboard-backdrop')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'scoreboard-backdrop') {
      isScoreBoardOpen = false;
      render();
    }
  });

  // النقر على بلاطات اليد
  document.querySelectorAll('.online-hand-tile-wrapper').forEach((el) => {
    const tileId = el.getAttribute('data-id');
    const tile = userHand.find((t) => toTileId(t) === tileId);
    if (!tile || !isUserTurn) return;

    el.addEventListener('click', async (e) => {
      e.stopPropagation();

      if (isBoardEmpty(view.board)) {
        try {
          await onlineClient.sendPlayTile(toTileId(tile) as TileId, 'LEFT');
        } catch (err: unknown) {
          alert(err instanceof Error ? err.message : String(err));
        }
        return;
      }

      const ends = getPlayableEnds(tile, view.board);
      if (ends.length === 1) {
        try {
          await onlineClient.sendPlayTile(toTileId(tile) as TileId, ends[0]!);
        } catch (err: unknown) {
          alert(err instanceof Error ? err.message : String(err));
        }
      } else if (ends.length === 2) {
        onlineSelectedTile = onlineSelectedTile && tileEquals(onlineSelectedTile, tile) ? null : tile;
        render();
      }
    });
  });

  // النقر على المربعات المنقطة على الطاولة
  document.getElementById('online-ghost-slot-left')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (onlineSelectedTile) {
      const tileToPlay = onlineSelectedTile;
      onlineSelectedTile = null;
      try {
        await onlineClient.sendPlayTile(toTileId(tileToPlay) as TileId, 'LEFT');
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : String(err));
      }
    }
  });

  document.getElementById('online-ghost-slot-right')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (onlineSelectedTile) {
      const tileToPlay = onlineSelectedTile;
      onlineSelectedTile = null;
      try {
        await onlineClient.sendPlayTile(toTileId(tileToPlay) as TileId, 'RIGHT');
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : String(err));
      }
    }
  });

  // النقر على أرضية الطاولة لإلغاء التحديد
  document.querySelector('.ahwa-board-felt')?.addEventListener('click', () => {
    if (onlineSelectedTile) {
      onlineSelectedTile = null;
      render();
    }
  });
}

// بدء التصيير الأول
render();
