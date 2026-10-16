import crypto from "crypto";
import { UserStatus, OpportunityStatus, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

export interface DeleteAccountResult {
  message: string;
}

/**
 * Anonymizes and soft-deletes a user's account (FR-020).
 *
 * Implements SRS Section 7.4 Data Privacy and Retention:
 * - Application and competition-registration records are preserved for reporting (minimum 12 months).
 * - Personal identifying information (name, email, profile details) is wiped or anonymized.
 * - Credentials and active tokens are purged or invalidated so the account can never authenticate again.
 * - For business accounts, all active/open opportunities are automatically closed to prevent new applications.
 *
 * All database operations are executed atomically within a transaction.
 */
export const deleteUserAccount = async (
  userId: string
): Promise<DeleteAccountResult> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.status === UserStatus.DELETED) {
    throw new AppError("Account has already been deleted", 400);
  }

  const anonymizedEmail = `deleted_${userId}@deleted.local`;
  const anonymizedName =
    user.role === Role.BUSINESS ? "Deleted Business" : "Deleted User";
  const dummyPasswordHash = `$2a$10$DELETEDACCOUNTINVALIDHASH${crypto.randomBytes(16).toString("hex")}`;

  await prisma.$transaction(async (tx) => {
    // 1. Update user record with anonymized details and DELETED status
    await tx.user.update({
      where: { id: userId },
      data: {
        name: anonymizedName,
        email: anonymizedEmail,
        password_hash: dummyPasswordHash,
        status: UserStatus.DELETED,
        deleted_at: new Date(),
      },
    });

    // 2. Remove student profile details (PII) if student
    if (user.role === Role.STUDENT) {
      await tx.studentProfile.deleteMany({
        where: { user_id: userId },
      });
    }

    // 3. Remove business profile and close open opportunities if business
    if (user.role === Role.BUSINESS) {
      await tx.businessProfile.deleteMany({
        where: { user_id: userId },
      });

      await tx.opportunity.updateMany({
        where: {
          posted_by: userId,
          status: OpportunityStatus.OPEN,
        },
        data: {
          status: OpportunityStatus.CLOSED,
        },
      });
    }

    // 4. Invalidate and purge notifications and password reset tokens
    await tx.notification.deleteMany({
      where: { user_id: userId },
    });

    await tx.passwordResetToken.deleteMany({
      where: { user_id: userId },
    });
  });

  return { message: "Account deleted successfully" };
};
