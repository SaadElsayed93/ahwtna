import {
  type BoardEnd,
  type BoardState,
  type GameMode,
  type MatchScore,
  type MatchScore2P,
  type MatchScore4P,
  type SeatIndex,
  type Tile,
  tileEquals,
} from '@ahwtna/shared';

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

import { getEgyptianTileName, type MatchFeedEvent } from '@ahwtna/ui';

export interface PlayerInfo {
  seat: SeatIndex;
  name: string;
  avatarChar: string;
  isAi: boolean;
  team?: 'TEAM_A' | 'TEAM_B';
}

export interface ModalData {
  title: string;
  subtitle: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  variant: 'gold' | 'success' | 'danger';
}

export type SoundEffect = 'slam' | 'draw' | 'pass' | 'win' | 'block';

export interface ControllerCallbacks {
  onUpdate: () => void;
  onSound?: (sound: SoundEffect) => void;
}

export class OfflineGameController {
  mode: GameMode = 'INDIVIDUAL_2P';
  roundNumber: number = 1;
  board: BoardState = createEmptyBoard();
  hands: Record<SeatIndex, Tile[]> = { 0: [], 1: [], 2: [], 3: [] };
  boneyard: Tile[] = [];
  currentTurn: SeatIndex = 0;
  openingTile: Tile | null = null;
  matchScore: MatchScore = { seat0: 0, seat1: 0 };
  matchOver: boolean = false;
  feedEvents: MatchFeedEvent[] = [];
  selectedTile: Tile | null = null;
  statusMessage: string = '';
  modal: ModalData | null = null;

  private callbacks: ControllerCallbacks;
  private aiTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(callbacks: ControllerCallbacks) {
    this.callbacks = callbacks;
  }

  get players(): PlayerInfo[] {
    if (this.mode === 'INDIVIDUAL_2P') {
      return [
        { seat: 0, name: 'أنت (معلم الطاولة)', avatarChar: 'أ', isAi: false },
        { seat: 1, name: 'عم شكشك', avatarChar: 'ش', isAi: true },
      ];
    } else {
      return [
        { seat: 0, name: 'أنت', avatarChar: 'أ', isAi: false, team: 'TEAM_A' },
        { seat: 1, name: 'عم شكشك', avatarChar: 'ش', isAi: true, team: 'TEAM_B' },
        { seat: 2, name: 'المعلم محروس', avatarChar: 'م', isAi: true, team: 'TEAM_A' },
        { seat: 3, name: 'أستاذ فوزي', avatarChar: 'ف', isAi: true, team: 'TEAM_B' },
      ];
    }
  }

  getPlayer(seat: SeatIndex): PlayerInfo {
    return this.players.find((p) => p.seat === seat) ?? {
      seat,
      name: `لاعب ${seat + 1}`,
      avatarChar: `${seat + 1}`,
      isAi: true,
    };
  }

  addFeedEvent(type: MatchFeedEvent['type'], text: string) {
    const d = new Date();
    const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    this.feedEvents.push({
      id: Math.random().toString(36).substring(2),
      timestamp: time,
      type,
      text,
    });
  }

  setGameMode(mode: GameMode) {
    this.mode = mode;
    this.resetMatch();
  }

  resetMatch() {
    if (this.aiTimeoutId) {
      clearTimeout(this.aiTimeoutId);
      this.aiTimeoutId = null;
    }
    this.roundNumber = 1;
    this.matchOver = false;
    this.feedEvents = [];
    if (this.mode === 'INDIVIDUAL_2P') {
      this.matchScore = { seat0: 0, seat1: 0 };
      this.addFeedEvent('SYSTEM', 'طاولة فردية جديدة (أنت ضد عم شكشك)! أهلاً بكم في قهوتنا.');
    } else {
      this.matchScore = { teamA: 0, teamB: 0 };
      this.addFeedEvent('SYSTEM', 'طاولة زوجية جديدة (أنت ومحروس ضد شكشك وفوزي)! أول من يصل 101 يخسر.');
    }
    this.startNewRound();
  }

