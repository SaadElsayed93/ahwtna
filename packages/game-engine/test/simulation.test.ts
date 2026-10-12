import { describe, expect, it } from 'vitest';
import { type MatchScore2P, type MatchScore4P } from '@ahwtna/shared';
import { simulateFullMatch, simulateSingleRound } from '../src/simulation.js';
import { createSeededRandom } from '../src/tile-set.js';

describe('Mass Match & Round Simulation (ENG-073, ENG-074)', () => {
  it('simulates a clean single round of 2P individual domino', () => {
    const result = simulateSingleRound('INDIVIDUAL_2P');
    expect(result.turnCount).toBeGreaterThan(0);
    expect(['DOMINO_OUT', 'BLOCKED_GAME']).toContain(result.roundResult.reason);
  });

  it('simulates a clean single round of 4P team domino', () => {
    const result = simulateSingleRound('TEAM_4P');
    expect(result.turnCount).toBeGreaterThan(0);
    expect(['DOMINO_OUT', 'BLOCKED_GAME']).toContain(result.roundResult.reason);
  });

  it('simulates a full 2P match until a player reaches 101 points', () => {
    const match = simulateFullMatch('INDIVIDUAL_2P');
    expect(match.roundsPlayed).toBeGreaterThan(0);

    const score = match.finalScore as MatchScore2P;
    const maxScore = Math.max(score.seat0, score.seat1);
    expect(maxScore).toBeGreaterThanOrEqual(101);
    expect(match.winnerSeat).toBeDefined();
    expect(match.loserSeat).toBeDefined();
  });

  it('simulates a full 4P match until a team reaches 101 points', () => {
    const match = simulateFullMatch('TEAM_4P');
    expect(match.roundsPlayed).toBeGreaterThan(0);

    const score = match.finalScore as MatchScore4P;
    const maxScore = Math.max(score.teamA, score.teamB);
    expect(maxScore).toBeGreaterThanOrEqual(101);
    expect(match.winnerTeam).toBeDefined();
    expect(match.loserTeam).toBeDefined();
  });

  it('ENG-074: seeded simulation runs produce 100% reproducible outcomes', () => {
    const rng1 = createSeededRandom(777);
    const round1 = simulateSingleRound('INDIVIDUAL_2P', undefined, rng1);

    const rng2 = createSeededRandom(777);
    const round2 = simulateSingleRound('INDIVIDUAL_2P', undefined, rng2);

    expect(round1.roundResult.reason).toBe(round2.roundResult.reason);
    expect(round1.roundResult.winnerSeat).toBe(round2.roundResult.winnerSeat);
    expect(round1.roundResult.penaltyPoints).toBe(round2.roundResult.penaltyPoints);
    expect(round1.turnCount).toBe(round2.turnCount);
  });

  it('ENG-073: runs 1,000 simulated rounds with 0 deadlocks or unhandled errors', () => {
    const rng = createSeededRandom(99999);
    let dominoOutCount = 0;
    let blockedCount = 0;

    for (let i = 0; i < 1000; i++) {
      const mode = i % 2 === 0 ? 'INDIVIDUAL_2P' : 'TEAM_4P';
      const round = simulateSingleRound(mode, undefined, rng);

      if (round.roundResult.reason === 'DOMINO_OUT') {
        dominoOutCount++;
      } else if (round.roundResult.reason === 'BLOCKED_GAME') {
        blockedCount++;
      }
    }

    // Both termination modes must have naturally occurred
    expect(dominoOutCount).toBeGreaterThan(500);
    expect(blockedCount).toBeGreaterThan(50);
    expect(dominoOutCount + blockedCount).toBe(1000);
  });
});
