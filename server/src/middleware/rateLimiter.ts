import rateLimit from 'express-rate-limit';

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Limit each IP to 10000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test' ||
    req.ip === '127.0.0.1' ||
    req.ip === '::1' ||
    req.path === '/health' ||
    req.baseUrl === '/api/health' ||
    req.originalUrl?.startsWith('/api/health'),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Allowed for testing/verification
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test' ||
    req.ip === '127.0.0.1' ||
    req.ip === '::1',
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes',
  },
});