  startNewRound() {
    if (this.aiTimeoutId) {
      clearTimeout(this.aiTimeoutId);
      this.aiTimeoutId = null;
    }

    const deal = dealInitialTiles(this.mode);
    this.board = createEmptyBoard();
    this.hands = {
      0: [...(deal.hands[0] ?? [])],
      1: [...(deal.hands[1] ?? [])],
      2: [...(deal.hands[2] ?? [])],
      3: [...(deal.hands[3] ?? [])],
    };
    this.boneyard = [...deal.boneyard];
    this.selectedTile = null;
    this.modal = null;

    if (this.roundNumber === 1) {
      // الجولة الأولى: صاحب الدش [6|6] (أو أعلى دبل متاح) يفتتح بالدش حصراً
      const opener = determineFirstRoundOpener(deal.hands);
      this.openingTile = opener.startingTile;
      this.currentTurn = opener.starterSeat;
      const starterName = getEgyptianTileName(opener.startingTile[0], opener.startingTile[1]);
      const openerPlayer = this.getPlayer(opener.starterSeat);

      if (opener.starterSeat === 0) {
        this.statusMessage = `أنت معك ${starterName} [${opener.startingTile[0]}|${opener.startingTile[1]}]! اضغط عليه لافتتاح الماتش.`;
        this.addFeedEvent('SYSTEM', `الجولة الأولى: معك ${starterName}! اضغط عليه لافتتاح الطاولة.`);
      } else {
        this.statusMessage = `${openerPlayer.name} معه ${starterName} [${opener.startingTile[0]}|${opener.startingTile[1]}] وسيفتتح الماتش...`;
        this.addFeedEvent('SYSTEM', `الجولة الأولى: ${openerPlayer.name} معه ${starterName} وسيفتتح بالدش.`);
      }
    } else {
      // الجولات التالية (الجولة 2 فما فوق): الفائز بالجولة السابقة يبدأ بأي بلاطة يحبها بكل حرية!
      this.openingTile = null;
      const starterPlayer = this.getPlayer(this.currentTurn);
      if (this.currentTurn === 0) {
        this.statusMessage = `أنت فائز الجولة السابقة! يحق لك افتتاح الطاولة بأي بلاطة تختارها.`;
        this.addFeedEvent('SYSTEM', `الجولة ${this.roundNumber}: أنت صاحب البداية — العب أي بلاطة من يدك!`);
      } else {
        this.statusMessage = `${starterPlayer.name} فاز بالجولة السابقة وسيفتتح الطاولة باختياره...`;
        this.addFeedEvent('SYSTEM', `الجولة ${this.roundNumber}: ${starterPlayer.name} يفتتح الطاولة.`);
      }
    }

    this.notifyUpdate();

    if (this.getPlayer(this.currentTurn).isAi) {
      this.scheduleAITurn(1000);
    }
  }

  private notifyUpdate() {
    this.callbacks.onUpdate();
  }

  private playSound(sound: SoundEffect) {
    if (this.callbacks.onSound) {
      this.callbacks.onSound(sound);
    }
  }

  private nextSeat(seat: SeatIndex): SeatIndex {
    if (this.mode === 'INDIVIDUAL_2P') {
      return seat === 0 ? 1 : 0;
    }
    return ((seat + 1) % 4) as SeatIndex;
  }

