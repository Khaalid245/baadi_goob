import crypto from "crypto";
import request from "supertest";
import bcrypt from "bcryptjs";
import { Prisma, Role, UserStatus } from "@prisma/client";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { verifyToken, generateToken } from "../src/common/jwt";
import {
  hashResetToken,
  PASSWORD_RESET_GENERIC_MESSAGE,
} from "../src/services/auth.service";

describe("POST /api/v1/auth/register", () => {
  const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const createdEmails = new Set<string>();

  const generateEmail = (prefix: string): string => {
    const email = `${prefix}_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase();
    createdEmails.add(email);
    return email;
  };

  afterAll(async () => {
    if (createdEmails.size > 0) {
      await prisma.user.deleteMany({
        where: {
          email: { in: Array.from(createdEmails) },
        },
      });
    }
    await prisma.$disconnect();
  });

  describe("Successful Registrations", () => {
    it("should register a STUDENT by default (status 201) and omit password/hash", async () => {
      const email = generateEmail("student");
      const password = "StrongPassword123!";

      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Farah Ahmed",
        email,
        password,
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("message", "User registered successfully");
      expect(res.body).toHaveProperty("user");

      const { user } = res.body;
      expect(user).toHaveProperty("id");
      expect(typeof user.id).toBe("string");
      expect(user.name).toBe("Farah Ahmed");
      expect(user.email).toBe(email);
      expect(user.role).toBe("STUDENT");
      expect(user.status).toBe("ACTIVE");
      expect(user).toHaveProperty("created_at");

      // Verify no sensitive fields are returned
      expect(user.password).toBeUndefined();
      expect(user.password_hash).toBeUndefined();
      expect((res.body as Record<string, unknown>).password).toBeUndefined();
      expect((res.body as Record<string, unknown>).password_hash).toBeUndefined();
    });

    it("should register a BUSINESS when role is explicitly provided (status 201)", async () => {
      const email = generateEmail("business");
      const password = "BusinessPassword123!";

      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Hormuud Telecom",
        email,
        password,
        role: "BUSINESS",
      });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe("BUSINESS");
      expect(res.body.user.email).toBe(email);
      expect(res.body.user.password_hash).toBeUndefined();
    });

    it("should properly hash password in the database with bcrypt (work factor 10)", async () => {
      const email = generateEmail("hashcheck");
      const rawPassword = "SuperSecurePassword123!";

      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Hash Verifier",
        email,
        password: rawPassword,
      });

      expect(res.status).toBe(201);

      // Verify directly against the database
      const dbUser = await prisma.user.findUnique({
        where: { email },
      });

      expect(dbUser).not.toBeNull();
      expect(dbUser?.password_hash).toBeDefined();
      expect(dbUser?.password_hash).not.toBe(rawPassword);

      // Verify bcrypt comparison passes
      const matches = await bcrypt.compare(rawPassword, dbUser!.password_hash);
      expect(matches).toBe(true);
    });

    it("should trim name and lowercase email upon registration", async () => {
      const rawEmail = `Padded_${runId}@Test.Local`;
      const normalizedEmail = rawEmail.toLowerCase();
      createdEmails.add(normalizedEmail);

      const res = await request(app).post("/api/v1/auth/register").send({
        name: "  Spaced Name  ",
        email: `  ${rawEmail}  `,
        password: "ValidPassword123!",
      });

      expect(res.status).toBe(201);
      expect(res.body.user.name).toBe("Spaced Name");
      expect(res.body.user.email).toBe(normalizedEmail);
    });
  });

  describe("Role Enforcement & Security", () => {
    it("should reject registration with ADMIN role (status 400)", async () => {
      const email = generateEmail("admin_attempt");

      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Malicious User",
        email,
        password: "Password123!",
        role: "ADMIN",
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain("Role must be either STUDENT or BUSINESS");

      // Verify no user was created in the database
      const dbUser = await prisma.user.findUnique({
        where: { email },
      });
      expect(dbUser).toBeNull();
    });

    it("should reject registration with any unrecognized role (status 400)", async () => {
      const email = generateEmail("bad_role");

      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Unknown Role User",
        email,
        password: "Password123!",
        role: "MODERATOR",
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("Duplicate Email Handling", () => {
    it("should return 409 with 'Email already in use' on duplicate email", async () => {
      const email = generateEmail("duplicate");
      const password = "DuplicatePassword123!";

      // First registration succeeds
      const firstRes = await request(app).post("/api/v1/auth/register").send({
        name: "First User",
        email,
        password,
      });
      expect(firstRes.status).toBe(201);

      // Second registration with the same email fails with 409
      const secondRes = await request(app).post("/api/v1/auth/register").send({
        name: "Second User",
        email,
        password,
      });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body).toEqual({ error: "Email already in use" });
    });

    it("should return 409 when email has different casing", async () => {
      const email = generateEmail("case_dup");

      const firstRes = await request(app).post("/api/v1/auth/register").send({
        name: "Original User",
        email: email.toLowerCase(),
        password: "Password123!",
      });
      expect(firstRes.status).toBe(201);

      const secondRes = await request(app).post("/api/v1/auth/register").send({
        name: "Uppercase User",
        email: email.toUpperCase(),
        password: "Password123!",
      });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body).toEqual({ error: "Email already in use" });
    });

    it("should catch Prisma P2002 race condition error and return 409", async () => {
      const email = generateEmail("race_condition");

      // Simulate findUnique passing (no user found) but create failing with P2002
      jest.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(null);
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed on the constraint: `User_email_key`",
        {
          code: "P2002",
          clientVersion: "5.22.0",
        }
      );
      jest.spyOn(prisma.user, "create").mockRejectedValueOnce(p2002Error);

      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Race Condition User",
        email,
        password: "Password123!",
      });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: "Email already in use" });

      jest.restoreAllMocks();
    });
  });

  describe("Validation Errors (400 Bad Request)", () => {
    it("should return 400 when name is missing", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        email: generateEmail("no_name"),
        password: "Password123!",
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Name is required" });
    });

    it("should return 400 when name is shorter than 2 characters", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "A",
        email: generateEmail("short_name"),
        password: "Password123!",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Name must be between 2 and 100 characters");
    });

    it("should return 400 when name exceeds 100 characters", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "A".repeat(101),
        email: generateEmail("long_name"),
        password: "Password123!",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Name must be between 2 and 100 characters");
    });

    it("should return 400 when email is missing", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "No Email User",
        password: "Password123!",
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Email is required" });
    });

    it("should return 400 when email is invalid format", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Bad Email User",
        email: "not-an-email",
        password: "Password123!",
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Invalid email address" });
    });

    it("should return 400 when password is missing", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "No Password User",
        email: generateEmail("no_pw"),
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Password is required" });
    });

    it("should return 400 when password is shorter than 8 characters", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Short Password User",
        email: generateEmail("short_pw"),
        password: "1234567",
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Password must be at least 8 characters" });
    });

    it("should return 400 when request body is empty", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });
});

describe("POST /api/v1/auth/login", () => {
  const loginRunId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const loginEmails = new Set<string>();

  const generateLoginEmail = (prefix: string): string => {
    const email = `${prefix}_${loginRunId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase();
    loginEmails.add(email);
    return email;
  };

  afterAll(async () => {
    if (loginEmails.size > 0) {
      await prisma.user.deleteMany({
        where: {
          email: { in: Array.from(loginEmails) },
        },
      });
    }
  });

  describe("Successful Logins", () => {
    it("should authenticate a STUDENT user with valid credentials (status 200) and issue a JWT token", async () => {
      const email = generateLoginEmail("student_login");
      const password = "ValidPassword123!";

      // Register user first
      const regRes = await request(app).post("/api/v1/auth/register").send({
        name: "Login Student",
        email,
        password,
      });
      expect(regRes.status).toBe(201);

      // Login
      const res = await request(app).post("/api/v1/auth/login").send({
        email,
        password,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "Login successful");
      expect(res.body).toHaveProperty("user");
      expect(res.body).toHaveProperty("token");

      const { user, token } = res.body;
      expect(user.email).toBe(email);
      expect(user.role).toBe("STUDENT");
      expect(user.status).toBe("ACTIVE");
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);

      // Verify token payload
      const decoded = verifyToken(token);
      expect(decoded.id).toBe(user.id);
      expect(decoded.email).toBe(email);
      expect(decoded.role).toBe("STUDENT");

      // Verify no sensitive fields
      expect(user.password).toBeUndefined();
      expect(user.password_hash).toBeUndefined();
      expect((res.body as Record<string, unknown>).password_hash).toBeUndefined();
    });

    it("should authenticate a BUSINESS user with valid credentials (status 200)", async () => {
      const email = generateLoginEmail("biz_login");
      const password = "BizPassword123!";

      await request(app).post("/api/v1/auth/register").send({
        name: "Login Business",
        email,
        password,
        role: "BUSINESS",
      });

      const res = await request(app).post("/api/v1/auth/login").send({
        email,
        password,
      });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe("BUSINESS");
      expect(typeof res.body.token).toBe("string");
    });

    it("should allow login with case-insensitive email input", async () => {
      const email = generateLoginEmail("case_login");
      const password = "ValidPassword123!";

      await request(app).post("/api/v1/auth/register").send({
        name: "Case User",
        email,
        password,
      });

      // Login using uppercase email
      const res = await request(app).post("/api/v1/auth/login").send({
        email: email.toUpperCase(),
        password,
      });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(email.toLowerCase());
      expect(typeof res.body.token).toBe("string");
    });
  });

  describe("Credential Failures & Security", () => {
    it("should reject login with wrong password (status 401)", async () => {
      const email = generateLoginEmail("wrong_pw");
      const password = "CorrectPassword123!";

      await request(app).post("/api/v1/auth/register").send({
        name: "Wrong PW User",
        email,
        password,
      });

      const res = await request(app).post("/api/v1/auth/login").send({
        email,
        password: "IncorrectPassword999!",
      });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Invalid email or password" });
    });

    it("should reject login for nonexistent email (status 401)", async () => {
      const email = generateLoginEmail("nonexistent");

      const res = await request(app).post("/api/v1/auth/login").send({
        email,
        password: "SomePassword123!",
      });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Invalid email or password" });
    });

    it("should return identical generic error messages for wrong password and nonexistent email", async () => {
      const email = generateLoginEmail("identical_err");
      const password = "CorrectPassword123!";

      await request(app).post("/api/v1/auth/register").send({
        name: "Identical Err User",
        email,
        password,
      });

      const wrongPwRes = await request(app).post("/api/v1/auth/login").send({
        email,
        password: "WrongPassword123!",
      });

      const nonexistentRes = await request(app).post("/api/v1/auth/login").send({
        email: generateLoginEmail("definitely_not_registered"),
        password: "AnyPassword123!",
      });

      expect(wrongPwRes.status).toBe(401);
      expect(nonexistentRes.status).toBe(401);
      expect(wrongPwRes.body).toEqual(nonexistentRes.body);
      expect(wrongPwRes.body).toEqual({ error: "Invalid email or password" });
    });

    it("should reject SUSPENDED accounts with status 403 and issue no token", async () => {
      const email = generateLoginEmail("suspended_user");
      const password = "ValidPassword123!";

      // Register user
      const regRes = await request(app).post("/api/v1/auth/register").send({
        name: "Suspended User",
        email,
        password,
      });
      expect(regRes.status).toBe(201);

      // Manually suspend the user in the database
      await prisma.user.update({
        where: { email },
        data: { status: "SUSPENDED" },
      });

      // Attempt login with correct credentials
      const res = await request(app).post("/api/v1/auth/login").send({
        email,
        password,
      });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain("Account is suspended");
      expect((res.body as Record<string, unknown>).token).toBeUndefined();
    });

    it("should never expose password or password_hash in login response or error", async () => {
      const email = generateLoginEmail("no_leak");
      const password = "ValidPassword123!";

      await request(app).post("/api/v1/auth/register").send({
        name: "No Leak User",
        email,
        password,
      });

      const successRes = await request(app).post("/api/v1/auth/login").send({
        email,
        password,
      });

      expect(successRes.body.user.password).toBeUndefined();
      expect(successRes.body.user.password_hash).toBeUndefined();
      expect((successRes.body as Record<string, unknown>).password_hash).toBeUndefined();

      const failRes = await request(app).post("/api/v1/auth/login").send({
        email,
        password: "WrongPassword!",
      });

      expect(JSON.stringify(failRes.body)).not.toContain("password_hash");
    });
  });

  describe("Validation Errors (400 Bad Request)", () => {
    it("should return 400 when email is missing", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        password: "ValidPassword123!",
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Email is required" });
    });

    it("should return 400 when email has invalid format", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "not-an-email",
        password: "ValidPassword123!",
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Invalid email address" });
    });

    it("should return 400 when password is missing or empty", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: generateLoginEmail("missing_pw"),
        password: "",
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Password is required" });
    });

    it("should return 400 when request body is empty", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });
});

