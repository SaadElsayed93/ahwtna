import {
  type BoardState,
  type GameMode,
  getNextSeat,
  type MatchScore,
  type MatchScore2P,
  type MatchScore4P,
  type RoundResult,
  type SeatIndex,
  type Tile,
} from '@ahwtna/shared';
import { chooseAIMove } from './ai.js';
import { createEmptyBoard } from './board.js';
import { dealInitialTiles, determineFirstRoundOpener } from './deal.js';
import { executePlayerMove, type MoveContext } from './move-validator.js';
import {
  applyRoundScoreAndCheckMatchEnd,
  calculateBlockedGameResult,
  calculateDominoOutResult,
  type MatchScoreUpdateResult,
} from './scoring.js';
import { executeDraw, executePass, isGameBlocked, type TurnContext } from './turn-cycle.js';

export interface SimulatedRoundResult {
  readonly roundResult: RoundResult;
  readonly turnCount: number;
}

export interface SimulatedMatchResult {
  readonly mode: GameMode;
  readonly roundsPlayed: number;
  readonly finalScore: MatchScore;
  readonly winnerSeat?: SeatIndex;
  readonly winnerTeam?: string;
  readonly loserSeat?: SeatIndex;
  readonly loserTeam?: string;
}

/**
 * محاكاة جولة دومينو 101 كاملة حتى النهاية (خروج أو قفلة)
 */
export function simulateSingleRound(
  mode: GameMode,
  starterSeatOverride?: SeatIndex,
  randomFn?: () => number
): SimulatedRoundResult {
  const deal = dealInitialTiles(mode, randomFn);

  let hands: Record<SeatIndex, Tile[]> = {
    0: [...deal.hands[0]],
    1: [...deal.hands[1]],
    2: [...deal.hands[2]],
    3: [...deal.hands[3]],
  };

  let boneyard: Tile[] = [...deal.boneyard];
  let board: BoardState = createEmptyBoard();

  let activeSeat: SeatIndex =
    starterSeatOverride !== undefined
      ? starterSeatOverride
      : determineFirstRoundOpener(deal.hands).starterSeat;

  let turnCount = 0;
  const maxTurnsSafety = 1000; // صمام أمان لمنع أي حلقة لا نهائية

  while (turnCount < maxTurnsSafety) {
    turnCount++;

    const aiAction = chooseAIMove({
      seat: activeSeat,
      hand: hands[activeSeat],
      board,
      mode,
      boneyardCount: boneyard.length,
    });

    if (aiAction.action === 'PLAY') {
      const moveCtx: MoveContext = {
        phase: 'PLAYING',
        activeSeat,
        hand: hands[activeSeat],
        board,
      };

      const result = executePlayerMove(
        activeSeat,
        aiAction.tile,
        aiAction.targetEnd,
        moveCtx
      );

      board = result.newBoard;
      hands[activeSeat] = [...result.newHand];

      // فحص خروج اللاعب
      if (hands[activeSeat].length === 0) {
        const roundRes = calculateDominoOutResult(activeSeat, mode, hands, 1);
        return { roundResult: roundRes, turnCount };
      }

      // فحص القفلة بعد النقلة
      if (isGameBlocked(board, hands)) {
        const roundRes = calculateBlockedGameResult(mode, hands, 1);
        return { roundResult: roundRes, turnCount };
      }

      activeSeat = getNextSeat(activeSeat, mode);
    } else if (aiAction.action === 'DRAW') {
      const turnCtx: TurnContext = {
        mode,
        activeSeat,
        hands,
        boneyard,
        board,
      };

      const drawRes = executeDraw(activeSeat, turnCtx);
      hands[activeSeat] = [...drawRes.newHand];
      boneyard = [...drawRes.newBoneyard];
      // في الدومينو بعد السحب، يبقى الدور لنفس اللاعب ليرى إن كان يستطيع اللعب أو يسحب ثانية
    } else if (aiAction.action === 'PASS') {
      const turnCtx: TurnContext = {
        mode,
        activeSeat,
        hands,
        boneyard,
        board,
      };

      const passRes = executePass(activeSeat, turnCtx);

      if (passRes.isBlocked) {
        const roundRes = calculateBlockedGameResult(mode, hands, 1);
        return { roundResult: roundRes, turnCount };
      }

      activeSeat = passRes.nextSeat;
    }
  }

  throw new Error(`تجاوزت الجولة الحد الأقصى للحركات (${maxTurnsSafety}) دون حسم!`);
}

/**
 * محاكاة ماتش دومينو 101 كامل من عدة جولات حتى بلوغ الـ 101
 */
export function simulateFullMatch(
  mode: GameMode,
  randomFn?: () => number
): SimulatedMatchResult {
  let score: MatchScore =
    mode === 'INDIVIDUAL_2P'
      ? ({ seat0: 0, seat1: 0 } as MatchScore2P)
      : ({ teamA: 0, teamB: 0 } as MatchScore4P);

  let roundsPlayed = 0;
  let nextStarter: SeatIndex | undefined = undefined;
  const maxRoundsSafety = 50;

  while (roundsPlayed < maxRoundsSafety) {
    roundsPlayed++;
    const sim = simulateSingleRound(mode, nextStarter, randomFn);

    const update: MatchScoreUpdateResult = applyRoundScoreAndCheckMatchEnd(
      score,
      sim.roundResult,
      mode
    );

    score = update.updatedScore;

    if (update.isMatchOver) {
      return {
        mode,
        roundsPlayed,
        finalScore: score,
        winnerSeat: update.matchWinnerSeat,
        winnerTeam: update.matchWinnerTeam,
        loserSeat: update.matchLoserSeat,
        loserTeam: update.matchLoserTeam,
      };
    }

    // الفائز بالجولة يبدأ الجولة التالية
    if (sim.roundResult.winnerSeat !== undefined) {
      nextStarter = sim.roundResult.winnerSeat;
    }
  }

  throw new Error(`تجاوز الماتش ${maxRoundsSafety} جولة دون وصول أي طرف للـ 101!`);
}
