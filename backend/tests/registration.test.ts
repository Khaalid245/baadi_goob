import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  Role,
  UserStatus,
  OpportunityType,
  OpportunityStatus,
} from "@prisma/client";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { generateToken, getJwtSecret } from "../src/common/jwt";
import { registerCompetitionParamSchema } from "../src/validations/registration.validation";

describe("Competition Registrations Module", () => {
  const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const createdUserIds = new Set<string>();
  const createdOpportunityIds = new Set<string>();

  // Tokens and IDs
  let student1Token: string;
  let student1Id: string;

  let student2Token: string;
  let student2Id: string;

  let studentConcurrencyToken: string;
  let studentConcurrencyId: string;

  let businessToken: string;
  let businessId: string;

  let otherBusinessToken: string;
  let otherBusinessId: string;

  let adminToken: string;
  let adminId: string;

  // Opportunities
  let openCompetitionId: string;
  let closedCompetitionId: string;
  let expiredCompetitionId: string;
  let emptyCompetitionId: string;
  let openJobId: string;
  let openInternshipId: string;

  beforeAll(async () => {
    const password_hash = await bcrypt.hash("Password123!", 10);

    // 1. Business user who creates opportunities
    const businessUser = await prisma.user.create({
      data: {
        name: "Test Business For Registrations",
        email: `biz_reg_${runId}@test.local`.toLowerCase(),
        password_hash,
        role: Role.BUSINESS,
        status: UserStatus.ACTIVE,
        businessProfile: {
          create: {
            company_name: "Competition Testing Corp",
          },
        },
      },
    });
    businessId = businessUser.id;
    createdUserIds.add(businessId);
    businessToken = generateToken({
      id: businessUser.id,
      email: businessUser.email,
      role: Role.BUSINESS,
    });

    // 2. Other Business user (unrelated business)
    const otherBusinessUser = await prisma.user.create({
      data: {
        name: "Other Business For Registrations",
        email: `other_biz_${runId}@test.local`.toLowerCase(),
        password_hash,
        role: Role.BUSINESS,
        status: UserStatus.ACTIVE,
        businessProfile: {
          create: {
            company_name: "Unrelated Business Corp",
          },
        },
      },
    });
    otherBusinessId = otherBusinessUser.id;
    createdUserIds.add(otherBusinessId);
    otherBusinessToken = generateToken({
      id: otherBusinessUser.id,
      email: otherBusinessUser.email,
      role: Role.BUSINESS,
    });

    // 3. Admin user
    const adminUser = await prisma.user.create({
      data: {
        name: "Test Admin For Registrations",
        email: `admin_reg_${runId}@test.local`.toLowerCase(),
        password_hash,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    adminId = adminUser.id;
    createdUserIds.add(adminId);
    adminToken = generateToken({
      id: adminUser.id,
      email: adminUser.email,
      role: Role.ADMIN,
    });

    // 4. Student 1 with complete profile (education, skills, project_links)
    const student1 = await prisma.user.create({
      data: {
        name: "Student One Reg",
        email: `student1_reg_${runId}@test.local`.toLowerCase(),
        password_hash,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        studentProfile: {
          create: {
            education: "BSc Computer Science",
            skills: ["TypeScript", "Node.js", "React"],
            project_links: ["https://github.com/student1/project"],
          },
        },
      },
    });
    student1Id = student1.id;
    createdUserIds.add(student1Id);
    student1Token = generateToken({
      id: student1.id,
      email: student1.email,
      role: Role.STUDENT,
    });

    // 5. Student 2 (for duplicate and forgery tests)
    const student2 = await prisma.user.create({
      data: {
        name: "Student Two Reg",
        email: `student2_reg_${runId}@test.local`.toLowerCase(),
        password_hash,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });
    student2Id = student2.id;
    createdUserIds.add(student2Id);
    student2Token = generateToken({
      id: student2.id,
      email: student2.email,
      role: Role.STUDENT,
    });

    // 6. Student 3 (for concurrency test)
    const student3 = await prisma.user.create({
      data: {
        name: "Student Concurrency Reg",
        email: `student_concurrent_${runId}@test.local`.toLowerCase(),
        password_hash,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });
    studentConcurrencyId = student3.id;
    createdUserIds.add(studentConcurrencyId);
    studentConcurrencyToken = generateToken({
      id: student3.id,
      email: student3.email,
      role: Role.STUDENT,
    });

    // 7. Open Competition Opportunity (owned by businessId)
    const opp1 = await prisma.opportunity.create({
      data: {
        posted_by: businessId,
        type: OpportunityType.COMPETITION,
        title: `Somali Hackathon ${runId}`,
        description: "National hackathon solving agricultural and financial problems.",
        skills_required: ["TypeScript", "React", "Node.js"],
        deadline: new Date(Date.now() + 86400000 * 30),
        status: OpportunityStatus.OPEN,
      },
    });
    openCompetitionId = opp1.id;
    createdOpportunityIds.add(openCompetitionId);

    // 8. Closed Competition Opportunity (owned by businessId)
    const opp2 = await prisma.opportunity.create({
      data: {
        posted_by: businessId,
        type: OpportunityType.COMPETITION,
        title: `Closed Competition ${runId}`,
        description: "Competition that has been officially closed by organizer.",
        skills_required: ["Python"],
        deadline: new Date(Date.now() + 86400000 * 10),
        status: OpportunityStatus.CLOSED,
      },
    });
    closedCompetitionId = opp2.id;
    createdOpportunityIds.add(closedCompetitionId);

    // 9. Expired Competition Opportunity (owned by businessId)
    const opp3 = await prisma.opportunity.create({
      data: {
        posted_by: businessId,
        type: OpportunityType.COMPETITION,
        title: `Expired Competition ${runId}`,
        description: "Competition whose registration deadline has elapsed.",
        skills_required: ["Algorithms"],
        deadline: new Date(Date.now() - 86400000),
        status: OpportunityStatus.OPEN,
      },
    });
    expiredCompetitionId = opp3.id;
    createdOpportunityIds.add(expiredCompetitionId);

    // 10. Empty Competition Opportunity (0 registrations, owned by businessId)
    const oppEmpty = await prisma.opportunity.create({
      data: {
        posted_by: businessId,
        type: OpportunityType.COMPETITION,
        title: `Empty Competition ${runId}`,
        description: "Competition with zero registered participants.",
        skills_required: ["Rust"],
        deadline: new Date(Date.now() + 86400000 * 20),
        status: OpportunityStatus.OPEN,
      },
    });
    emptyCompetitionId = oppEmpty.id;
    createdOpportunityIds.add(emptyCompetitionId);

    // 11. Open Job Opportunity
    const opp4 = await prisma.opportunity.create({
      data: {
        posted_by: businessId,
        type: OpportunityType.JOB,
        title: `Fullstack Developer ${runId}`,
        description: "Fullstack engineering job posting.",
        skills_required: ["Node.js", "MySQL"],
        deadline: new Date(Date.now() + 86400000 * 20),
        status: OpportunityStatus.OPEN,
      },
    });
    openJobId = opp4.id;
    createdOpportunityIds.add(openJobId);

    // 12. Open Internship Opportunity
    const opp5 = await prisma.opportunity.create({
      data: {
        posted_by: businessId,
        type: OpportunityType.INTERNSHIP,
        title: `Junior Web Intern ${runId}`,
        description: "Internship opportunity for university students.",
        skills_required: ["HTML", "CSS"],
        deadline: new Date(Date.now() + 86400000 * 25),
        status: OpportunityStatus.OPEN,
      },
    });
    openInternshipId = opp5.id;
    createdOpportunityIds.add(openInternshipId);
  });

  afterAll(async () => {
    // Clean up created registrations
    if (createdOpportunityIds.size > 0 || createdUserIds.size > 0) {
      try {
        await prisma.competitionRegistration.deleteMany({
          where: {
            OR: [
              { opportunity_id: { in: Array.from(createdOpportunityIds) } },
              { student_id: { in: Array.from(createdUserIds) } },
            ],
          },
        });
      } catch {
        // Ignored during cleanup
      }
    }

    // Clean up applications if any were created
    if (createdOpportunityIds.size > 0 || createdUserIds.size > 0) {
      try {
        await prisma.application.deleteMany({
          where: {
            OR: [
              { opportunity_id: { in: Array.from(createdOpportunityIds) } },
              { student_id: { in: Array.from(createdUserIds) } },
            ],
          },
        });
      } catch {
        // Ignored during cleanup
      }
    }

    // Clean up opportunities
    if (createdOpportunityIds.size > 0) {
      try {
        await prisma.opportunity.deleteMany({
          where: { id: { in: Array.from(createdOpportunityIds) } },
        });
      } catch {
        // Ignored during cleanup
      }
    }

    // Clean up users
    if (createdUserIds.size > 0) {
      try {
        await prisma.user.deleteMany({
          where: { id: { in: Array.from(createdUserIds) } },
        });
      } catch {
        // Ignored during cleanup
      }
    }
  });

  describe("Validation Schema Unit Tests", () => {
    it("should accept valid UUIDs in registerCompetitionParamSchema", () => {
      const validUuid = "123e4567-e89b-12d3-a456-426614174000";
      const result = registerCompetitionParamSchema.safeParse({ id: validUuid });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validUuid);
      }
    });

    it("should reject non-UUID strings in registerCompetitionParamSchema", () => {
      const result = registerCompetitionParamSchema.safeParse({
        id: "not-a-valid-uuid",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toMatch(/Invalid opportunity ID/i);
      }
    });

    it("should reject empty or whitespace strings in registerCompetitionParamSchema", () => {
      const empty = registerCompetitionParamSchema.safeParse({ id: "" });
      expect(empty.success).toBe(false);

      const whitespace = registerCompetitionParamSchema.safeParse({
        id: "   ",
      });
      expect(whitespace.success).toBe(false);
    });

    it("should reject unexpected extra fields in strict mode", () => {
      const extra = registerCompetitionParamSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        unexpected: "value",
      });
      expect(extra.success).toBe(false);
    });
  });

  describe("POST /api/v1/opportunities/:id/registrations (FR-006)", () => {
    describe("Authentication and Role-Based Access Control", () => {
      it("should return 401 when Authorization header is missing", async () => {
        const res = await request(app)
          .post(`/api/v1/opportunities/${openCompetitionId}/registrations`)
          .send();

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error).toMatch(/Authentication token is required/i);
      });

      it("should return 401 when Authorization header token is malformed", async () => {
        const res = await request(app)
          .post(`/api/v1/opportunities/${openCompetitionId}/registrations`)
          .set("Authorization", "Bearer invalid-token-string")
          .send();

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error).toMatch(/Invalid authentication token/i);
      });

      it("should return 401 when token has expired", async () => {
        const expiredToken = jwt.sign(
          {
            id: student1Id,
            email: "student1@test.local",
            role: Role.STUDENT,
          },
          getJwtSecret(),
          { expiresIn: "-5s" }
        );

        const res = await request(app)
          .post(`/api/v1/opportunities/${openCompetitionId}/registrations`)
          .set("Authorization", `Bearer ${expiredToken}`)
          .send();

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Token has expired" });
      });

      it("should return 403 when authenticated as BUSINESS role", async () => {
        const res = await request(app)
          .post(`/api/v1/opportunities/${openCompetitionId}/registrations`)
          .set("Authorization", `Bearer ${businessToken}`)
          .send();

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ error: "Access denied" });
      });

      it("should return 403 when authenticated as ADMIN role", async () => {
        const res = await request(app)
          .post(`/api/v1/opportunities/${openCompetitionId}/registrations`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send();

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ error: "Access denied" });
      });
    });

    describe("Parameter Validation & Opportunity Rules", () => {
      it("should return 400 when opportunity ID is not a valid UUID", async () => {
        const res = await request(app)
          .post("/api/v1/opportunities/not-a-valid-uuid/registrations")
          .set("Authorization", `Bearer ${student1Token}`)
          .send();

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error).toMatch(/Invalid opportunity ID/i);
      });

      it("should return 404 when opportunity does not exist", async () => {
        const nonExistentUuid = "00000000-0000-0000-0000-000000000000";
        const res = await request(app)
          .post(`/api/v1/opportunities/${nonExistentUuid}/registrations`)
          .set("Authorization", `Bearer ${student1Token}`)
          .send();

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Opportunity not found" });
      });

      it("should return 400 when opportunity type is JOB", async () => {
        const res = await request(app)
          .post(`/api/v1/opportunities/${openJobId}/registrations`)
          .set("Authorization", `Bearer ${student1Token}`)
          .send();

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error).toMatch(
          /Competition registration is only allowed for competitions/i
        );
      });

      it("should return 400 when opportunity type is INTERNSHIP", async () => {
        const res = await request(app)
          .post(`/api/v1/opportunities/${openInternshipId}/registrations`)
          .set("Authorization", `Bearer ${student1Token}`)
          .send();

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error).toMatch(
          /Competition registration is only allowed for competitions/i
        );
      });

      it("should return 400 when competition status is CLOSED", async () => {
        const res = await request(app)
          .post(`/api/v1/opportunities/${closedCompetitionId}/registrations`)
          .set("Authorization", `Bearer ${student1Token}`)
          .send();

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error).toMatch(
          /Competition is closed for registrations/i
        );
      });

      it("should return 400 when competition deadline has elapsed", async () => {
        const res = await request(app)
          .post(`/api/v1/opportunities/${expiredCompetitionId}/registrations`)
          .set("Authorization", `Bearer ${student1Token}`)
          .send();

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error).toMatch(/Competition deadline has passed/i);
      });
    });

    describe("Successful Registration & Forgery Protection", () => {
      it("should register successfully (201) and derive student ID exclusively from authenticated user", async () => {
        // Even if client attempts to pass a forged student_id or registration fields in request body
        const res = await request(app)
          .post(`/api/v1/opportunities/${openCompetitionId}/registrations`)
          .set("Authorization", `Bearer ${student1Token}`)
          .send({
            student_id: student2Id,
            registered_at: "2020-01-01T00:00:00.000Z",
            status: "SHORTLISTED",
          });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("message", "Registration successful");
        expect(res.body).toHaveProperty("registration");

        const registration = res.body.registration;
        expect(registration).toHaveProperty("id");
        expect(typeof registration.id).toBe("string");
        // Must be student1Id, NOT student2Id from forged body
        expect(registration.student_id).toBe(student1Id);
        expect(registration.opportunity_id).toBe(openCompetitionId);
        expect(registration).toHaveProperty("registered_at");
        expect(!isNaN(Date.parse(registration.registered_at))).toBe(true);

        // Verify persistence in MySQL
        const dbRecord = await prisma.competitionRegistration.findUnique({
          where: {
            student_id_opportunity_id: {
              student_id: student1Id,
              opportunity_id: openCompetitionId,
            },
          },
        });

        expect(dbRecord).not.toBeNull();
        expect(dbRecord?.id).toBe(registration.id);
        expect(dbRecord?.student_id).toBe(student1Id);
        expect(dbRecord?.opportunity_id).toBe(openCompetitionId);
      });

      it("should return 409 Conflict when student attempts duplicate registration", async () => {
        // student1 is already registered from previous test
        const res = await request(app)
          .post(`/api/v1/opportunities/${openCompetitionId}/registrations`)
          .set("Authorization", `Bearer ${student1Token}`)
          .send();

        expect(res.status).toBe(409);
        expect(res.body).toEqual({
          error: "Already registered for this competition",
        });

        // Verify that no second registration was created
        const count = await prisma.competitionRegistration.count({
          where: {
            student_id: student1Id,
            opportunity_id: openCompetitionId,
          },
        });
        expect(count).toBe(1);
      });

      it("should allow another student to register for the same competition", async () => {
        const res = await request(app)
          .post(`/api/v1/opportunities/${openCompetitionId}/registrations`)
          .set("Authorization", `Bearer ${student2Token}`)
          .send();

        expect(res.status).toBe(201);
        expect(res.body.registration.student_id).toBe(student2Id);
        expect(res.body.registration.opportunity_id).toBe(openCompetitionId);

        const dbRecord = await prisma.competitionRegistration.findUnique({
          where: {
            student_id_opportunity_id: {
              student_id: student2Id,
              opportunity_id: openCompetitionId,
            },
          },
        });
        expect(dbRecord).not.toBeNull();
      });
    });

    describe("Concurrency Safeguard", () => {
      it("should handle concurrent duplicate registration requests safely, creating exactly one registration", async () => {
        // Create a dedicated competition for concurrency test
        const concurrentOpp = await prisma.opportunity.create({
          data: {
            posted_by: businessId,
            type: OpportunityType.COMPETITION,
            title: `Concurrency Test Competition ${runId}`,
            description: "Testing concurrent duplicate registrations.",
            deadline: new Date(Date.now() + 86400000 * 15),
            status: OpportunityStatus.OPEN,
          },
        });
        createdOpportunityIds.add(concurrentOpp.id);

        // Launch 5 concurrent requests simultaneously for the same student
        const requests = Array.from({ length: 5 }, () =>
          request(app)
            .post(`/api/v1/opportunities/${concurrentOpp.id}/registrations`)
            .set("Authorization", `Bearer ${studentConcurrencyToken}`)
            .send()
        );

        const responses = await Promise.all(requests);

        const successes = responses.filter((r) => r.status === 201);
        const conflicts = responses.filter((r) => r.status === 409);

        // Exactly 1 request succeeds with 201, the rest receive 409 Conflict
        expect(successes.length).toBe(1);
        expect(conflicts.length).toBe(4);

        // Verify database contains exactly 1 registration row
        const count = await prisma.competitionRegistration.count({
          where: {
            student_id: studentConcurrencyId,
            opportunity_id: concurrentOpp.id,
          },
        });
        expect(count).toBe(1);
      });
    });
  });

  describe("GET /api/v1/opportunities/:id/registrations (FR-018)", () => {
    describe("Authentication and Role-Based Authorization", () => {
      it("should return 401 when Authorization header is missing", async () => {
        const res = await request(app)
          .get(`/api/v1/opportunities/${openCompetitionId}/registrations`);

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error).toMatch(/Authentication token is required/i);
      });

      it("should return 401 when token is malformed", async () => {
        const res = await request(app)
          .get(`/api/v1/opportunities/${openCompetitionId}/registrations`)
          .set("Authorization", "Bearer invalid-token-sample");

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error).toMatch(/Invalid authentication token/i);
      });

      it("should return 401 when token has expired", async () => {
        const expiredBizToken = jwt.sign(
          {
            id: businessId,
            email: "biz@test.local",
            role: Role.BUSINESS,
          },
          getJwtSecret(),
          { expiresIn: "-10s" }
        );

        const res = await request(app)
          .get(`/api/v1/opportunities/${openCompetitionId}/registrations`)
          .set("Authorization", `Bearer ${expiredBizToken}`);

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Token has expired" });
      });

      it("should return 403 when authenticated as a STUDENT", async () => {
        const res = await request(app)
          .get(`/api/v1/opportunities/${openCompetitionId}/registrations`)
          .set("Authorization", `Bearer ${student1Token}`);

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ error: "Access denied" });
      });

      it("should return 403 when authenticated as a non-owner BUSINESS", async () => {
        // otherBusinessId did not post openCompetitionId
        const res = await request(app)
          .get(`/api/v1/opportunities/${openCompetitionId}/registrations`)
          .set("Authorization", `Bearer ${otherBusinessToken}`);

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ error: "Access denied" });
      });

      it("should return 200 when authenticated as the owner BUSINESS", async () => {
        const res = await request(app)
          .get(`/api/v1/opportunities/${openCompetitionId}/registrations`)
          .set("Authorization", `Bearer ${businessToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("registrations");
        expect(Array.isArray(res.body.registrations)).toBe(true);
      });

      it("should return 200 when authenticated as ADMIN (platform-wide access per SRS Section 5)", async () => {
        const res = await request(app)
          .get(`/api/v1/opportunities/${openCompetitionId}/registrations`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("registrations");
        expect(Array.isArray(res.body.registrations)).toBe(true);
      });
    });

    describe("Parameter Validation & Opportunity Rules", () => {
      it("should return 400 when opportunity ID is not a valid UUID", async () => {
        const res = await request(app)
          .get("/api/v1/opportunities/not-a-valid-uuid/registrations")
          .set("Authorization", `Bearer ${businessToken}`);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error).toMatch(/Invalid opportunity ID/i);
      });

      it("should return 404 when opportunity does not exist", async () => {
        const nonExistentUuid = "00000000-0000-0000-0000-000000000000";
        const res = await request(app)
          .get(`/api/v1/opportunities/${nonExistentUuid}/registrations`)
          .set("Authorization", `Bearer ${businessToken}`);

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Opportunity not found" });
      });

      it("should return 400 when opportunity type is JOB", async () => {
        const res = await request(app)
          .get(`/api/v1/opportunities/${openJobId}/registrations`)
          .set("Authorization", `Bearer ${businessToken}`);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error).toMatch(
          /Competition registrations are only available for competitions/i
        );
      });

      it("should return 400 when opportunity type is INTERNSHIP", async () => {
        const res = await request(app)
          .get(`/api/v1/opportunities/${openInternshipId}/registrations`)
          .set("Authorization", `Bearer ${businessToken}`);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error).toMatch(
          /Competition registrations are only available for competitions/i
        );
      });
    });

    describe("Data Accuracy, Formatting & Security", () => {
      it("should return an empty array when an eligible competition has zero registrations", async () => {
        const res = await request(app)
          .get(`/api/v1/opportunities/${emptyCompetitionId}/registrations`)
          .set("Authorization", `Bearer ${businessToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("registrations");
        expect(res.body.registrations).toEqual([]);
        expect(res.body.registrants).toEqual([]);
      });

      it("should return complete registration and student profile details with safe fields only", async () => {
        const res = await request(app)
          .get(`/api/v1/opportunities/${openCompetitionId}/registrations`)
          .set("Authorization", `Bearer ${businessToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("registrations");
        expect(res.body.registrations.length).toBe(2);

        // Find the record for student 1
        const record1 = res.body.registrations.find(
          (r: { student_id: string }) => r.student_id === student1Id
        );
        expect(record1).toBeDefined();
        expect(record1.name).toBe("Student One Reg");
        expect(record1.email).toBe(`student1_reg_${runId}@test.local`.toLowerCase());
        expect(record1.education).toBe("BSc Computer Science");
        expect(record1.skills).toEqual(["TypeScript", "Node.js", "React"]);
        expect(record1.project_links).toEqual(["https://github.com/student1/project"]);
        expect(typeof record1.registered_at).toBe("string");
        expect(!isNaN(Date.parse(record1.registered_at))).toBe(true);

        // Security check: no sensitive fields exposed in any record
        for (const item of res.body.registrations) {
          expect(item).not.toHaveProperty("password_hash");
          expect(item).not.toHaveProperty("password");
          expect(item).not.toHaveProperty("token");
          expect(item).not.toHaveProperty("status"); // registrations have no status
        }
      });

      it("should ensure deterministic ordering (newest registration first)", async () => {
        const res = await request(app)
          .get(`/api/v1/opportunities/${openCompetitionId}/registrations`)
          .set("Authorization", `Bearer ${businessToken}`);

        expect(res.status).toBe(200);
        const list = res.body.registrations;
        expect(list.length).toBeGreaterThanOrEqual(2);

        for (let i = 0; i < list.length - 1; i++) {
          const current = new Date(list[i].registered_at).getTime();
          const next = new Date(list[i + 1].registered_at).getTime();
          expect(current).toBeGreaterThanOrEqual(next);
        }
      });

      it("should prevent non-owner business from bypassing authorization using client-supplied query params or body", async () => {
        const res = await request(app)
          .get(`/api/v1/opportunities/${openCompetitionId}/registrations?posted_by=${businessId}&user_id=${businessId}`)
          .set("Authorization", `Bearer ${otherBusinessToken}`)
          .send({ posted_by: businessId, role: "ADMIN" });

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ error: "Access denied" });
      });
    });
  });

  describe("Non-Regression: Existing Opportunity and Applications Endpoints", () => {
    it("should ensure opportunity details GET /opportunities/:id remains unaffected", async () => {
      const res = await request(app).get(`/api/v1/opportunities/${openCompetitionId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("opportunity");
      expect(res.body.opportunity.id).toBe(openCompetitionId);
      expect(res.body.opportunity.type).toBe(OpportunityType.COMPETITION);
    });

    it("should ensure applications endpoint POST /opportunities/:id/applications continues to reject competitions", async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${openCompetitionId}/applications`)
        .set("Authorization", `Bearer ${student1Token}`)
        .send();

      // Should be rejected by application flow with 400 (or 403 if profile check precedes)
      // specifically preserving existing application endpoint behavior
      expect([400, 403]).toContain(res.status);
    });
  });
});
