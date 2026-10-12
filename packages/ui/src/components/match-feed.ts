export interface MatchFeedEvent {
  id: string;
  timestamp: string;
  type: 'PLAY' | 'DRAW' | 'PASS' | 'DOMINO' | 'BLOCKED' | 'SYSTEM';
  text: string;
  playerName?: string;
  tileId?: string;
}

export interface MatchFeedProps {
  events: MatchFeedEvent[];
  maxItems?: number;
  className?: string;
  id?: string;
}

/**
 * شريط أحداث المباراة المباشر بصيغة عربية أصيلة
 */
export function renderMatchFeed(props: MatchFeedProps): string {
  const { events, maxItems = 10, className = '', id = '' } = props;
  const idAttr = id ? `id="${id}"` : '';

  const items = events
    .slice(-maxItems)
    .reverse()
    .map((evt) => {
      let icon = '🎲';
      if (evt.type === 'DOMINO') icon = '🏆';
      else if (evt.type === 'BLOCKED') icon = '🔒';
      else if (evt.type === 'DRAW') icon = '📥';
      else if (evt.type === 'PASS') icon = '⏭️';

      return `
        <div class="ahwa-feed-item type-${evt.type.toLowerCase()}">
          <span class="ahwa-feed-icon" aria-hidden="true">${icon}</span>
          <span class="ahwa-feed-text">${evt.text}</span>
          <span class="ahwa-feed-time">${evt.timestamp}</span>
        </div>
      `.trim();
    })
    .join('\n');

  return `
    <div class="ahwa-match-feed ${className}" ${idAttr} role="log" aria-label="سجل أحداث المباراة" aria-live="polite">
      <div class="ahwa-feed-header">
        <h5>شريط أحداث الطاولة</h5>
      </div>
      <div class="ahwa-feed-list">
        ${items.length > 0 ? items : '<div class="ahwa-feed-empty">المباراة في بدايتها... كل واحد يجهز ورقه!</div>'}
      </div>
    </div>
  `.trim();
}
