import request from "supertest";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

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
