import { AHWTNA_VERSION, GAME_NAME } from '@ahwtna/shared';
import { ENGINE_NAME } from '@ahwtna/game-engine';
import { UI_THEME_NAME } from '@ahwtna/ui';

export const WEB_APP_TITLE = `${GAME_NAME} v${AHWTNA_VERSION}`;
console.log(`${WEB_APP_TITLE} initialized with ${ENGINE_NAME} and ${UI_THEME_NAME}`);
