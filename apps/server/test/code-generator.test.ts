import { describe, expect, it } from 'vitest';
import { generateRoomCode } from '../src/room/code-generator.js';

describe('Room Code Generator', () => {
  it('should generate a 6-character alphanumeric string', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('should not contain ambiguous characters (0, O, 1, I)', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      expect(code).not.toMatch(/[01OI]/);
    }
  });

  it('should generate unique codes avoiding existing ones', () => {
    const existing = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const code = generateRoomCode(existing);
      expect(existing.has(code)).toBe(false);
      existing.add(code);
    }
    expect(existing.size).toBe(100);
  });
});