  checkEndOfRound(): boolean {
    const handsRecord: Record<SeatIndex, readonly Tile[]> = {
      0: this.hands[0],
      1: this.hands[1],
      2: this.hands[2],
      3: this.hands[3],
    };

    // 1. خروج أحد اللاعبين (دومينو!)
    const activePlayerCount = this.mode === 'INDIVIDUAL_2P' ? 2 : 4;
    for (let s = 0; s < activePlayerCount; s++) {
      const seat = s as SeatIndex;
      if (this.hands[seat].length === 0) {
        this.playSound('win');
        const winnerPlayer = this.getPlayer(seat);
        const roundRes = calculateDominoOutResult(seat, this.mode, handsRecord, this.roundNumber);
        const scoreUpdate = applyRoundScoreAndCheckMatchEnd(this.matchScore, roundRes, this.mode);
        this.matchScore = scoreUpdate.updatedScore;

        this.addFeedEvent('DOMINO', `دومينو! ${winnerPlayer.name} أنهى ورقه أولاً.`);

        if (scoreUpdate.isMatchOver) {
          this.matchOver = true;
          let matchWinnerName = '';
          let finalScoreText = '';
          if (this.mode === 'INDIVIDUAL_2P') {
            const s2p = this.matchScore as MatchScore2P;
            matchWinnerName = s2p.seat0 >= 101 ? 'عم شكشك' : 'أنت';
            finalScoreText = `الرصيد النهائي: أنت: ${s2p.seat0} | عم شكشك: ${s2p.seat1}`;
          } else {
            const s4p = this.matchScore as MatchScore4P;
            matchWinnerName = s4p.teamA >= 101 ? 'فريق شكشك وفوزي' : 'فريقك (أنت ومحروس)';
            finalScoreText = `الرصيد النهائي: فريقك: ${s4p.teamA} | فريق الخصم: ${s4p.teamB}`;
          }

          this.modal = {
            title: 'نهاية المباراة!',
            subtitle: `مبروك ${matchWinnerName}! الخاسر تجاوز حد الـ 101 نقطة جزاء.`,
            body: `<p>${finalScoreText}</p>`,
            primaryLabel: 'ماتش جديد',
            onPrimary: () => this.resetMatch(),
            variant: 'gold',
          };
        } else {
          let scoreText = '';
          if (this.mode === 'INDIVIDUAL_2P') {
            const s2p = this.matchScore as MatchScore2P;
            scoreText = `رصيدك: ${s2p.seat0} | رصيد الخصم: ${s2p.seat1}`;
          } else {
            const s4p = this.matchScore as MatchScore4P;
            scoreText = `رصيد فريقك: ${s4p.teamA} | رصيد الخصم: ${s4p.teamB}`;
          }

          this.modal = {
            title: 'دومينو!',
            subtitle: `${winnerPlayer.name} قفل الجولة بالدومينو!`,
            body: `<p>نقاط الجزاء المضافة: ${roundRes.penaltyPoints} نقطة على الفريق الخاسر.<br>${scoreText}</p>`,
            primaryLabel: 'الجولة التالية',
            onPrimary: () => {
              this.roundNumber++;
              this.currentTurn = seat; // الفائز يبدأ الجولة التالية بأي بلاطة
              this.startNewRound();
            },
            variant: seat === 0 || (this.mode === 'TEAM_4P' && seat === 2) ? 'success' : 'danger',
          };
        }
        this.notifyUpdate();
        return true;
      }
    }

    // 2. القفلة (Blocked Game)
    if (this.boneyard.length === 0 && isGameBlocked(this.board, handsRecord)) {
      this.playSound('block');
      const roundRes = calculateBlockedGameResult(this.mode, handsRecord, this.roundNumber);
      const scoreUpdate = applyRoundScoreAndCheckMatchEnd(this.matchScore, roundRes, this.mode);
      this.matchScore = scoreUpdate.updatedScore;

      this.addFeedEvent('BLOCKED', 'القفلة! لا توجد حركات قانونية لأي لاعب على الطاولة.');

      if (scoreUpdate.isMatchOver) {
        this.matchOver = true;
        let matchWinnerName = '';
        let finalScoreText = '';
        if (this.mode === 'INDIVIDUAL_2P') {
          const s2p = this.matchScore as MatchScore2P;
          matchWinnerName = s2p.seat0 >= 101 ? 'عم شكشك' : 'أنت';
          finalScoreText = `الرصيد النهائي: أنت: ${s2p.seat0} | عم شكشك: ${s2p.seat1}`;
        } else {
          const s4p = this.matchScore as MatchScore4P;
          matchWinnerName = s4p.teamA >= 101 ? 'فريق شكشك وفوزي' : 'فريقك (أنت ومحروس)';
          finalScoreText = `الرصيد النهائي: فريقك: ${s4p.teamA} | فريق الخصم: ${s4p.teamB}`;
        }

        this.modal = {
          title: 'نهاية المباراة!',
          subtitle: `مبروك ${matchWinnerName}! الخاسر تجاوز حد الـ 101 نقطة.`,
          body: `<p>${finalScoreText}</p>`,
          primaryLabel: 'ماتش جديد',
          onPrimary: () => this.resetMatch(),
          variant: 'gold',
        };
      } else {
        let scoreText = '';
        if (this.mode === 'INDIVIDUAL_2P') {
          const s2p = this.matchScore as MatchScore2P;
          scoreText = `رصيدك: ${s2p.seat0} | رصيد الخصم: ${s2p.seat1}`;
        } else {
          const s4p = this.matchScore as MatchScore4P;
          scoreText = `رصيد فريقك: ${s4p.teamA} | رصيد الخصم: ${s4p.teamB}`;
        }

        const outcomeText = roundRes.isTie
          ? 'تعادل تام في مجموع النقط! 0 نقاط لكلا الطرفين.'
          : roundRes.winnerSeat !== undefined
          ? `${this.getPlayer(roundRes.winnerSeat).name} صاحب المجموع الأقل! حصل على ${roundRes.penaltyPoints} نقطة جزاء ضد الخصوم.`
          : `حصل الفريق الفائز على ${roundRes.penaltyPoints} نقطة جزاء ضد الخصوم.`;

        this.modal = {
          title: 'القفلة!',
          subtitle: 'اللعب اتقفل على الطاولة',
          body: `<p>${outcomeText}<br>${scoreText}</p>`,
          primaryLabel: 'الجولة التالية',
          onPrimary: () => {
            this.roundNumber++;
            if (roundRes.winnerSeat !== undefined) {
              this.currentTurn = roundRes.winnerSeat;
            }
            this.startNewRound();
          },
          variant: 'gold',
        };
      }
      this.notifyUpdate();
      return true;
    }

    return false;
  }

