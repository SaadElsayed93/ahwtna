import { describe, expect, it, beforeEach } from 'vitest';
import { GameError } from '@ahwtna/shared';
import { RoomManager } from '../src/room/room-manager.js';

describe('RoomManager & Seating (TEST-9.1, TEST-9.2, TEST-9.3)', () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  describe('TEST-9.1: Room Creation & Join', () => {
    it('creates a 2P room with 6-char code and sets the creator as host on seat 0', () => {
      const room = manager.createRoom('p1', 'معلم أحمد', 'INDIVIDUAL_2P');

      expect(room.roomId).toHaveLength(6);
      expect(room.mode).toBe('INDIVIDUAL_2P');
      expect(room.hostId).toBe('p1');
      expect(room.status).toBe('LOBBY');

      const players = room.getPlayers();
      expect(players).toHaveLength(1);
      expect(players[0]?.id).toBe('p1');
      expect(players[0]?.displayName).toBe('معلم أحمد');
      expect(players[0]?.seat).toBe(0);
      expect(players[0]?.isHost).toBe(true);
      expect(players[0]?.isReady).toBe(false);
    });

    it('allows a second player to join a 2P room and assigns the remaining seat 1', () => {
      const room = manager.createRoom('p1', 'معلم أحمد', 'INDIVIDUAL_2P');
      const { player } = manager.joinRoom(room.roomId, 'p2', 'عم شكشك');

      expect(player.id).toBe('p2');
      expect(player.displayName).toBe('عم شكشك');
      expect(player.seat).toBe(1);
      expect(player.isHost).toBe(false);
      expect(room.getPlayers()).toHaveLength(2);
    });

    it('creates a 4P team room and assigns team IDs correctly according to seats', () => {
      const room = manager.createRoom('p1', 'لاعب 1', 'TEAM_4P');
      const p1 = room.getPlayerById('p1')!;
      expect(p1.team).toBe('TEAM_A'); // seat 0

      const { player: p2 } = manager.joinRoom(room.roomId, 'p2', 'لاعب 2');
      expect(p2.seat).toBe(1);
      expect(p2.team).toBe('TEAM_B'); // seat 1

      const { player: p3 } = manager.joinRoom(room.roomId, 'p3', 'لاعب 3');
      expect(p3.seat).toBe(2);
      expect(p3.team).toBe('TEAM_A'); // seat 2 (زميل مقعد 0)

      const { player: p4 } = manager.joinRoom(room.roomId, 'p4', 'لاعب 4');
      expect(p4.seat).toBe(3);
      expect(p4.team).toBe('TEAM_B'); // seat 3 (زميل مقعد 1)
    });
  });

  describe('TEST-9.2: Seat Collision & Overflow Prevention', () => {
    it('throws ROOM_FULL when a third player tries to join an INDIVIDUAL_2P room', () => {
      const room = manager.createRoom('p1', 'لاعب 1', 'INDIVIDUAL_2P');
      manager.joinRoom(room.roomId, 'p2', 'لاعب 2');

      expect(() => {
        manager.joinRoom(room.roomId, 'p3', 'لاعب 3');
      }).toThrowError(GameError);

      try {
        manager.joinRoom(room.roomId, 'p3', 'لاعب 3');
      } catch (err) {
        expect((err as GameError).code).toBe('ROOM_FULL');
      }
    });

    it('throws ROOM_FULL when a fifth player tries to join a TEAM_4P room', () => {
      const room = manager.createRoom('p1', 'لاعب 1', 'TEAM_4P');
      manager.joinRoom(room.roomId, 'p2', 'لاعب 2');
      manager.joinRoom(room.roomId, 'p3', 'لاعب 3');
      manager.joinRoom(room.roomId, 'p4', 'لاعب 4');

      expect(() => {
        manager.joinRoom(room.roomId, 'p5', 'لاعب 5');
      }).toThrowError(GameError);
    });

    it('prevents choosing a seat that is already occupied (SEAT_TAKEN)', () => {
      const room = manager.createRoom('p1', 'لاعب 1', 'INDIVIDUAL_2P'); // in seat 0
      manager.joinRoom(room.roomId, 'p2', 'لاعب 2'); // in seat 1

      expect(() => {
        manager.chooseSeat(room.roomId, 'p2', 0);
      }).toThrowError(GameError);

      try {
        manager.chooseSeat(room.roomId, 'p2', 0);
      } catch (err) {
        expect((err as GameError).code).toBe('SEAT_TAKEN');
      }
    });

    it('prevents choosing an invalid seat index out of range (INVALID_SEAT)', () => {
      const room = manager.createRoom('p1', 'لاعب 1', 'INDIVIDUAL_2P');

      expect(() => {
        // Seat 2 is invalid in 2P mode (only 0 and 1)
        manager.chooseSeat(room.roomId, 'p1', 2);
      }).toThrowError(GameError);

      try {
        manager.chooseSeat(room.roomId, 'p1', 2);
      } catch (err) {
        expect((err as GameError).code).toBe('INVALID_SEAT');
      }
    });

    it('throws ROOM_NOT_FOUND when accessing non-existent room code', () => {
      expect(() => {
        manager.getRoomOrThrow('NON999');
      }).toThrowError(GameError);

      try {
        manager.getRoomOrThrow('NON999');
      } catch (err) {
        expect((err as GameError).code).toBe('ROOM_NOT_FOUND');
      }
    });
  });

  describe('TEST-9.3: Host Departure Handling & Cleanup', () => {
    it('transfers host badge to the oldest remaining player when host leaves', () => {
      const room = manager.createRoom('host1', 'المضيف الأصلي', 'INDIVIDUAL_2P');
      manager.joinRoom(room.roomId, 'player2', 'اللاعب الثاني');

      expect(room.hostId).toBe('host1');
      expect(room.getPlayerById('host1')?.isHost).toBe(true);

      const leaveResult = manager.leaveRoom(room.roomId, 'host1');
      expect(leaveResult.isRoomAbandoned).toBe(false);
      expect(leaveResult.newHostId).toBe('player2');
      expect(room.hostId).toBe('player2');
      expect(room.getPlayerById('player2')?.isHost).toBe(true);
      expect(room.getPlayers()).toHaveLength(1);
    });

    it('marks room as abandoned and removes it from manager when last player leaves', () => {
      const room = manager.createRoom('singleHost', 'وحيد', 'INDIVIDUAL_2P');
      const roomId = room.roomId;

      expect(manager.getRoom(roomId)).toBeDefined();

      const result = manager.leaveRoom(roomId, 'singleHost');
      expect(result.isRoomAbandoned).toBe(true);
      expect(manager.getRoom(roomId)).toBeUndefined();
    });
  });

  describe('TEST-9.6: Quick Random Matchmaking (التوفيق العشوائي السريع)', () => {
    it('creates a new room when no available room exists in the requested mode', () => {
      const result = manager.quickMatch('p1', 'المعلم صبحي', 'INDIVIDUAL_2P', true);

      expect(result.isNewRoom).toBe(true);
      expect(result.roundStarted).toBe(false);
      expect(result.room.roomId).toHaveLength(6);
      expect(result.room.getPlayers()).toHaveLength(1);
      expect(result.player.displayName).toBe('المعلم صبحي');
      expect(result.player.isReady).toBe(true);
    });

    it('joins an existing waiting room and starts the round when all players are ready', () => {
      const first = manager.quickMatch('p1', 'المعلم صبحي', 'INDIVIDUAL_2P', true);
      expect(first.isNewRoom).toBe(true);
      expect(first.roundStarted).toBe(false);

      // Player 2 searches for random match in 2P mode
      const second = manager.quickMatch('p2', 'عم شكشك', 'INDIVIDUAL_2P', true);

      expect(second.isNewRoom).toBe(false);
      expect(second.room.roomId).toBe(first.room.roomId);
      expect(second.room.getPlayers()).toHaveLength(2);
      expect(second.player.seat).toBe(1);
      expect(second.roundStarted).toBe(true);
      expect(second.room.status).toBe('IN_ROUND');
    });

    it('matches 4 players in TEAM_4P mode across teams correctly', () => {
      const p1 = manager.quickMatch('p1', 'لاعب 1', 'TEAM_4P', true);
      const p2 = manager.quickMatch('p2', 'لاعب 2', 'TEAM_4P', true);
      const p3 = manager.quickMatch('p3', 'لاعب 3', 'TEAM_4P', true);
      const p4 = manager.quickMatch('p4', 'لاعب 4', 'TEAM_4P', true);

      expect(p1.isNewRoom).toBe(true);
      expect(p2.isNewRoom).toBe(false);
      expect(p3.isNewRoom).toBe(false);
      expect(p4.isNewRoom).toBe(false);

      expect(p4.room.roomId).toBe(p1.room.roomId);
      expect(p4.room.getPlayers()).toHaveLength(4);
      expect(p4.roundStarted).toBe(true);
      expect(p4.room.status).toBe('IN_ROUND');
    });
  });
});
