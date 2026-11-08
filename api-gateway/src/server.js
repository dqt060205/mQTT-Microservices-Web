import { createApp } from './app.js';
import { config } from './config/env.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`🚀 mQTT API Gateway is running on port ${config.port}`);
  console.log(`📡 URL: http://localhost:${config.port}`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`----------------------------------------------------`);
  console.log(`Registered Services:`);
  for (const srv of Object.values(config.services)) {
    console.log(` - ${srv.name.padEnd(16)} -> ${srv.url} (${srv.routes.join(', ')})`);
  }
  console.log(`====================================================`);
});

// Xử lý tắt server an toàn (Graceful Shutdown)
function shutdown(signal) {
  console.log(`\nNhận tín hiệu ${signal}. Đang đóng kết nối API Gateway...`);
  server.close(() => {
    console.log('API Gateway đã dừng an toàn.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Không thể đóng kết nối kịp thời, buộc dừng.');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

