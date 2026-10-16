import request from "supertest";
import bcrypt from "bcryptjs";
import {
  Role,
  UserStatus,
  OpportunityType,
  OpportunityStatus,
  ApplicationStatus,
} from "@prisma/client";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { generateToken } from "../src/common/jwt";

describe("FR-020: Account Deletion and 12-Month Data Retention", () => {
  const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const createdUserIds = new Set<string>();
  const passwordPlain = "StrongPass123!";
  const password_hash = bcrypt.hashSync(passwordPlain, 10);

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

  const createTestUser = async (
    role: Role,
    prefix: string,
    status: UserStatus = UserStatus.ACTIVE
  ): Promise<{ id: string; email: string; token: string }> => {
    const email = `${prefix}_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase();
    const user = await prisma.user.create({
      data: {
        name: `${prefix} Test User`,
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

  describe("Authentication & Route Access Control", () => {
    it("should reject unauthenticated DELETE /api/v1/users/me with 401", async () => {
      const res = await request(app).delete("/api/v1/users/me");

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/token is required/i);
    });

    it("should reject DELETE /api/v1/users/me with invalid token format with 401", async () => {
      const res = await request(app)
        .delete("/api/v1/users/me")
        .set("Authorization", "Bearer invalid-token-value");

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid.*token/i);
    });

    it("should reject DELETE /api/v1/users/me with suspended account with 403", async () => {
      const suspended = await createTestUser(
        Role.STUDENT,
        "suspended_del",
        UserStatus.SUSPENDED
      );

      const res = await request(app)
        .delete("/api/v1/users/me")
        .set("Authorization", `Bearer ${suspended.token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/suspended/i);
    });
  });

  describe("Student Account Deletion and 12-Month Retention", () => {
    it("should delete student account, anonymize PII, and preserve application/registration history", async () => {
      // 1. Create a business and opportunities (job and competition)
      const business = await createTestUser(Role.BUSINESS, "retention_biz");
      await prisma.businessProfile.create({
        data: {
          user_id: business.id,
          company_name: "Retention Corp",
        },
      });

      const jobOpp = await prisma.opportunity.create({
        data: {
          posted_by: business.id,
          type: OpportunityType.JOB,
          title: `Backend Engineer ${runId}`,
          description: "Develop APIs",
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: OpportunityStatus.OPEN,
        },
      });

      const compOpp = await prisma.opportunity.create({
        data: {
          posted_by: business.id,
          type: OpportunityType.COMPETITION,
          title: `Hackathon ${runId}`,
          description: "Coding Contest",
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: OpportunityStatus.OPEN,
        },
      });

      // 2. Create student user with complete profile and active notification / reset token
      const student = await createTestUser(Role.STUDENT, "student_to_delete");
      const originalEmail = student.email;

      await prisma.studentProfile.create({
        data: {
          user_id: student.id,
          education: "BSc Computer Science",
          skills: ["TypeScript", "Node.js", "Docker"],
          project_links: ["https://github.com/student/project1"],
        },
      });

      await prisma.notification.create({
        data: {
          user_id: student.id,
          type: "WELCOME",
          message: "Welcome to Baadi Goob",
          channel: "IN_APP",
        },
      });

      await prisma.passwordResetToken.create({
        data: {
          user_id: student.id,
          token_hash: `dummy_hash_${runId}`,
          expires_at: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      // 3. Student submits application to job and registers for competition
      const appRecord = await prisma.application.create({
        data: {
          student_id: student.id,
          opportunity_id: jobOpp.id,
          status: ApplicationStatus.NEW,
        },
      });

      const regRecord = await prisma.competitionRegistration.create({
        data: {
          student_id: student.id,
          opportunity_id: compOpp.id,
        },
      });

      // 4. Student deletes their own account
      const res = await request(app)
        .delete("/api/v1/users/me")
        .set("Authorization", `Bearer ${student.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Account deleted successfully" });
      expect(res.body).not.toHaveProperty("password_hash");
      expect(res.body).not.toHaveProperty("email");

      // 5. Verify database state for deleted user
      const dbUser = await prisma.user.findUnique({
        where: { id: student.id },
      });

      expect(dbUser).not.toBeNull();
      expect(dbUser?.status).toBe(UserStatus.DELETED);
      expect(dbUser?.deleted_at).toBeInstanceOf(Date);
      expect(dbUser?.name).toBe("Deleted User");
      expect(dbUser?.email).toBe(`deleted_${student.id}@deleted.local`);
      expect(dbUser?.email).not.toBe(originalEmail);

      // Verify dummy password hash cannot authenticate with original password
      const pwMatches = await bcrypt.compare(
        passwordPlain,
        dbUser!.password_hash
      );
      expect(pwMatches).toBe(false);

      // 6. Verify StudentProfile PII was deleted
      const dbProfile = await prisma.studentProfile.findUnique({
        where: { user_id: student.id },
      });
      expect(dbProfile).toBeNull();

      // 7. Verify notifications and reset tokens were purged
      const notifications = await prisma.notification.findMany({
        where: { user_id: student.id },
      });
      expect(notifications).toHaveLength(0);

      const resetTokens = await prisma.passwordResetToken.findMany({
        where: { user_id: student.id },
      });
      expect(resetTokens).toHaveLength(0);

      // 8. CRITICAL SRS RETENTION CHECK: Application and registration history preserved
      const preservedApp = await prisma.application.findUnique({
        where: { id: appRecord.id },
      });
      expect(preservedApp).not.toBeNull();
      expect(preservedApp?.student_id).toBe(student.id);
      expect(preservedApp?.opportunity_id).toBe(jobOpp.id);
      expect(preservedApp?.status).toBe(ApplicationStatus.NEW);

      const preservedReg = await prisma.competitionRegistration.findUnique({
        where: { id: regRecord.id },
      });
      expect(preservedReg).not.toBeNull();
      expect(preservedReg?.student_id).toBe(student.id);
      expect(preservedReg?.opportunity_id).toBe(compOpp.id);

      // 9. Verify business applicant listing shows anonymized details without PII
      const appListingRes = await request(app)
        .get(`/api/v1/opportunities/${jobOpp.id}/applications`)
        .set("Authorization", `Bearer ${business.token}`);

      expect(appListingRes.status).toBe(200);
      const returnedApp = appListingRes.body.applications.find(
        (a: { id: string }) => a.id === appRecord.id
      );
      expect(returnedApp).toBeDefined();
      expect(returnedApp.name).toBe("Deleted User");
      expect(returnedApp.email).toBe(`deleted_${student.id}@deleted.local`);
      expect(returnedApp.education).toBeNull();
      expect(returnedApp.skills).toBeNull();
      expect(returnedApp.project_links).toBeNull();

      // 10. Verify competition registrants listing shows anonymized details
      const regListingRes = await request(app)
        .get(`/api/v1/opportunities/${compOpp.id}/registrations`)
        .set("Authorization", `Bearer ${business.token}`);

      expect(regListingRes.status).toBe(200);
      const returnedReg = regListingRes.body.registrations.find(
        (r: { id: string }) => r.id === regRecord.id
      );
      expect(returnedReg).toBeDefined();
      expect(returnedReg.name).toBe("Deleted User");
      expect(returnedReg.email).toBe(`deleted_${student.id}@deleted.local`);
      expect(returnedReg.education).toBeNull();
      expect(returnedReg.skills).toBeNull();

      // 11. Verify former original email is freed and can be re-registered
      const reregisterRes = await request(app).post("/api/v1/auth/register").send({
        name: "New Student",
        email: originalEmail,
        password: "NewPassword123!",
        role: "STUDENT",
      });
      expect(reregisterRes.status).toBe(201);
      createdUserIds.add(reregisterRes.body.user.id);
    });
  });

  describe("Business Account Deletion and Opportunity Handling", () => {
    it("should delete business account, close active opportunities, and preserve applicant history", async () => {
      const business = await createTestUser(Role.BUSINESS, "del_biz");
      await prisma.businessProfile.create({
        data: {
          user_id: business.id,
          company_name: "Tech Innovators",
        },
      });

      // Post 2 open opportunities
      const opp1 = await prisma.opportunity.create({
        data: {
          posted_by: business.id,
          type: OpportunityType.JOB,
          title: `Frontend Dev ${runId}`,
          description: "React dev",
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          status: OpportunityStatus.OPEN,
        },
      });

      const opp2 = await prisma.opportunity.create({
        data: {
          posted_by: business.id,
          type: OpportunityType.INTERNSHIP,
          title: `QA Intern ${runId}`,
          description: "Testing",
          deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          status: OpportunityStatus.OPEN,
        },
      });

      // Student applies to opp1
      const student = await createTestUser(Role.STUDENT, "biz_del_applicant");
      await prisma.studentProfile.create({
        data: {
          user_id: student.id,
          skills: ["React"],
        },
      });

      const appRecord = await prisma.application.create({
        data: {
          student_id: student.id,
          opportunity_id: opp1.id,
          status: ApplicationStatus.NEW,
        },
      });

      // Business deletes their account
      const res = await request(app)
        .delete("/api/v1/users/me")
        .set("Authorization", `Bearer ${business.token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Account deleted successfully");

      // Verify business user anonymized
      const dbBiz = await prisma.user.findUnique({
        where: { id: business.id },
      });
      expect(dbBiz?.status).toBe(UserStatus.DELETED);
      expect(dbBiz?.name).toBe("Deleted Business");
      expect(dbBiz?.email).toBe(`deleted_${business.id}@deleted.local`);

      // Verify businessProfile removed
      const dbBizProfile = await prisma.businessProfile.findUnique({
        where: { user_id: business.id },
      });
      expect(dbBizProfile).toBeNull();

      // Verify active opportunities were set to CLOSED
      const dbOpp1 = await prisma.opportunity.findUnique({
        where: { id: opp1.id },
      });
      const dbOpp2 = await prisma.opportunity.findUnique({
        where: { id: opp2.id },
      });
      expect(dbOpp1?.status).toBe(OpportunityStatus.CLOSED);
      expect(dbOpp2?.status).toBe(OpportunityStatus.CLOSED);

      // Verify application record from student is still intact
      const dbApp = await prisma.application.findUnique({
        where: { id: appRecord.id },
      });
      expect(dbApp).not.toBeNull();
      expect(dbApp?.status).toBe(ApplicationStatus.NEW);

      // Verify other students cannot apply to now-closed opportunities
      const otherStudent = await createTestUser(Role.STUDENT, "late_app");
      await prisma.studentProfile.create({
        data: {
          user_id: otherStudent.id,
          skills: ["React"],
        },
      });

      const applyRes = await request(app)
        .post(`/api/v1/opportunities/${opp1.id}/applications`)
        .set("Authorization", `Bearer ${otherStudent.token}`);
      expect(applyRes.status).toBe(400);
      expect(applyRes.body.error).toMatch(/closed/i);
    });
  });

  describe("Security, Access & Authentication Invariants After Deletion", () => {
    it("should prevent deleted user from authenticating with existing token", async () => {
      const student = await createTestUser(Role.STUDENT, "auth_failure_student");

      const delRes = await request(app)
        .delete("/api/v1/users/me")
        .set("Authorization", `Bearer ${student.token}`);
      expect(delRes.status).toBe(200);

      // Attempt protected call with deleted user's token
      const profileRes = await request(app)
        .get("/api/v1/students/profile")
        .set("Authorization", `Bearer ${student.token}`);

      expect(profileRes.status).toBe(401);
      expect(profileRes.body.error).toMatch(/deleted/i);
    });

    it("should prevent deleted user from logging in with original credentials", async () => {
      const student = await createTestUser(Role.STUDENT, "login_blocked");
      const originalEmail = student.email;

      await request(app)
        .delete("/api/v1/users/me")
        .set("Authorization", `Bearer ${student.token}`);

      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: originalEmail,
        password: passwordPlain,
      });

      expect(loginRes.status).toBe(401);
      expect(loginRes.body.error).toMatch(/invalid email or password/i);
    });

    it("should prevent login attempts using anonymized deleted email", async () => {
      const student = await createTestUser(Role.STUDENT, "anon_login_blocked");

      await request(app)
        .delete("/api/v1/users/me")
        .set("Authorization", `Bearer ${student.token}`);

      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: `deleted_${student.id}@deleted.local`,
        password: passwordPlain,
      });

      expect(loginRes.status).toBe(401);
    });

    it("should not generate password reset tokens for deleted accounts (anti-enumeration)", async () => {
      const student = await createTestUser(Role.STUDENT, "reset_blocked");
      const originalEmail = student.email;

      await request(app)
        .delete("/api/v1/users/me")
        .set("Authorization", `Bearer ${student.token}`);

      // Request reset with original email
      const resetResOriginal = await request(app)
        .post("/api/v1/auth/password-reset")
        .send({ email: originalEmail });
      expect(resetResOriginal.status).toBe(200);
      expect(resetResOriginal.body.message).toMatch(/if that email is registered/i);

      // Request reset with anonymized email
      const resetResAnon = await request(app)
        .post("/api/v1/auth/password-reset")
        .send({ email: `deleted_${student.id}@deleted.local` });
      expect(resetResAnon.status).toBe(200);
      expect(resetResAnon.body.message).toMatch(/if that email is registered/i);

      // Ensure no tokens were created in DB
      const tokens = await prisma.passwordResetToken.findMany({
        where: { user_id: student.id },
      });
      expect(tokens).toHaveLength(0);
    });

    it("should reject repeated deletion calls on an already deleted account", async () => {
      const student = await createTestUser(Role.STUDENT, "repeat_del");

      // First call succeeds
      const firstRes = await request(app)
        .delete("/api/v1/users/me")
        .set("Authorization", `Bearer ${student.token}`);
      expect(firstRes.status).toBe(200);

      // Second call fails authentication with 401 (account deleted)
      const secondRes = await request(app)
        .delete("/api/v1/users/me")
        .set("Authorization", `Bearer ${student.token}`);
      expect(secondRes.status).toBe(401);
      expect(secondRes.body.error).toMatch(/deleted/i);
    });

    it("should strictly delete only the authenticated user's account and never another user's account", async () => {
      const victim = await createTestUser(Role.STUDENT, "victim_user");
      const attacker = await createTestUser(Role.STUDENT, "attacker_user");

      // Attacker attempts to pass victim's ID in body or query
      const res = await request(app)
        .delete("/api/v1/users/me")
        .set("Authorization", `Bearer ${attacker.token}`)
        .send({ userId: victim.id, id: victim.id });

      expect(res.status).toBe(200);

      // Attacker is deleted
      const dbAttacker = await prisma.user.findUnique({
        where: { id: attacker.id },
      });
      expect(dbAttacker?.status).toBe(UserStatus.DELETED);

      // Victim remains intact and ACTIVE
      const dbVictim = await prisma.user.findUnique({
        where: { id: victim.id },
      });
      expect(dbVictim?.status).toBe(UserStatus.ACTIVE);
      expect(dbVictim?.email).toBe(victim.email);
    });
  });

  describe("Admin Interaction with Deleted Accounts", () => {
    it("should allow admin to list users with status=DELETED filter", async () => {
      const admin = await createTestUser(Role.ADMIN, "listing_admin");
      const student = await createTestUser(Role.STUDENT, "to_list_deleted");

      await request(app)
        .delete("/api/v1/users/me")
        .set("Authorization", `Bearer ${student.token}`);

      const listRes = await request(app)
        .get("/api/v1/admin/users")
        .query({ status: "DELETED" })
        .set("Authorization", `Bearer ${admin.token}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.users.length).toBeGreaterThan(0);
      const found = listRes.body.users.find((u: { id: string }) => u.id === student.id);
      expect(found).toBeDefined();
      expect(found.status).toBe("DELETED");
      expect(found.name).toBe("Deleted User");
      expect(found.email).toBe(`deleted_${student.id}@deleted.local`);
      expect(found).not.toHaveProperty("password_hash");
    });

    it("should prevent admin from suspending or reactivating a deleted account", async () => {
      const admin = await createTestUser(Role.ADMIN, "protect_admin");
      const student = await createTestUser(Role.STUDENT, "cannot_reactivate");

      await request(app)
        .delete("/api/v1/users/me")
        .set("Authorization", `Bearer ${student.token}`);

      // Attempt to reactivate deleted account
      const reactivateRes = await request(app)
        .patch(`/api/v1/admin/users/${student.id}/status`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ status: "ACTIVE" });

      expect(reactivateRes.status).toBe(400);
      expect(reactivateRes.body.error).toMatch(/cannot modify status of a deleted account/i);

      // Attempt to suspend deleted account
      const suspendRes = await request(app)
        .patch(`/api/v1/admin/users/${student.id}/status`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ status: "SUSPENDED" });

      expect(suspendRes.status).toBe(400);
      expect(suspendRes.body.error).toMatch(/cannot modify status of a deleted account/i);
    });
  });
});
