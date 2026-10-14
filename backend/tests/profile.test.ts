import request from "supertest";
import bcrypt from "bcryptjs";
import { Role, UserStatus, VerificationStatus } from "@prisma/client";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { generateToken } from "../src/common/jwt";
import {
  updateStudentProfileSchema,
  updateBusinessProfileSchema,
} from "../src/validations/profile.validation";

describe("Profiles Module Validation Schemas (Unit)", () => {
  describe("updateStudentProfileSchema", () => {
    it("should accept valid student profile inputs", () => {
      const valid = {
        education: "Jamhuuriya University, Computer Science",
        skills: ["TypeScript", "Node.js"],
        project_links: ["https://github.com/student/project"],
      };
      const result = updateStudentProfileSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should accept partial inputs with omitted fields", () => {
      const result = updateStudentProfileSchema.safeParse({
        skills: ["Python"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.education).toBeUndefined();
        expect(result.data.project_links).toBeUndefined();
      }
    });

    it("should accept explicit nulls to clear fields", () => {
      const result = updateStudentProfileSchema.safeParse({
        education: null,
        skills: null,
        project_links: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.education).toBeNull();
        expect(result.data.skills).toBeNull();
        expect(result.data.project_links).toBeNull();
      }
    });

    it("should reject unknown fields (e.g. role, status, user_id)", () => {
      const withRole = updateStudentProfileSchema.safeParse({
        role: "ADMIN",
      });
      expect(withRole.success).toBe(false);

      const withStatus = updateStudentProfileSchema.safeParse({
        status: "ACTIVE",
      });
      expect(withStatus.success).toBe(false);

      const withUserId = updateStudentProfileSchema.safeParse({
        user_id: "other-user-id",
      });
      expect(withUserId.success).toBe(false);

      const withArbitrary = updateStudentProfileSchema.safeParse({
        isAdmin: true,
      });
      expect(withArbitrary.success).toBe(false);
    });

    it("should reject invalid project_links URLs", () => {
      const result = updateStudentProfileSchema.safeParse({
        project_links: ["not-a-valid-url"],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Each project link must be a valid URL"
        );
      }
    });

    it("should reject empty skill strings", () => {
      const result = updateStudentProfileSchema.safeParse({
        skills: [""],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Skill name cannot be empty");
      }
    });

    it("should reject skills exceeding 30 items", () => {
      const tooManySkills = Array.from({ length: 31 }, (_, i) => `Skill${i}`);
      const result = updateStudentProfileSchema.safeParse({
        skills: tooManySkills,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Maximum of 30 skills allowed"
        );
      }
    });
  });

  describe("updateBusinessProfileSchema", () => {
    it("should accept valid company_name", () => {
      const result = updateBusinessProfileSchema.safeParse({
        company_name: "Hormuud Telecom",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty or missing company_name", () => {
      const missing = updateBusinessProfileSchema.safeParse({});
      expect(missing.success).toBe(false);

      const tooShort = updateBusinessProfileSchema.safeParse({
        company_name: "A",
      });
      expect(tooShort.success).toBe(false);
    });

    it("should reject unknown fields (e.g. verification_status, role)", () => {
      const withVerification = updateBusinessProfileSchema.safeParse({
        company_name: "Valid Company",
        verification_status: "VERIFIED",
      });
      expect(withVerification.success).toBe(false);

      const withRole = updateBusinessProfileSchema.safeParse({
        company_name: "Valid Company",
        role: "ADMIN",
      });
      expect(withRole.success).toBe(false);
    });
  });
});

describe("Profiles Module HTTP Endpoints (Integration)", () => {
  const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const createdUserIds = new Set<string>();

  const createTestUser = async (data: {
    role: Role;
    status?: UserStatus;
  }) => {
    const email = `profile_test_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase();
    const password_hash = await bcrypt.hash("Password123!", 10);

    const user = await prisma.user.create({
      data: {
        name: "Profile Test User",
        email,
        password_hash,
        role: data.role,
        status: data.status ?? UserStatus.ACTIVE,
      },
    });

    createdUserIds.add(user.id);
    return user;
  };

  afterAll(async () => {
    if (createdUserIds.size > 0) {
      try {
        await prisma.user.deleteMany({
          where: { id: { in: Array.from(createdUserIds) } },
        });
      } catch {
        // Ignored if DB is disconnected during cleanup
      }
    }
    await prisma.$disconnect();
  });

  describe("Authentication & Header Guards", () => {
    it("should return 401 when Authorization header is missing on student profile GET", async () => {
      const res = await request(app).get("/api/v1/students/me/profile");
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Authentication token is required" });
    });

    it("should return 401 when Authorization header is missing on business profile GET", async () => {
      const res = await request(app).get("/api/v1/businesses/me/profile");
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Authentication token is required" });
    });

    it("should return 401 when Bearer token is invalid format", async () => {
      const res = await request(app)
        .get("/api/v1/students/me/profile")
        .set("Authorization", "Basic invalid");
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: "Invalid authorization format. Expected Bearer token",
      });
    });
  });

  describe("Student Profile Endpoints (/api/v1/students/me/profile)", () => {
    it("should return 404 when student has registered but profile does not exist yet", async () => {
      const student = await createTestUser({ role: Role.STUDENT });
      const token = generateToken({
        id: student.id,
        email: student.email,
        role: student.role,
      });

      const res = await request(app)
        .get("/api/v1/students/me/profile")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Student profile not found" });
    });

    it("should create profile via PUT when missing (upsert create) and return 200", async () => {
      const student = await createTestUser({ role: Role.STUDENT });
      const token = generateToken({
        id: student.id,
        email: student.email,
        role: student.role,
      });

      const payload = {
        education: "Somali National University",
        skills: ["JavaScript", "React"],
        project_links: ["https://github.com/somali-student/portfolio"],
      };

      const putRes = await request(app)
        .put("/api/v1/students/me/profile")
        .set("Authorization", `Bearer ${token}`)
        .send(payload);

      expect(putRes.status).toBe(200);
      expect(putRes.body).toHaveProperty("message", "Profile updated successfully");
      expect(putRes.body).toHaveProperty("profile");
      expect(putRes.body.profile.user_id).toBe(student.id);
      expect(putRes.body.profile.education).toBe(payload.education);
      expect(putRes.body.profile.skills).toEqual(payload.skills);
      expect(putRes.body.profile.project_links).toEqual(payload.project_links);

      // Verify subsequent GET returns 200 with saved profile
      const getRes = await request(app)
        .get("/api/v1/students/me/profile")
        .set("Authorization", `Bearer ${token}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.profile.education).toBe(payload.education);
      expect(getRes.body.profile.skills).toEqual(payload.skills);
      expect(getRes.body.profile.project_links).toEqual(payload.project_links);
    });

    it("should preserve omitted fields on partial PUT update", async () => {
      const student = await createTestUser({ role: Role.STUDENT });
      const token = generateToken({
        id: student.id,
        email: student.email,
        role: student.role,
      });

      // Initial creation
      await request(app)
        .put("/api/v1/students/me/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({
          education: "Initial University",
          skills: ["HTML", "CSS"],
          project_links: ["https://initial.link"],
        });

      // Partial update modifying ONLY skills
      const partialRes = await request(app)
        .put("/api/v1/students/me/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({
          skills: ["HTML", "CSS", "TypeScript"],
        });

      expect(partialRes.status).toBe(200);
      expect(partialRes.body.profile.skills).toEqual([
        "HTML",
        "CSS",
        "TypeScript",
      ]);
      // Preserved fields
      expect(partialRes.body.profile.education).toBe("Initial University");
      expect(partialRes.body.profile.project_links).toEqual([
        "https://initial.link",
      ]);
    });

    it("should allow explicitly clearing nullable student fields with null", async () => {
      const student = await createTestUser({ role: Role.STUDENT });
      const token = generateToken({
        id: student.id,
        email: student.email,
        role: student.role,
      });

      // Initial creation
      await request(app)
        .put("/api/v1/students/me/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({
          education: "University to Clear",
          skills: ["Rust"],
          project_links: ["https://project.com"],
        });

      // Clear education with null
      const clearRes = await request(app)
        .put("/api/v1/students/me/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({
          education: null,
        });

      expect(clearRes.status).toBe(200);
      expect(clearRes.body.profile.education).toBeNull();
      // Other fields preserved
      expect(clearRes.body.profile.skills).toEqual(["Rust"]);
      expect(clearRes.body.profile.project_links).toEqual(["https://project.com"]);
    });

    it("should reject unknown request body fields with HTTP 400", async () => {
      const student = await createTestUser({ role: Role.STUDENT });
      const token = generateToken({
        id: student.id,
        email: student.email,
        role: student.role,
      });

      const res = await request(app)
        .put("/api/v1/students/me/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({
          education: "University",
          role: "ADMIN",
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain("Unrecognized key");
    });

    it("should reject invalid project_links with HTTP 400", async () => {
      const student = await createTestUser({ role: Role.STUDENT });
      const token = generateToken({
        id: student.id,
        email: student.email,
        role: student.role,
      });

      const res = await request(app)
        .put("/api/v1/students/me/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({
          project_links: ["not-a-valid-url"],
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: "Each project link must be a valid URL",
      });
    });

    it("should deny student access to business profile endpoints (status 403)", async () => {
      const student = await createTestUser({ role: Role.STUDENT });
      const token = generateToken({
        id: student.id,
        email: student.email,
        role: student.role,
      });

      const getRes = await request(app)
        .get("/api/v1/businesses/me/profile")
        .set("Authorization", `Bearer ${token}`);
      expect(getRes.status).toBe(403);
      expect(getRes.body).toEqual({ error: "Access denied" });

      const putRes = await request(app)
        .put("/api/v1/businesses/me/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({ company_name: "Illegal Business" });
      expect(putRes.status).toBe(403);
      expect(putRes.body).toEqual({ error: "Access denied" });
    });

    it("should reject suspended student user with HTTP 403", async () => {
      const student = await createTestUser({
        role: Role.STUDENT,
        status: UserStatus.SUSPENDED,
      });
      const token = generateToken({
        id: student.id,
        email: student.email,
        role: student.role,
      });

      const res = await request(app)
        .get("/api/v1/students/me/profile")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: "Account is suspended. Please contact support.",
      });
    });
  });

  describe("Business Profile Endpoints (/api/v1/businesses/me/profile)", () => {
    it("should return 404 when business profile has not been created yet", async () => {
      const business = await createTestUser({ role: Role.BUSINESS });
      const token = generateToken({
        id: business.id,
        email: business.email,
        role: business.role,
      });

      const res = await request(app)
        .get("/api/v1/businesses/me/profile")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Business profile not found" });
    });

    it("should create business profile via PUT with PENDING verification status", async () => {
      const business = await createTestUser({ role: Role.BUSINESS });
      const token = generateToken({
        id: business.id,
        email: business.email,
        role: business.role,
      });

      const putRes = await request(app)
        .put("/api/v1/businesses/me/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({ company_name: "Somali Tech Ventures" });

      expect(putRes.status).toBe(200);
      expect(putRes.body).toHaveProperty(
        "message",
        "Company profile updated successfully"
      );
      expect(putRes.body.profile.company_name).toBe("Somali Tech Ventures");
      expect(putRes.body.profile.verification_status).toBe(
        VerificationStatus.PENDING
      );

      // Verify GET returns created profile
      const getRes = await request(app)
        .get("/api/v1/businesses/me/profile")
        .set("Authorization", `Bearer ${token}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.profile.company_name).toBe("Somali Tech Ventures");
      expect(getRes.body.profile.verification_status).toBe(
        VerificationStatus.PENDING
      );
    });

    it("should update existing business profile company_name via PUT", async () => {
      const business = await createTestUser({ role: Role.BUSINESS });
      const token = generateToken({
        id: business.id,
        email: business.email,
        role: business.role,
      });

      // Initial creation
      await request(app)
        .put("/api/v1/businesses/me/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({ company_name: "Original Name LLC" });

      // Update
      const updateRes = await request(app)
        .put("/api/v1/businesses/me/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({ company_name: "Updated Name Corp" });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.profile.company_name).toBe("Updated Name Corp");
    });

    it("should reject attempts to self-verify via verification_status with HTTP 400", async () => {
      const business = await createTestUser({ role: Role.BUSINESS });
      const token = generateToken({
        id: business.id,
        email: business.email,
        role: business.role,
      });

      const res = await request(app)
        .put("/api/v1/businesses/me/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({
          company_name: "Hacker Co",
          verification_status: "VERIFIED",
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain("Unrecognized key");
    });

    it("should reject missing or empty company_name with HTTP 400", async () => {
      const business = await createTestUser({ role: Role.BUSINESS });
      const token = generateToken({
        id: business.id,
        email: business.email,
        role: business.role,
      });

      const emptyRes = await request(app)
        .put("/api/v1/businesses/me/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({});
      expect(emptyRes.status).toBe(400);
      expect(emptyRes.body).toEqual({ error: "Company name is required" });

      const tooShortRes = await request(app)
        .put("/api/v1/businesses/me/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({ company_name: " " });
      expect(tooShortRes.status).toBe(400);
      expect(tooShortRes.body.error).toContain("Company name");
    });

    it("should deny business access to student profile endpoints (status 403)", async () => {
      const business = await createTestUser({ role: Role.BUSINESS });
      const token = generateToken({
        id: business.id,
        email: business.email,
        role: business.role,
      });

      const getRes = await request(app)
        .get("/api/v1/students/me/profile")
        .set("Authorization", `Bearer ${token}`);
      expect(getRes.status).toBe(403);
      expect(getRes.body).toEqual({ error: "Access denied" });

      const putRes = await request(app)
        .put("/api/v1/students/me/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({ education: "Illegal Student Info" });
      expect(putRes.status).toBe(403);
      expect(putRes.body).toEqual({ error: "Access denied" });
    });

    it("should reject suspended business user with HTTP 403", async () => {
      const business = await createTestUser({
        role: Role.BUSINESS,
        status: UserStatus.SUSPENDED,
      });
      const token = generateToken({
        id: business.id,
        email: business.email,
        role: business.role,
      });

      const res = await request(app)
        .get("/api/v1/businesses/me/profile")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: "Account is suspended. Please contact support.",
      });
    });
  });
});
