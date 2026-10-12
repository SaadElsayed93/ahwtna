import {
  type GameMode,
  getTeamForSeat,
  getTileSum,
  type HandPipSummary,
  MATCH_LOSS_LIMIT,
  type MatchScore,
  type MatchScore2P,
  type MatchScore4P,
  type RoundResult,
  type SeatIndex,
  type TeamId,
  type Tile,
} from '@ahwtna/shared';

/**
 * حساب مجموع نقاط (Pips) اليد
 */
export function calculateHandSum(hand: readonly Tile[]): number {
  return hand.reduce((acc, tile) => acc + getTileSum(tile), 0);
}

/**
 * حساب ملخص النقاط لكل يد
 */
export function summarizeHands(
  hands: Partial<Record<SeatIndex, readonly Tile[]>>
): HandPipSummary[] {
  return Object.keys(hands).map(s => {
    const seat = parseInt(s, 10) as SeatIndex;
    const hand = hands[seat] ?? [];
    return {
      seat,
      sum: calculateHandSum(hand),
      tileCount: hand.length,
    };
  });
}

/**
 * احتساب نتيجة الجولة عند خروج لاعب (Domino Out)
 * فردي: فوز اللاعب صاحب اليد الفارغة، وعقوبة على الخصم
 * زوجي: فوز فريق اللاعب صاحب اليد الفارغة فوراً، وعقوبة تجمع أيدي لاعبي الفريق الخاسر
 */
export function calculateDominoOutResult(
  outSeat: SeatIndex,
  mode: GameMode,
  hands: Readonly<Record<SeatIndex, readonly Tile[]>>,
  roundNumber: number = 1
): RoundResult {
  const pipSummaries = summarizeHands(hands);

  if (mode === 'INDIVIDUAL_2P') {
    const opponentSeat: SeatIndex = outSeat === 0 ? 1 : 0;
    const penaltyPoints = calculateHandSum(hands[opponentSeat] ?? []);

    return {
      roundNumber,
      reason: 'DOMINO_OUT',
      isTie: false,
      winnerSeat: outSeat,
      penalizedSeat: opponentSeat,
      penaltyPoints,
      pipSummaries,
    };
  }

  // في النمط الزوجي:
  const winnerTeam = getTeamForSeat(outSeat, 'TEAM_4P')!;
  const losingTeam: TeamId = winnerTeam === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';

  // جمع نقاط عضوي الفريق الخاسر
  const losingSeats: SeatIndex[] = losingTeam === 'TEAM_A' ? [0, 2] : [1, 3];
  const penaltyPoints = losingSeats.reduce<number>(
    (acc, seat) => acc + calculateHandSum(hands[seat] ?? []),
    0
  );

  return {
    roundNumber,
    reason: 'DOMINO_OUT',
    isTie: false,
    winnerSeat: outSeat,
    winnerTeam,
    penalizedTeam: losingTeam,
    penaltyPoints,
    pipSummaries,
  };
}

/**
 * احتساب نتيجة الجولة عند إغلاق اللعب (Blocked Game / قفلة)
 * صاحب (أو فريق) المجموع الأقل يفوز، وصاحب المجموع الأعلى يُعاقب بنقاطه
 * في حال تعادل المجموعين: تعادل تام و 0 نقاط عقوبة
 */
