import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import { Role, UserStatus } from "@prisma/client";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { generateToken, getJwtSecret } from "../src/common/jwt";
import { roleCheck } from "../src/middleware/roleCheck";
import { AppError } from "../src/middleware/errorHandler";

describe("Authentication & Authorization Middleware", () => {
  const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const createdUserIds = new Set<string>();

  const createTestUser = async (data: {
    role?: Role;
    status?: UserStatus;
  }) => {
    const email = `auth_mid_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase();
    const password_hash = await bcrypt.hash("Password123!", 10);

    const user = await prisma.user.create({
      data: {
        name: "Middleware Test User",
        email,
        password_hash,
        role: data.role ?? Role.STUDENT,
        status: data.status ?? UserStatus.ACTIVE,
      },
    });

    createdUserIds.add(user.id);
    return user;
  };

  afterAll(async () => {
    if (createdUserIds.size > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: Array.from(createdUserIds) } },
      });
    }
  });

  describe("GET /api/v1/auth/me (Protected by authenticate)", () => {
    it("should return 200 with user identity when active user provides valid Bearer token", async () => {
      const user = await createTestUser({
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
      });
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("user");
      const { user: resUser } = res.body;
      expect(resUser.id).toBe(user.id);
      expect(resUser.name).toBe(user.name);
      expect(resUser.email).toBe(user.email);
      expect(resUser.role).toBe(user.role);
      expect(resUser.status).toBe(user.status);
      expect(resUser).toHaveProperty("created_at");

      // Ensure no sensitive fields leaked
      expect((res.body as Record<string, unknown>).token).toBeUndefined();
      expect(resUser.password).toBeUndefined();
      expect(resUser.password_hash).toBeUndefined();
    });

    it("should return 403 when a suspended user presents a valid token", async () => {
      // Create user as active, issue token, then suspend user
      const user = await createTestUser({
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
      });
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Update user to SUSPENDED in database
      await prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.SUSPENDED },
      });

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: "Account is suspended. Please contact support.",
      });
    });

    it("should return 401 when a valid token references a deleted or nonexistent user", async () => {
      const nonExistentPayload = {
        id: "00000000-0000-0000-0000-000000000000",
        email: "nonexistent@test.local",
        role: Role.STUDENT,
      };
      const token = generateToken(nonExistentPayload);

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: "User account no longer exists",
      });
    });

    it("should reflect updated database role on the authenticated request when role changes after token issuance", async () => {
      const user = await createTestUser({
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
      });
      // Token issued with STUDENT role
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: Role.STUDENT,
      });

      // Administrator changes user's role to BUSINESS in database
      await prisma.user.update({
        where: { id: user.id },
        data: { role: Role.BUSINESS },
      });

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe(Role.BUSINESS);
    });

    it("should handle database errors as internal server errors (500) rather than invalid tokens", async () => {
      const user = await createTestUser({
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
      });
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      const findUniqueSpy = jest
        .spyOn(prisma.user, "findUnique")
        .mockRejectedValueOnce(new Error("Database connection failure"));

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal Server Error" });

      findUniqueSpy.mockRestore();
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
      const dummyPayload = {
        id: "any-id",
        email: "dummy@example.com",
        role: Role.STUDENT,
      };
      const token = generateToken(dummyPayload);

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token} extra_segment`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: "Invalid authorization format. Expected Bearer token",
      });
    });

    it("should return 401 with 'Token has expired' when token is expired", async () => {
      const dummyPayload = {
        id: "any-id",
        email: "dummy@example.com",
        role: Role.STUDENT,
      };
      const secret = getJwtSecret();
      const expiredToken = jwt.sign(dummyPayload, secret, { expiresIn: "-1s" });

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
      const dummyPayload = {
        id: "any-id",
        email: "dummy@example.com",
        role: Role.STUDENT,
      };
      const differentSecret = "completely-different-signing-secret-32b";
      const forgedToken = jwt.sign(dummyPayload, differentSecret, {
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
