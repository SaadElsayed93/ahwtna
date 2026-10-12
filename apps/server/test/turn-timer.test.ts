import { describe, expect, it } from 'vitest';
import { GameRoom } from '../src/room/game-room.js';
import { TurnTimerManager } from '../src/sync/turn-timer.js';

describe('TurnTimerManager (30s Server Turn Timer)', () => {
  it('triggers auto-action when timer expires and advances game state', async () => {
    // نستخدم timeout صغير للاختبار (50ms) بدلاً من 30 ثانية
    const timerManager = new TurnTimerManager({ timeoutMs: 50 });
    const room = new GameRoom('TMR101', 'INDIVIDUAL_2P', 'p1', 'لاعب 1');
    room.joinPlayer('p2', 'لاعب 2', 1);
    room.startNextRound(12345); // بذرة حتمية

    const initialSeat = room.activeRound!.currentTurnSeat;
    const initialVersion = room.stateVersion;

    let autoActionCalled = false;
    await new Promise<void>((resolve) => {
      timerManager.startTurnTimer(room, (res) => {
        autoActionCalled = true;
        expect(res.seat).toBe(initialSeat);
        resolve();
      });
    });

    expect(autoActionCalled).toBe(true);
    // تأكيد تقدم نسخة الحالة وتغير أو استمرار الدور
    expect(room.stateVersion).toBeGreaterThan(initialVersion);
    timerManager.clearAll();
  });

  it('cancels timer and does not trigger fallback if cleared in time', async () => {
    const timerManager = new TurnTimerManager({ timeoutMs: 60 });
    const room = new GameRoom('TMR102', 'INDIVIDUAL_2P', 'p1', 'لاعب 1');
    room.joinPlayer('p2', 'لاعب 2', 1);
    room.startNextRound(12345);

    let triggered = false;
    timerManager.startTurnTimer(room, () => {
      triggered = true;
    });

    // إلغاء المؤقت بعد 20ms
    await new Promise((r) => setTimeout(r, 20));
    timerManager.clearTurnTimer(room.roomId);

    // انتظار انقضاء الـ 60ms والتأكد من عدم الاستدعاء
    await new Promise((r) => setTimeout(r, 70));
    expect(triggered).toBe(false);
    timerManager.clearAll();
  });
});
