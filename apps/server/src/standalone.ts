import { startServer } from './index.js';

const port = parseInt(process.env.PORT || '3001', 10);
const host = process.env.HOST || '0.0.0.0';

startServer(port, host).catch((err) => {
  console.error('[قهوتنا | ahwtna] خطأ أثناء تشغيل خادم اللعبة:', err);
  process.exit(1);
});
