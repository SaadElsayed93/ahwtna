export type ButtonVariant = 'primary' | 'gold' | 'wood' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface AhwaButtonProps {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  icon?: string;
  id?: string;
  className?: string;
  onClickAttr?: string;
  ariaLabel?: string;
}

/**
 * توليد كود زر القهوة التراثي (Tactile Ahwa Button)
 */
export function renderAhwaButton(props: AhwaButtonProps): string {
  const {
    label,
    variant = 'primary',
    size = 'md',
    disabled = false,
    icon = '',
    id,
    className = '',
    onClickAttr = '',
    ariaLabel,
  } = props;

  const idAttr = id ? `id="${id}"` : '';
  const clickAttr = onClickAttr && !disabled ? `onclick="${onClickAttr}"` : '';
  const disabledAttr = disabled ? 'disabled="disabled" aria-disabled="true"' : '';
  const ariaAttr = ariaLabel ? `aria-label="${ariaLabel}"` : '';

  const iconMarkup = icon ? `<span class="ahwa-btn-icon">${icon}</span>` : '';

  return `
    <button class="ahwa-btn ahwa-btn-${variant} ahwa-btn-${size} ${className}"
            type="button"
            ${idAttr}
            ${clickAttr}
            ${disabledAttr}
            ${ariaAttr}>
      ${iconMarkup}
      <span class="ahwa-btn-label">${label}</span>
    </button>
  `.trim();
}