export function calculateBlockedGameResult(
  mode: GameMode,
  hands: Readonly<Record<SeatIndex, readonly Tile[]>>,
  roundNumber: number = 1
): RoundResult {
  const pipSummaries = summarizeHands(hands);

  if (mode === 'INDIVIDUAL_2P') {
    const sum0 = calculateHandSum(hands[0] ?? []);
    const sum1 = calculateHandSum(hands[1] ?? []);

    if (sum0 === sum1) {
      // تعادل تام في القفلة (ENG-034, ENG-038)
      return {
        roundNumber,
        reason: 'BLOCKED_GAME',
        isTie: true,
        penaltyPoints: 0,
        pipSummaries,
      };
    }

    const winnerSeat: SeatIndex = sum0 < sum1 ? 0 : 1;
    const penalizedSeat: SeatIndex = sum0 < sum1 ? 1 : 0;
    const penaltyPoints = sum0 < sum1 ? sum1 : sum0;

    return {
      roundNumber,
      reason: 'BLOCKED_GAME',
      isTie: false,
      winnerSeat,
      penalizedSeat,
      penaltyPoints,
      pipSummaries,
    };
  }

  // في النمط الزوجي (مجموع فريق أ مقابل مجموع فريق ب)
  const sumTeamA =
    calculateHandSum(hands[0] ?? []) + calculateHandSum(hands[2] ?? []);
  const sumTeamB =
    calculateHandSum(hands[1] ?? []) + calculateHandSum(hands[3] ?? []);

  if (sumTeamA === sumTeamB) {
    // تعادل تام بين الفريقين في القفلة (ENG-053)
    return {
      roundNumber,
      reason: 'BLOCKED_GAME',
      isTie: true,
      penaltyPoints: 0,
      pipSummaries,
    };
  }

  const winnerTeam: TeamId = sumTeamA < sumTeamB ? 'TEAM_A' : 'TEAM_B';
  const penalizedTeam: TeamId = sumTeamA < sumTeamB ? 'TEAM_B' : 'TEAM_A';
  const penaltyPoints = sumTeamA < sumTeamB ? sumTeamB : sumTeamA;

  return {
    roundNumber,
    reason: 'BLOCKED_GAME',
    isTie: false,
    winnerTeam,
    penalizedTeam,
    penaltyPoints,
    pipSummaries,
  };
}

export interface MatchScoreUpdateResult {
  readonly updatedScore: MatchScore;
  readonly isMatchOver: boolean;
  readonly matchWinnerSeat?: SeatIndex;
  readonly matchWinnerTeam?: TeamId;
  readonly matchLoserSeat?: SeatIndex;
  readonly matchLoserTeam?: TeamId;
}

/**
 * تطبيق عقوبة الجولة على الرصيد التراكمي وفحص بلوغ حد الـ 101 (ENG-035, ENG-036, ENG-054)
 */
export function applyRoundScoreAndCheckMatchEnd(
  currentScore: MatchScore,
  roundResult: RoundResult,
  mode: GameMode
): MatchScoreUpdateResult {
  if (roundResult.isTie || roundResult.penaltyPoints === 0) {
    return {
      updatedScore: currentScore,
      isMatchOver: false,
    };
  }

  if (mode === 'INDIVIDUAL_2P') {
    const score2p = currentScore as MatchScore2P;
    const penalized = roundResult.penalizedSeat!;

    const newSeat0 =
      penalized === 0 ? score2p.seat0 + roundResult.penaltyPoints : score2p.seat0;
    const newSeat1 =
      penalized === 1 ? score2p.seat1 + roundResult.penaltyPoints : score2p.seat1;

    const updatedScore: MatchScore2P = { seat0: newSeat0, seat1: newSeat1 };

    const loserSeat = newSeat0 >= MATCH_LOSS_LIMIT ? 0 : newSeat1 >= MATCH_LOSS_LIMIT ? 1 : null;

    if (loserSeat !== null) {
      const winnerSeat: SeatIndex = loserSeat === 0 ? 1 : 0;
      return {
        updatedScore,
        isMatchOver: true,
        matchWinnerSeat: winnerSeat,
        matchLoserSeat: loserSeat,
      };
    }

    return {
      updatedScore,
      isMatchOver: false,
    };
  }

  // نمط الزوجي (4P)
  const score4p = currentScore as MatchScore4P;
  const penalized = roundResult.penalizedTeam!;

  const newTeamA =
    penalized === 'TEAM_A' ? score4p.teamA + roundResult.penaltyPoints : score4p.teamA;
  const newTeamB =
    penalized === 'TEAM_B' ? score4p.teamB + roundResult.penaltyPoints : score4p.teamB;

  const updatedScore: MatchScore4P = { teamA: newTeamA, teamB: newTeamB };

  const loserTeam =
    newTeamA >= MATCH_LOSS_LIMIT ? 'TEAM_A' : newTeamB >= MATCH_LOSS_LIMIT ? 'TEAM_B' : null;

  if (loserTeam !== null) {
    const winnerTeam: TeamId = loserTeam === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';
    return {
      updatedScore,
      isMatchOver: true,
      matchWinnerTeam: winnerTeam,
      matchLoserTeam: loserTeam,
    };
  }

  return {
    updatedScore,
    isMatchOver: false,
  };
}
