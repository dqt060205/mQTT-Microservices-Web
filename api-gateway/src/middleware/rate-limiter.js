import { rateLimit } from 'express-rate-limit';
import { config } from '../config/env.js';

export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Đã vượt quá giới hạn số lượng yêu cầu. Vui lòng thử lại sau.',
    },
  },
  skip: (req) => {
    // Không giới hạn tần suất cho các endpoint kiểm tra sức khỏe
    const path = req.path;
    return path === '/' || path === '/health' || path === '/ready' || path === '/services/health';
  },
});

