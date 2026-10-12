import type { PipValue } from '@ahwtna/shared';
import { PIP_LAYOUTS, getTileArabicDescription } from './pip-matrix.js';
import { AHWA_COLORS } from '../tokens/colors.js';

export type TileOrientation = 'vertical' | 'horizontal';
export type TileSize = 'sm' | 'md' | 'lg';
export type TileState = 'idle' | 'playable' | 'selected' | 'disabled';

export interface TileRenderOptions {
  left: PipValue;
  right: PipValue;
  orientation?: TileOrientation;
  size?: TileSize;
  state?: TileState;
  faceDown?: boolean;
  showBrassPin?: boolean;
  id?: string;
  className?: string;
  dataTileId?: string;
  onClickAttr?: string;
}

const SIZE_DIMENSIONS: Record<TileSize, { width: number; height: number; pipRadius: number }> = {
  sm: { width: 32, height: 64, pipRadius: 2.2 },
  md: { width: 44, height: 88, pipRadius: 3.2 },
  lg: { width: 56, height: 112, pipRadius: 4.2 },
};

/**
 * توليد كود SVG نقي عالي الدقة (Retina-ready) للبلاطة
 */
export function renderTileSvg(options: TileRenderOptions): string {
  const {
    left,
    right,
    orientation = 'vertical',
    size = 'md',
    state = 'idle',
    faceDown = false,
    showBrassPin = true,
    dataTileId = `${left}|${right}`,
  } = options;

  const baseDim = SIZE_DIMENSIONS[size];
  const isHoriz = orientation === 'horizontal';
  const width = isHoriz ? baseDim.height : baseDim.width;
  const height = isHoriz ? baseDim.width : baseDim.height;
  const halfLength = (isHoriz ? width : height) / 2;
  const pipR = baseDim.pipRadius;

  const { title, ariaLabel } = getTileArabicDescription(left, right);

  // أنماط التوهج والإطار حسب الحالة
  let strokeColor: string = AHWA_COLORS.tileBorder;
  if (state === 'playable') {
    strokeColor = AHWA_COLORS.warmGold;
  } else if (state === 'selected') {
    strokeColor = AHWA_COLORS.warmGold;
  } else if (state === 'disabled') {
    strokeColor = '#A0A0A0';
  }

  // إذا كانت البلاطة مقلوبة (Face Down)
  if (faceDown) {
    return `
      <svg class="ahwa-domino-tile ahwa-tile-facedown size-${size} ${options.className || ''}"
           xmlns="http://www.w3.org/2000/svg"
           viewBox="0 0 ${width} ${height}"
           width="${width}"
           height="${height}"
           role="img"
           aria-label="بلاطة مقلوبة"
           ${options.id ? `id="${options.id}"` : ''}>
        <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="6" ry="6"
              fill="${AHWA_COLORS.walnutWood}" stroke="${AHWA_COLORS.warmGold}" stroke-width="1.5" />
        <rect x="4" y="4" width="${width - 8}" height="${height - 8}" rx="4" ry="4"
              fill="none" stroke="${AHWA_COLORS.warmGold}" stroke-dasharray="3,3" stroke-width="1" opacity="0.6" />
      </svg>
    `.trim();
  }

  // دالة مساعدة لرسم النقاط في نصف البلاطة
  const renderPipsForValue = (val: PipValue, offsetX: number, offsetY: number, boxW: number, boxH: number) => {
    const layout = PIP_LAYOUTS[val];
    return layout
      .map((coord) => {
        const cx = offsetX + coord.x * boxW;
        const cy = offsetY + coord.y * boxH;
        return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${pipR}" fill="${AHWA_COLORS.pipDark}" />`;
      })
      .join('\n');
  };

  let leftHalfPips = '';
  let rightHalfPips = '';
  let dividerLine = '';
  let pinElement = '';

  if (isHoriz) {
    // أفقي: نصف أيسر ونصف أيمن
    leftHalfPips = renderPipsForValue(left, 0, 0, halfLength, height);
    rightHalfPips = renderPipsForValue(right, halfLength, 0, halfLength, height);
    dividerLine = `<line x1="${halfLength}" y1="4" x2="${halfLength}" y2="${height - 4}" stroke="${AHWA_COLORS.tileBorder}" stroke-width="1.5" />`;
    if (showBrassPin) {
      pinElement = `<circle cx="${halfLength}" cy="${height / 2}" r="${pipR * 0.9}" fill="${AHWA_COLORS.brassGold}" stroke="${AHWA_COLORS.pipDark}" stroke-width="0.5" />`;
    }
  } else {
    // رأسي: نصف علوي ونصف سفلي
    leftHalfPips = renderPipsForValue(left, 0, 0, width, halfLength);
    rightHalfPips = renderPipsForValue(right, 0, halfLength, width, halfLength);
    dividerLine = `<line x1="4" y1="${halfLength}" x2="${width - 4}" y2="${halfLength}" stroke="${AHWA_COLORS.tileBorder}" stroke-width="1.5" />`;
    if (showBrassPin) {
      pinElement = `<circle cx="${width / 2}" cy="${halfLength}" r="${pipR * 0.9}" fill="${AHWA_COLORS.brassGold}" stroke="${AHWA_COLORS.pipDark}" stroke-width="0.5" />`;
    }
  }

  const clickableAttr = options.onClickAttr ? `onclick="${options.onClickAttr}"` : '';
  const customId = options.id ? `id="${options.id}"` : '';

  return `
    <svg class="ahwa-domino-tile orientation-${orientation} size-${size} state-${state} ${options.className || ''}"
         xmlns="http://www.w3.org/2000/svg"
         viewBox="0 0 ${width} ${height}"
         width="${width}"
         height="${height}"
         role="button"
         tabindex="${state === 'playable' ? '0' : '-1'}"
         aria-label="${ariaLabel}"
         data-tile-id="${dataTileId}"
         ${customId}
         ${clickableAttr}>
      <title>${title}</title>
      <!-- جسم البلاطة العاجية مع شطفة حافة خفيفة -->
      <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="6" ry="6"
            fill="${AHWA_COLORS.tileIvory}" stroke="${strokeColor}" stroke-width="2" />
      <!-- الخط الفاصل ودبوس النحاس التراثي -->
      ${dividerLine}
      ${pinElement}
      <!-- نقاط النصفين -->
      ${leftHalfPips}
      ${rightHalfPips}
    </svg>
  `.trim();
}

/**
 * توليد كود HTML كامل لتمثيل البلاطة مع دعم كامل للـ DOM والـ CSS Styles
 */
export function renderTileHtml(options: TileRenderOptions): string {
  const {
    left,
    right,
    orientation = 'vertical',
    size = 'md',
    state = 'idle',
    dataTileId = `${left}|${right}`,
  } = options;

  const { title, ariaLabel } = getTileArabicDescription(left, right);
  const svgContent = renderTileSvg(options);
  const clickAttr = options.onClickAttr ? `onclick="${options.onClickAttr}"` : '';

  return `
    <div class="ahwa-tile-wrapper orientation-${orientation} size-${size} state-${state} ${options.className || ''}"
         data-tile-id="${dataTileId}"
         data-left="${left}"
         data-right="${right}"
         title="${title}"
         aria-label="${ariaLabel}"
         role="${state === 'playable' ? 'button' : 'figure'}"
         tabindex="${state === 'playable' ? '0' : '-1'}"
         ${options.id ? `id="${options.id}"` : ''}
         ${clickAttr}>
      ${svgContent}
    </div>
  `.trim();
}
