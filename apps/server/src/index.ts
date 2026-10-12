import { AHWTNA_VERSION } from '@ahwtna/shared';
import { ENGINE_NAME } from '@ahwtna/game-engine';
import { AhwtnaServer } from './server.js';

export const SERVER_NAME = 'Ahwtna Authoritative Game Server';

export * from './room/code-generator.js';
export * from './room/authoritative-round.js';
export * from './room/game-room.js';
export * from './room/room-manager.js';
export * from './sync/turn-timer.js';
export * from './sync/reconnect-manager.js';
export * from './server.js';

/**
 * دالة مساعدة لتشغيل الخادم
 */
export async function startServer(port: number = 3001, host: string = '0.0.0.0'): Promise<AhwtnaServer> {
  const server = new AhwtnaServer();
  const address = await server.listen(port, host);
  console.log(`[قهوتنا | ahwtna] ${SERVER_NAME} v${AHWTNA_VERSION} (${ENGINE_NAME}) جاهز ومستمع على ${address}`);
  return server;
}
