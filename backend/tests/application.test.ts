import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  Role,
  UserStatus,
  OpportunityType,
  OpportunityStatus,
  ApplicationStatus,
} from "@prisma/client";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { generateToken, getJwtSecret } from "../src/common/jwt";
import { applyOpportunityParamSchema } from "../src/validations/application.validation";

describe("Application Module", () => {
  const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const createdUserIds = new Set<string>();
  const createdOpportunityIds = new Set<string>();

  // Tokens and IDs
  let studentWithSkillsToken: string;
  let studentWithSkillsId: string;

  let studentWithoutProfileToken: string;
  let studentWithoutProfileId: string;

  let studentWithEmptySkillsToken: string;
  let studentWithEmptySkillsId: string;

  let studentWithNullSkillsToken: string;
  let studentWithNullSkillsId: string;

  let otherStudentToken: string;
  let otherStudentId: string;

  let businessToken: string;
  let businessId: string;

  let adminToken: string;
  let adminId: string;

  // Opportunities
  let openInternshipId: string;
  let openJobId: string;
  let competitionOppId: string;
  let closedOppId: string;
  let expiredOppId: string;

  beforeAll(async () => {
    const password_hash = await bcrypt.hash("Password123!", 10);

    // 1. Business user who creates opportunities
    const businessUser = await prisma.user.create({
      data: {
        name: "Test Business For Apps",
        email: `biz_app_${runId}@test.local`.toLowerCase(),
        password_hash,
        role: Role.BUSINESS,
        status: UserStatus.ACTIVE,
        businessProfile: {
          create: {
            company_name: "App Testing Corp",
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

    // 2. Admin user
    const adminUser = await prisma.user.create({
      data: {
        name: "Test Admin For Apps",
        email: `admin_app_${runId}@test.local`.toLowerCase(),
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

    // 3. Student user with complete profile and skills
    const student1 = await prisma.user.create({
      data: {
        name: "Student Complete Profile",
        email: `student_complete_${runId}@test.local`.toLowerCase(),
        password_hash,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        studentProfile: {
          create: {
            education: "Computer Science BSc",
            skills: ["TypeScript", "Node.js", "Express"],
            project_links: ["https://github.com/student/project1"],
          },
        },
      },
    });
    studentWithSkillsId = student1.id;
    createdUserIds.add(studentWithSkillsId);
    studentWithSkillsToken = generateToken({
      id: student1.id,
      email: student1.email,
      role: Role.STUDENT,
    });

    // 4. Student user without any student profile
    const student2 = await prisma.user.create({
      data: {
        name: "Student Without Profile",
        email: `student_noprofile_${runId}@test.local`.toLowerCase(),
        password_hash,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });
    studentWithoutProfileId = student2.id;
    createdUserIds.add(studentWithoutProfileId);
    studentWithoutProfileToken = generateToken({
      id: student2.id,
      email: student2.email,
      role: Role.STUDENT,
    });

    // 5. Student user with profile having empty skills array
    const student3 = await prisma.user.create({
      data: {
        name: "Student Empty Skills",
        email: `student_emptyskills_${runId}@test.local`.toLowerCase(),
        password_hash,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        studentProfile: {
          create: {
            education: "Information Systems",
            skills: [],
          },
        },
      },
    });
    studentWithEmptySkillsId = student3.id;
    createdUserIds.add(studentWithEmptySkillsId);
    studentWithEmptySkillsToken = generateToken({
      id: student3.id,
      email: student3.email,
      role: Role.STUDENT,
    });

    // 6. Student user with profile having null skills
    const student4 = await prisma.user.create({
      data: {
        name: "Student Null Skills",
        email: `student_nullskills_${runId}@test.local`.toLowerCase(),
        password_hash,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        studentProfile: {
          create: {
            education: "Software Engineering",
            skills: undefined,
          },
        },
      },
    });
    studentWithNullSkillsId = student4.id;
    createdUserIds.add(studentWithNullSkillsId);
    studentWithNullSkillsToken = generateToken({
      id: student4.id,
      email: student4.email,
      role: Role.STUDENT,
    });

    // 7. Other student for forgery tests
    const student5 = await prisma.user.create({
      data: {
        name: "Other Student",
        email: `other_student_${runId}@test.local`.toLowerCase(),
        password_hash,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        studentProfile: {
          create: {
            skills: ["Python", "Django"],
          },
        },
      },
    });
    otherStudentId = student5.id;
    createdUserIds.add(otherStudentId);
    otherStudentToken = generateToken({
      id: student5.id,
      email: student5.email,
      role: Role.STUDENT,
    });

    // Create test opportunities
    // Open Internship
    const opp1 = await prisma.opportunity.create({
      data: {
        posted_by: businessId,
        type: OpportunityType.INTERNSHIP,
        title: `Software Engineering Intern ${runId}`,
        description: "Full stack TypeScript and React engineering internship.",
        skills_required: ["TypeScript", "React"],
        deadline: new Date(Date.now() + 86400000 * 30),
        status: OpportunityStatus.OPEN,
      },
    });
    openInternshipId = opp1.id;
    createdOpportunityIds.add(openInternshipId);

    // Open Job
    const opp2 = await prisma.opportunity.create({
      data: {
        posted_by: businessId,
        type: OpportunityType.JOB,
        title: `Junior Backend Developer ${runId}`,
        description: "Junior backend developer building robust REST APIs.",
        skills_required: ["Node.js", "Express"],
        deadline: new Date(Date.now() + 86400000 * 45),
        status: OpportunityStatus.OPEN,
      },
    });
    openJobId = opp2.id;
    createdOpportunityIds.add(openJobId);

    // Competition opportunity
    const opp3 = await prisma.opportunity.create({
      data: {
        posted_by: businessId,
        type: OpportunityType.COMPETITION,
        title: `National Coding Championship ${runId}`,
        description: "Annual algorithmic programming competition for university students.",
        skills_required: ["Algorithms", "Problem Solving"],
        deadline: new Date(Date.now() + 86400000 * 60),
        status: OpportunityStatus.OPEN,
      },
    });
    competitionOppId = opp3.id;
    createdOpportunityIds.add(competitionOppId);

    // Closed Opportunity
    const opp4 = await prisma.opportunity.create({
      data: {
        posted_by: businessId,
        type: OpportunityType.JOB,
        title: `Closed Opportunity ${runId}`,
        description: "Opportunity that has already been closed by the business.",
        skills_required: ["Go"],
        deadline: new Date(Date.now() + 86400000 * 10),
        status: OpportunityStatus.CLOSED,
      },
    });
    closedOppId = opp4.id;
    createdOpportunityIds.add(closedOppId);

    // Expired Opportunity (deadline in past)
    const opp5 = await prisma.opportunity.create({
      data: {
        posted_by: businessId,
        type: OpportunityType.INTERNSHIP,
        title: `Expired Opportunity ${runId}`,
        description: "Internship opportunity whose deadline has already elapsed.",
        skills_required: ["HTML", "CSS"],
        deadline: new Date(Date.now() - 86400000),
        status: OpportunityStatus.OPEN,
      },
    });
    expiredOppId = opp5.id;
    createdOpportunityIds.add(expiredOppId);
  });

  afterAll(async () => {
    // Delete created applications
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

    // Delete created notifications
    if (createdUserIds.size > 0) {
      try {
        await prisma.notification.deleteMany({
          where: { user_id: { in: Array.from(createdUserIds) } },
        });
      } catch {
        // Ignored during cleanup
      }
    }

    // Delete created opportunities
    if (createdOpportunityIds.size > 0) {
      try {
        await prisma.opportunity.deleteMany({
          where: { id: { in: Array.from(createdOpportunityIds) } },
        });
      } catch {
        // Ignored during cleanup
      }
    }

    // Delete created users
    if (createdUserIds.size > 0) {
      try {
        await prisma.user.deleteMany({
          where: { id: { in: Array.from(createdUserIds) } },
        });
      } catch {
        // Ignored during cleanup
      }
    }

    await prisma.$disconnect();
  });

  describe("Validation Schemas (Unit)", () => {
    it("should accept valid opportunity ID param", () => {
      const result = applyOpportunityParamSchema.safeParse({ id: "valid-opp-uuid" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("valid-opp-uuid");
      }
    });

    it("should reject missing or empty ID", () => {
      const missing = applyOpportunityParamSchema.safeParse({});
      expect(missing.success).toBe(false);

      const empty = applyOpportunityParamSchema.safeParse({ id: "" });
      expect(empty.success).toBe(false);

      const whitespace = applyOpportunityParamSchema.safeParse({ id: "   " });
      expect(whitespace.success).toBe(false);
    });

    it("should reject unknown extra parameters in strict mode", () => {
      const extra = applyOpportunityParamSchema.safeParse({
        id: "valid-id",
        extra: "not-allowed",
      });
      expect(extra.success).toBe(false);
    });
  });

  describe("Authentication & Role Authorization", () => {
    it("should return 401 when Authorization header is missing", async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${openInternshipId}/applications`)
        .send();

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/Authentication token is required/i);
    });

    it("should return 401 when token is invalid or malformed", async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${openInternshipId}/applications`)
        .set("Authorization", "Bearer invalid.token.value")
        .send();

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/Invalid authentication token/i);
    });

    it("should return 401 when token is expired", async () => {
      const expiredToken = jwt.sign(
        {
          id: studentWithSkillsId,
          email: "student@test.local",
          role: Role.STUDENT,
        },
        getJwtSecret(),
        { expiresIn: "-1s" }
      );

      const res = await request(app)
        .post(`/api/v1/opportunities/${openInternshipId}/applications`)
        .set("Authorization", `Bearer ${expiredToken}`)
        .send();

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Token has expired" });
    });

    it("should return 403 when authenticated as a BUSINESS role", async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${openInternshipId}/applications`)
        .set("Authorization", `Bearer ${businessToken}`)
        .send();

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied" });
    });

    it("should return 403 when authenticated as an ADMIN role", async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${openInternshipId}/applications`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send();

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied" });
    });
  });

  describe("Student Profile Completeness Requirements", () => {
    it("should return 403 with completion prompt when student has no profile", async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${openInternshipId}/applications`)
        .set("Authorization", `Bearer ${studentWithoutProfileToken}`)
        .send();

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/complete your student profile/i);
    });

    it("should return 403 with completion prompt when student profile has empty skills array", async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${openInternshipId}/applications`)
        .set("Authorization", `Bearer ${studentWithEmptySkillsToken}`)
        .send();

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/complete your student profile/i);
    });

    it("should return 403 with completion prompt when student profile has null skills", async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${openInternshipId}/applications`)
        .set("Authorization", `Bearer ${studentWithNullSkillsToken}`)
        .send();

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/complete your student profile/i);
    });
  });

  describe("Opportunity Validation & Status Requirements", () => {
    it("should return 400 when opportunity ID is whitespace only", async () => {
      const res = await request(app)
        .post("/api/v1/opportunities/%20%20/applications")
        .set("Authorization", `Bearer ${studentWithSkillsToken}`)
        .send();

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/Opportunity ID cannot be empty/i);
    });

    it("should return 404 when opportunity does not exist", async () => {
      const res = await request(app)
        .post("/api/v1/opportunities/non-existent-opportunity-id/applications")
        .set("Authorization", `Bearer ${studentWithSkillsToken}`)
        .send();

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Opportunity not found" });
    });

    it("should return 400 when opportunity is a COMPETITION with registration explanation", async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${competitionOppId}/applications`)
        .set("Authorization", `Bearer ${studentWithSkillsToken}`)
        .send();

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/competition registration is a separate flow/i);
    });

    it("should return 400 when opportunity status is CLOSED", async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${closedOppId}/applications`)
        .set("Authorization", `Bearer ${studentWithSkillsToken}`)
        .send();

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/Opportunity is closed for applications/i);
    });

    it("should return 400 when opportunity deadline has passed", async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${expiredOppId}/applications`)
        .set("Authorization", `Bearer ${studentWithSkillsToken}`)
        .send();

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/Opportunity deadline has passed/i);
    });
  });

  describe("Application Submission, Persistence & Status", () => {
    let createdApplicationId: string;

    it("should successfully apply to an eligible INTERNSHIP opportunity (HTTP 201)", async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${openInternshipId}/applications`)
        .set("Authorization", `Bearer ${studentWithSkillsToken}`)
        .send();

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("message", "Application submitted successfully");
      expect(res.body).toHaveProperty("application");

      const appData = res.body.application;
      expect(appData).toHaveProperty("id");
      expect(appData.student_id).toBe(studentWithSkillsId);
      expect(appData.opportunity_id).toBe(openInternshipId);
      expect(appData.status).toBe(ApplicationStatus.NEW);
      expect(appData).toHaveProperty("submitted_at");
      expect(new Date(appData.submitted_at).toString()).not.toBe("Invalid Date");

      createdApplicationId = appData.id;

      // Verify directly in database
      const dbRecord = await prisma.application.findUnique({
        where: { id: createdApplicationId },
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.student_id).toBe(studentWithSkillsId);
      expect(dbRecord?.opportunity_id).toBe(openInternshipId);
      expect(dbRecord?.status).toBe(ApplicationStatus.NEW);
    });

    it("should successfully apply to an eligible JOB opportunity (HTTP 201)", async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${openJobId}/applications`)
        .set("Authorization", `Bearer ${studentWithSkillsToken}`)
        .send();

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("message", "Application submitted successfully");
      expect(res.body.application.status).toBe("NEW");
      expect(res.body.application.student_id).toBe(studentWithSkillsId);
      expect(res.body.application.opportunity_id).toBe(openJobId);

      // Verify in DB
      const dbRecord = await prisma.application.findUnique({
        where: { id: res.body.application.id },
      });
      expect(dbRecord?.status).toBe("NEW");
    });

    it("should prevent duplicate applications and return HTTP 409", async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${openInternshipId}/applications`)
        .set("Authorization", `Bearer ${studentWithSkillsToken}`)
        .send();

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/Already applied/i);
    });
  });

  describe("Request Body & Field Forgery Safeguards", () => {
    it("should ignore forged fields in request body and strictly use authenticated identity and initial status NEW", async () => {
      // Create a fresh open opportunity for this test
      const freshOpp = await prisma.opportunity.create({
        data: {
          posted_by: businessId,
          type: OpportunityType.JOB,
          title: `Forgery Test Job ${runId}`,
          description: "Testing that forged payload fields are ignored entirely.",
          deadline: new Date(Date.now() + 86400000 * 20),
          status: OpportunityStatus.OPEN,
        },
      });
      createdOpportunityIds.add(freshOpp.id);

      const fakeId = "00000000-0000-0000-0000-000000000000";

      // Attempt to forge student_id, status, and application id
      const res = await request(app)
        .post(`/api/v1/opportunities/${freshOpp.id}/applications`)
        .set("Authorization", `Bearer ${otherStudentToken}`)
        .send({
          student_id: studentWithSkillsId, // malicious attempt to impersonate another student
          status: "HIRED",                 // malicious attempt to set status to HIRED
          id: fakeId,                      // malicious attempt to set custom ID
        });

      expect(res.status).toBe(201);
      expect(res.body.application.student_id).toBe(otherStudentId);
      expect(res.body.application.student_id).not.toBe(studentWithSkillsId);
      expect(res.body.application.status).toBe(ApplicationStatus.NEW);
      expect(res.body.application.status).not.toBe("HIRED");
      expect(res.body.application.id).not.toBe(fakeId);

      // Verify the record in the database
      const dbApp = await prisma.application.findUnique({
        where: { id: res.body.application.id },
      });
      expect(dbApp).not.toBeNull();
      expect(dbApp?.student_id).toBe(otherStudentId);
      expect(dbApp?.status).toBe(ApplicationStatus.NEW);
      expect(dbApp?.id).not.toBe(fakeId);
    });
  });

  describe("Concurrent Duplicate Submissions Safety", () => {
    it("should safely handle concurrent duplicate submissions creating exactly one record (one 201, one 409)", async () => {
      // Create a fresh student with complete profile
      const concurrentStudent = await prisma.user.create({
        data: {
          name: "Concurrent Student",
          email: `concurrent_student_${runId}@test.local`.toLowerCase(),
          password_hash: await bcrypt.hash("Password123!", 10),
          role: Role.STUDENT,
          status: UserStatus.ACTIVE,
          studentProfile: {
            create: {
              skills: ["Concurrency", "Go", "TypeScript"],
            },
          },
        },
      });
      createdUserIds.add(concurrentStudent.id);
      const concurrentToken = generateToken({
        id: concurrentStudent.id,
        email: concurrentStudent.email,
        role: Role.STUDENT,
      });

      // Create a fresh opportunity
      const concurrentOpp = await prisma.opportunity.create({
        data: {
          posted_by: businessId,
          type: OpportunityType.JOB,
          title: `Concurrency Target Job ${runId}`,
          description: "Testing concurrent duplicate application handling.",
          deadline: new Date(Date.now() + 86400000 * 15),
          status: OpportunityStatus.OPEN,
        },
      });
      createdOpportunityIds.add(concurrentOpp.id);

      // Fire 2 concurrent application requests simultaneously
      const [resA, resB] = await Promise.all([
        request(app)
          .post(`/api/v1/opportunities/${concurrentOpp.id}/applications`)
          .set("Authorization", `Bearer ${concurrentToken}`)
          .send(),
        request(app)
          .post(`/api/v1/opportunities/${concurrentOpp.id}/applications`)
          .set("Authorization", `Bearer ${concurrentToken}`)
          .send(),
      ]);

      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([201, 409]);

      const successRes = resA.status === 201 ? resA : resB;
      const conflictRes = resA.status === 409 ? resA : resB;

      expect(successRes.body).toHaveProperty("message", "Application submitted successfully");
      expect(conflictRes.body).toHaveProperty("error");
      expect(conflictRes.body.error).toMatch(/Already applied/i);

      // Verify that database has EXACTLY 1 application record
      const count = await prisma.application.count({
        where: {
          student_id: concurrentStudent.id,
          opportunity_id: concurrentOpp.id,
        },
      });
      expect(count).toBe(1);
    });
  });

  describe("GET /api/v1/students/me/applications", () => {
    let studentWithAppsId: string;
    let studentWithAppsToken: string;
    let studentEmptyId: string;
    let studentEmptyToken: string;
    let studentOtherId: string;
    let studentOtherToken: string;

    let oppAlphaId: string;
    let oppBetaId: string;
    let oppGammaId: string;

    beforeAll(async () => {
      const password_hash = await bcrypt.hash("Password123!", 10);

      // Student with multiple applications
      const student1 = await prisma.user.create({
        data: {
          name: "Student Listing 1",
          email: `student_list1_${runId}@test.local`.toLowerCase(),
          password_hash,
          role: Role.STUDENT,
          status: UserStatus.ACTIVE,
          studentProfile: {
            create: { skills: ["React", "Node"] },
          },
        },
      });
      studentWithAppsId = student1.id;
      createdUserIds.add(studentWithAppsId);
      studentWithAppsToken = generateToken({
        id: student1.id,
        email: student1.email,
        role: Role.STUDENT,
      });

      // Student with 0 applications
      const student2 = await prisma.user.create({
        data: {
          name: "Student Listing 2",
          email: `student_list2_${runId}@test.local`.toLowerCase(),
          password_hash,
          role: Role.STUDENT,
          status: UserStatus.ACTIVE,
          studentProfile: {
            create: { skills: ["Python"] },
          },
        },
      });
      studentEmptyId = student2.id;
      createdUserIds.add(studentEmptyId);
      studentEmptyToken = generateToken({
        id: student2.id,
        email: student2.email,
        role: Role.STUDENT,
      });

      // Another student for cross-user isolation test
      const student3 = await prisma.user.create({
        data: {
          name: "Student Listing 3",
          email: `student_list3_${runId}@test.local`.toLowerCase(),
          password_hash,
          role: Role.STUDENT,
          status: UserStatus.ACTIVE,
          studentProfile: {
            create: { skills: ["Java"] },
          },
        },
      });
      studentOtherId = student3.id;
      createdUserIds.add(studentOtherId);
      studentOtherToken = generateToken({
        id: student3.id,
        email: student3.email,
        role: Role.STUDENT,
      });

      // Create distinct opportunities for testing listing
      const oppA = await prisma.opportunity.create({
        data: {
          posted_by: businessId,
          type: OpportunityType.INTERNSHIP,
          title: `Alpha Internship ${runId}`,
          description: "Internship opportunity for listing tests.",
          skills_required: ["React"],
          deadline: new Date(Date.now() + 86400000 * 20),
          status: OpportunityStatus.OPEN,
        },
      });
      oppAlphaId = oppA.id;
      createdOpportunityIds.add(oppAlphaId);

      const oppB = await prisma.opportunity.create({
        data: {
          posted_by: businessId,
          type: OpportunityType.JOB,
          title: `Beta Job ${runId}`,
          description: "Full-time job opportunity for listing tests.",
          skills_required: ["Node.js"],
          deadline: new Date(Date.now() + 86400000 * 30),
          status: OpportunityStatus.OPEN,
        },
      });
      oppBetaId = oppB.id;
      createdOpportunityIds.add(oppBetaId);

      const oppC = await prisma.opportunity.create({
        data: {
          posted_by: businessId,
          type: OpportunityType.JOB,
          title: `Gamma Job ${runId}`,
          description: "Job opportunity for other student test.",
          skills_required: ["Java"],
          deadline: new Date(Date.now() + 86400000 * 40),
          status: OpportunityStatus.OPEN,
        },
      });
      oppGammaId = oppC.id;
      createdOpportunityIds.add(oppGammaId);

      // Create applications with deterministic timestamps
      // Application 1: Submitted 2 hours ago
      await prisma.application.create({
        data: {
          student_id: studentWithAppsId,
          opportunity_id: oppAlphaId,
          status: ApplicationStatus.NEW,
          submitted_at: new Date(Date.now() - 7200000),
        },
      });

      // Application 2: Submitted 1 hour ago (newer than App 1)
      await prisma.application.create({
        data: {
          student_id: studentWithAppsId,
          opportunity_id: oppBetaId,
          status: ApplicationStatus.SHORTLISTED,
          submitted_at: new Date(Date.now() - 3600000),
        },
      });

      // Application for other student:
      await prisma.application.create({
        data: {
          student_id: studentOtherId,
          opportunity_id: oppGammaId,
          status: ApplicationStatus.NEW,
          submitted_at: new Date(),
        },
      });
    });

    it("should return 401 when Authorization header is missing", async () => {
      const res = await request(app).get("/api/v1/students/me/applications");
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Authentication token is required/i);
    });

    it("should return 401 when token is malformed", async () => {
      const res = await request(app)
        .get("/api/v1/students/me/applications")
        .set("Authorization", "Bearer invalid-token");
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Invalid authentication token/i);
    });

    it("should return 401 when token is expired", async () => {
      const expiredToken = jwt.sign(
        { id: studentWithAppsId, email: "student@test.local", role: Role.STUDENT },
        getJwtSecret(),
        { expiresIn: "-1s" }
      );
      const res = await request(app)
        .get("/api/v1/students/me/applications")
        .set("Authorization", `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Token has expired" });
    });

    it("should return 403 when authenticated as a BUSINESS role", async () => {
      const res = await request(app)
        .get("/api/v1/students/me/applications")
        .set("Authorization", `Bearer ${businessToken}`);
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied" });
    });

    it("should return 403 when authenticated as an ADMIN role", async () => {
      const res = await request(app)
        .get("/api/v1/students/me/applications")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied" });
    });

    it("should return 200 with an empty array when student has no applications", async () => {
      const res = await request(app)
        .get("/api/v1/students/me/applications")
        .set("Authorization", `Bearer ${studentEmptyToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("applications");
      expect(Array.isArray(res.body.applications)).toBe(true);
      expect(res.body.applications).toHaveLength(0);
    });

    it("should return 200 with student applications and correct opportunity information", async () => {
      const res = await request(app)
        .get("/api/v1/students/me/applications")
        .set("Authorization", `Bearer ${studentWithAppsToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("applications");
      expect(res.body.applications).toHaveLength(2);

      const [firstApp, secondApp] = res.body.applications;

      // Verify structure and fields
      expect(firstApp).toHaveProperty("id");
      expect(firstApp.student_id).toBe(studentWithAppsId);
      expect(firstApp).toHaveProperty("submitted_at");
      expect(firstApp).toHaveProperty("status");

      expect(firstApp).toHaveProperty("opportunity");
      expect(firstApp.opportunity).toHaveProperty("id");
      expect(firstApp.opportunity).toHaveProperty("title");
      expect(firstApp.opportunity).toHaveProperty("type");
      expect(firstApp.opportunity).toHaveProperty("deadline");
      expect(firstApp.opportunity).toHaveProperty("status");
      expect(firstApp.opportunity).toHaveProperty("company_name", "App Testing Corp");

      expect(secondApp).toHaveProperty("id");
      expect(secondApp.student_id).toBe(studentWithAppsId);
      expect(secondApp.opportunity).toHaveProperty("company_name", "App Testing Corp");
    });

    it("should return application status accurately (SHORTLISTED vs NEW)", async () => {
      const res = await request(app)
        .get("/api/v1/students/me/applications")
        .set("Authorization", `Bearer ${studentWithAppsToken}`);

      expect(res.status).toBe(200);
      const appBeta = res.body.applications.find(
        (a: any) => a.opportunity_id === oppBetaId
      );
      const appAlpha = res.body.applications.find(
        (a: any) => a.opportunity_id === oppAlphaId
      );

      expect(appBeta?.status).toBe(ApplicationStatus.SHORTLISTED);
      expect(appAlpha?.status).toBe(ApplicationStatus.NEW);
    });

    it("should order applications deterministically by newest submission time first", async () => {
      const res = await request(app)
        .get("/api/v1/students/me/applications")
        .set("Authorization", `Bearer ${studentWithAppsToken}`);

      expect(res.status).toBe(200);
      expect(res.body.applications).toHaveLength(2);

      // App Beta (1 hour ago) must appear before App Alpha (2 hours ago)
      expect(res.body.applications[0].opportunity_id).toBe(oppBetaId);
      expect(res.body.applications[1].opportunity_id).toBe(oppAlphaId);

      const time0 = new Date(res.body.applications[0].submitted_at).getTime();
      const time1 = new Date(res.body.applications[1].submitted_at).getTime();
      expect(time0).toBeGreaterThan(time1);
    });

    it("should isolate different students' applications so one student cannot see another's records", async () => {
      const resStudent1 = await request(app)
        .get("/api/v1/students/me/applications")
        .set("Authorization", `Bearer ${studentWithAppsToken}`);

      const resStudentOther = await request(app)
        .get("/api/v1/students/me/applications")
        .set("Authorization", `Bearer ${studentOtherToken}`);

      expect(resStudent1.status).toBe(200);
      expect(resStudentOther.status).toBe(200);

      // Student 1 has oppAlpha and oppBeta
      const student1OppIds = resStudent1.body.applications.map((a: any) => a.opportunity_id);
      expect(student1OppIds).toContain(oppAlphaId);
      expect(student1OppIds).toContain(oppBetaId);
      expect(student1OppIds).not.toContain(oppGammaId);

      // Student Other has only oppGamma
      const studentOtherOppIds = resStudentOther.body.applications.map((a: any) => a.opportunity_id);
      expect(studentOtherOppIds).toContain(oppGammaId);
      expect(studentOtherOppIds).not.toContain(oppAlphaId);
      expect(studentOtherOppIds).not.toContain(oppBetaId);
    });

    it("should never expose sensitive fields such as password hashes, tokens, or emails", async () => {
      const res = await request(app)
        .get("/api/v1/students/me/applications")
        .set("Authorization", `Bearer ${studentWithAppsToken}`);

      expect(res.status).toBe(200);
      const jsonString = JSON.stringify(res.body);

      expect(jsonString).not.toMatch(/password_hash/i);
      expect(jsonString).not.toMatch(/Password123/i);
      expect(jsonString).not.toMatch(/secret/i);
      expect(jsonString).not.toMatch(/token/i);
      expect(jsonString).not.toMatch(/@test\.local/i);
    });

    it("should ignore query parameters or request body attempting to forge student_id", async () => {
      const res = await request(app)
        .get(`/api/v1/students/me/applications?student_id=${studentOtherId}`)
        .set("Authorization", `Bearer ${studentWithAppsToken}`)
        .send({ student_id: studentOtherId });

      expect(res.status).toBe(200);
      // Still returns studentWithAppsId's 2 applications, not studentOtherId's
      expect(res.body.applications).toHaveLength(2);
      expect(res.body.applications[0].student_id).toBe(studentWithAppsId);
      expect(res.body.applications[1].student_id).toBe(studentWithAppsId);
    });
  });

  describe("GET /api/v1/opportunities/:id/applications", () => {
    let bizOwnerId: string;
    let bizOwnerToken: string;
    let bizOtherId: string;
    let bizOtherToken: string;

    let oppWithOwnerAppsId: string;
    let oppWithNoAppsId: string;
    let oppOtherBizId: string;

    let applicantStudent1Id: string;
    let applicantStudent2Id: string;

    beforeAll(async () => {
      const password_hash = await bcrypt.hash("Password123!", 10);

      // 1. Business Owner User
      const bizOwner = await prisma.user.create({
        data: {
          name: "Biz Owner User",
          email: `biz_owner_${runId}@test.local`.toLowerCase(),
          password_hash,
          role: Role.BUSINESS,
          status: UserStatus.ACTIVE,
          businessProfile: {
            create: { company_name: "Owner Biz Corp" },
          },
        },
      });
      bizOwnerId = bizOwner.id;
      createdUserIds.add(bizOwnerId);
      bizOwnerToken = generateToken({
        id: bizOwner.id,
        email: bizOwner.email,
        role: Role.BUSINESS,
      });

      // 2. Other Business User
      const bizOther = await prisma.user.create({
        data: {
          name: "Biz Other User",
          email: `biz_other_${runId}@test.local`.toLowerCase(),
          password_hash,
          role: Role.BUSINESS,
          status: UserStatus.ACTIVE,
          businessProfile: {
            create: { company_name: "Other Biz Ltd" },
          },
        },
      });
      bizOtherId = bizOther.id;
      createdUserIds.add(bizOtherId);
      bizOtherToken = generateToken({
        id: bizOther.id,
        email: bizOther.email,
        role: Role.BUSINESS,
      });

      // 3. Student applicants with complete profile data
      const studentA = await prisma.user.create({
        data: {
          name: "Applicant Alice",
          email: `alice_${runId}@test.local`.toLowerCase(),
          password_hash,
          role: Role.STUDENT,
          status: UserStatus.ACTIVE,
          studentProfile: {
            create: {
              education: "BSc Software Engineering",
              skills: ["React", "TypeScript", "GraphQL"],
              project_links: ["https://github.com/alice/project1"],
            },
          },
        },
      });
      applicantStudent1Id = studentA.id;
      createdUserIds.add(applicantStudent1Id);

      const studentB = await prisma.user.create({
        data: {
          name: "Applicant Bob",
          email: `bob_${runId}@test.local`.toLowerCase(),
          password_hash,
          role: Role.STUDENT,
          status: UserStatus.ACTIVE,
          studentProfile: {
            create: {
              education: "MSc Computer Science",
              skills: ["Python", "FastAPI", "Docker"],
              project_links: ["https://github.com/bob/portfolio"],
            },
          },
        },
      });
      applicantStudent2Id = studentB.id;
      createdUserIds.add(applicantStudent2Id);

      // 4. Opportunities
      // Opportunity owned by bizOwner with applicants
      const oppWithApps = await prisma.opportunity.create({
        data: {
          posted_by: bizOwnerId,
          type: OpportunityType.JOB,
          title: `Senior Fullstack Developer ${runId}`,
          description: "Fullstack role for applicant review test.",
          skills_required: ["TypeScript", "React"],
          deadline: new Date(Date.now() + 86400000 * 30),
          status: OpportunityStatus.OPEN,
        },
      });
      oppWithOwnerAppsId = oppWithApps.id;
      createdOpportunityIds.add(oppWithOwnerAppsId);

      // Opportunity owned by bizOwner with ZERO applicants
      const oppNoApps = await prisma.opportunity.create({
        data: {
          posted_by: bizOwnerId,
          type: OpportunityType.INTERNSHIP,
          title: `Empty Applicants Internship ${runId}`,
          description: "Opportunity with no applications.",
          skills_required: ["Python"],
          deadline: new Date(Date.now() + 86400000 * 30),
          status: OpportunityStatus.OPEN,
        },
      });
      oppWithNoAppsId = oppNoApps.id;
      createdOpportunityIds.add(oppWithNoAppsId);

      // Opportunity owned by other business
      const oppOther = await prisma.opportunity.create({
        data: {
          posted_by: bizOtherId,
          type: OpportunityType.JOB,
          title: `Other Biz Role ${runId}`,
          description: "Belongs to bizOther.",
          skills_required: ["Go"],
          deadline: new Date(Date.now() + 86400000 * 30),
          status: OpportunityStatus.OPEN,
        },
      });
      oppOtherBizId = oppOther.id;
      createdOpportunityIds.add(oppOtherBizId);

      // 5. Create Applications for oppWithOwnerAppsId
      // First application: Alice submitted 2 hours ago with status SHORTLISTED
      await prisma.application.create({
        data: {
          student_id: applicantStudent1Id,
          opportunity_id: oppWithOwnerAppsId,
          status: ApplicationStatus.SHORTLISTED,
          submitted_at: new Date(Date.now() - 7200000),
        },
      });

      // Second application: Bob submitted 1 hour ago with status NEW
      await prisma.application.create({
        data: {
          student_id: applicantStudent2Id,
          opportunity_id: oppWithOwnerAppsId,
          status: ApplicationStatus.NEW,
          submitted_at: new Date(Date.now() - 3600000),
        },
      });
    });

    it("should return 401 when Authorization header is missing", async () => {
      const res = await request(app).get(
        `/api/v1/opportunities/${oppWithOwnerAppsId}/applications`
      );
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Authentication token is required/i);
    });

    it("should return 401 when token is invalid or malformed", async () => {
      const res = await request(app)
        .get(`/api/v1/opportunities/${oppWithOwnerAppsId}/applications`)
        .set("Authorization", "Bearer invalid-token-str");
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Invalid authentication token/i);
    });

    it("should return 401 when token is expired", async () => {
      const expiredToken = jwt.sign(
        { id: bizOwnerId, email: "biz@test.local", role: Role.BUSINESS },
        getJwtSecret(),
        { expiresIn: "-1s" }
      );
      const res = await request(app)
        .get(`/api/v1/opportunities/${oppWithOwnerAppsId}/applications`)
        .set("Authorization", `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Token has expired" });
    });

    it("should return 403 when called by a STUDENT role", async () => {
      const res = await request(app)
        .get(`/api/v1/opportunities/${oppWithOwnerAppsId}/applications`)
        .set("Authorization", `Bearer ${studentWithSkillsToken}`);
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied" });
    });

    it("should return 403 when called by an ADMIN role according to SRS Table 10", async () => {
      const res = await request(app)
        .get(`/api/v1/opportunities/${oppWithOwnerAppsId}/applications`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied" });
    });

    it("should return 404 when opportunity does not exist", async () => {
      const res = await request(app)
        .get("/api/v1/opportunities/non-existent-opportunity-id/applications")
        .set("Authorization", `Bearer ${bizOwnerToken}`);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Opportunity not found" });
    });

    it("should return 403 when a business attempts to view another business's opportunity applicants", async () => {
      // bizOther attempts to view oppWithOwnerAppsId (owned by bizOwner)
      const res = await request(app)
        .get(`/api/v1/opportunities/${oppWithOwnerAppsId}/applications`)
        .set("Authorization", `Bearer ${bizOtherToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied" });
      // Ensure no applicant data is disclosed in the error response
      expect(res.body).not.toHaveProperty("applications");
      expect(res.body).not.toHaveProperty("applicants");
      expect(res.text).not.toMatch(/Applicant Alice/i);
      expect(res.text).not.toMatch(/Applicant Bob/i);
    });

    it("should return 200 with an empty array when the opportunity has zero applicants", async () => {
      const res = await request(app)
        .get(`/api/v1/opportunities/${oppWithNoAppsId}/applications`)
        .set("Authorization", `Bearer ${bizOwnerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("applications");
      expect(Array.isArray(res.body.applications)).toBe(true);
      expect(res.body.applications).toHaveLength(0);
    });

    it("should return 200 with all applicants and required FR-009 fields for the owner business", async () => {
      const res = await request(app)
        .get(`/api/v1/opportunities/${oppWithOwnerAppsId}/applications`)
        .set("Authorization", `Bearer ${bizOwnerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("applications");
      expect(res.body.applications).toHaveLength(2);

      const [firstApplicant, secondApplicant] = res.body.applications;

      // Deterministic order: newest submission first (Bob 1hr ago, Alice 2hrs ago)
      expect(firstApplicant.student_id).toBe(applicantStudent2Id);
      expect(firstApplicant.name).toBe("Applicant Bob");
      expect(firstApplicant.email).toBe(`bob_${runId}@test.local`.toLowerCase());
      expect(firstApplicant.education).toBe("MSc Computer Science");
      expect(firstApplicant.skills).toEqual(["Python", "FastAPI", "Docker"]);
      expect(firstApplicant.project_links).toEqual(["https://github.com/bob/portfolio"]);
      expect(firstApplicant.status).toBe(ApplicationStatus.NEW);
      expect(firstApplicant).toHaveProperty("id");
      expect(firstApplicant).toHaveProperty("submitted_at");

      expect(secondApplicant.student_id).toBe(applicantStudent1Id);
      expect(secondApplicant.name).toBe("Applicant Alice");
      expect(secondApplicant.email).toBe(`alice_${runId}@test.local`.toLowerCase());
      expect(secondApplicant.education).toBe("BSc Software Engineering");
      expect(secondApplicant.skills).toEqual(["React", "TypeScript", "GraphQL"]);
      expect(secondApplicant.project_links).toEqual(["https://github.com/alice/project1"]);
      expect(secondApplicant.status).toBe(ApplicationStatus.SHORTLISTED);
    });

    it("should never expose password hashes, tokens, or unrelated private account details", async () => {
      const res = await request(app)
        .get(`/api/v1/opportunities/${oppWithOwnerAppsId}/applications`)
        .set("Authorization", `Bearer ${bizOwnerToken}`);

      expect(res.status).toBe(200);
      const json = JSON.stringify(res.body);

      expect(json).not.toMatch(/password_hash/i);
      expect(json).not.toMatch(/Password123/i);
      expect(json).not.toMatch(/secret/i);
      expect(json).not.toMatch(/token/i);
    });

    it("should prevent forged business or user IDs in body or query from bypassing ownership", async () => {
      // bizOther tries to supply posted_by or user_id matching bizOwner
      const res = await request(app)
        .get(
          `/api/v1/opportunities/${oppWithOwnerAppsId}/applications?user_id=${bizOwnerId}&posted_by=${bizOwnerId}`
        )
        .set("Authorization", `Bearer ${bizOtherToken}`)
        .send({ user_id: bizOwnerId, posted_by: bizOwnerId });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied" });
      expect(res.body).not.toHaveProperty("applications");
    });
  });

  describe("PATCH /api/v1/applications/:id/status", () => {
    let patchBizOwnerId: string;
    let patchBizOwnerToken: string;
    let patchBizOtherId: string;
    let patchBizOtherToken: string;
    let patchStudentId: string;
    let patchStudentToken: string;
    let patchOppId: string;
    let patchAppId: string;
    let otherBizOppId: string;
    let otherBizAppId: string;

    beforeAll(async () => {
      const password_hash = await bcrypt.hash("Password123!", 10);
      const subRunId = `patch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      // 1. Business owner
      const bizOwner = await prisma.user.create({
        data: {
          name: "Patch Status Biz Owner",
          email: `patch_owner_${subRunId}@test.local`.toLowerCase(),
          password_hash,
          role: Role.BUSINESS,
          status: UserStatus.ACTIVE,
          businessProfile: {
            create: { company_name: "Status Tester Ltd" },
          },
        },
      });
      patchBizOwnerId = bizOwner.id;
      createdUserIds.add(patchBizOwnerId);
      patchBizOwnerToken = generateToken({
        id: bizOwner.id,
        email: bizOwner.email,
        role: Role.BUSINESS,
      });

      // 2. Another business (non-owner)
      const bizOther = await prisma.user.create({
        data: {
          name: "Patch Status Biz Other",
          email: `patch_other_${subRunId}@test.local`.toLowerCase(),
          password_hash,
          role: Role.BUSINESS,
          status: UserStatus.ACTIVE,
          businessProfile: {
            create: { company_name: "Other Status Corp" },
          },
        },
      });
      patchBizOtherId = bizOther.id;
      createdUserIds.add(patchBizOtherId);
      patchBizOtherToken = generateToken({
        id: bizOther.id,
        email: bizOther.email,
        role: Role.BUSINESS,
      });

      // 3. Student applicant
      const student = await prisma.user.create({
        data: {
          name: "Patch Status Student",
          email: `patch_student_${subRunId}@test.local`.toLowerCase(),
          password_hash,
          role: Role.STUDENT,
          status: UserStatus.ACTIVE,
          studentProfile: {
            create: {
              education: "BSc Software Engineering",
              skills: ["TypeScript", "MySQL", "Jest"],
              project_links: ["https://github.com/patch-student"],
            },
          },
        },
      });
      patchStudentId = student.id;
      createdUserIds.add(patchStudentId);
      patchStudentToken = generateToken({
        id: student.id,
        email: student.email,
        role: Role.STUDENT,
      });

      // 4. Opportunity owned by bizOwner
      const opp = await prisma.opportunity.create({
        data: {
          posted_by: patchBizOwnerId,
          type: OpportunityType.JOB,
          title: `Backend Architect ${subRunId}`,
          description: "High impact backend engineering role.",
          skills_required: ["TypeScript", "Node.js"],
          deadline: new Date(Date.now() + 86400000 * 30),
          status: OpportunityStatus.OPEN,
        },
      });
      patchOppId = opp.id;
      createdOpportunityIds.add(patchOppId);

      // 5. Application on bizOwner opportunity
      const appRecord = await prisma.application.create({
        data: {
          student_id: patchStudentId,
          opportunity_id: patchOppId,
          status: ApplicationStatus.NEW,
        },
      });
      patchAppId = appRecord.id;

      // 6. Opportunity owned by bizOther
      const otherOpp = await prisma.opportunity.create({
        data: {
          posted_by: patchBizOtherId,
          type: OpportunityType.INTERNSHIP,
          title: `Frontend Intern ${subRunId}`,
          description: "React and CSS development.",
          skills_required: ["React"],
          deadline: new Date(Date.now() + 86400000 * 20),
          status: OpportunityStatus.OPEN,
        },
      });
      otherBizOppId = otherOpp.id;
      createdOpportunityIds.add(otherBizOppId);

      // 7. Application on bizOther opportunity
      const otherAppRecord = await prisma.application.create({
        data: {
          student_id: patchStudentId,
          opportunity_id: otherBizOppId,
          status: ApplicationStatus.NEW,
        },
      });
      otherBizAppId = otherAppRecord.id;
    });

    describe("Authentication and Authorization", () => {
      it("should return 401 when Authorization header is missing", async () => {
        const initialNotificationCount = await prisma.notification.count({
          where: { user_id: patchStudentId },
        });

        const res = await request(app)
          .patch(`/api/v1/applications/${patchAppId}/status`)
          .send({ status: "SHORTLISTED" });

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error).toMatch(/token/i);

        const postNotificationCount = await prisma.notification.count({
          where: { user_id: patchStudentId },
        });
        expect(postNotificationCount).toBe(initialNotificationCount);
      });

      it("should return 401 when token is invalid or malformed", async () => {
        const res = await request(app)
          .patch(`/api/v1/applications/${patchAppId}/status`)
          .set("Authorization", "Bearer invalid.jwt.token")
          .send({ status: "SHORTLISTED" });

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("error");
      });

      it("should return 401 when token has expired", async () => {
        const secret = getJwtSecret();
        const expiredToken = jwt.sign(
          {
            id: patchBizOwnerId,
            email: "patch_owner@test.local",
            role: Role.BUSINESS,
          },
          secret,
          { expiresIn: -10 }
        );

        const res = await request(app)
          .patch(`/api/v1/applications/${patchAppId}/status`)
          .set("Authorization", `Bearer ${expiredToken}`)
          .send({ status: "SHORTLISTED" });

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/expired/i);
      });

      it("should return 403 when authenticated as STUDENT", async () => {
        const initialNotificationCount = await prisma.notification.count({
          where: { user_id: patchStudentId },
        });

        const res = await request(app)
          .patch(`/api/v1/applications/${patchAppId}/status`)
          .set("Authorization", `Bearer ${patchStudentToken}`)
          .send({ status: "SHORTLISTED" });

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ error: "Access denied" });

        const postNotificationCount = await prisma.notification.count({
          where: { user_id: patchStudentId },
        });
        expect(postNotificationCount).toBe(initialNotificationCount);
      });

      it("should return 403 when authenticated as ADMIN", async () => {
        const res = await request(app)
          .patch(`/api/v1/applications/${patchAppId}/status`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ status: "SHORTLISTED" });

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ error: "Access denied" });
      });
    });

    describe("Validation and Edge Cases", () => {
      it("should return 400 when application ID is whitespace or malformed", async () => {
        const res = await request(app)
          .patch("/api/v1/applications/%20%20%20/status")
          .set("Authorization", `Bearer ${patchBizOwnerToken}`)
          .send({ status: "SHORTLISTED" });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error");
      });

      it("should return 400 when attempting to set status to NEW", async () => {
        const initialNotificationCount = await prisma.notification.count({
          where: { user_id: patchStudentId },
        });

        const res = await request(app)
          .patch(`/api/v1/applications/${patchAppId}/status`)
          .set("Authorization", `Bearer ${patchBizOwnerToken}`)
          .send({ status: "NEW" });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error).toMatch(/SHORTLISTED, REJECTED, HIRED/);

        const postNotificationCount = await prisma.notification.count({
          where: { user_id: patchStudentId },
        });
        expect(postNotificationCount).toBe(initialNotificationCount);
      });

      it("should return 400 when status is invalid or unsupported", async () => {
        const invalidStatuses = ["PENDING", "ACCEPTED", "REVIEWING", "shortlisted", 123, null, ""];

        for (const st of invalidStatuses) {
          const res = await request(app)
            .patch(`/api/v1/applications/${patchAppId}/status`)
            .set("Authorization", `Bearer ${patchBizOwnerToken}`)
            .send({ status: st });

          expect(res.status).toBe(400);
          expect(res.body).toHaveProperty("error");
        }
      });

      it("should return 400 when request body is empty or missing status", async () => {
        const res = await request(app)
          .patch(`/api/v1/applications/${patchAppId}/status`)
          .set("Authorization", `Bearer ${patchBizOwnerToken}`)
          .send({});

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error");
      });

      it("should return 400 when unrecognized or forged fields are present in request body", async () => {
        const res = await request(app)
          .patch(`/api/v1/applications/${patchAppId}/status`)
          .set("Authorization", `Bearer ${patchBizOwnerToken}`)
          .send({
            status: "SHORTLISTED",
            student_id: otherStudentId,
            opportunity_id: otherBizOppId,
            id: "forged-id",
            submitted_at: new Date().toISOString(),
          });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error).toMatch(/unrecognized/i);
      });

      it("should return 404 when application ID does not exist", async () => {
        const nonExistentId = "00000000-0000-0000-0000-000000000000";
        const res = await request(app)
          .patch(`/api/v1/applications/${nonExistentId}/status`)
          .set("Authorization", `Bearer ${patchBizOwnerToken}`)
          .send({ status: "SHORTLISTED" });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Application not found" });
      });

      it("should return 403 when a business attempts to update an application for another business's opportunity", async () => {
        const initialNotificationCount = await prisma.notification.count({
          where: { user_id: patchStudentId },
        });

        // 1. patchBizOther tries to update patchAppId (which belongs to patchBizOwnerId's opportunity)
        const res1 = await request(app)
          .patch(`/api/v1/applications/${patchAppId}/status`)
          .set("Authorization", `Bearer ${patchBizOtherToken}`)
          .send({ status: "SHORTLISTED" });

        expect(res1.status).toBe(403);
        expect(res1.body).toEqual({ error: "Access denied" });

        // 2. patchBizOwner tries to update otherBizAppId (which belongs to patchBizOtherId's opportunity)
        const res2 = await request(app)
          .patch(`/api/v1/applications/${otherBizAppId}/status`)
          .set("Authorization", `Bearer ${patchBizOwnerToken}`)
          .send({ status: "SHORTLISTED" });

        expect(res2.status).toBe(403);
        expect(res2.body).toEqual({ error: "Access denied" });

        // Ensure database records were untouched
        const appInDb1 = await prisma.application.findUnique({
          where: { id: patchAppId },
        });
        expect(appInDb1?.status).toBe(ApplicationStatus.NEW);

        const appInDb2 = await prisma.application.findUnique({
          where: { id: otherBizAppId },
        });
        expect(appInDb2?.status).toBe(ApplicationStatus.NEW);

        // Ensure no notification was created
        const postNotificationCount = await prisma.notification.count({
          where: { user_id: patchStudentId },
        });
        expect(postNotificationCount).toBe(initialNotificationCount);
      });

      it("should prevent forged query or headers from bypassing ownership check", async () => {
        const res = await request(app)
          .patch(
            `/api/v1/applications/${patchAppId}/status?posted_by=${patchBizOwnerId}&business_id=${patchBizOwnerId}`
          )
          .set("Authorization", `Bearer ${patchBizOtherToken}`)
          .send({ status: "SHORTLISTED" });

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ error: "Access denied" });
      });
    });

    describe("Successful Status Updates, Persistence & Notifications", () => {
      it("should successfully update status to SHORTLISTED and persist in DB with a notification", async () => {
        const beforeNotifications = await prisma.notification.findMany({
          where: { user_id: patchStudentId },
        });

        const res = await request(app)
          .patch(`/api/v1/applications/${patchAppId}/status`)
          .set("Authorization", `Bearer ${patchBizOwnerToken}`)
          .send({ status: "SHORTLISTED" });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty(
          "message",
          "Application status updated successfully"
        );
        expect(res.body).toHaveProperty("application");
        expect(res.body.application).toMatchObject({
          id: patchAppId,
          student_id: patchStudentId,
          opportunity_id: patchOppId,
          status: ApplicationStatus.SHORTLISTED,
        });
        expect(res.body.application).toHaveProperty("submitted_at");

        // Verify privacy: no sensitive fields leaked
        const json = JSON.stringify(res.body);
        expect(json).not.toMatch(/password/i);
        expect(json).not.toMatch(/secret/i);
        expect(json).not.toMatch(/token/i);

        // Verify database persistence
        const appInDb = await prisma.application.findUnique({
          where: { id: patchAppId },
        });
        expect(appInDb?.status).toBe(ApplicationStatus.SHORTLISTED);

        // Verify notification in DB
        const afterNotifications = await prisma.notification.findMany({
          where: { user_id: patchStudentId },
          orderBy: { sent_at: "desc" },
        });
        expect(afterNotifications.length).toBe(beforeNotifications.length + 1);

        const newNotification = afterNotifications[0];
        expect(newNotification.user_id).toBe(patchStudentId);
        expect(newNotification.type).toBe("APPLICATION_SHORTLISTED");
        expect(newNotification.channel).toBe("EMAIL");
        expect(newNotification.message).toMatch(/shortlisted/i);
        expect(newNotification.message).toMatch(/Backend Architect/);
        expect(newNotification.sent_at).toBeInstanceOf(Date);
      });

      it("should allow transition from SHORTLISTED to HIRED and create corresponding notification", async () => {
        const beforeNotifications = await prisma.notification.findMany({
          where: { user_id: patchStudentId },
        });

        const res = await request(app)
          .patch(`/api/v1/applications/${patchAppId}/status`)
          .set("Authorization", `Bearer ${patchBizOwnerToken}`)
          .send({ status: "HIRED" });

        expect(res.status).toBe(200);
        expect(res.body.application.status).toBe(ApplicationStatus.HIRED);

        // Verify DB persistence
        const appInDb = await prisma.application.findUnique({
          where: { id: patchAppId },
        });
        expect(appInDb?.status).toBe(ApplicationStatus.HIRED);

        // Verify notification in DB
        const afterNotifications = await prisma.notification.findMany({
          where: { user_id: patchStudentId },
          orderBy: { sent_at: "desc" },
        });
        expect(afterNotifications.length).toBe(beforeNotifications.length + 1);

        const newNotification = afterNotifications[0];
        expect(newNotification.user_id).toBe(patchStudentId);
        expect(newNotification.type).toBe("APPLICATION_HIRED");
        expect(newNotification.channel).toBe("EMAIL");
        expect(newNotification.message).toMatch(/hired/i);
      });

      it("should allow transition to REJECTED and create corresponding notification", async () => {
        const beforeNotifications = await prisma.notification.findMany({
          where: { user_id: patchStudentId },
        });

        const res = await request(app)
          .patch(`/api/v1/applications/${patchAppId}/status`)
          .set("Authorization", `Bearer ${patchBizOwnerToken}`)
          .send({ status: "REJECTED" });

        expect(res.status).toBe(200);
        expect(res.body.application.status).toBe(ApplicationStatus.REJECTED);

        // Verify DB persistence
        const appInDb = await prisma.application.findUnique({
          where: { id: patchAppId },
        });
        expect(appInDb?.status).toBe(ApplicationStatus.REJECTED);

        // Verify notification in DB
        const afterNotifications = await prisma.notification.findMany({
          where: { user_id: patchStudentId },
          orderBy: { sent_at: "desc" },
        });
        expect(afterNotifications.length).toBe(beforeNotifications.length + 1);

        const newNotification = afterNotifications[0];
        expect(newNotification.user_id).toBe(patchStudentId);
        expect(newNotification.type).toBe("APPLICATION_REJECTED");
        expect(newNotification.channel).toBe("EMAIL");
        expect(newNotification.message).toMatch(/rejected/i);
      });
    });

    describe("Transaction Atomicity and Rollback", () => {
      it("should roll back status update if notification creation fails inside transaction", async () => {
        // Create a fresh opportunity and application for rollback test
        const freshOpp = await prisma.opportunity.create({
          data: {
            posted_by: patchBizOwnerId,
            type: OpportunityType.JOB,
            title: "Rollback Test Opp",
            description: "Testing rollback behavior",
            skills_required: ["Node.js"],
            deadline: new Date(Date.now() + 86400000 * 15),
            status: OpportunityStatus.OPEN,
          },
        });
        createdOpportunityIds.add(freshOpp.id);

        const freshApp = await prisma.application.create({
          data: {
            student_id: patchStudentId,
            opportunity_id: freshOpp.id,
            status: ApplicationStatus.NEW,
          },
        });

        const initialNotifications = await prisma.notification.count({
          where: { user_id: patchStudentId },
        });

        // Spy on prisma.$transaction to simulate notification creation failure
        const origTransaction = prisma.$transaction.bind(prisma);
        const transactionSpy = jest
          .spyOn(prisma, "$transaction")
          .mockImplementation(async (callback: any, ...args: any[]) => {
            if (typeof callback === "function") {
              return origTransaction(async (tx: any) => {
                // Intercept notification.create to simulate failure
                tx.notification.create = jest.fn().mockImplementation(async () => {
                  throw new Error("Simulated database failure during notification creation");
                });
                return callback(tx);
              }, ...args);
            }
            return origTransaction(callback, ...args);
          });

        try {
          const res = await request(app)
            .patch(`/api/v1/applications/${freshApp.id}/status`)
            .set("Authorization", `Bearer ${patchBizOwnerToken}`)
            .send({ status: "SHORTLISTED" });

          // Endpoint should fail with 500
          expect(res.status).toBe(500);

          // Crucial check: application status in database MUST still be NEW (not SHORTLISTED)
          const appInDb = await prisma.application.findUnique({
            where: { id: freshApp.id },
          });
          expect(appInDb?.status).toBe(ApplicationStatus.NEW);

          // Crucial check: no notification was created
          const postNotifications = await prisma.notification.count({
            where: { user_id: patchStudentId },
          });
          expect(postNotifications).toBe(initialNotifications);
        } finally {
          transactionSpy.mockRestore();
        }
      });
    });

    describe("Regression Verification", () => {
      it("should ensure student submission endpoint continues to work", async () => {
        // Create an opportunity for submission regression test
        const regOpp = await prisma.opportunity.create({
          data: {
            posted_by: patchBizOwnerId,
            type: OpportunityType.JOB,
            title: "Regression Opp Submissions",
            description: "Regression opportunity description",
            skills_required: ["TypeScript"],
            deadline: new Date(Date.now() + 86400000 * 20),
            status: OpportunityStatus.OPEN,
          },
        });
        createdOpportunityIds.add(regOpp.id);

        const res = await request(app)
          .post(`/api/v1/opportunities/${regOpp.id}/applications`)
          .set("Authorization", `Bearer ${patchStudentToken}`);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("application");
        expect(res.body.application.status).toBe(ApplicationStatus.NEW);
      });

      it("should ensure student my-applications listing endpoint continues to work", async () => {
        const res = await request(app)
          .get("/api/v1/students/me/applications")
          .set("Authorization", `Bearer ${patchStudentToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("applications");
        expect(Array.isArray(res.body.applications)).toBe(true);
        expect(res.body.applications.length).toBeGreaterThan(0);
      });

      it("should ensure business opportunity applicants list endpoint continues to work", async () => {
        const res = await request(app)
          .get(`/api/v1/opportunities/${patchOppId}/applications`)
          .set("Authorization", `Bearer ${patchBizOwnerToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("applications");
        expect(Array.isArray(res.body.applications)).toBe(true);
        expect(res.body.applications.length).toBeGreaterThan(0);
      });
    });
  });
});
