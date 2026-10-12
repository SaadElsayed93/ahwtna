export interface PlayerScoreItem {
  id: string;
  name: string;
  penaltyScore: number;
  tileCount?: number;
  isLeader?: boolean;
}

export interface ScoreBoardProps {
  roundNumber: number;
  players: PlayerScoreItem[];
  matchLimit?: number; // default 101
  className?: string;
  id?: string;
}

/**
 * لوحة رصيد كلاسيكية تحاكي نوتة حساب القهوة المصرية التراثية
 */
export function renderScoreBoard(props: ScoreBoardProps): string {
  const {
    roundNumber,
    players,
    matchLimit = 101,
    className = '',
    id = '',
  } = props;

  const idAttr = id ? `id="${id}"` : '';

  const playerRows = players
    .map((p) => {
      const isCritical = p.penaltyScore >= 85;
      const isLost = p.penaltyScore >= matchLimit;
      const progressPercent = Math.min(100, Math.round((p.penaltyScore / matchLimit) * 100));

      const statusBadge = isLost
        ? '<span class="ahwa-pill ahwa-pill-lost">خسر الماتش</span>'
        : isCritical
        ? '<span class="ahwa-pill ahwa-pill-critical">في خطر!</span>'
        : '';

      return `
        <div class="ahwa-score-row ${isCritical ? 'is-critical' : ''} ${isLost ? 'is-lost' : ''}">
          <div class="ahwa-score-player-col">
            <span class="ahwa-score-player-name">${p.name}</span>
            ${statusBadge}
          </div>
          <div class="ahwa-score-points-col">
            <span class="ahwa-score-number">${p.penaltyScore}</span>
            <span class="ahwa-score-limit">/ ${matchLimit}</span>
          </div>
          <div class="ahwa-score-bar-container" title="${progressPercent}% من حد الـ 101">
            <div class="ahwa-score-bar-fill ${isCritical ? 'fill-critical' : ''}" style="width: ${progressPercent}%"></div>
          </div>
        </div>
      `.trim();
    })
    .join('\n');

  return `
    <div class="ahwa-scoreboard-notebook ${className}" ${idAttr} role="region" aria-label="نوتة حساب القهوة">
      <div class="ahwa-notebook-header">
        <div class="ahwa-notebook-title">
          <span class="ahwa-coffee-cup-icon" aria-hidden="true">☕</span>
          <h4>نوتة الحساب</h4>
        </div>
        <div class="ahwa-round-indicator">
          <span>الجولة:</span>
          <strong>${roundNumber}</strong>
        </div>
      </div>
      <div class="ahwa-notebook-divider" aria-hidden="true"></div>
      <div class="ahwa-scoreboard-rows">
        ${playerRows}
      </div>
      <div class="ahwa-notebook-footer">
        <small>الوصول لـ 101 نقطة جزاء يعني خسارة الماتش فوراً</small>
      </div>
    </div>
  `.trim();
}
