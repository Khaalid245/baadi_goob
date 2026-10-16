import request from "supertest";
import bcrypt from "bcryptjs";
import {
  Role,
  UserStatus,
  VerificationStatus,
  OpportunityType,
  OpportunityStatus,
  ApplicationStatus,
} from "@prisma/client";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { generateToken } from "../src/common/jwt";

describe("GET /api/v1/dashboard/summary (FR-022)", () => {
  const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const createdUserIds = new Set<string>();

  const password_hash = bcrypt.hashSync("TestPassword123!", 10);

  afterAll(async () => {
    if (createdUserIds.size > 0) {
      await prisma.user.deleteMany({
        where: {
          id: { in: Array.from(createdUserIds) },
        },
      });
    }
    await prisma.$disconnect();
  });

  const createUser = async (
    role: Role,
    prefix: string,
    status: UserStatus = UserStatus.ACTIVE
  ): Promise<{ id: string; email: string; token: string }> => {
    const email = `${prefix}_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase();
    const user = await prisma.user.create({
      data: {
        name: `${prefix} User`,
        email,
        password_hash,
        role,
        status,
      },
    });

    createdUserIds.add(user.id);

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return { id: user.id, email: user.email, token };
  };

  describe("Authentication & Access Control", () => {
    it("should return 401 when no token is provided", async () => {
      const res = await request(app).get("/api/v1/dashboard/summary");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain("Authentication token is required");
    });

    it("should return 401 when an invalid token is provided", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", "Bearer invalid.jwt.token");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
    });

    it("should return 403 when user account is suspended", async () => {
      const suspended = await createUser(
        Role.STUDENT,
        "suspended_student",
        UserStatus.SUSPENDED
      );

      const res = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${suspended.token}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain("Account is suspended");
    });
  });

  describe("Student Dashboard Summary", () => {
    it("should return correct summary for student with no profile (profile_complete: false, zero counts)", async () => {
      const student = await createUser(Role.STUDENT, "no_profile_student");

      const res = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${student.token}`);

      expect(res.status).toBe(200);
      expect(res.body.role).toBe("STUDENT");
      expect(res.body.profile_complete).toBe(false);
      expect(res.body.is_profile_complete).toBe(false);
      expect(res.body.total_applications).toBe(0);
      expect(res.body.competition_registrations).toBe(0);
      expect(res.body.applications).toEqual({
        NEW: 0,
        SHORTLISTED: 0,
        REJECTED: 0,
        HIRED: 0,
        total: 0,
      });
      expect(res.body.applications_by_status).toEqual({
        NEW: 0,
        SHORTLISTED: 0,
        REJECTED: 0,
        HIRED: 0,
      });
    });

    it("should return profile_complete: false when student profile has null or empty skills array", async () => {
      const studentA = await createUser(Role.STUDENT, "empty_skills_student");
      await prisma.studentProfile.create({
        data: {
          user_id: studentA.id,
          education: "Computer Science",
          skills: [],
        },
      });

      const resA = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${studentA.token}`);

      expect(resA.status).toBe(200);
      expect(resA.body.profile_complete).toBe(false);

      const studentB = await createUser(Role.STUDENT, "null_skills_student");
      await prisma.studentProfile.create({
        data: {
          user_id: studentB.id,
          skills: undefined,
        },
      });

      const resB = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${studentB.token}`);

      expect(resB.status).toBe(200);
      expect(resB.body.profile_complete).toBe(false);
    });

    it("should return profile_complete: true, accurate application status counts, and competition registrations", async () => {
      // 1. Create a business and opportunities
      const business = await createUser(Role.BUSINESS, "host_business");
      await prisma.businessProfile.create({
        data: {
          user_id: business.id,
          company_name: "Host Co",
          verification_status: VerificationStatus.VERIFIED,
        },
      });

      const jobOpp = await prisma.opportunity.create({
        data: {
          posted_by: business.id,
          type: OpportunityType.JOB,
          title: "Full Stack Engineer",
          description: "Full stack engineering job",
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: OpportunityStatus.OPEN,
        },
      });

      const internOpp1 = await prisma.opportunity.create({
        data: {
          posted_by: business.id,
          type: OpportunityType.INTERNSHIP,
          title: "Backend Intern 1",
          description: "Backend internship 1",
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: OpportunityStatus.OPEN,
        },
      });

      const internOpp2 = await prisma.opportunity.create({
        data: {
          posted_by: business.id,
          type: OpportunityType.INTERNSHIP,
          title: "Backend Intern 2",
          description: "Backend internship 2",
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: OpportunityStatus.OPEN,
        },
      });

      const internOpp3 = await prisma.opportunity.create({
        data: {
          posted_by: business.id,
          type: OpportunityType.INTERNSHIP,
          title: "Backend Intern 3",
          description: "Backend internship 3",
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: OpportunityStatus.OPEN,
        },
      });

      const compOpp = await prisma.opportunity.create({
        data: {
          posted_by: business.id,
          type: OpportunityType.COMPETITION,
          title: "National Coding Challenge",
          description: "Coding competition",
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: OpportunityStatus.OPEN,
        },
      });

      // 2. Create student with complete profile
      const student = await createUser(Role.STUDENT, "complete_student");
      await prisma.studentProfile.create({
        data: {
          user_id: student.id,
          education: "Software Engineering",
          skills: ["Node.js", "React"],
        },
      });

      // 3. Create applications with different statuses
      await prisma.application.create({
        data: {
          student_id: student.id,
          opportunity_id: jobOpp.id,
          status: ApplicationStatus.NEW,
        },
      });

      await prisma.application.create({
        data: {
          student_id: student.id,
          opportunity_id: internOpp1.id,
          status: ApplicationStatus.SHORTLISTED,
        },
      });

      await prisma.application.create({
        data: {
          student_id: student.id,
          opportunity_id: internOpp2.id,
          status: ApplicationStatus.REJECTED,
        },
      });

      await prisma.application.create({
        data: {
          student_id: student.id,
          opportunity_id: internOpp3.id,
          status: ApplicationStatus.HIRED,
        },
      });

      // 4. Create competition registration
      await prisma.competitionRegistration.create({
        data: {
          student_id: student.id,
          opportunity_id: compOpp.id,
        },
      });

      // 5. Query dashboard summary
      const res = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${student.token}`);

      expect(res.status).toBe(200);
      expect(res.body.role).toBe("STUDENT");
      expect(res.body.profile_complete).toBe(true);
      expect(res.body.is_profile_complete).toBe(true);
      expect(res.body.total_applications).toBe(4);
      expect(res.body.competition_registrations).toBe(1);
      expect(res.body.applications).toEqual({
        NEW: 1,
        SHORTLISTED: 1,
        REJECTED: 1,
        HIRED: 1,
        total: 4,
      });
      expect(res.body.applications_by_status).toEqual({
        NEW: 1,
        SHORTLISTED: 1,
        REJECTED: 1,
        HIRED: 1,
      });
    });

    it("should maintain strict isolation between different students (no cross-tenant leakage)", async () => {
      const student1 = await createUser(Role.STUDENT, "iso_student_1");
      const student2 = await createUser(Role.STUDENT, "iso_student_2");

      const business = await createUser(Role.BUSINESS, "iso_host_business");
      const opp = await prisma.opportunity.create({
        data: {
          posted_by: business.id,
          type: OpportunityType.JOB,
          title: "Iso Job",
          description: "Iso Job desc",
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: OpportunityStatus.OPEN,
        },
      });

      // Student 1 applies
      await prisma.application.create({
        data: {
          student_id: student1.id,
          opportunity_id: opp.id,
          status: ApplicationStatus.SHORTLISTED,
        },
      });

      // Student 2 queries dashboard: must have 0 applications
      const res2 = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${student2.token}`);

      expect(res2.status).toBe(200);
      expect(res2.body.total_applications).toBe(0);
      expect(res2.body.applications.SHORTLISTED).toBe(0);
    });
  });

  describe("Business Dashboard Summary", () => {
    it("should return empty metrics for a new business with no listings", async () => {
      const business = await createUser(Role.BUSINESS, "empty_business");
      await prisma.businessProfile.create({
        data: {
          user_id: business.id,
          company_name: "Empty Co",
          verification_status: VerificationStatus.PENDING,
        },
      });

      const res = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${business.token}`);

      expect(res.status).toBe(200);
      expect(res.body.role).toBe("BUSINESS");
      expect(res.body.verification_status).toBe("PENDING");
      expect(res.body.total_opportunities).toBe(0);
      expect(res.body.active_opportunities).toBe(0);
      expect(res.body.opportunities).toEqual({
        OPEN: 0,
        CLOSED: 0,
        total: 0,
      });
      expect(res.body.total_applications).toBe(0);
      expect(res.body.pending_applications).toBe(0);
      expect(res.body.applications).toEqual({
        NEW: 0,
        SHORTLISTED: 0,
        REJECTED: 0,
        HIRED: 0,
        total: 0,
      });
      expect(res.body.competition_registrations).toBe(0);
    });

    it("should return accurate opportunity, applicant, and competition metrics for a business", async () => {
      const business = await createUser(Role.BUSINESS, "active_biz");
      await prisma.businessProfile.create({
        data: {
          user_id: business.id,
          company_name: "Active Tech Ltd",
          verification_status: VerificationStatus.VERIFIED,
        },
      });

      // Opportunities: 2 OPEN, 1 CLOSED, 1 COMPETITION (OPEN)
      const openOpp1 = await prisma.opportunity.create({
        data: {
          posted_by: business.id,
          type: OpportunityType.JOB,
          title: "Dev 1",
          description: "Dev 1 desc",
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          status: OpportunityStatus.OPEN,
        },
      });

      const openOpp2 = await prisma.opportunity.create({
        data: {
          posted_by: business.id,
          type: OpportunityType.INTERNSHIP,
          title: "Intern 1",
          description: "Intern 1 desc",
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          status: OpportunityStatus.OPEN,
        },
      });

      const closedOpp = await prisma.opportunity.create({
        data: {
          posted_by: business.id,
          type: OpportunityType.JOB,
          title: "Closed Dev",
          description: "Closed Dev desc",
          deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          status: OpportunityStatus.CLOSED,
        },
      });

      const compOpp = await prisma.opportunity.create({
        data: {
          posted_by: business.id,
          type: OpportunityType.COMPETITION,
          title: "Tech Hackathon",
          description: "Hackathon desc",
          deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          status: OpportunityStatus.OPEN,
        },
      });

      // Students applying
      const s1 = await createUser(Role.STUDENT, "applicant_1");
      const s2 = await createUser(Role.STUDENT, "applicant_2");
      const s3 = await createUser(Role.STUDENT, "applicant_3");

      // Applications to business opportunities: 2 NEW, 1 SHORTLISTED
      await prisma.application.create({
        data: {
          student_id: s1.id,
          opportunity_id: openOpp1.id,
          status: ApplicationStatus.NEW,
        },
      });

      await prisma.application.create({
        data: {
          student_id: s2.id,
          opportunity_id: openOpp2.id,
          status: ApplicationStatus.NEW,
        },
      });

      await prisma.application.create({
        data: {
          student_id: s3.id,
          opportunity_id: closedOpp.id,
          status: ApplicationStatus.SHORTLISTED,
        },
      });

      // Competition registrations: 2 students register
      await prisma.competitionRegistration.create({
        data: {
          student_id: s1.id,
          opportunity_id: compOpp.id,
        },
      });

      await prisma.competitionRegistration.create({
        data: {
          student_id: s2.id,
          opportunity_id: compOpp.id,
        },
      });

      const res = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${business.token}`);

      expect(res.status).toBe(200);
      expect(res.body.role).toBe("BUSINESS");
      expect(res.body.verification_status).toBe("VERIFIED");

      // Opportunities: 3 OPEN (2 jobs + 1 comp), 1 CLOSED -> total 4
      expect(res.body.total_opportunities).toBe(4);
      expect(res.body.active_opportunities).toBe(3);
      expect(res.body.opportunities).toEqual({
        OPEN: 3,
        CLOSED: 1,
        total: 4,
      });

      // Applications: 2 NEW, 1 SHORTLISTED -> total 3
      expect(res.body.total_applications).toBe(3);
      expect(res.body.pending_applications).toBe(2);
      expect(res.body.applications).toEqual({
        NEW: 2,
        SHORTLISTED: 1,
        REJECTED: 0,
        HIRED: 0,
        total: 3,
      });

      // Competition registrations: 2
      expect(res.body.competition_registrations).toBe(2);
    });

    it("should strictly isolate metrics between different businesses", async () => {
      const bizA = await createUser(Role.BUSINESS, "biz_a");
      const bizB = await createUser(Role.BUSINESS, "biz_b");

      const oppA = await prisma.opportunity.create({
        data: {
          posted_by: bizA.id,
          type: OpportunityType.JOB,
          title: "Biz A Job",
          description: "Biz A Job desc",
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          status: OpportunityStatus.OPEN,
        },
      });

      const student = await createUser(Role.STUDENT, "app_student");
      await prisma.application.create({
        data: {
          student_id: student.id,
          opportunity_id: oppA.id,
          status: ApplicationStatus.NEW,
        },
      });

      // Biz B must see 0 opportunities and 0 applications
      const resB = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${bizB.token}`);

      expect(resB.status).toBe(200);
      expect(resB.body.total_opportunities).toBe(0);
      expect(resB.body.total_applications).toBe(0);
      expect(resB.body.pending_applications).toBe(0);
    });
  });

  describe("Admin Dashboard Summary", () => {
    it("should return system-wide totals for admin user", async () => {
      const admin = await createUser(Role.ADMIN, "system_admin");

      const res = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.role).toBe("ADMIN");

      // Verify users aggregation
      expect(res.body).toHaveProperty("total_users");
      expect(typeof res.body.total_users).toBe("number");
      expect(res.body.total_users).toBeGreaterThan(0);
      expect(res.body.users).toHaveProperty("STUDENT");
      expect(res.body.users).toHaveProperty("BUSINESS");
      expect(res.body.users).toHaveProperty("ADMIN");
      expect(res.body.users.total).toBe(res.body.total_users);

      // Verify pending verifications
      expect(res.body).toHaveProperty("businesses_awaiting_verification");
      expect(typeof res.body.businesses_awaiting_verification).toBe("number");
      expect(res.body.pending_verifications).toBe(
        res.body.businesses_awaiting_verification
      );

      // Verify platform opportunities
      expect(res.body).toHaveProperty("total_opportunities");
      expect(res.body.opportunities).toHaveProperty("OPEN");
      expect(res.body.opportunities).toHaveProperty("CLOSED");
      expect(res.body.opportunities.total).toBe(res.body.total_opportunities);
      expect(res.body.active_opportunities).toBe(res.body.opportunities.OPEN);

      // Verify total applications
      expect(res.body).toHaveProperty("total_applications");
      expect(typeof res.body.total_applications).toBe("number");
    });
  });

  describe("Security & Privacy Invariants", () => {
    it("should never expose applicant personal details or passwords in dashboard summary", async () => {
      const student = await createUser(Role.STUDENT, "privacy_student");
      const business = await createUser(Role.BUSINESS, "privacy_business");
      const admin = await createUser(Role.ADMIN, "privacy_admin");

      const studentRes = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${student.token}`);
      const studentStr = JSON.stringify(studentRes.body);
      expect(studentStr).not.toContain("password");
      expect(studentStr).not.toContain("password_hash");
      expect(studentStr).not.toContain("token_hash");

      const businessRes = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${business.token}`);
      const businessStr = JSON.stringify(businessRes.body);
      expect(businessStr).not.toContain("password");
      expect(businessStr).not.toContain("password_hash");

      const adminRes = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${admin.token}`);
      const adminStr = JSON.stringify(adminRes.body);
      expect(adminStr).not.toContain("password");
      expect(adminStr).not.toContain("password_hash");
    });
  });
});
