import {
  injectAhwaStyles,
  AHWA_COLORS,
  DOMINO_VOCABULARY,
  renderTileSvg,
  renderAhwaButton,
  renderTurnIndicator,
  renderScoreBoard,
  renderAhwaModal,
  renderMatchFeed,
  type MatchFeedEvent,
  type TileState,
} from '@ahwtna/ui';

import {
  createEmptyBoard,
  isBoardEmpty,
  getPlayableEnds,
  executePlayerMove,
  dealInitialTiles,
  determineFirstRoundOpener,
  chooseAIMove,
  isGameBlocked,
  calculateDominoOutResult,
  calculateBlockedGameResult,
  applyRoundScoreAndCheckMatchEnd,
  type MoveContext,
} from '@ahwtna/game-engine';

import {
  type BoardEnd,
  type BoardState,
  type MatchScore2P,
  type SeatIndex,
  type Tile,
  tileEquals,
} from '@ahwtna/shared';

const toTileId = (t: Tile): string => `${t[0]}|${t[1]}`;

// حقن الأنماط التراثية للقهوة المصرية
injectAhwaStyles();

// الصوتيات التفاعلية (Web Audio API)
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
    osc.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  playDraw() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.13);
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
}

const sounds = new SoundEngine();

// حالة المباراة
interface WebGameState {
  board: BoardState;
  p0Hand: Tile[];
  p1Hand: Tile[];
  boneyard: Tile[];
  currentTurn: SeatIndex;
  roundNumber: number;
  matchScore: MatchScore2P;
  matchOver: boolean;
  openingTile: Tile | null;
  feedEvents: MatchFeedEvent[];
  selectedTile: Tile | null;
  statusMessage: string;
  modal: {
    title: string;
    subtitle: string;
    body: string;
    primaryLabel: string;
    onPrimary: () => void;
    variant: 'gold' | 'success' | 'danger';
  } | null;
}

const state: WebGameState = {
  board: createEmptyBoard(),
  p0Hand: [],
  p1Hand: [],
  boneyard: [],
  currentTurn: 0,
  roundNumber: 1,
  matchScore: { seat0: 0, seat1: 0 },
  matchOver: false,
  openingTile: null,
  feedEvents: [],
  selectedTile: null,
  statusMessage: '',
  modal: null,
};

function addFeedEvent(type: MatchFeedEvent['type'], text: string) {
  const d = new Date();
  const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  state.feedEvents.push({
    id: Math.random().toString(36).substring(2),
    timestamp: time,
    type,
    text,
  });
}

function startNewRound() {
  const deal = dealInitialTiles('INDIVIDUAL_2P');

  state.board = createEmptyBoard();
  state.p0Hand = [...(deal.hands[0] ?? [])];
  state.p1Hand = [...(deal.hands[1] ?? [])];
  state.boneyard = [...deal.boneyard];
  state.selectedTile = null;
  state.modal = null;

  if (state.roundNumber === 1) {
    const opener = determineFirstRoundOpener(deal.hands);
    state.openingTile = opener.startingTile;
    state.currentTurn = opener.starterSeat;
    if (opener.starterSeat === 0) {
      state.statusMessage = `دورك تفتتح الطاولة بأعلى دوش [${opener.startingTile[0]}|${opener.startingTile[1]}]!`;
      addFeedEvent('SYSTEM', `بدء الجولة 1: معك أعلى دوش [${opener.startingTile[0]}|${opener.startingTile[1]}]! اضغط عليه للبدء.`);
    } else {
      state.statusMessage = `عم شكشك معه أعلى دوش [${opener.startingTile[0]}|${opener.startingTile[1]}] وسيفتتح الطاولة...`;
      addFeedEvent('SYSTEM', `بدء الجولة 1: عم شكشك معه أعلى دوش [${opener.startingTile[0]}|${opener.startingTile[1]}] وسيبدأ.`);
    }
  } else {
    state.openingTile = null;
    state.statusMessage = `بدء الجولة ${state.roundNumber}: ${state.currentTurn === 0 ? 'دورك تفتتح الطاولة بأي بلاطة' : 'دور عم شكشك يبدأ'}`;
    addFeedEvent('SYSTEM', `بدء الجولة ${state.roundNumber}: كل لاعب جهز ورقه.`);
  }

  render();

  if (state.currentTurn === 1) {
    setTimeout(triggerAIMove, 1000);
  }
}

