import request from "supertest";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { app } from "../src/app";
import { generateToken, getJwtSecret } from "../src/common/jwt";
import { roleCheck } from "../src/middleware/roleCheck";
import { AppError } from "../src/middleware/errorHandler";

describe("Authentication & Authorization Middleware", () => {
  const validPayload = {
    id: "test-user-uuid-123",
    email: "middleware_test@example.com",
    role: Role.STUDENT,
  };

  describe("GET /api/v1/auth/me (Protected by authenticate)", () => {
    it("should return 200 with user identity when valid Bearer token is provided", async () => {
      const token = generateToken(validPayload);

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        user: {
          id: validPayload.id,
          email: validPayload.email,
          role: validPayload.role,
        },
      });
      // Ensure no sensitive fields leaked
      expect((res.body as Record<string, unknown>).token).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.password_hash).toBeUndefined();
    });

    it("should return 401 when Authorization header is missing", async () => {
      const res = await request(app).get("/api/v1/auth/me");

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Authentication token is required" });
    });

    it("should return 401 when Basic auth is provided instead of Bearer", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Basic dXNlcjpwYXNz");

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: "Invalid authorization format. Expected Bearer token",
      });
    });

    it("should return 401 when Bearer token is empty", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer ");

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Authentication token is required" });
    });

    it("should return 401 when Authorization header has extra segments", async () => {
      const token = generateToken(validPayload);

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token} extra_segment`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: "Invalid authorization format. Expected Bearer token",
      });
    });

    it("should return 401 with 'Token has expired' when token is expired", async () => {
      const secret = getJwtSecret();
      const expiredToken = jwt.sign(validPayload, secret, { expiresIn: "-1s" });

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Token has expired" });
    });

    it("should return 401 with 'Invalid authentication token' when token is malformed", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer not.a.valid.jwt");

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Invalid authentication token" });
    });

    it("should return 401 when token is signed with a different secret", async () => {
      const differentSecret = "completely-different-signing-secret-32b";
      const forgedToken = jwt.sign(validPayload, differentSecret, {
        expiresIn: "15m",
      });

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Invalid authentication token" });
    });

    it("should preserve public routes without requiring authentication", async () => {
      const healthRes = await request(app).get("/api/v1/health");
      expect(healthRes.status).toBe(200);

      const regNoAuth = await request(app)
        .post("/api/v1/auth/register")
        .send({});
      // Reaches validation (400), not authentication (401)
      expect(regNoAuth.status).toBe(400);

      const loginNoAuth = await request(app)
        .post("/api/v1/auth/login")
        .send({});
      // Reaches validation (400), not authentication (401)
      expect(loginNoAuth.status).toBe(400);
    });
  });

  describe("Role Authorization Middleware (roleCheck)", () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockRes = {} as unknown as Response;
      mockNext = jest.fn();
    });

    it("should call next() when authenticated user has an allowed role", () => {
      mockReq = {
        user: {
          id: "admin-123",
          email: "admin@example.com",
          role: Role.ADMIN,
        },
      } as unknown as Request;

      const middleware = roleCheck([Role.ADMIN, Role.BUSINESS]);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should return 403 'Access denied' when user role is not permitted", () => {
      mockReq = {
        user: {
          id: "student-123",
          email: "student@example.com",
          role: Role.STUDENT,
        },
      } as unknown as Request;

      const middleware = roleCheck([Role.ADMIN]);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("Access denied");
    });

    it("should return 401 'Authentication required' when req.user is missing", () => {
      mockReq = {
        user: undefined,
      } as unknown as Request;

      const middleware = roleCheck([Role.STUDENT]);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Authentication required");
    });

    it("should not trust roles provided in request body or query parameters", () => {
      mockReq = {
        user: {
          id: "student-123",
          email: "student@example.com",
          role: Role.STUDENT,
        },
        body: { role: Role.ADMIN },
        query: { role: Role.ADMIN },
      } as unknown as Request;

      const middleware = roleCheck([Role.ADMIN]);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("Access denied");
    });
  });
});