  handlePlayerTileClick(tile: Tile) {
    if (this.matchOver || this.currentTurn !== 0) return;

    // الجولة الأولى والطاولة فارغة: يجب البدء بقطعة البداية المعتمدة (الدش)
    if (this.roundNumber === 1 && isBoardEmpty(this.board) && this.openingTile) {
      if (!tileEquals(tile, this.openingTile)) {
        const name = getEgyptianTileName(this.openingTile[0], this.openingTile[1]);
        this.statusMessage = `قواعد الدومينو: أول جولة لازم تبدأ بـ ${name} [${this.openingTile[0]}|${this.openingTile[1]}]!`;
        this.addFeedEvent('SYSTEM', `تنبيه: لازم تبدأ بـ ${name} لافتتاح الجولة.`);
        this.notifyUpdate();
        return;
      }
      this.playPlayerMove(tile, 'LEFT');
      return;
    }

    // جولة 2 فما فوق والطاولة فارغة: الفائز يلعب أي بلاطة بحرية تامة!
    if (isBoardEmpty(this.board)) {
      this.playPlayerMove(tile, 'LEFT');
      return;
    }

    const ends = getPlayableEnds(tile, this.board);
    const tileName = getEgyptianTileName(tile[0], tile[1]);

    if (ends.length === 0) {
      this.statusMessage = `البلاطة ${tileName} [${tile[0]}|${tile[1]}] لا تطابق أي طرف مفتوح (${this.board.leftValue} أو ${this.board.rightValue}).`;
      this.notifyUpdate();
      return;
    }

    // إذا نقر اللاعب على نفس البلاطة المحددة حالياً: نقوم بإلغاء التحديد
    if (this.selectedTile && tileEquals(this.selectedTile, tile)) {
      this.selectedTile = null;
      this.statusMessage = 'تم إلغاء التحديد. اختر بلاطة للعب.';
      this.notifyUpdate();
      return;
    }

    if (ends.length === 1) {
      this.playPlayerMove(tile, ends[0]!);
    } else {
      // تطابق كلا الطرفين: نحدد البلاطة ليختار اللاعب الطرف المطلوب عبر المربعات المنقطة على الطاولة
      this.selectedTile = tile;
      this.statusMessage = `اختر مكان اللعب بالضغط على أحد المربعين المنقطين على الطاولة (${this.board.leftValue} أو ${this.board.rightValue})`;
      this.notifyUpdate();
    }
  }