function resetMatch() {
  state.roundNumber = 1;
  state.matchScore = { seat0: 0, seat1: 0 };
  state.matchOver = false;
  state.feedEvents = [];
  addFeedEvent('SYSTEM', 'طاولة جديدة! أهلاً بكم في قهوتنا.');
  startNewRound();
}

function checkEndOfRound(): boolean {
  const handsRecord: Record<SeatIndex, readonly Tile[]> = {
    0: state.p0Hand,
    1: state.p1Hand,
    2: [],
    3: [],
  };

  // 1. خروج أحد اللاعبين (دومينو!)
  if (state.p0Hand.length === 0 || state.p1Hand.length === 0) {
    sounds.playWin();
    const winner: SeatIndex = state.p0Hand.length === 0 ? 0 : 1;
    const roundRes = calculateDominoOutResult(winner, 'INDIVIDUAL_2P', handsRecord, state.roundNumber);
    const scoreUpdate = applyRoundScoreAndCheckMatchEnd(state.matchScore, roundRes, 'INDIVIDUAL_2P');
    state.matchScore = scoreUpdate.updatedScore as MatchScore2P;

    addFeedEvent('DOMINO', winner === 0 ? 'دومينو! أنت أنهيت ورقك أولاً.' : 'دومينو! عم شكشك أنهى ورقه أولاً.');

    if (scoreUpdate.isMatchOver) {
      state.matchOver = true;
      const matchWinner = state.matchScore.seat0 >= 101 ? 'عم شكشك' : 'أنت';
      state.modal = {
        title: 'نهاية المباراة!',
        subtitle: `مبروك ${matchWinner}! الخاسر تجاوز حد الـ 101 نقطة جزاء.`,
        body: `<p>الرصيد النهائي: أنت: <strong>${state.matchScore.seat0}</strong> | عم شكشك: <strong>${state.matchScore.seat1}</strong></p>`,
        primaryLabel: 'ماتش جديد',
        onPrimary: resetMatch,
        variant: 'gold',
      };
    } else {
      state.modal = {
        title: 'دومينو!',
        subtitle: winner === 0 ? 'أحسنت! أنهيت ورقك أولاً' : 'عم شكشك قفل الجولة بالدومينو!',
        body: `<p>نقاط الجزاء المضافة: ${roundRes.penaltyPoints} نقطة على الخاسر.<br>رصيدك: <strong>${state.matchScore.seat0}</strong> | رصيد الخصم: <strong>${state.matchScore.seat1}</strong></p>`,
        primaryLabel: 'الجولة التالية',
        onPrimary: () => {
          state.roundNumber++;
          state.currentTurn = winner;
          startNewRound();
        },
        variant: winner === 0 ? 'success' : 'danger',
      };
    }
    render();
    return true;
  }

  // 2. القفلة (Blocked Game)
  if (state.boneyard.length === 0 && isGameBlocked(state.board, handsRecord)) {
    sounds.playSlam();
    const roundRes = calculateBlockedGameResult('INDIVIDUAL_2P', handsRecord, state.roundNumber);
    const scoreUpdate = applyRoundScoreAndCheckMatchEnd(state.matchScore, roundRes, 'INDIVIDUAL_2P');
    state.matchScore = scoreUpdate.updatedScore as MatchScore2P;

    addFeedEvent('BLOCKED', 'القفلة! لا توجد حركات قانونية لأي لاعب.');

    if (scoreUpdate.isMatchOver) {
      state.matchOver = true;
      const matchWinner = state.matchScore.seat0 >= 101 ? 'عم شكشك' : 'أنت';
      state.modal = {
        title: 'نهاية المباراة!',
        subtitle: `مبروك ${matchWinner}! الخاسر تجاوز حد الـ 101 نقطة.`,
        body: `<p>الرصيد النهائي: أنت: <strong>${state.matchScore.seat0}</strong> | عم شكشك: <strong>${state.matchScore.seat1}</strong></p>`,
        primaryLabel: 'ماتش جديد',
        onPrimary: resetMatch,
        variant: 'gold',
      };
    } else {
      const outcomeText = roundRes.isTie
        ? 'تعادل في مجموع القطع! 0 نقاط لكلا الطرفين.'
        : roundRes.winnerSeat === 0
        ? `أنت صاحب المجموع الأقل! حصلت على ${roundRes.penaltyPoints} نقطة جزاء ضد الخصم.`
        : `عم شكشك صاحب المجموع الأقل! حصل على ${roundRes.penaltyPoints} نقطة جزاء ضدك.`;

      state.modal = {
        title: 'القفلة!',
        subtitle: 'اللعب اتقفل على الطاولة',
        body: `<p>${outcomeText}<br>رصيدك: <strong>${state.matchScore.seat0}</strong> | رصيد الخصم: <strong>${state.matchScore.seat1}</strong></p>`,
        primaryLabel: 'الجولة التالية',
        onPrimary: () => {
          state.roundNumber++;
          if (roundRes.winnerSeat !== undefined) {
            state.currentTurn = roundRes.winnerSeat;
          }
          startNewRound();
        },
        variant: 'gold',
      };
    }
    render();
    return true;
  }

  return false;
}

