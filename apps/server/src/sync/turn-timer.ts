import type { SeatIndex } from '@ahwtna/shared';
import { chooseAIMove } from '@ahwtna/game-engine';
import type { GameRoom } from '../room/game-room.js';

export interface TurnTimerOptions {
  timeoutMs?: number;
}

export class TurnTimerManager {
  public readonly timeoutMs: number;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private turnStartTimes: Map<string, number> = new Map();

  constructor(options?: TurnTimerOptions) {
    this.timeoutMs = options?.timeoutMs ?? 30_000; // 30 ثانية افتراضياً
  }

  /**
   * بدء مؤقت الدور للمقعد الحالي في الغرفة
   */
  public startTurnTimer(
    room: GameRoom,
    onAutoAction: (actionResult: {
      actionType: 'PLAY' | 'DRAW' | 'PASS';
      seat: SeatIndex;
    }) => void
  ): void {
    this.clearTurnTimer(room.roomId);

    if (room.status !== 'IN_ROUND' || !room.activeRound) {
      return;
    }

    const currentSeat = room.activeRound.currentTurnSeat;
    this.turnStartTimes.set(room.roomId, Date.now());

    const timer = setTimeout(() => {
      this.timers.delete(room.roomId);
      this.turnStartTimes.delete(room.roomId);

      if (room.status !== 'IN_ROUND' || !room.activeRound) {
        return;
      }

      if (room.activeRound.currentTurnSeat !== currentSeat) {
        return;
      }

      // حساب الحركة التلقائية بالذكاء الاصطناعي التكتيكي لضمان استمرار اللعب دون تجميد
      const hand = room.activeRound.hands.get(currentSeat) ?? [];
      const aiAction = chooseAIMove({
        seat: currentSeat,
        hand,
        board: room.activeRound.board,
        mode: room.mode,
        boneyardCount: room.activeRound.boneyard.length,
      });

      try {
        if (aiAction.action === 'PLAY') {
          room.executeCommand({
            type: 'PLAY_TILE',
            seat: currentSeat,
            tileId: `${aiAction.tile[0]}|${aiAction.tile[1]}`,
            targetEnd: aiAction.targetEnd,
            clientCommandId: `auto-play-${Date.now()}`,
            expectedStateVersion: room.stateVersion,
          });
          onAutoAction({ actionType: 'PLAY', seat: currentSeat });
        } else if (aiAction.action === 'DRAW') {
          room.executeCommand({
            type: 'DRAW_TILE',
            seat: currentSeat,
            clientCommandId: `auto-draw-${Date.now()}`,
            expectedStateVersion: room.stateVersion,
          });
          onAutoAction({ actionType: 'DRAW', seat: currentSeat });
        } else if (aiAction.action === 'PASS') {
          room.executeCommand({
            type: 'PASS',
            seat: currentSeat,
            clientCommandId: `auto-pass-${Date.now()}`,
            expectedStateVersion: room.stateVersion,
          });
          onAutoAction({ actionType: 'PASS', seat: currentSeat });
        }
      } catch (err) {
        // في حال فشل الحركة لأي سبب، نتأكد من التمرير أو تفادي الـ deadlock
        console.error(`خطأ أثناء تنفيذ الحركة التلقائية للمقعد ${currentSeat}:`, err);
      }
    }, this.timeoutMs);

    this.timers.set(room.roomId, timer);
  }

  /**
   * إلغاء مؤقت الدور الحالي للغرفة
   */
  public clearTurnTimer(roomId: string): void {
    const timer = this.timers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(roomId);
      this.turnStartTimes.delete(roomId);
    }
  }

  /**
   * معرفة الوقت المتبقي من مهلة الـ 30 ثانية
   */
  public getTimeRemainingMs(roomId: string): number {
    const startTime = this.turnStartTimes.get(roomId);
    if (!startTime) return 0;
    const elapsed = Date.now() - startTime;
    return Math.max(0, this.timeoutMs - elapsed);
  }

  public clearAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.turnStartTimes.clear();
  }
}
