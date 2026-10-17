import { Role, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface PurgeOptions {
  cutoffDate?: Date;
  dryRun?: boolean;
}

export interface PurgeResult {
  dryRun: boolean;
  cutoffDate: Date;
  eligibleStudentsCount: number;
  purgedStudentsCount: number;
  purgedApplicationsCount: number;
  purgedRegistrationsCount: number;
  eligibleStudentIds: string[];
}

/**
 * Calculates the default 12-month retention cutoff date based on SRS Section 7.4.
 * Records deleted strictly on or before this timestamp have completed their 12-month
 * reporting retention period and are eligible for permanent purging.
 */
export const getDefaultRetentionCutoffDate = (): Date => {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  return cutoff;
};

/**
 * Purges expired anonymized student accounts and their associated application and
 * competition-registration records that have fulfilled the 12-month retention mandate (SRS Section 7.4).
 *
 * Safety & Isolation Constraints:
 * 1. Scope Restriction: Only student accounts with role = STUDENT, status = DELETED, and
 *    deleted_at <= cutoffDate are eligible.
 * 2. Active User Protection: Active, pending, or suspended accounts are NEVER selected.
 * 3. Business Account Protection: Business accounts and their opportunities are NEVER purged
 *    by this routine, preventing collateral cascade deletion of other students' applications.
 * 4. Auditability: Counts of eligible accounts, applications, and competition registrations
 *    are computed prior to deletion.
 * 5. Dry-Run Safety: When dryRun is true, eligible records are identified and counted without
 *    executing any database mutations.
 * 6. Atomicity: All deletions occur within an isolated Prisma transaction.
 */
export const purgeExpiredAccounts = async (
  options?: PurgeOptions
): Promise<PurgeResult> => {
  const dryRun = options?.dryRun ?? false;
  const cutoffDate = options?.cutoffDate ?? getDefaultRetentionCutoffDate();

  // 1. Identify eligible deleted student accounts on or before the cutoff date
  const eligibleStudents = await prisma.user.findMany({
    where: {
      role: Role.STUDENT,
      status: UserStatus.DELETED,
      deleted_at: {
        lte: cutoffDate,
        not: null,
      },
    },
    select: {
      id: true,
      _count: {
        select: {
          applications: true,
          registrations: true,
        },
      },
    },
  });

  const eligibleStudentIds = eligibleStudents.map((s) => s.id);
  const totalApplications = eligibleStudents.reduce(
    (sum, s) => sum + s._count.applications,
    0
  );
  const totalRegistrations = eligibleStudents.reduce(
    (sum, s) => sum + s._count.registrations,
    0
  );

  // If dry-run mode or no eligible students exist, return without modifying the database
  if (dryRun || eligibleStudentIds.length === 0) {
    return {
      dryRun,
      cutoffDate,
      eligibleStudentsCount: eligibleStudentIds.length,
      purgedStudentsCount: 0,
      purgedApplicationsCount: totalApplications,
      purgedRegistrationsCount: totalRegistrations,
      eligibleStudentIds,
    };
  }

  // 2. Perform atomic deletion in a Prisma transaction
  await prisma.$transaction(async (tx) => {
    // Explicitly delete retained applications for eligible students
    await tx.application.deleteMany({
      where: {
        student_id: { in: eligibleStudentIds },
      },
    });

    // Explicitly delete retained competition registrations for eligible students
    await tx.competitionRegistration.deleteMany({
      where: {
        student_id: { in: eligibleStudentIds },
      },
    });

    // Clean up any stray student profile records if present
    await tx.studentProfile.deleteMany({
      where: {
        user_id: { in: eligibleStudentIds },
      },
    });

    // Permanently remove the soft-deleted student user accounts
    await tx.user.deleteMany({
      where: {
        id: { in: eligibleStudentIds },
      },
    });
  });

  return {
    dryRun: false,
    cutoffDate,
    eligibleStudentsCount: eligibleStudentIds.length,
    purgedStudentsCount: eligibleStudentIds.length,
    purgedApplicationsCount: totalApplications,
    purgedRegistrationsCount: totalRegistrations,
    eligibleStudentIds,
  };
};
