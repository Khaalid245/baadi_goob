import {
  Prisma,
  Role,
  UserStatus,
  VerificationStatus,
  BusinessProfile,
  User,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import {
  ListBusinessesQuery,
  ListUsersQuery,
} from "../validations/admin.validation";

export interface SafeBusinessUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  created_at: string;
}

export interface SafeBusinessDetails {
  id: string;
  user_id: string;
  company_name: string;
  verification_status: VerificationStatus;
  user: SafeBusinessUser;
}

export interface ListBusinessesResult {
  businesses: SafeBusinessDetails[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const formatBusinessDetails = (
  profile: BusinessProfile & { user: User }
): SafeBusinessDetails => {
  return {
    id: profile.id,
    user_id: profile.user_id,
    company_name: profile.company_name,
    verification_status: profile.verification_status,
    user: {
      id: profile.user.id,
      name: profile.user.name,
      email: profile.user.email,
      role: profile.user.role,
      status: profile.user.status,
      created_at: profile.user.created_at.toISOString(),
    },
  };
};

/**
 * Lists business accounts filtered by verification status (FR-012).
 * Accessible to Administrators only.
 * Defaults to PENDING businesses, supports deterministic ordering and pagination.
 * Excludes sensitive fields (passwords, tokens).
 */
export const listBusinesses = async (
  query: ListBusinessesQuery
): Promise<ListBusinessesResult> => {
  const status = query.status ?? VerificationStatus.PENDING;
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const skip = (page - 1) * limit;

  const where = {
    verification_status: status,
    user: {
      role: Role.BUSINESS,
    },
  };

  const [total, profiles] = await Promise.all([
    prisma.businessProfile.count({ where }),
    prisma.businessProfile.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { user: { created_at: "desc" } },
        { id: "asc" },
      ],
      include: {
        user: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    businesses: profiles.map(formatBusinessDetails),
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPrevPage,
    },
    total,
    page,
    limit,
    totalPages,
  };
};

/**
 * Verifies or rejects a newly registered business account (FR-012, FR-019).
 * Accessible to Administrators only.
 * Atomically updates verification status and generates an in-database notification.
 * Enforces business-only accounts, prevents redundant status transitions, and sanitizes output.
 */
export const verifyBusiness = async (
  businessId: string,
  targetStatus: VerificationStatus
): Promise<SafeBusinessDetails> => {
  return await prisma.$transaction(async (tx) => {
    // 1. Look up business profile by either profile id or user id
    let profile = await tx.businessProfile.findFirst({
      where: {
        OR: [{ id: businessId }, { user_id: businessId }],
      },
      include: {
        user: true,
      },
    });

    if (!profile) {
      // Check if user exists to provide specific error message
      const user = await tx.user.findUnique({
        where: { id: businessId },
        include: {
          businessProfile: true,
        },
      });

      if (!user) {
        throw new AppError("Business not found", 404);
      }

      if (user.role !== Role.BUSINESS) {
        throw new AppError(
          "Only business accounts can be verified or rejected",
          400
        );
      }

      if (!user.businessProfile) {
        throw new AppError(
          "Business profile must be completed before verification",
          400
        );
      }

      profile = await tx.businessProfile.findUnique({
        where: { user_id: user.id },
        include: { user: true },
      });
    }

    if (!profile) {
      throw new AppError("Business not found", 404);
    }

    // Ensure the associated user account is a BUSINESS
    if (profile.user.role !== Role.BUSINESS) {
      throw new AppError(
        "Only business accounts can be verified or rejected",
        400
      );
    }

    // Check for invalid transitions (e.g. redundant transition)
    if (profile.verification_status === targetStatus) {
      throw new AppError(
        `Business is already ${targetStatus.toLowerCase()}`,
        400
      );
    }

    // 2. Update verification status
    const updatedProfile = await tx.businessProfile.update({
      where: { id: profile.id },
      data: {
        verification_status: targetStatus,
      },
      include: {
        user: true,
      },
    });

    // 3. Atomically create in-database notification for the business user (FR-019)
    await tx.notification.create({
      data: {
        user_id: profile.user_id,
        type: `BUSINESS_${targetStatus}`,
        message:
          targetStatus === VerificationStatus.VERIFIED
            ? "Your business account has been verified. You can now post opportunities."
            : "Your business account verification has been rejected.",
        channel: "EMAIL",
      },
    });

    return formatBusinessDetails(updatedProfile);
  });
};

export interface SafeAdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  created_at: string;
}

export interface ListUsersResult {
  users: SafeAdminUser[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Lists user accounts filtered by role and status (FR-021).
 * Accessible to Administrators only.
 * Supports deterministic ordering and pagination.
 * Excludes sensitive fields (passwords, tokens).
 */
export const listUsers = async (
  query: ListUsersQuery
): Promise<ListUsersResult> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};
  if (query.role) {
    where.role = query.role;
  }
  if (query.status) {
    where.status = query.status;
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ created_at: "desc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        created_at: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      created_at: u.created_at.toISOString(),
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPrevPage,
    },
    total,
    page,
    limit,
    totalPages,
  };
};

/**
 * Updates a user account status (suspends or reactivates) (FR-021).
 * Accessible to Administrators only.
 * Prevents self-suspension by the calling administrator and rejects redundant transitions.
 */
export const updateUserStatus = async (
  targetUserId: string,
  targetStatus: UserStatus,
  adminUserId: string
): Promise<SafeAdminUser> => {
  // 1. Prevent self-suspension
  if (targetUserId === adminUserId && targetStatus === UserStatus.SUSPENDED) {
    throw new AppError("Administrators cannot suspend their own account", 400);
  }

  // 2. Fetch existing user
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // 3. Prevent modifying deleted accounts
  if (user.status === UserStatus.DELETED) {
    throw new AppError("Cannot modify status of a deleted account", 400);
  }

  // 4. Prevent redundant status transition
  if (user.status === targetStatus) {
    throw new AppError(
      `User is already ${targetStatus.toLowerCase()}`,
      400
    );
  }

  // 4. Update status
  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { status: targetStatus },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      created_at: true,
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    status: updated.status,
    created_at: updated.created_at.toISOString(),
  };
};
