import { describe, expect, it } from 'vitest';
import { GameRoom } from '../src/room/game-room.js';
import { ReconnectManager } from '../src/sync/reconnect-manager.js';

describe('ReconnectManager (45s Reconnection Window & Forfeit)', () => {
  it('marks player disconnected and successfully reconnects within grace window', () => {
    const manager = new ReconnectManager({ gracePeriodMs: 500 });
    const room = new GameRoom('REC101', 'INDIVIDUAL_2P', 'p1', 'لاعب 1');
    room.joinPlayer('p2', 'لاعب 2', 1);

    expect(room.getPlayerById('p1')?.isConnected).toBe(true);

    // تسجيل انقطاع الاتصال
    let forfeitCalled = false;
    manager.handleDisconnect(room, 'p1', () => {
      forfeitCalled = true;
    });

    expect(room.getPlayerById('p1')?.isConnected).toBe(false);
    expect(manager.getRemainingGraceMs(room.roomId, 'p1')).toBeGreaterThan(0);

    // إعادة الاتصال قبل انقضاء المهلة (بمعرف سوكت جديد)
    const reconnected = manager.handleReconnect(room, 'p1', 'p1_new_socket');
    expect(reconnected).toBeDefined();
    expect(reconnected?.isConnected).toBe(true);
    expect(reconnected?.id).toBe('p1_new_socket');
    expect(room.getPlayerById('p1_new_socket')?.isConnected).toBe(true);
    expect(forfeitCalled).toBe(false);

    manager.clearAll();
  });

  it('triggers forfeit when grace window expires without reconnection', async () => {
    const manager = new ReconnectManager({ gracePeriodMs: 60 });
    const room = new GameRoom('REC102', 'INDIVIDUAL_2P', 'p1', 'لاعب 1');
    room.joinPlayer('p2', 'لاعب 2', 1);

    let forfeitedPlayerId = '';
    manager.handleDisconnect(room, 'p2', (_r, player) => {
      forfeitedPlayerId = player.id;
    });

    // انتظار 100ms لتجاوز نافذة الـ 60ms
    await new Promise((r) => setTimeout(r, 100));

    expect(forfeitedPlayerId).toBe('p2');
    manager.clearAll();
  });
});