function triggerAIMove() {
  if (state.currentTurn !== 1 || state.matchOver) return;

  // إذا كانت الطاولة فارغة في الجولة الأولى: الـ AI يبدأ بقطعة البداية المحددة
  if (isBoardEmpty(state.board) && state.roundNumber === 1 && state.openingTile) {
    const starter = state.openingTile;
    sounds.playSlam();
    const moveCtx: MoveContext = {
      phase: 'PLAYING',
      activeSeat: 1,
      hand: state.p1Hand,
      board: state.board,
    };
    const moveRes = executePlayerMove(1, starter, 'LEFT', moveCtx);
    state.board = moveRes.newBoard;
    state.p1Hand = [...moveRes.newHand];
    addFeedEvent('PLAY', `عم شكشك افتتح الطاولة بأعلى دوش [${starter[0]}|${starter[1]}]`);
    state.currentTurn = 0;
    state.statusMessage = 'دورك الآن — العب بلاطة تطابق أحد طرفي الطاولة!';
    render();
    return;
  }

  const decision = chooseAIMove({
    seat: 1,
    hand: state.p1Hand,
    board: state.board,
    mode: 'INDIVIDUAL_2P',
    boneyardCount: state.boneyard.length,
  });

  if (decision.action === 'PLAY' && decision.tile && decision.targetEnd) {
    sounds.playSlam();
    const playedTile = decision.tile;
    const moveCtx: MoveContext = {
      phase: 'PLAYING',
      activeSeat: 1,
      hand: state.p1Hand,
      board: state.board,
    };
    const moveRes = executePlayerMove(1, playedTile, decision.targetEnd, moveCtx);
    state.board = moveRes.newBoard;
    state.p1Hand = [...moveRes.newHand];
    addFeedEvent('PLAY', `عم شكشك لعب [${playedTile[0]}|${playedTile[1]}] على ${decision.targetEnd === 'LEFT' ? 'الطرف الأيمن' : 'الطرف الأيسر'}`);

    if (checkEndOfRound()) return;

    state.currentTurn = 0;
    state.statusMessage = 'دورك — اختر بلاطة للعب!';
    render();
  } else if (decision.action === 'DRAW') {
    if (state.boneyard.length > 0) {
      sounds.playDraw();
      const drawn = state.boneyard.pop()!;
      state.p1Hand.push(drawn);
      addFeedEvent('DRAW', 'عم شكشك سحب بلاطة من المخزون');
      state.statusMessage = 'عم شكشك سحب بلاطة...';
      render();
      setTimeout(triggerAIMove, 700);
    } else {
      addFeedEvent('PASS', 'عم شكشك باصى لعدم وجود قطع في المخزون');
      state.currentTurn = 0;
      state.statusMessage = 'عم شكشك باصى! الدور عندك.';
      render();
    }
  } else if (decision.action === 'PASS') {
    addFeedEvent('PASS', 'عم شكشك باصى (تمرير الدور)');
    state.currentTurn = 0;
    state.statusMessage = 'عم شكشك مرر الدور! دورك للعب.';
    render();
  }
}

