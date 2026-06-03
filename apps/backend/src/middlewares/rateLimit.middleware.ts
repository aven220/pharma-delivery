import rateLimit from 'express-rate-limit';
import { env, isDev } from '../config/env';

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: isDev ? 10_000 : env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests' },
  skip: (req) => req.path === '/health' || req.path.startsWith('/api/auth'),
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 20,
  message: { success: false, error: 'Too many login attempts' },
});