  playPlayerMove(tile: Tile, end: BoardEnd) {
    this.playSound('slam');
    const moveCtx: MoveContext = {
      phase: 'PLAYING',
      activeSeat: 0,
      hand: this.hands[0],
      board: this.board,
    };
    const moveRes = executePlayerMove(0, tile, end, moveCtx);
    this.board = moveRes.newBoard;
    this.hands[0] = [...moveRes.newHand];
    this.selectedTile = null;

    const tileName = getEgyptianTileName(tile[0], tile[1]);
    this.addFeedEvent('PLAY', `أنت لعبت ${tileName} [${tile[0]}|${tile[1]}] على ${end === 'LEFT' ? 'الطرف الأيمن' : 'الطرف الأيسر'}`);

    if (this.checkEndOfRound()) return;

    this.currentTurn = this.nextSeat(0);
    const nextPlayer = this.getPlayer(this.currentTurn);
    this.statusMessage = `${nextPlayer.name} يفكر في نقلته...`;
    this.notifyUpdate();

    if (nextPlayer.isAi) {
      this.scheduleAITurn(900);
    }
  }

  handlePlayerDraw() {
    if (this.matchOver || this.currentTurn !== 0) return;
    if (this.boneyard.length === 0 || this.mode === 'TEAM_4P') return;

    this.playSound('draw');
    const drawn = this.boneyard.pop()!;
    this.hands[0].push(drawn);
    const drawnName = getEgyptianTileName(drawn[0], drawn[1]);
    this.addFeedEvent('DRAW', `سحبت ${drawnName} [${drawn[0]}|${drawn[1]}] من المخزون`);
    this.statusMessage = `سحبت ${drawnName} — هل تناسب اللعب الآن؟`;
    this.notifyUpdate();
  }

  handlePlayerPass() {
    if (this.matchOver || this.currentTurn !== 0) return;
    this.playSound('pass');
    this.addFeedEvent('PASS', 'أنت مررت الدور (باص)');
    this.currentTurn = this.nextSeat(0);
    const nextPlayer = this.getPlayer(this.currentTurn);
    this.statusMessage = `مررت الدور — ${nextPlayer.name} يلعب...`;
    this.notifyUpdate();

    if (nextPlayer.isAi) {
      this.scheduleAITurn(900);
    }
  }

  private scheduleAITurn(delayMs: number) {
    if (this.aiTimeoutId) {
      clearTimeout(this.aiTimeoutId);
    }
    this.aiTimeoutId = setTimeout(() => {
      this.aiTimeoutId = null;
      this.executeAITurn();
    }, delayMs);
  }

