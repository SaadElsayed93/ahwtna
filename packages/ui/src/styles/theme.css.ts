import { AHWA_COLORS } from '../tokens/colors.js';
import { AHWA_TYPOGRAPHY } from '../tokens/typography.js';

export function getAhwaCss(): string {
  return `
/* ==========================================================================
   قهوتنا | ahwtna — Master Egyptian Ahwa Stylesheet & Design System
   ========================================================================== */

:root {
  --ahwa-dark-green: ${AHWA_COLORS.darkGreen};
  --ahwa-table-green: ${AHWA_COLORS.tableGreen};
  --ahwa-deep-emerald: ${AHWA_COLORS.deepEmerald};
  --ahwa-cream-paper: ${AHWA_COLORS.creamPaper};
  --ahwa-cream-soft: ${AHWA_COLORS.creamSoft};
  --ahwa-parchment: ${AHWA_COLORS.parchment};
  --ahwa-warm-gold: ${AHWA_COLORS.warmGold};
  --ahwa-brass-gold: ${AHWA_COLORS.brassGold};
  --ahwa-pale-gold: ${AHWA_COLORS.paleGold};
  --ahwa-walnut-wood: ${AHWA_COLORS.walnutWood};
  --ahwa-rich-wood: ${AHWA_COLORS.richWood};
  --ahwa-mahogany: ${AHWA_COLORS.mahogany};
  --ahwa-tile-ivory: ${AHWA_COLORS.tileIvory};
  --ahwa-tile-shade: ${AHWA_COLORS.tileIvoryShade};
  --ahwa-pip-dark: ${AHWA_COLORS.pipDark};
  --ahwa-tile-border: ${AHWA_COLORS.tileBorder};
  --ahwa-danger-red: ${AHWA_COLORS.dangerRed};
  --ahwa-danger-bg: ${AHWA_COLORS.dangerBg};
  --ahwa-success-green: ${AHWA_COLORS.successGreen};
  --ahwa-success-bg: ${AHWA_COLORS.successBg};
  --ahwa-shadow-deep: ${AHWA_COLORS.shadowDeep};
  --ahwa-shadow-med: ${AHWA_COLORS.shadowMedium};
  --ahwa-shadow-soft: ${AHWA_COLORS.shadowSoft};
  --ahwa-gold-glow: ${AHWA_COLORS.goldGlow};
  --ahwa-font: ${AHWA_TYPOGRAPHY.fontFamily};
}

/* Base RTL settings */
html[dir="rtl"], body[dir="rtl"], .ahwa-root-rtl {
  direction: rtl;
  text-align: right;
  font-family: var(--ahwa-font);
}

/* ==========================================================================
   Domino Tiles Styling & Tactile Animations
   ========================================================================== */

.ahwa-domino-tile {
  display: inline-block;
  vertical-align: middle;
  border-radius: 6px;
  filter: drop-shadow(0 3px 6px var(--ahwa-shadow-deep));
  transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.16s ease;
  user-select: none;
  cursor: default;
}

.ahwa-tile-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  touch-action: manipulation;
  position: relative;
}

.ahwa-tile-wrapper.state-playable .ahwa-domino-tile,
.ahwa-domino-tile.state-playable {
  cursor: pointer;
  filter: drop-shadow(0 4px 10px var(--ahwa-gold-glow)) drop-shadow(0 2px 4px var(--ahwa-shadow-deep));
}

.ahwa-tile-wrapper.state-playable:hover .ahwa-domino-tile,
.ahwa-domino-tile.state-playable:hover {
  transform: translateY(-8px) scale(1.05);
  filter: drop-shadow(0 8px 18px var(--ahwa-warm-gold)) drop-shadow(0 4px 8px var(--ahwa-shadow-deep));
}

.ahwa-tile-wrapper.state-selected .ahwa-domino-tile,
.ahwa-domino-tile.state-selected {
  transform: translateY(-10px) scale(1.08);
  filter: drop-shadow(0 0 16px var(--ahwa-warm-gold)) drop-shadow(0 6px 12px var(--ahwa-shadow-deep));
}

.ahwa-tile-wrapper.state-disabled .ahwa-domino-tile,
.ahwa-domino-tile.state-disabled {
  opacity: 0.55;
  filter: grayscale(40%) drop-shadow(0 1px 2px var(--ahwa-shadow-soft));
  cursor: not-allowed;
}

@keyframes ahwa-tile-slam {
  0% {
    transform: scale(1.3) translateY(-15px);
    opacity: 0.8;
  }
  60% {
    transform: scale(0.97) translateY(2px);
    opacity: 1;
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.ahwa-tile-slam-animate {
  animation: ahwa-tile-slam 0.22s cubic-bezier(0.2, 0.8, 0.4, 1) forwards;
}

/* ==========================================================================
   Tactile Ahwa Buttons
   ========================================================================== */

.ahwa-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: var(--ahwa-font);
  font-weight: 700;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  padding: 10px 20px;
  transition: all 0.15s ease-in-out;
  text-decoration: none;
  user-select: none;
}

.ahwa-btn-sm {
  font-size: 13px;
  padding: 6px 14px;
}

.ahwa-btn-md {
  font-size: 15px;
  padding: 10px 20px;
}

.ahwa-btn-lg {
  font-size: 18px;
  padding: 14px 28px;
}

.ahwa-btn-primary {
  background: linear-gradient(135deg, var(--ahwa-table-green) 0%, var(--ahwa-dark-green) 100%);
  color: var(--ahwa-cream-paper);
  border: 1.5px solid var(--ahwa-warm-gold);
  box-shadow: 0 4px 12px var(--ahwa-shadow-med);
}

.ahwa-btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #185a47 0%, #104637 100%);
  border-color: var(--ahwa-pale-gold);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px var(--ahwa-shadow-deep);
}

.ahwa-btn-gold {
  background: linear-gradient(135deg, var(--ahwa-warm-gold) 0%, var(--ahwa-brass-gold) 100%);
  color: var(--ahwa-walnut-wood);
  border: 1.5px solid var(--ahwa-pale-gold);
  box-shadow: 0 4px 12px var(--ahwa-gold-glow);
}

.ahwa-btn-gold:hover:not(:disabled) {
  transform: translateY(-2px);
  filter: brightness(1.1);
  box-shadow: 0 6px 18px var(--ahwa-warm-gold);
}

.ahwa-btn-wood {
  background: linear-gradient(135deg, var(--ahwa-mahogany) 0%, var(--ahwa-walnut-wood) 100%);
  color: var(--ahwa-cream-paper);
  border: 1px solid rgba(212, 175, 55, 0.4);
  box-shadow: 0 4px 10px var(--ahwa-shadow-med);
}

.ahwa-btn-wood:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: var(--ahwa-warm-gold);
}

.ahwa-btn-danger {
  background: linear-gradient(135deg, #E53935 0%, var(--ahwa-danger-red) 100%);
  color: #FFFFFF;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(211, 47, 47, 0.4);
}

.ahwa-btn-danger:hover:not(:disabled) {
  transform: translateY(-2px);
  filter: brightness(1.1);
}

.ahwa-btn:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: 0 2px 4px var(--ahwa-shadow-med);
}

.ahwa-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(50%);
  transform: none !important;
}

/* ==========================================================================
   Turn Indicator & Player Aura
   ========================================================================== */

.ahwa-turn-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(13, 59, 46, 0.7);
  padding: 8px 16px;
  border-radius: 30px;
  border: 1.5px solid rgba(212, 175, 55, 0.3);
  transition: all 0.25s ease;
}

.ahwa-turn-indicator.is-active-turn {
  background: rgba(13, 59, 46, 0.95);
  border-color: var(--ahwa-warm-gold);
  box-shadow: 0 0 16px var(--ahwa-gold-glow);
}

.ahwa-avatar-container {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ahwa-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--ahwa-warm-gold);
  color: var(--ahwa-walnut-wood);
  font-weight: 900;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--ahwa-cream-paper);
}

.ahwa-turn-glow {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid var(--ahwa-warm-gold);
  animation: ahwa-glow-pulse 1.8s infinite;
}

@keyframes ahwa-glow-pulse {
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 0.3; }
  100% { transform: scale(1); opacity: 0.8; }
}

.ahwa-player-name {
  font-weight: 700;
  font-size: 15px;
  color: var(--ahwa-cream-paper);
}

.ahwa-tile-count {
  font-size: 12px;
  color: var(--ahwa-pale-gold);
}

.ahwa-turn-badge {
  background: var(--ahwa-warm-gold);
  color: var(--ahwa-walnut-wood);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 6px;
}

/* ==========================================================================
   Notebook Scoreboard (نوتة حساب القهوة)
   ========================================================================== */

.ahwa-scoreboard-notebook {
  background: var(--ahwa-cream-paper);
  color: var(--ahwa-walnut-wood);
  border-radius: 12px;
  padding: 16px;
  border: 2px solid var(--ahwa-warm-gold);
  box-shadow: 0 8px 24px var(--ahwa-shadow-deep);
  min-width: 260px;
}

.ahwa-notebook-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.ahwa-notebook-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ahwa-walnut-wood);
}

.ahwa-notebook-title h4 {
  font-size: 18px;
  font-weight: 800;
}

.ahwa-notebook-divider {
  height: 2px;
  background: repeating-linear-gradient(90deg, var(--ahwa-brass-gold) 0, var(--ahwa-brass-gold) 6px, transparent 6px, transparent 10px);
  margin-bottom: 12px;
}

.ahwa-score-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0;
  border-bottom: 1px dashed rgba(45, 26, 18, 0.15);
}

.ahwa-score-player-col {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ahwa-score-player-name {
  font-weight: 700;
  font-size: 14px;
}

.ahwa-score-number {
  font-weight: 900;
  font-size: 20px;
  color: var(--ahwa-dark-green);
}

.ahwa-score-row.is-critical .ahwa-score-number {
  color: var(--ahwa-danger-red);
}

.ahwa-score-bar-container {
  height: 6px;
  background: rgba(45, 26, 18, 0.12);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 4px;
}

.ahwa-score-bar-fill {
  height: 100%;
  background: var(--ahwa-table-green);
  transition: width 0.3s ease;
}

.ahwa-score-bar-fill.fill-critical {
  background: var(--ahwa-danger-red);
}

.ahwa-pill {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
}

.ahwa-pill-critical {
  background: var(--ahwa-danger-bg);
  color: var(--ahwa-danger-red);
}

.ahwa-pill-lost {
  background: var(--ahwa-danger-red);
  color: #fff;
}

.ahwa-notebook-footer {
  margin-top: 10px;
  font-size: 11px;
  color: #666;
  text-align: center;
}

/* ==========================================================================
   Modals & Feed
   ========================================================================== */

.ahwa-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}

.ahwa-modal-card {
  background: var(--ahwa-walnut-wood);
  color: var(--ahwa-cream-paper);
  border: 2px solid var(--ahwa-warm-gold);
  border-radius: 16px;
  padding: 24px;
  max-width: 440px;
  width: 100%;
  box-shadow: 0 12px 36px var(--ahwa-shadow-deep);
  text-align: center;
}

.ahwa-modal-title {
  font-size: 24px;
  font-weight: 900;
  color: var(--ahwa-warm-gold);
  margin-bottom: 6px;
}

.ahwa-modal-subtitle {
  font-size: 14px;
  opacity: 0.85;
  margin-bottom: 16px;
}

.ahwa-modal-body {
  margin-bottom: 20px;
  font-size: 15px;
}

.ahwa-modal-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.ahwa-match-feed {
  background: rgba(13, 59, 46, 0.9);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 10px;
  padding: 12px;
  color: var(--ahwa-cream-paper);
}

.ahwa-feed-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.ahwa-feed-time {
  margin-right: auto;
  font-size: 11px;
  color: #aaa;
}
  `.trim();
}

/**
 * دالة حقن الـ Stylesheet ديناميكياً داخل رأس الصفحة في بيئة المتصفح
 */
export function injectAhwaStyles(targetDoc?: Document): void {
  const doc = targetDoc ?? (typeof document !== 'undefined' ? document : null);
  if (!doc) return;

  const styleId = 'ahwa-master-design-system';
  if (doc.getElementById(styleId)) return;

  const styleEl = doc.createElement('style');
  styleEl.id = styleId;
  styleEl.textContent = getAhwaCss();
  doc.head.appendChild(styleEl);
}
