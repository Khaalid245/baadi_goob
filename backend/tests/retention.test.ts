import bcrypt from "bcryptjs";
import {
  Role,
  UserStatus,
  OpportunityType,
  OpportunityStatus,
  ApplicationStatus,
} from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import {
  purgeExpiredAccounts,
  getDefaultRetentionCutoffDate,
} from "../src/services/retention.service";

describe("SRS Section 7.4 & FR-020: 12-Month Application History Retention Purge", () => {
  const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const createdUserIds = new Set<string>();
  const createdOpportunityIds = new Set<string>();
  const dummyPasswordHash = bcrypt.hashSync("RetentionTest123!", 10);

  // Reference cutoff timestamp for deterministic boundary testing:
  // e.g. Cutoff is 2025-10-17T00:00:00.000Z (exactly 12 months before 2026-10-17)
  const testCutoffDate = new Date("2025-10-17T00:00:00.000Z");

  afterAll(async () => {
    // Clean up any remaining test fixtures created in this run
    if (createdUserIds.size > 0) {
      await prisma.application.deleteMany({
        where: { student_id: { in: Array.from(createdUserIds) } },
      });
      await prisma.competitionRegistration.deleteMany({
        where: { student_id: { in: Array.from(createdUserIds) } },
      });
      await prisma.opportunity.deleteMany({
        where: { id: { in: Array.from(createdOpportunityIds) } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: Array.from(createdUserIds) } },
      });
    }
    await prisma.$disconnect();
  });

  const createTestUser = async (params: {
    role: Role;
    status: UserStatus;
    deletedAt?: Date | null;
    prefix: string;
  }) => {
    const email = `${params.prefix}_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase();
    const user = await prisma.user.create({
      data: {
        name: params.status === UserStatus.DELETED ? "Deleted User" : `${params.prefix} User`,
        email: params.status === UserStatus.DELETED ? `deleted_${Date.now()}@deleted.local` : email,
        password_hash: dummyPasswordHash,
        role: params.role,
        status: params.status,
        deleted_at: params.deletedAt ?? null,
      },
    });
    createdUserIds.add(user.id);
    return user;
  };

  const createTestOpportunity = async (postedByUserId: string, type: OpportunityType = OpportunityType.INTERNSHIP) => {
    const opp = await prisma.opportunity.create({
      data: {
        posted_by: postedByUserId,
        type,
        title: `Retention Test Opp ${runId}`,
        description: "Test description for retention audit",
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: OpportunityStatus.OPEN,
      },
    });
    createdOpportunityIds.add(opp.id);
    return opp;
  };

  const createTestApplication = async (studentId: string, opportunityId: string) => {
    return prisma.application.create({
      data: {
        student_id: studentId,
        opportunity_id: opportunityId,
        status: ApplicationStatus.NEW,
      },
    });
  };

  const createTestRegistration = async (studentId: string, opportunityId: string) => {
    return prisma.competitionRegistration.create({
      data: {
        student_id: studentId,
        opportunity_id: opportunityId,
      },
    });
  };

  describe("Default Retention Cutoff Helper", () => {
    it("should calculate a default cutoff approximately 1 year in the past", () => {
      const now = new Date();
      const cutoff = getDefaultRetentionCutoffDate();

      expect(cutoff).toBeInstanceOf(Date);
      expect(cutoff.getTime()).toBeLessThan(now.getTime());
      // Difference should be roughly 365 days (within leap-year / day-of-month variation)
      const diffDays = Math.round((now.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBeGreaterThanOrEqual(365);
      expect(diffDays).toBeLessThanOrEqual(366);
    });
  });

  describe("Dry-Run Protection", () => {
    it("5. Dry-run reports eligible counts without changing or deleting any records", async () => {
      // Create a business and opportunity to attach applications
      const business = await createTestUser({
        role: Role.BUSINESS,
        status: UserStatus.ACTIVE,
        prefix: "dry_biz",
      });
      const opp = await createTestOpportunity(business.id);

      // Create an expired deleted student (deleted 400 days ago, before cutoff)
      const expiredStudent = await createTestUser({
        role: Role.STUDENT,
        status: UserStatus.DELETED,
        deletedAt: new Date(testCutoffDate.getTime() - 24 * 60 * 60 * 1000),
        prefix: "dry_expired_stud",
      });
      await createTestApplication(expiredStudent.id, opp.id);

      // Execute in dry-run mode
      const result = await purgeExpiredAccounts({
        cutoffDate: testCutoffDate,
        dryRun: true,
      });

      expect(result.dryRun).toBe(true);
      expect(result.eligibleStudentsCount).toBeGreaterThanOrEqual(1);
      expect(result.purgedStudentsCount).toBe(0);
      expect(result.purgedApplicationsCount).toBeGreaterThanOrEqual(1);
      expect(result.eligibleStudentIds).toContain(expiredStudent.id);

      // Verify the record STILL EXISTS in the database after dry-run
      const studentStillExists = await prisma.user.findUnique({
        where: { id: expiredStudent.id },
      });
      expect(studentStillExists).not.toBeNull();

      const appStillExists = await prisma.application.findUnique({
        where: {
          student_id_opportunity_id: {
            student_id: expiredStudent.id,
            opportunity_id: opp.id,
          },
        },
      });
      expect(appStillExists).not.toBeNull();
    });
  });

  describe("Retention Boundary & Eligibility Filtering", () => {
    it("1, 2, 3, 4, 8: Respects boundary, purges only expired deleted students, preserves active/recent/business accounts", async () => {
      const activeBusiness = await createTestUser({
        role: Role.BUSINESS,
        status: UserStatus.ACTIVE,
        prefix: "boundary_biz",
      });
      const oppInternship = await createTestOpportunity(activeBusiness.id, OpportunityType.INTERNSHIP);
      const oppCompetition = await createTestOpportunity(activeBusiness.id, OpportunityType.COMPETITION);

      // 1. Expired Deleted Student (deleted BEFORE cutoff: 366 days ago) -> MUST BE PURGED
      const expiredStudent = await createTestUser({
        role: Role.STUDENT,
        status: UserStatus.DELETED,
        deletedAt: new Date(testCutoffDate.getTime() - 1000),
        prefix: "exp_stud_target",
      });
      await createTestApplication(expiredStudent.id, oppInternship.id);
      await createTestRegistration(expiredStudent.id, oppCompetition.id);

      // 2. Exactly on the Cutoff Date (deletedAt === cutoffDate) -> MUST BE PURGED (lte check)
      const exactlyAtCutoffStudent = await createTestUser({
        role: Role.STUDENT,
        status: UserStatus.DELETED,
        deletedAt: new Date(testCutoffDate.getTime()),
        prefix: "exact_boundary_stud",
      });
      await createTestApplication(exactlyAtCutoffStudent.id, oppInternship.id);

      // 3. Just inside the Retention Period (deletedAt === cutoffDate + 1 second) -> MUST BE PRESERVED
      const justInsideStudent = await createTestUser({
        role: Role.STUDENT,
        status: UserStatus.DELETED,
        deletedAt: new Date(testCutoffDate.getTime() + 1000),
        prefix: "just_inside_stud",
      });
      await createTestApplication(justInsideStudent.id, oppInternship.id);

      // 4. Recently Deleted Student (deleted 30 days ago) -> MUST BE PRESERVED
      const recentDeletedStudent = await createTestUser({
        role: Role.STUDENT,
        status: UserStatus.DELETED,
        deletedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        prefix: "recent_del_stud",
      });
      await createTestApplication(recentDeletedStudent.id, oppInternship.id);

      // 5. Active Student -> MUST NEVER BE PURGED
      const activeStudent = await createTestUser({
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        deletedAt: null,
        prefix: "active_stud",
      });
      await createTestApplication(activeStudent.id, oppInternship.id);

      // 6. Deleted Business Account beyond cutoff -> MUST NEVER BE PURGED BY STUDENT ROUTINE
      const expiredBusiness = await createTestUser({
        role: Role.BUSINESS,
        status: UserStatus.DELETED,
        deletedAt: new Date(testCutoffDate.getTime() - 1000),
        prefix: "del_biz_target",
      });
      const bizOpp = await createTestOpportunity(expiredBusiness.id);
      // Active student applied to this deleted business opportunity
      await createTestApplication(activeStudent.id, bizOpp.id);

      // Execute LIVE PURGE with the deterministic testCutoffDate
      const purgeResult = await purgeExpiredAccounts({
        cutoffDate: testCutoffDate,
        dryRun: false,
      });

      expect(purgeResult.dryRun).toBe(false);
      expect(purgeResult.purgedStudentsCount).toBeGreaterThanOrEqual(2);
      expect(purgeResult.eligibleStudentIds).toContain(expiredStudent.id);
      expect(purgeResult.eligibleStudentIds).toContain(exactlyAtCutoffStudent.id);
      expect(purgeResult.eligibleStudentIds).not.toContain(justInsideStudent.id);
      expect(purgeResult.eligibleStudentIds).not.toContain(recentDeletedStudent.id);
      expect(purgeResult.eligibleStudentIds).not.toContain(activeStudent.id);
      expect(purgeResult.eligibleStudentIds).not.toContain(expiredBusiness.id);

      // VERIFY PURGED RECORDS:
      // A. Expired student record and its dependent application/registration must be gone
      const checkExpired = await prisma.user.findUnique({ where: { id: expiredStudent.id } });
      expect(checkExpired).toBeNull();

      const checkExpiredApps = await prisma.application.findMany({
        where: { student_id: expiredStudent.id },
      });
      expect(checkExpiredApps).toHaveLength(0);

      const checkExpiredRegs = await prisma.competitionRegistration.findMany({
        where: { student_id: expiredStudent.id },
      });
      expect(checkExpiredRegs).toHaveLength(0);

      // B. Exactly-at-cutoff student must be gone
      const checkExact = await prisma.user.findUnique({ where: { id: exactlyAtCutoffStudent.id } });
      expect(checkExact).toBeNull();

      // VERIFY PRESERVED RECORDS:
      // C. Just inside retention student must remain
      const checkJustInside = await prisma.user.findUnique({ where: { id: justInsideStudent.id } });
      expect(checkJustInside).not.toBeNull();
      expect(checkJustInside?.status).toBe(UserStatus.DELETED);

      const checkJustInsideApps = await prisma.application.findMany({
        where: { student_id: justInsideStudent.id },
      });
      expect(checkJustInsideApps).toHaveLength(1);

      // D. Recently deleted student must remain
      const checkRecent = await prisma.user.findUnique({ where: { id: recentDeletedStudent.id } });
      expect(checkRecent).not.toBeNull();

      // E. Active student must remain
      const checkActive = await prisma.user.findUnique({ where: { id: activeStudent.id } });
      expect(checkActive).not.toBeNull();
      expect(checkActive?.status).toBe(UserStatus.ACTIVE);

      // F. Deleted business account and its opportunities MUST REMAIN INTACT
      const checkBiz = await prisma.user.findUnique({ where: { id: expiredBusiness.id } });
      expect(checkBiz).not.toBeNull();
      expect(checkBiz?.role).toBe(Role.BUSINESS);

      const checkBizOpp = await prisma.opportunity.findUnique({ where: { id: bizOpp.id } });
      expect(checkBizOpp).not.toBeNull();

      const checkBizOppApps = await prisma.application.findMany({ where: { opportunity_id: bizOpp.id } });
      expect(checkBizOppApps).toHaveLength(1);
    });

    it("7. Repeated execution is idempotent and safe", async () => {
      // Re-running the purge with the same cutoff date should find 0 eligible students
      const secondRun = await purgeExpiredAccounts({
        cutoffDate: testCutoffDate,
        dryRun: false,
      });

      expect(secondRun.dryRun).toBe(false);
      expect(secondRun.purgedStudentsCount).toBe(0);
      expect(secondRun.purgedApplicationsCount).toBe(0);
      expect(secondRun.purgedRegistrationsCount).toBe(0);
      expect(secondRun.eligibleStudentIds).toHaveLength(0);
    });
  });
});
