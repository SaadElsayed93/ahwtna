import { describe, expect, it } from 'vitest';
import { createTile, type MatchScore2P, type MatchScore4P, type Tile } from '@ahwtna/shared';
import {
  applyRoundScoreAndCheckMatchEnd,
  calculateBlockedGameResult,
  calculateDominoOutResult,
  calculateHandSum,
} from '../src/scoring.js';

describe('Scoring Engine & 101 Limit (ENG-030 to ENG-055)', () => {
  describe('Individual 2P Scoring', () => {
    it('ENG-030 & ENG-031: player goes out, loser receives sum of remaining hand', () => {
      const hands: Record<number, Tile[]> = {
        0: [], // Player 0 went out!
        1: [createTile(2, 3), createTile(4, 6)], // Sum = 5 + 10 = 15
        2: [],
        3: [],
      };

      const result = calculateDominoOutResult(0, 'INDIVIDUAL_2P', hands, 1);
      expect(result.reason).toBe('DOMINO_OUT');
      expect(result.winnerSeat).toBe(0);
      expect(result.penalizedSeat).toBe(1);
      expect(result.penaltyPoints).toBe(15);
      expect(result.isTie).toBe(false);
    });

    it('ENG-032: blocked game where seat 0 has fewer pips -> seat 0 wins, seat 1 penalized', () => {
      const hands: Record<number, Tile[]> = {
        0: [createTile(1, 2)], // Sum = 3
        1: [createTile(3, 5)], // Sum = 8
        2: [],
        3: [],
      };

      const result = calculateBlockedGameResult('INDIVIDUAL_2P', hands, 1);
      expect(result.reason).toBe('BLOCKED_GAME');
      expect(result.winnerSeat).toBe(0);
      expect(result.penalizedSeat).toBe(1);
      expect(result.penaltyPoints).toBe(8);
      expect(result.isTie).toBe(false);
    });

    it('ENG-033: blocked game where seat 1 has fewer pips -> seat 1 wins, seat 0 penalized', () => {
      const hands: Record<number, Tile[]> = {
        0: [createTile(4, 5)], // Sum = 9
        1: [createTile(0, 2)], // Sum = 2
        2: [],
        3: [],
      };

      const result = calculateBlockedGameResult('INDIVIDUAL_2P', hands, 1);
      expect(result.winnerSeat).toBe(1);
      expect(result.penalizedSeat).toBe(0);
      expect(result.penaltyPoints).toBe(9);
    });

    it('ENG-034 & ENG-038: blocked game with equal pips results in a tie with 0 penalty points', () => {
      const hands: Record<number, Tile[]> = {
        0: [createTile(1, 4)], // Sum = 5
        1: [createTile(2, 3)], // Sum = 5
        2: [],
        3: [],
      };

      const result = calculateBlockedGameResult('INDIVIDUAL_2P', hands, 1);
      expect(result.isTie).toBe(true);
      expect(result.penaltyPoints).toBe(0);
      expect(result.winnerSeat).toBeUndefined();
      expect(result.penalizedSeat).toBeUndefined();
    });

    it('ENG-035: score 96 + penalty 8 = 104 -> immediate match loss', () => {
      const currentScore: MatchScore2P = { seat0: 96, seat1: 40 };
      const roundResult = {
        roundNumber: 5,
        reason: 'DOMINO_OUT' as const,
        isTie: false,
        winnerSeat: 1 as const,
        penalizedSeat: 0 as const,
        penaltyPoints: 8,
        pipSummaries: [],
      };

      const update = applyRoundScoreAndCheckMatchEnd(currentScore, roundResult, 'INDIVIDUAL_2P');
      expect(update.isMatchOver).toBe(true);
      expect((update.updatedScore as MatchScore2P).seat0).toBe(104);
      expect(update.matchLoserSeat).toBe(0);
      expect(update.matchWinnerSeat).toBe(1);
    });

    it('ENG-036: score 93 + penalty 8 = 101 -> exact match loss', () => {
      const currentScore: MatchScore2P = { seat0: 20, seat1: 93 };
      const roundResult = {
        roundNumber: 3,
        reason: 'DOMINO_OUT' as const,
        isTie: false,
        winnerSeat: 0 as const,
        penalizedSeat: 1 as const,
        penaltyPoints: 8,
        pipSummaries: [],
      };

      const update = applyRoundScoreAndCheckMatchEnd(currentScore, roundResult, 'INDIVIDUAL_2P');
      expect(update.isMatchOver).toBe(true);
      expect((update.updatedScore as MatchScore2P).seat1).toBe(101);
      expect(update.matchLoserSeat).toBe(1);
      expect(update.matchWinnerSeat).toBe(0);
    });

    it('ENG-037: score 100 + penalty 0 (tie) does not end match', () => {
      const currentScore: MatchScore2P = { seat0: 100, seat1: 50 };
      const roundResult = {
        roundNumber: 4,
        reason: 'BLOCKED_GAME' as const,
        isTie: true,
        penaltyPoints: 0,
        pipSummaries: [],
      };

      const update = applyRoundScoreAndCheckMatchEnd(currentScore, roundResult, 'INDIVIDUAL_2P');
      expect(update.isMatchOver).toBe(false);
      expect((update.updatedScore as MatchScore2P).seat0).toBe(100);
    });
  });

  describe('Team 4P Scoring', () => {
    it('ENG-050 & ENG-055: when one teammate goes out, team wins and opponent combined pips are penalized', () => {
      const hands: Record<number, Tile[]> = {
        0: [], // Seat 0 (Team A) goes out!
        1: [createTile(1, 2)], // Seat 1 (Team B) = 3
        2: [createTile(6, 6)], // Seat 2 (Team A) = 12 (teammate still has tiles!)
        3: [createTile(3, 4), createTile(5, 5)], // Seat 3 (Team B) = 7 + 10 = 17
      };

      const result = calculateDominoOutResult(0, 'TEAM_4P', hands, 1);
      expect(result.reason).toBe('DOMINO_OUT');
      expect(result.winnerTeam).toBe('TEAM_A');
      expect(result.penalizedTeam).toBe('TEAM_B');
      // Team B penalty = 3 + 17 = 20
      expect(result.penaltyPoints).toBe(20);
    });

    it('ENG-051 & ENG-052: blocked game compares combined team sums', () => {
      const hands: Record<number, Tile[]> = {
        0: [createTile(1, 1)], // Team A: 2
        1: [createTile(2, 2)], // Team B: 4
        2: [createTile(2, 3)], // Team A: 5 -> Total Team A = 7
        3: [createTile(4, 5)], // Team B: 9 -> Total Team B = 13
      };

      const result = calculateBlockedGameResult('TEAM_4P', hands, 1);
      expect(result.reason).toBe('BLOCKED_GAME');
      expect(result.winnerTeam).toBe('TEAM_A');
      expect(result.penalizedTeam).toBe('TEAM_B');
      expect(result.penaltyPoints).toBe(13); // Higher team penalty
    });

    it('ENG-053: blocked game with equal team sums results in a tie', () => {
      const hands: Record<number, Tile[]> = {
        0: [createTile(1, 4)], // Team A: 5
        1: [createTile(2, 3)], // Team B: 5
        2: [createTile(0, 5)], // Team A: 5 -> Total A = 10
        3: [createTile(1, 4)], // Team B: 5 -> Total B = 10
      };

      const result = calculateBlockedGameResult('TEAM_4P', hands, 1);
      expect(result.isTie).toBe(true);
      expect(result.penaltyPoints).toBe(0);
    });

    it('ENG-054: team score 95 + penalty 11 = 106 -> immediate match loss for team', () => {
      const currentScore: MatchScore4P = { teamA: 40, teamB: 95 };
      const roundResult = {
        roundNumber: 6,
        reason: 'DOMINO_OUT' as const,
        isTie: false,
        winnerTeam: 'TEAM_A' as const,
        penalizedTeam: 'TEAM_B' as const,
        penaltyPoints: 11,
        pipSummaries: [],
      };

      const update = applyRoundScoreAndCheckMatchEnd(currentScore, roundResult, 'TEAM_4P');
      expect(update.isMatchOver).toBe(true);
      expect((update.updatedScore as MatchScore4P).teamB).toBe(106);
      expect(update.matchLoserTeam).toBe('TEAM_B');
      expect(update.matchWinnerTeam).toBe('TEAM_A');
    });
  });
});
