import { describe, expect, it } from 'vitest';
import {
  getNextSeat,
  getTeamForSeat,
  getTeammateSeat,
} from '../src/types/player.js';

describe('Player & Seat Domain (TEST-1.3)', () => {
  it('correctly maps teams in 4-player team mode', () => {
    expect(getTeamForSeat(0, 'TEAM_4P')).toBe('TEAM_A');
    expect(getTeamForSeat(2, 'TEAM_4P')).toBe('TEAM_A');
    expect(getTeamForSeat(1, 'TEAM_4P')).toBe('TEAM_B');
    expect(getTeamForSeat(3, 'TEAM_4P')).toBe('TEAM_B');
  });

  it('returns undefined team for individual 2P mode', () => {
    expect(getTeamForSeat(0, 'INDIVIDUAL_2P')).toBeUndefined();
    expect(getTeamForSeat(1, 'INDIVIDUAL_2P')).toBeUndefined();
  });

  it('rotates turn sequentially in 2P mode', () => {
    expect(getNextSeat(0, 'INDIVIDUAL_2P')).toBe(1);
    expect(getNextSeat(1, 'INDIVIDUAL_2P')).toBe(0);
  });

  it('rotates turn clockwise sequentially in 4P mode alternating teams', () => {
    expect(getNextSeat(0, 'TEAM_4P')).toBe(1);
    expect(getNextSeat(1, 'TEAM_4P')).toBe(2);
    expect(getNextSeat(2, 'TEAM_4P')).toBe(3);
    expect(getNextSeat(3, 'TEAM_4P')).toBe(0);
  });

  it('correctly identifies opposing teammates in 4P mode', () => {
    expect(getTeammateSeat(0)).toBe(2);
    expect(getTeammateSeat(2)).toBe(0);
    expect(getTeammateSeat(1)).toBe(3);
    expect(getTeammateSeat(3)).toBe(1);
  });
});