function handleTileClick(tile: Tile) {
  if (state.matchOver) return;

  if (state.currentTurn !== 0) {
    state.statusMessage = 'انتظر دورك! عم شكشك بيفكر في نقلته...';
    render();
    return;
  }

  // في الجولة الأولى والطاولة فارغة: يجب البدء بقطعة البداية المعتمدة
  if (state.roundNumber === 1 && isBoardEmpty(state.board) && state.openingTile) {
    if (!tileEquals(tile, state.openingTile)) {
      state.statusMessage = `قواعد الدومينو: لازم تبدأ بأعلى دوش معاك [${state.openingTile[0]}|${state.openingTile[1]}]!`;
      addFeedEvent('SYSTEM', `تنبيه: لازم تلعب [${state.openingTile[0]}|${state.openingTile[1]}] لافتتاح الجولة.`);
      render();
      return;
    }
    playPlayerTile(tile, 'LEFT');
    return;
  }

  // إذا كانت الطاولة فارغة في أي جولة تالية
  if (isBoardEmpty(state.board)) {
    playPlayerTile(tile, 'LEFT');
    return;
  }

  const ends = getPlayableEnds(tile, state.board);
  if (ends.length === 0) {
    state.statusMessage = `البلاطة [${tile[0]}|${tile[1]}] لا تطابق أي طرف مفتوح (${state.board.leftValue} أو ${state.board.rightValue}).`;
    render();
    return;
  }

  if (ends.length === 1) {
    playPlayerTile(tile, ends[0]!);
  } else {
    // تطابق كلا الطرفين: نعرض نافذة الاختيار
    state.selectedTile = tile;
    state.statusMessage = `اختر الطرف المطلوب للعب [${tile[0]}|${tile[1]}]`;
    render();
  }
}

function playPlayerTile(tile: Tile, end: BoardEnd) {
  sounds.playSlam();
  const moveCtx: MoveContext = {
    phase: 'PLAYING',
    activeSeat: 0,
    hand: state.p0Hand,
    board: state.board,
  };
  const moveRes = executePlayerMove(0, tile, end, moveCtx);
  state.board = moveRes.newBoard;
  state.p0Hand = [...moveRes.newHand];
  state.selectedTile = null;

  addFeedEvent('PLAY', `أنت لعبت [${tile[0]}|${tile[1]}] على ${end === 'LEFT' ? 'الطرف الأيمن' : 'الطرف الأيسر'}`);

  if (checkEndOfRound()) return;

  state.currentTurn = 1;
  state.statusMessage = 'عم شكشك يفكر في نقلته...';
  render();
  setTimeout(triggerAIMove, 900);
}

function handlePlayerDraw() {
  if (state.currentTurn !== 0 || state.matchOver) return;
  if (state.boneyard.length === 0) return;

  sounds.playDraw();
  const drawn = state.boneyard.pop()!;
  state.p0Hand.push(drawn);
  addFeedEvent('DRAW', `سحبت بلاطة [${drawn[0]}|${drawn[1]}] من المخزون`);
  state.statusMessage = `سحبت [${drawn[0]}|${drawn[1]}] — هل تناسب اللعب الآن؟`;

  render();
}

