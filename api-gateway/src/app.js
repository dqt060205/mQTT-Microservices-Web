import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import { buildCorsMiddleware } from './middleware/cors.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { notFoundHandler, errorHandler } from './middleware/error-handler.js';
import { createServiceProxy } from './services/proxy.js';
import gatewayRoutes from './routes/gateway.routes.js';

export function createApp() {
  const app = express();

  // Tắt header X-Powered-By để bảo mật
  app.disable('x-powered-by');

  // Middleware bảo mật HTTP headers
  app.use(helmet());

  // Cấu hình CORS cho frontend
  app.use(buildCorsMiddleware());

  // Ghi log request
  if (config.nodeEnv !== 'test') {
    app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
  }

  // Giới hạn tần suất request (Rate Limiting)
  app.use(rateLimiter);

  // 1. Các endpoint quản trị & health check của API Gateway
  app.use('/', gatewayRoutes);

  // 2. Đăng ký Reverse Proxy cho từng microservice
  // Lưu ý: Không dùng express.json() trước các proxy này để giữ nguyên stream dữ liệu (JSON, multipart, headers)
  for (const service of Object.values(config.services)) {
    app.use(createServiceProxy(service));
  }

  // 3. Xử lý khi không tìm thấy route (404)
  app.use(notFoundHandler);

  // 4. Xử lý lỗi toàn cục (500)
  app.use(errorHandler);

  return app;
}

export default createApp;