  private executeAITurn() {
    if (this.matchOver) return;
    const activeSeat = this.currentTurn;
    const aiPlayer = this.getPlayer(activeSeat);
    if (!aiPlayer.isAi) return;

    // إذا كانت الطاولة فارغة في الجولة الأولى: افتتاح بقطعة البداية المحددة (الدش)
    if (isBoardEmpty(this.board) && this.roundNumber === 1 && this.openingTile) {
      const starter = this.openingTile;
      this.playSound('slam');
      const moveCtx: MoveContext = {
        phase: 'PLAYING',
        activeSeat,
        hand: this.hands[activeSeat],
        board: this.board,
      };
      const moveRes = executePlayerMove(activeSeat, starter, 'LEFT', moveCtx);
      this.board = moveRes.newBoard;
      this.hands[activeSeat] = [...moveRes.newHand];
      const name = getEgyptianTileName(starter[0], starter[1]);
      this.addFeedEvent('PLAY', `${aiPlayer.name} افتتح الطاولة بـ ${name} [${starter[0]}|${starter[1]}]`);

      this.currentTurn = this.nextSeat(activeSeat);
      const nextPlayer = this.getPlayer(this.currentTurn);
      this.statusMessage = nextPlayer.isAi ? `${nextPlayer.name} يفكر...` : 'دورك الآن — العب بلاطة تطابق أحد طرفي الطاولة!';
      this.notifyUpdate();

      if (nextPlayer.isAi) {
        this.scheduleAITurn(850);
      }
      return;
    }

    const decision = chooseAIMove({
      seat: activeSeat,
      hand: this.hands[activeSeat],
      board: this.board,
      mode: this.mode,
      boneyardCount: this.boneyard.length,
    });

    if (decision.action === 'PLAY' && decision.tile && decision.targetEnd) {
      this.playSound('slam');
      const playedTile = decision.tile;
      const moveCtx: MoveContext = {
        phase: 'PLAYING',
        activeSeat,
        hand: this.hands[activeSeat],
        board: this.board,
      };
      const moveRes = executePlayerMove(activeSeat, playedTile, decision.targetEnd, moveCtx);
      this.board = moveRes.newBoard;
      this.hands[activeSeat] = [...moveRes.newHand];
      const tileName = getEgyptianTileName(playedTile[0], playedTile[1]);
      this.addFeedEvent('PLAY', `${aiPlayer.name} لعب ${tileName} [${playedTile[0]}|${playedTile[1]}] على ${decision.targetEnd === 'LEFT' ? 'الطرف الأيمن' : 'الطرف الأيسر'}`);

      if (this.checkEndOfRound()) return;

      this.currentTurn = this.nextSeat(activeSeat);
      const nextPlayer = this.getPlayer(this.currentTurn);
      this.statusMessage = nextPlayer.isAi ? `${nextPlayer.name} يفكر...` : 'دورك — اختر بلاطة للعب!';
      this.notifyUpdate();

      if (nextPlayer.isAi) {
        this.scheduleAITurn(850);
      }
    } else if (decision.action === 'DRAW') {
      if (this.boneyard.length > 0) {
        this.playSound('draw');
        const drawn = this.boneyard.pop()!;
        this.hands[activeSeat].push(drawn);
        this.addFeedEvent('DRAW', `${aiPlayer.name} سحب بلاطة من المخزون`);
        this.statusMessage = `${aiPlayer.name} سحب بلاطة...`;
        this.notifyUpdate();
        this.scheduleAITurn(650);
      } else {
        this.playSound('pass');
        this.addFeedEvent('PASS', `${aiPlayer.name} باصى لعدم وجود قطع في المخزون`);
        this.currentTurn = this.nextSeat(activeSeat);
        const nextPlayer = this.getPlayer(this.currentTurn);
        this.statusMessage = nextPlayer.isAi ? `${nextPlayer.name} يفكر...` : `${aiPlayer.name} باصى! الدور عندك.`;
        this.notifyUpdate();

        if (nextPlayer.isAi) {
          this.scheduleAITurn(850);
        }
      }
    } else if (decision.action === 'PASS') {
      this.playSound('pass');
      this.addFeedEvent('PASS', `${aiPlayer.name} باصى (تمرير الدور)`);
      this.currentTurn = this.nextSeat(activeSeat);
      const nextPlayer = this.getPlayer(this.currentTurn);
      this.statusMessage = nextPlayer.isAi ? `${nextPlayer.name} يفكر...` : `${aiPlayer.name} مرر الدور! دورك للعب.`;
      this.notifyUpdate();

      if (nextPlayer.isAi) {
        this.scheduleAITurn(850);
      }
    }
  }
}