describe("POST /api/v1/auth/password-reset", () => {
  const resetRunId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const resetEmails = new Set<string>();

  const generateResetEmail = (prefix: string): string => {
    const email = `${prefix}_${resetRunId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase();
    resetEmails.add(email);
    return email;
  };

  afterAll(async () => {
    if (resetEmails.size > 0) {
      await prisma.user.deleteMany({
        where: {
          email: { in: Array.from(resetEmails) },
        },
      });
    }
  });

  describe("Anti-Enumeration & Generic Response", () => {
    it("should return identical generic 200 response for an existing user without leaking account existence", async () => {
      const email = generateResetEmail("existing_reset");
      const password = "InitialPassword123!";

      await request(app).post("/api/v1/auth/register").send({
        name: "Existing User",
        email,
        password,
      });

      const res = await request(app)
        .post("/api/v1/auth/password-reset")
        .send({ email });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: PASSWORD_RESET_GENERIC_MESSAGE,
      });

      // Verify no sensitive fields in response
      expect(res.body.token).toBeUndefined();
      expect(res.body.rawToken).toBeUndefined();
      expect(res.body.token_hash).toBeUndefined();
      expect(res.body.password).toBeUndefined();
      expect(res.body.user).toBeUndefined();
    });

    it("should return identical generic 200 response for a nonexistent user", async () => {
      const nonexistentEmail = generateResetEmail("nonexistent_reset");

      const res = await request(app)
        .post("/api/v1/auth/password-reset")
        .send({ email: nonexistentEmail });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: PASSWORD_RESET_GENERIC_MESSAGE,
      });

      expect(res.body.token).toBeUndefined();
      expect(res.body.user).toBeUndefined();
    });

    it("should return identical generic 200 response for a suspended user without issuing an active token", async () => {
      const email = generateResetEmail("suspended_reset");
      const password = "InitialPassword123!";

      const regRes = await request(app).post("/api/v1/auth/register").send({
        name: "Suspended User",
        email,
        password,
      });
      expect(regRes.status).toBe(201);

      await prisma.user.update({
        where: { email },
        data: { status: "SUSPENDED" },
      });

      const res = await request(app)
        .post("/api/v1/auth/password-reset")
        .send({ email });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: PASSWORD_RESET_GENERIC_MESSAGE,
      });

      // Confirm no active reset token was created for the suspended account
      const tokens = await prisma.passwordResetToken.findMany({
        where: { user: { email } },
      });
      expect(tokens.length).toBe(0);
    });

    it("should trim and normalize email casing", async () => {
      const email = generateResetEmail("cased_reset");
      const password = "InitialPassword123!";

      await request(app).post("/api/v1/auth/register").send({
        name: "Cased User",
        email,
        password,
      });

      const res = await request(app)
        .post("/api/v1/auth/password-reset")
        .send({ email: `  ${email.toUpperCase()}  ` });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: PASSWORD_RESET_GENERIC_MESSAGE,
      });

      // Verify token was created for normalized user
      const dbToken = await prisma.passwordResetToken.findFirst({
        where: { user: { email: email.toLowerCase() } },
      });
      expect(dbToken).not.toBeNull();
    });
  });

  describe("Token Persistence & Storage Security", () => {
    it("should persist a SHA-256 hashed token with 15-minute expiration and null used_at", async () => {
      const email = generateResetEmail("token_persist");
      const password = "Password123!";

      const regRes = await request(app).post("/api/v1/auth/register").send({
        name: "Token Persist User",
        email,
        password,
      });
      const userId = regRes.body.user.id;

      const beforeTime = Date.now();
      const res = await request(app)
        .post("/api/v1/auth/password-reset")
        .send({ email });

      expect(res.status).toBe(200);

      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { user_id: userId },
      });

      expect(tokenRecord).not.toBeNull();
      expect(tokenRecord?.user_id).toBe(userId);
      expect(tokenRecord?.token_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(tokenRecord?.used_at).toBeNull();

      const expiresAt = tokenRecord!.expires_at.getTime();
      expect(expiresAt).toBeGreaterThan(beforeTime + 14 * 60 * 1000);
      expect(expiresAt).toBeLessThanOrEqual(beforeTime + 16 * 60 * 1000);
    });

    it("should supersede previous unused reset tokens upon repeated requests", async () => {
      const email = generateResetEmail("repeated_requests");
      const password = "Password123!";

      const regRes = await request(app).post("/api/v1/auth/register").send({
        name: "Repeat User",
        email,
        password,
      });
      const userId = regRes.body.user.id;

      // First request
      await request(app).post("/api/v1/auth/password-reset").send({ email });

      const firstToken = await prisma.passwordResetToken.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
      });
      expect(firstToken).not.toBeNull();
      expect(firstToken?.used_at).toBeNull();

      // Second request
      await request(app).post("/api/v1/auth/password-reset").send({ email });

      // First token must now be marked as used (superseded)
      const updatedFirstToken = await prisma.passwordResetToken.findUnique({
        where: { id: firstToken!.id },
      });
      expect(updatedFirstToken?.used_at).not.toBeNull();

      // Exactly one token for this user should now be active (used_at === null)
      const activeTokens = await prisma.passwordResetToken.findMany({
        where: { user_id: userId, used_at: null },
      });
      expect(activeTokens.length).toBe(1);
      expect(activeTokens[0].id).not.toBe(firstToken!.id);
    });
  });

  describe("Validation Errors (400 Bad Request)", () => {
    it("should return 400 when email is missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/password-reset")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Email is required" });
    });

    it("should return 400 when email format is invalid", async () => {
      const res = await request(app)
        .post("/api/v1/auth/password-reset")
        .send({ email: "not-an-email" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Invalid email address" });
    });
  });
});

describe("POST /api/v1/auth/password-reset/confirm", () => {
  const confirmRunId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const confirmEmails = new Set<string>();

  const generateConfirmEmail = (prefix: string): string => {
    const email = `${prefix}_${confirmRunId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase();
    confirmEmails.add(email);
    return email;
  };

  afterAll(async () => {
    if (confirmEmails.size > 0) {
      await prisma.user.deleteMany({
        where: {
          email: { in: Array.from(confirmEmails) },
        },
      });
    }
  });

  const createTokenFixture = async (
    userId: string,
    options?: {
      expiresAt?: Date;
      usedAt?: Date;
    }
  ): Promise<{ rawToken: string; tokenRecordId: string }> => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const token_hash = hashResetToken(rawToken);
    const expires_at =
      options?.expiresAt ?? new Date(Date.now() + 15 * 60 * 1000);

    const record = await prisma.passwordResetToken.create({
      data: {
        user_id: userId,
        token_hash,
        expires_at,
        used_at: options?.usedAt,
      },
    });

    return { rawToken, tokenRecordId: record.id };
  };

  describe("Successful Confirmation & Password Lifecycle", () => {
    it("should confirm password reset with newPassword, update password_hash, invalidate token, and allow login", async () => {
      const email = generateConfirmEmail("success_confirm");
      const oldPassword = "OldPassword123!";
      const newPassword = "NewPassword123!";

      const regRes = await request(app).post("/api/v1/auth/register").send({
        name: "Success Confirm User",
        email,
        password: oldPassword,
      });
      const userId = regRes.body.user.id;

      const { rawToken, tokenRecordId } = await createTokenFixture(userId);

      const confirmRes = await request(app)
        .post("/api/v1/auth/password-reset/confirm")
        .send({
          token: rawToken,
          newPassword,
        });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body).toEqual({
        message: "Password has been reset successfully",
      });

      // Verify no sensitive fields in response
      expect(confirmRes.body.token).toBeUndefined();
      expect(confirmRes.body.password).toBeUndefined();
      expect(confirmRes.body.password_hash).toBeUndefined();
      expect(confirmRes.body.user).toBeUndefined();

      // Verify token is now marked as used in database
      const updatedToken = await prisma.passwordResetToken.findUnique({
        where: { id: tokenRecordId },
      });
      expect(updatedToken?.used_at).not.toBeNull();

      // Verify user password_hash in database updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      expect(await bcrypt.compare(newPassword, updatedUser!.password_hash)).toBe(true);
      expect(await bcrypt.compare(oldPassword, updatedUser!.password_hash)).toBe(false);

      // Verify old password cannot log in
      const oldLoginRes = await request(app).post("/api/v1/auth/login").send({
        email,
        password: oldPassword,
      });
      expect(oldLoginRes.status).toBe(401);
      expect(oldLoginRes.body).toEqual({ error: "Invalid email or password" });

      // Verify new password successfully logs in
      const newLoginRes = await request(app).post("/api/v1/auth/login").send({
        email,
        password: newPassword,
      });
      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body).toHaveProperty("token");
      expect(newLoginRes.body.user.email).toBe(email);
    });

    it("should accept 'password' as alternative field name for newPassword", async () => {
      const email = generateConfirmEmail("alt_field_confirm");
      const oldPassword = "OldPassword123!";
      const newPassword = "AltPassword123!";

      const regRes = await request(app).post("/api/v1/auth/register").send({
        name: "Alt Field User",
        email,
        password: oldPassword,
      });
      const userId = regRes.body.user.id;

      const { rawToken } = await createTokenFixture(userId);

      const confirmRes = await request(app)
        .post("/api/v1/auth/password-reset/confirm")
        .send({
          token: rawToken,
          password: newPassword,
        });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body).toEqual({
        message: "Password has been reset successfully",
      });

      // Verify login with new password
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email,
        password: newPassword,
      });
      expect(loginRes.status).toBe(200);
    });
  });

  describe("Token Invalidation, Expiry & Single-Use Enforcement", () => {
    it("should reject token reuse (single-use enforcement) with HTTP 400", async () => {
      const email = generateConfirmEmail("reuse_token");
      const oldPassword = "OldPassword123!";
      const newPassword = "FirstNewPassword123!";

      const regRes = await request(app).post("/api/v1/auth/register").send({
        name: "Reuse User",
        email,
        password: oldPassword,
      });
      const userId = regRes.body.user.id;

      const { rawToken } = await createTokenFixture(userId);

      // First confirmation succeeds
      const firstRes = await request(app)
        .post("/api/v1/auth/password-reset/confirm")
        .send({
          token: rawToken,
          newPassword,
        });
      expect(firstRes.status).toBe(200);

      // Reusing the same token must fail with 400
      const secondRes = await request(app)
        .post("/api/v1/auth/password-reset/confirm")
        .send({
          token: rawToken,
          newPassword: "SecondNewPassword123!",
        });

      expect(secondRes.status).toBe(400);
      expect(secondRes.body).toEqual({
        error: "Invalid or expired reset token",
      });
    });

    it("should reject expired tokens with HTTP 400", async () => {
      const email = generateConfirmEmail("expired_token");
      const password = "OldPassword123!";

      const regRes = await request(app).post("/api/v1/auth/register").send({
        name: "Expired User",
        email,
        password,
      });
      const userId = regRes.body.user.id;

      // Token that expired 5 minutes ago
      const expiredDate = new Date(Date.now() - 5 * 60 * 1000);
      const { rawToken } = await createTokenFixture(userId, { expiresAt: expiredDate });

      const res = await request(app)
        .post("/api/v1/auth/password-reset/confirm")
        .send({
          token: rawToken,
          newPassword: "NewPassword123!",
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: "Invalid or expired reset token",
      });
    });

    it("should reject invalid/unrecognized tokens with HTTP 400", async () => {
      const res = await request(app)
        .post("/api/v1/auth/password-reset/confirm")
        .send({
          token: "f".repeat(64),
          newPassword: "NewPassword123!",
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: "Invalid or expired reset token",
      });
    });

    it("should handle concurrent confirmation attempts safely where only one succeeds", async () => {
      const email = generateConfirmEmail("concurrent_confirm");
      const password = "Password123!";

      const regRes = await request(app).post("/api/v1/auth/register").send({
        name: "Concurrent User",
        email,
        password,
      });
      const userId = regRes.body.user.id;

      const { rawToken } = await createTokenFixture(userId);

      // Fire 2 concurrent requests with the exact same token
      const [res1, res2] = await Promise.all([
        request(app)
          .post("/api/v1/auth/password-reset/confirm")
          .send({ token: rawToken, newPassword: "ConcurrentPasswordA123!" }),
        request(app)
          .post("/api/v1/auth/password-reset/confirm")
          .send({ token: rawToken, newPassword: "ConcurrentPasswordB123!" }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 400]);

      const failedRes = res1.status === 400 ? res1 : res2;
      expect(failedRes.body).toEqual({
        error: "Invalid or expired reset token",
      });
    });
  });

  describe("Suspended Account Behavior", () => {
    it("should reject password reset confirmation if user was suspended with HTTP 403", async () => {
      const email = generateConfirmEmail("suspended_confirm");
      const initialPassword = "InitialPassword123!";

      const regRes = await request(app).post("/api/v1/auth/register").send({
        name: "Suspended Confirm User",
        email,
        password: initialPassword,
      });
      const userId = regRes.body.user.id;

      const { rawToken } = await createTokenFixture(userId);

      // Suspend user in database
      await prisma.user.update({
        where: { id: userId },
        data: { status: "SUSPENDED" },
      });

      // Attempt to confirm password reset
      const res = await request(app)
        .post("/api/v1/auth/password-reset/confirm")
        .send({
          token: rawToken,
          newPassword: "NewPassword123!",
        });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: "Account is suspended. Please contact support.",
      });

      // Verify password was NOT updated
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(await bcrypt.compare(initialPassword, user!.password_hash)).toBe(true);

      // Verify login remains rejected with 403
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email,
        password: initialPassword,
      });
      expect(loginRes.status).toBe(403);
    });
  });

  describe("Validation Errors (400 Bad Request)", () => {
    it("should return 400 when token is missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/password-reset/confirm")
        .send({
          newPassword: "ValidPassword123!",
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Token is required" });
    });

    it("should return 400 when new password is missing", async () => {
      const res = await request(app)
        .post("/api/v1/auth/password-reset/confirm")
        .send({
          token: "any_token_string",
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Password is required" });
    });

    it("should return 400 when password is shorter than 8 characters", async () => {
      const res = await request(app)
        .post("/api/v1/auth/password-reset/confirm")
        .send({
          token: "any_token_string",
          newPassword: "short",
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: "Password must be at least 8 characters",
      });
    });

    it("should return 400 when request body is empty", async () => {
      const res = await request(app)
        .post("/api/v1/auth/password-reset/confirm")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });
});

describe("GET /api/v1/auth/me", () => {
  const meRunId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const meEmails = new Set<string>();

  const generateMeEmail = (prefix: string): string => {
    const email = `${prefix}_${meRunId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase();
    meEmails.add(email);
    return email;
  };

  afterAll(async () => {
    if (meEmails.size > 0) {
      await prisma.user.deleteMany({
        where: {
          email: { in: Array.from(meEmails) },
        },
      });
    }
  });

  it("should return complete safe identity profile for STUDENT (status 200)", async () => {
    const email = generateMeEmail("me_student");
    const password = "ValidPassword123!";
    const name = "Student Me User";

    const regRes = await request(app).post("/api/v1/auth/register").send({
      name,
      email,
      password,
      role: "STUDENT",
    });
    expect(regRes.status).toBe(201);
    const studentId = regRes.body.user.id;

    const token = generateToken({
      id: studentId,
      email,
      role: Role.STUDENT,
    });

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("user");
    const { user } = res.body;

    // Safe identity fields
    expect(user.id).toBe(studentId);
    expect(user.name).toBe(name);
    expect(user.email).toBe(email);
    expect(user.role).toBe("STUDENT");
    expect(user.status).toBe("ACTIVE");
    expect(typeof user.created_at).toBe("string");

    // Verify no sensitive fields
    expect(user.password).toBeUndefined();
    expect(user.password_hash).toBeUndefined();
    expect((res.body as Record<string, unknown>).password_hash).toBeUndefined();
    expect((res.body as Record<string, unknown>).token).toBeUndefined();
  });

  it("should return complete safe identity profile for BUSINESS (status 200)", async () => {
    const email = generateMeEmail("me_business");
    const password = "ValidPassword123!";
    const name = "Business Me User";

    const regRes = await request(app).post("/api/v1/auth/register").send({
      name,
      email,
      password,
      role: "BUSINESS",
    });
    expect(regRes.status).toBe(201);
    const bizId = regRes.body.user.id;

    const token = generateToken({
      id: bizId,
      email,
      role: Role.BUSINESS,
    });

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("user");
    const { user } = res.body;

    expect(user.id).toBe(bizId);
    expect(user.name).toBe(name);
    expect(user.email).toBe(email);
    expect(user.role).toBe("BUSINESS");
    expect(user.status).toBe("ACTIVE");
    expect(typeof user.created_at).toBe("string");

    // Verify no sensitive fields
    expect(user.password).toBeUndefined();
    expect(user.password_hash).toBeUndefined();
  });

  it("should return complete safe identity profile for ADMIN (status 200)", async () => {
    const email = generateMeEmail("me_admin");
    const password_hash = await bcrypt.hash("AdminPassword123!", 10);
    const name = "Admin Me User";

    const adminUser = await prisma.user.create({
      data: {
        name,
        email,
        password_hash,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });

    const token = generateToken({
      id: adminUser.id,
      email: adminUser.email,
      role: Role.ADMIN,
    });

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("user");
    const { user } = res.body;

    expect(user.id).toBe(adminUser.id);
    expect(user.name).toBe(name);
    expect(user.email).toBe(email);
    expect(user.role).toBe("ADMIN");
    expect(user.status).toBe("ACTIVE");
    expect(typeof user.created_at).toBe("string");

    // Verify no sensitive fields
    expect(user.password).toBeUndefined();
    expect(user.password_hash).toBeUndefined();
  });

  it("should return 401 when Authorization header is missing", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Authentication token is required" });
  });

  it("should reject deleted accounts with 401", async () => {
    const email = generateMeEmail("me_deleted");
    const password_hash = await bcrypt.hash("Password123!", 10);

    const deletedUser = await prisma.user.create({
      data: {
        name: "Deleted User",
        email,
        password_hash,
        role: Role.STUDENT,
        status: UserStatus.DELETED,
      },
    });

    const token = generateToken({
      id: deletedUser.id,
      email: deletedUser.email,
      role: Role.STUDENT,
    });

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Account has been deleted" });
  });

  it("should reject suspended accounts with 403", async () => {
    const email = generateMeEmail("me_suspended");
    const password_hash = await bcrypt.hash("Password123!", 10);

    const suspendedUser = await prisma.user.create({
      data: {
        name: "Suspended User",
        email,
        password_hash,
        role: Role.STUDENT,
        status: UserStatus.SUSPENDED,
      },
    });

    const token = generateToken({
      id: suspendedUser.id,
      email: suspendedUser.email,
      role: Role.STUDENT,
    });

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "Account is suspended. Please contact support.",
    });
  });
});
