export interface TurnIndicatorProps {
  playerName: string;
  avatarChar: string;
  isCurrentTurn: boolean;
  tileCount: number;
  teamLabel?: string;
  timerSeconds?: number;
  maxTimerSeconds?: number;
  className?: string;
  id?: string;
}

/**
 * شارة دور اللاعب مع وهج ذهبي هادئ وعداد الوقت التنازلي
 */
export function renderTurnIndicator(props: TurnIndicatorProps): string {
  const {
    playerName,
    avatarChar,
    isCurrentTurn,
    tileCount,
    teamLabel = '',
    timerSeconds,
    maxTimerSeconds = 30,
    className = '',
    id = '',
  } = props;

  const activeClass = isCurrentTurn ? 'is-active-turn' : '';
  const idAttr = id ? `id="${id}"` : '';

  // حساب النسبة المئوية للمؤقت الدائري إن وجد
  let timerRingSvg = '';
  if (timerSeconds !== undefined && isCurrentTurn) {
    const radius = 26;
    const circ = 2 * Math.PI * radius;
    const progress = Math.max(0, Math.min(1, timerSeconds / maxTimerSeconds));
    const dashoffset = circ * (1 - progress);
    const strokeColor = timerSeconds <= 5 ? '#D32F2F' : '#D4AF37';

    timerRingSvg = `
      <svg class="ahwa-turn-timer-ring" width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="${radius}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="3" />
        <circle cx="30" cy="30" r="${radius}" fill="none" stroke="${strokeColor}" stroke-width="3"
                stroke-dasharray="${circ}" stroke-dashoffset="${dashoffset}"
                stroke-linecap="round" transform="rotate(-90 30 30)" />
      </svg>
    `.trim();
  }

  return `
    <div class="ahwa-turn-indicator ${activeClass} ${className}" ${idAttr} role="status" aria-live="polite">
      <div class="ahwa-avatar-container">
        ${timerRingSvg}
        <div class="ahwa-avatar" aria-hidden="true">${avatarChar}</div>
        ${isCurrentTurn ? '<div class="ahwa-turn-glow" aria-hidden="true"></div>' : ''}
      </div>
      <div class="ahwa-player-meta">
        <div class="ahwa-player-name-row">
          <span class="ahwa-player-name">${playerName}</span>
          ${teamLabel ? `<span class="ahwa-team-badge">${teamLabel}</span>` : ''}
        </div>
        <div class="ahwa-player-status">
          ${isCurrentTurn ? '<span class="ahwa-turn-badge">الدور عليه</span>' : ''}
          <span class="ahwa-tile-count">معه ${tileCount} قطع</span>
        </div>
      </div>
    </div>
  `.trim();
}
