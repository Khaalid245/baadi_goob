import rateLimit, { Options, RateLimitRequestHandler } from "express-rate-limit";

export const DEFAULT_LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const DEFAULT_LOGIN_RATE_LIMIT_MAX = 10;
export const LOGIN_RATE_LIMIT_MESSAGE = {
  error: "Too many login attempts, please try again later.",
};

/**
 * Factory function to create a login rate limiter with configurable options.
 * Allows test suites and custom environments to instantiate isolated rate limiters
 * without sharing global state or hitting production thresholds.
 */
export const createLoginRateLimiter = (
  options?: Partial<Options>
): RateLimitRequestHandler => {
  const isTest = process.env.NODE_ENV === "test";
  const defaultLimit = isTest
    ? process.env.LOGIN_RATE_LIMIT_MAX
      ? parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10)
      : 100
    : DEFAULT_LOGIN_RATE_LIMIT_MAX;

  return rateLimit({
    windowMs: DEFAULT_LOGIN_RATE_LIMIT_WINDOW_MS,
    limit: defaultLimit,
    standardHeaders: "draft-6",
    legacyHeaders: false,
    statusCode: 429,
    message: LOGIN_RATE_LIMIT_MESSAGE,
    ...options,
  });
};

/**
 * Default login rate limiter middleware applied to POST /api/v1/auth/login.
 * Enforces a maximum of 10 requests per 15-minute window per IP in production.
 */
export const loginRateLimiter = createLoginRateLimiter();
