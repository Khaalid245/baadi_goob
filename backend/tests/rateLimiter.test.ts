import express, { Request, Response } from "express";
import request from "supertest";
import { app } from "../src/app";
import {
  createLoginRateLimiter,
  DEFAULT_LOGIN_RATE_LIMIT_MAX,
  DEFAULT_LOGIN_RATE_LIMIT_WINDOW_MS,
  LOGIN_RATE_LIMIT_MESSAGE,
  createPasswordResetRateLimiter,
  DEFAULT_PASSWORD_RESET_RATE_LIMIT_MAX,
  DEFAULT_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
  PASSWORD_RESET_RATE_LIMIT_MESSAGE,
} from "../src/middleware/rateLimiter";

describe("Login Rate Limiter Middleware", () => {
  describe("Configuration Defaults", () => {
    it("should have correct production defaults (10 requests, 15 minutes)", () => {
      expect(DEFAULT_LOGIN_RATE_LIMIT_MAX).toBe(10);
      expect(DEFAULT_LOGIN_RATE_LIMIT_WINDOW_MS).toBe(15 * 60 * 1000);
      expect(LOGIN_RATE_LIMIT_MESSAGE).toEqual({
        error: "Too many login attempts, please try again later.",
      });
    });
  });

  describe("Isolated Rate Limiter Behavior", () => {
    let testApp: express.Express;
    const testLimit = 3;

    beforeEach(() => {
      testApp = express();
      testApp.use(express.json());

      const isolatedLimiter = createLoginRateLimiter({
        limit: testLimit,
        windowMs: 60 * 1000,
      });

      testApp.post(
        "/test-login",
        isolatedLimiter,
        (_req: Request, res: Response) => {
          res.status(200).json({ message: "login success" });
        }
      );
    });

    it("should process requests within the limit normally and include standard IETF rate-limit headers", async () => {
      for (let i = 1; i <= testLimit; i++) {
        const res = await request(testApp)
          .post("/test-login")
          .send({ email: "test@example.com" });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: "login success" });
        expect(res.headers["ratelimit-limit"]).toBe(String(testLimit));
        expect(res.headers["ratelimit-remaining"]).toBe(
          String(testLimit - i)
        );
        expect(res.headers["ratelimit-reset"]).toBeDefined();
        // Legacy headers should be disabled
        expect(res.headers["x-ratelimit-limit"]).toBeUndefined();
      }
    });

    it("should reject the next request with HTTP 429 and expected JSON error once limit is exceeded", async () => {
      // Consume quota
      for (let i = 0; i < testLimit; i++) {
        await request(testApp).post("/test-login").send({});
      }

      // Next request must be throttled
      const throttledRes = await request(testApp)
        .post("/test-login")
        .send({});

      expect(throttledRes.status).toBe(429);
      expect(throttledRes.body).toEqual({
        error: "Too many login attempts, please try again later.",
      });
      expect(throttledRes.headers["ratelimit-remaining"]).toBe("0");
      expect(throttledRes.headers["retry-after"]).toBeDefined();
      expect(Number(throttledRes.headers["retry-after"])).toBeGreaterThan(0);
    });
  });

  describe("Route Independence on Main Application", () => {
    it("should keep registration, health, and /me routes unaffected by login rate limiting", async () => {
      // 1. Health check is unthrottled
      const healthRes = await request(app).get("/api/v1/health");
      expect(healthRes.status).toBe(200);
      expect(healthRes.headers["ratelimit-limit"]).toBeUndefined();

      // 2. Registration is unthrottled by login limiter
      const regRes = await request(app)
        .post("/api/v1/auth/register")
        .send({});
      // Fails on validation (400), proving it reached the controller and was not throttled
      expect(regRes.status).toBe(400);
      expect(regRes.headers["ratelimit-limit"]).toBeUndefined();

      // 3. Current-user endpoint is protected by auth, not login rate limiting
      const meRes = await request(app).get("/api/v1/auth/me");
      expect(meRes.status).toBe(401);
      expect(meRes.headers["ratelimit-limit"]).toBeUndefined();
    });
  });
});

describe("Password Reset Rate Limiter Middleware", () => {
  describe("Configuration Defaults", () => {
    it("should have correct production defaults (5 requests, 15 minutes)", () => {
      expect(DEFAULT_PASSWORD_RESET_RATE_LIMIT_MAX).toBe(5);
      expect(DEFAULT_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS).toBe(15 * 60 * 1000);
      expect(PASSWORD_RESET_RATE_LIMIT_MESSAGE).toEqual({
        error: "Too many password reset attempts, please try again later.",
      });
    });
  });

  describe("Isolated Password Reset Limiter Behavior", () => {
    let testApp: express.Express;
    const testLimit = 2;

    beforeEach(() => {
      testApp = express();
      testApp.use(express.json());

      const isolatedLimiter = createPasswordResetRateLimiter({
        limit: testLimit,
        windowMs: 60 * 1000,
      });

      testApp.post(
        "/test-password-reset",
        isolatedLimiter,
        (_req: Request, res: Response) => {
          res.status(200).json({ message: "reset initiated" });
        }
      );
    });

    it("should process password reset requests within limit and reject with 429 when exceeded", async () => {
      for (let i = 1; i <= testLimit; i++) {
        const res = await request(testApp)
          .post("/test-password-reset")
          .send({ email: "user@example.com" });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: "reset initiated" });
        expect(res.headers["ratelimit-remaining"]).toBe(String(testLimit - i));
      }

      const throttledRes = await request(testApp)
        .post("/test-password-reset")
        .send({ email: "user@example.com" });

      expect(throttledRes.status).toBe(429);
      expect(throttledRes.body).toEqual({
        error: "Too many password reset attempts, please try again later.",
      });
    });
  });
});
