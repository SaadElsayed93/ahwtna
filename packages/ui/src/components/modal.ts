import { renderAhwaButton } from './button.js';

export interface AhwaModalProps {
  title: string;
  subtitle?: string;
  bodyHtml: string;
  primaryAction: {
    label: string;
    onClickAttr: string;
  };
  secondaryAction?: {
    label: string;
    onClickAttr: string;
  };
  variant?: 'gold' | 'success' | 'danger';
  id?: string;
  className?: string;
}

/**
 * نافذة حوارية منبثقة بتصميم القهوة التراثي لإعلانات النتائج
 */
export function renderAhwaModal(props: AhwaModalProps): string {
  const {
    title,
    subtitle = '',
    bodyHtml,
    primaryAction,
    secondaryAction,
    variant = 'gold',
    id = '',
    className = '',
  } = props;

  const idAttr = id ? `id="${id}"` : '';

  const primaryBtn = renderAhwaButton({
    label: primaryAction.label,
    variant: variant === 'danger' ? 'danger' : 'gold',
    size: 'lg',
    onClickAttr: primaryAction.onClickAttr,
  });

  const secondaryBtn = secondaryAction
    ? renderAhwaButton({
        label: secondaryAction.label,
        variant: 'wood',
        size: 'lg',
        onClickAttr: secondaryAction.onClickAttr,
      })
    : '';

  return `
    <div class="ahwa-modal-backdrop ${className}" ${idAttr} role="dialog" aria-modal="true" aria-labelledby="${id}-title">
      <div class="ahwa-modal-card variant-${variant}">
        <div class="ahwa-modal-header">
          <h3 id="${id}-title" class="ahwa-modal-title">${title}</h3>
          ${subtitle ? `<p class="ahwa-modal-subtitle">${subtitle}</p>` : ''}
        </div>
        <div class="ahwa-modal-body">
          ${bodyHtml}
        </div>
        <div class="ahwa-modal-footer">
          ${primaryBtn}
          ${secondaryBtn}
        </div>
      </div>
    </div>
  `.trim();
}
