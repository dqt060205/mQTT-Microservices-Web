import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config/env.js';

/**
 * Tạo middleware reverse proxy chuyển tiếp request đến microservice tương ứng.
 * - Hỗ trợ cả đường dẫn chuẩn `/api/<resource>` và đường dẫn rút gọn `/<resource>`
 * - Tự động gắn header `X-Forwarded-Host`, `X-Forwarded-Proto`
 * - Xử lý bắt lỗi khi microservice đích bị ngắt kết nối hoặc timeout (HTTP 503)
 */
export function createServiceProxy(serviceDef) {
  return createProxyMiddleware({
    target: serviceDef.url,
    changeOrigin: true,
    pathFilter: serviceDef.routes,
    pathRewrite: (path) => (path.startsWith('/api/') ? path : `/api${path}`),
    timeout: config.proxyTimeout,
    proxyTimeout: config.proxyTimeout,
    on: {
      error: (err, req, res) => {
        console.error(
          `[Gateway Proxy Error] [${serviceDef.id}] ${req.method} ${req.originalUrl} -> ${serviceDef.url}: ${err.message}`
        );

        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: `Dịch vụ '${serviceDef.name}' (${serviceDef.id}) tạm thời không thể truy cập hoặc đã quá thời gian chờ.`,
              service: serviceDef.id,
              target: serviceDef.url,
              timestamp: new Date().toISOString(),
            },
          });
        }
      },
    },
  });
}

