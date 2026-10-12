import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    alias: {
      '@ahwtna/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@ahwtna/game-engine': path.resolve(__dirname, '../../packages/game-engine/src'),
      '@ahwtna/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
});