function handlePlayerPass() {
  if (state.currentTurn !== 0 || state.matchOver) return;
  addFeedEvent('PASS', 'أنت مررت الدور (باص)');
  state.currentTurn = 1;
  state.statusMessage = 'مررت الدور — عم شكشك يلعب...';
  render();
  setTimeout(triggerAIMove, 900);
}

// رسم واجهة المستخدم بالكامل
function render() {
  const app = document.getElementById('app');
  if (!app) return;

  // فحص النقلات القانونية
  let hasLegalMove = false;
  if (isBoardEmpty(state.board)) {
    hasLegalMove = state.roundNumber === 1 && state.openingTile
      ? state.p0Hand.some((t) => tileEquals(t, state.openingTile!))
      : state.p0Hand.length > 0;
  } else {
    hasLegalMove = state.p0Hand.some((t) => getPlayableEnds(t, state.board).length > 0);
  }

  const canDraw = state.currentTurn === 0 && !hasLegalMove && state.boneyard.length > 0;
  const canPass = state.currentTurn === 0 && !hasLegalMove && state.boneyard.length === 0;

  // شارة الخصم
  const opponentIndicatorHtml = renderTurnIndicator({
    playerName: 'عم شكشك',
    avatarChar: 'ش',
    isCurrentTurn: state.currentTurn === 1,
    tileCount: state.p1Hand.length,
    timerSeconds: state.currentTurn === 1 ? 25 : undefined,
  });

  // شارة اللاعب
  const playerIndicatorHtml = renderTurnIndicator({
    playerName: 'أنت (معلم الطاولة)',
    avatarChar: 'أ',
    isCurrentTurn: state.currentTurn === 0,
    tileCount: state.p0Hand.length,
    timerSeconds: state.currentTurn === 0 ? 30 : undefined,
  });

  // نوتة الحساب
  const scoreBoardHtml = renderScoreBoard({
    roundNumber: state.roundNumber,
    players: [
      { id: 'p0', name: 'أنت', penaltyScore: state.matchScore.seat0 },
      { id: 'p1', name: 'عم شكشك', penaltyScore: state.matchScore.seat1 },
    ],
    matchLimit: 101,
  });

  // شريط الأحداث
  const feedHtml = renderMatchFeed({
    events: state.feedEvents,
    maxItems: 6,
  });

  // قطع السلسلة على الطاولة
  let chainHtml = '';
  if (isBoardEmpty(state.board)) {
    chainHtml = `
      <div style="color: ${AHWA_COLORS.paleGold}; opacity: 0.85; font-size: 16px; margin: auto; text-align: center; background: rgba(0,0,0,0.3); padding: 12px 20px; border-radius: 12px; border: 1px dashed rgba(212,175,55,0.4);">
        🪑 الطاولة خالية... بانتظار أول بلاطة لافتتاح السلسلة!
      </div>
    `;
  } else {
    chainHtml = state.board.nodes
      .map((node, idx) => {
        const isHoriz = node.tile[0] !== node.tile[1];
        return renderTileSvg({
          left: node.tile[0],
          right: node.tile[1],
          orientation: isHoriz ? 'horizontal' : 'vertical',
          size: 'md',
          className: idx === state.board.nodes.length - 1 || idx === 0 ? 'ahwa-tile-slam-animate' : '',
        });
      })
      .join(' ');
  }

  // قطع يد اللاعب
  const handHtml = state.p0Hand
    .map((tile) => {
      let isPlayable = false;
      if (state.currentTurn === 0) {
        if (isBoardEmpty(state.board)) {
          isPlayable = state.roundNumber === 1 && state.openingTile
            ? tileEquals(tile, state.openingTile)
            : true;
        } else {
          isPlayable = getPlayableEnds(tile, state.board).length > 0;
        }
      }

      const isSelected = state.selectedTile ? tileEquals(state.selectedTile, tile) : false;
      const tileState: TileState = isSelected ? 'selected' : isPlayable ? 'playable' : 'disabled';
      const tileIdStr = toTileId(tile);

      const tileMarkup = renderTileSvg({
        left: tile[0],
        right: tile[1],
        orientation: 'vertical',
        size: 'lg',
        state: tileState,
        dataTileId: tileIdStr,
      });

      return `
        <div class="user-hand-tile-wrapper ${isPlayable ? 'is-clickable' : ''}"
             data-id="${tileIdStr}"
             style="cursor: ${isPlayable ? 'pointer' : 'not-allowed'}; touch-action: manipulation; transition: transform 0.15s ease;">
          ${tileMarkup}
        </div>
      `;
    })
    .join('');

  // أزرار التحكم
  const drawButtonHtml = renderAhwaButton({
    label: `سحب (${state.boneyard.length})`,
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

  // مودال عند وجوده
  let modalHtml = '';
  if (state.modal) {
    modalHtml = renderAhwaModal({
      title: state.modal.title,
      subtitle: state.modal.subtitle,
      bodyHtml: state.modal.body,
      primaryAction: {
        label: state.modal.primaryLabel,
        onClickAttr: 'window.__ahwa_onModalPrimary()',
      },
      variant: state.modal.variant,
      id: 'active-modal',
    });
    (window as unknown as { __ahwa_onModalPrimary: () => void }).__ahwa_onModalPrimary = state.modal.onPrimary;
  }

  // خيار اختيار الطرف عند النقر على بلاطة تطابق الطرفين
  let chooseEndDialogHtml = '';
  if (state.selectedTile && state.board.leftValue !== null && state.board.rightValue !== null) {
    chooseEndDialogHtml = `
      <div style="position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
                  background: ${AHWA_COLORS.walnutWood}; padding: 14px 20px; border-radius: 14px;
                  border: 2px solid ${AHWA_COLORS.warmGold}; box-shadow: 0 8px 30px rgba(0,0,0,0.85);
                  display: flex; gap: 12px; align-items: center; z-index: 100;">
        <span style="font-weight: 700; color: ${AHWA_COLORS.creamPaper}; font-size: 15px;">العب [${state.selectedTile[0]}|${state.selectedTile[1]}] على:</span>
        <button id="btn-play-left" class="ahwa-btn ahwa-btn-gold ahwa-btn-md">الطرف الأيمن (${state.board.leftValue})</button>
        <button id="btn-play-right" class="ahwa-btn ahwa-btn-gold ahwa-btn-md">الطرف الأيسر (${state.board.rightValue})</button>
        <button id="btn-cancel-select" class="ahwa-btn ahwa-btn-wood ahwa-btn-sm">إلغاء</button>
      </div>
    `;
  }

  // الهيكل الشامل للصفحة
  app.innerHTML = `
    <!-- رأس الصفحة والشعار -->
    <header style="background: rgba(13, 59, 46, 0.95); border-bottom: 2px solid ${AHWA_COLORS.warmGold};
                   padding: 12px 24px; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <h1 style="color: ${AHWA_COLORS.warmGold}; font-weight: 900; font-size: 24px;">${DOMINO_VOCABULARY.gameTitle}</h1>
        <span style="color: ${AHWA_COLORS.creamPaper}; opacity: 0.8; font-size: 13px;">${DOMINO_VOCABULARY.tagline}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 16px;">
        ${restartButtonHtml}
      </div>
    </header>

    <!-- مساحة اللعب الرئيسية -->
    <main style="flex: 1; display: flex; flex-direction: column; padding: 16px; max-width: 1280px; width: 100%; margin: 0 auto; gap: 16px;">
      
      <!-- شريط معلومات الخصم ولوحة الحساب -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          ${opponentIndicatorHtml}
        </div>
        <div>
          ${scoreBoardHtml}
        </div>
      </div>

      <!-- بانر حالة اللعب الحالي -->
      <div style="background: rgba(0,0,0,0.35); border: 1.5px solid ${state.currentTurn === 0 ? AHWA_COLORS.warmGold : 'rgba(255,255,255,0.15)'};
                  border-radius: 10px; padding: 10px 18px; text-align: center; font-size: 15px; font-weight: 700;
                  color: ${state.currentTurn === 0 ? AHWA_COLORS.paleGold : '#aaa'}; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
        📢 ${state.statusMessage || (state.currentTurn === 0 ? 'دورك للعب!' : 'دور الخصم...')}
      </div>

      <!-- طاولة اللعب التراثية -->
      <div style="flex: 1; min-height: 420px; background: radial-gradient(circle, ${AHWA_COLORS.tableGreen} 0%, ${AHWA_COLORS.darkGreen} 100%);
                  border: 8px solid ${AHWA_COLORS.walnutWood}; border-radius: 20px;
                  box-shadow: inset 0 0 60px rgba(0,0,0,0.8), 0 10px 30px rgba(0,0,0,0.6);
                  position: relative; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 24px;">
        
        <!-- الأطراف المفتوحة -->
        ${!isBoardEmpty(state.board) ? `
          <div style="position: absolute; top: 12px; left: 24px; display: flex; gap: 16px; font-size: 14px; color: ${AHWA_COLORS.paleGold}; background: rgba(0,0,0,0.55); padding: 6px 16px; border-radius: 20px; border: 1px solid rgba(212,175,55,0.3);">
            <span>الطرف الأيمن: <strong style="color: ${AHWA_COLORS.warmGold}; font-size: 16px;">${state.board.leftValue}</strong></span>
            <span>|</span>
            <span>الطرف الأيسر: <strong style="color: ${AHWA_COLORS.warmGold}; font-size: 16px;">${state.board.rightValue}</strong></span>
          </div>
        ` : ''}

        <!-- سلسلة الدومينو -->
        <div style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px; max-width: 100%; max-height: 320px; overflow-y: auto; padding: 12px;">
          ${chainHtml}
        </div>

        ${chooseEndDialogHtml}
      </div>

      <!-- صينية قطع اللاعب وأزرار التحكم -->
      <div style="background: rgba(0,0,0,0.35); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 12px; border: 1.5px solid rgba(212, 175, 55, 0.25);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          ${playerIndicatorHtml}
          <div style="display: flex; gap: 10px; align-items: center;">
            ${drawButtonHtml}
            ${passButtonHtml}
          </div>
        </div>

        <!-- قطع اليد -->
        <div style="display: flex; gap: 12px; overflow-x: auto; padding: 12px 6px; justify-content: center; align-items: center; min-height: 125px;">
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
  document.getElementById('btn-draw')?.addEventListener('click', handlePlayerDraw);
  document.getElementById('btn-pass')?.addEventListener('click', handlePlayerPass);
  document.getElementById('btn-restart')?.addEventListener('click', resetMatch);

  document.querySelectorAll('.user-hand-tile-wrapper').forEach((el) => {
    const tileId = el.getAttribute('data-id');
    const tile = state.p0Hand.find((t) => toTileId(t) === tileId);
    if (!tile) return;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      handleTileClick(tile);
    });
  });

  document.getElementById('btn-play-left')?.addEventListener('click', () => {
    if (state.selectedTile) playPlayerTile(state.selectedTile, 'LEFT');
  });

  document.getElementById('btn-play-right')?.addEventListener('click', () => {
    if (state.selectedTile) playPlayerTile(state.selectedTile, 'RIGHT');
  });

  document.getElementById('btn-cancel-select')?.addEventListener('click', () => {
    state.selectedTile = null;
    render();
  });
}

// بدء التشغيل
resetMatch();
