import {
  Role,
  ApplicationStatus,
  OpportunityStatus,
  VerificationStatus,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

export interface StudentDashboardSummary {
  role: "STUDENT";
  applications: {
    NEW: number;
    SHORTLISTED: number;
    REJECTED: number;
    HIRED: number;
    total: number;
  };
  applications_by_status: {
    NEW: number;
    SHORTLISTED: number;
    REJECTED: number;
    HIRED: number;
  };
  total_applications: number;
  competition_registrations: number;
  total_competition_registrations: number;
  profile_complete: boolean;
  is_profile_complete: boolean;
}

export interface BusinessDashboardSummary {
  role: "BUSINESS";
  verification_status: VerificationStatus;
  opportunities: {
    OPEN: number;
    CLOSED: number;
    total: number;
  };
  opportunities_by_status: {
    OPEN: number;
    CLOSED: number;
  };
  total_opportunities: number;
  active_opportunities: number;
  applications: {
    NEW: number;
    SHORTLISTED: number;
    REJECTED: number;
    HIRED: number;
    total: number;
  };
  applications_by_status: {
    NEW: number;
    SHORTLISTED: number;
    REJECTED: number;
    HIRED: number;
  };
  total_applications: number;
  pending_applications: number;
  competition_registrations: number;
  total_competition_registrations: number;
}

export interface AdminDashboardSummary {
  role: "ADMIN";
  users: {
    STUDENT: number;
    BUSINESS: number;
    ADMIN: number;
    total: number;
  };
  users_by_role: {
    STUDENT: number;
    BUSINESS: number;
    ADMIN: number;
  };
  total_users: number;
  businesses_awaiting_verification: number;
  pending_verifications: number;
  opportunities: {
    OPEN: number;
    CLOSED: number;
    total: number;
  };
  total_opportunities: number;
  active_opportunities: number;
  total_applications: number;
}

export type DashboardSummary =
  | StudentDashboardSummary
  | BusinessDashboardSummary
  | AdminDashboardSummary;

/**
 * Generates role-based dashboard summary for the authenticated user (FR-022).
 */
export const getDashboardSummary = async (
  userId: string,
  role: Role
): Promise<DashboardSummary> => {
  if (role === Role.STUDENT) {
    return getStudentDashboardSummary(userId);
  } else if (role === Role.BUSINESS) {
    return getBusinessDashboardSummary(userId);
  } else if (role === Role.ADMIN) {
    return getAdminDashboardSummary();
  }

  throw new AppError("Invalid role", 400);
};

const getStudentDashboardSummary = async (
  userId: string
): Promise<StudentDashboardSummary> => {
  const [profile, appCounts, totalRegistrations] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { user_id: userId },
    }),
    prisma.application.groupBy({
      by: ["status"],
      where: { student_id: userId },
      _count: { status: true },
    }),
    prisma.competitionRegistration.count({
      where: { student_id: userId },
    }),
  ]);

  const applicationsByStatus = {
    [ApplicationStatus.NEW]: 0,
    [ApplicationStatus.SHORTLISTED]: 0,
    [ApplicationStatus.REJECTED]: 0,
    [ApplicationStatus.HIRED]: 0,
  };

  let totalApplications = 0;
  for (const item of appCounts) {
    if (item.status in applicationsByStatus) {
      applicationsByStatus[item.status] = item._count.status;
      totalApplications += item._count.status;
    }
  }

  let isProfileComplete = false;
  if (profile && Array.isArray(profile.skills)) {
    isProfileComplete = profile.skills.some(
      (s: unknown) => typeof s === "string" && s.trim().length > 0
    );
  }

  return {
    role: "STUDENT",
    applications: {
      ...applicationsByStatus,
      total: totalApplications,
    },
    applications_by_status: applicationsByStatus,
    total_applications: totalApplications,
    competition_registrations: totalRegistrations,
    total_competition_registrations: totalRegistrations,
    profile_complete: isProfileComplete,
    is_profile_complete: isProfileComplete,
  };
};

const getBusinessDashboardSummary = async (
  userId: string
): Promise<BusinessDashboardSummary> => {
  const [businessProfile, oppCounts, businessAppCounts, totalRegistrations] =
    await Promise.all([
      prisma.businessProfile.findUnique({
        where: { user_id: userId },
      }),
      prisma.opportunity.groupBy({
        by: ["status"],
        where: { posted_by: userId },
        _count: { status: true },
      }),
      prisma.application.groupBy({
        by: ["status"],
        where: {
          opportunity: {
            posted_by: userId,
          },
        },
        _count: { status: true },
      }),
      prisma.competitionRegistration.count({
        where: {
          opportunity: {
            posted_by: userId,
          },
        },
      }),
    ]);

  const opportunitiesByStatus = {
    [OpportunityStatus.OPEN]: 0,
    [OpportunityStatus.CLOSED]: 0,
  };

  let totalOpportunities = 0;
  for (const item of oppCounts) {
    if (item.status in opportunitiesByStatus) {
      opportunitiesByStatus[item.status] = item._count.status;
      totalOpportunities += item._count.status;
    }
  }

  const applicationsByStatus = {
    [ApplicationStatus.NEW]: 0,
    [ApplicationStatus.SHORTLISTED]: 0,
    [ApplicationStatus.REJECTED]: 0,
    [ApplicationStatus.HIRED]: 0,
  };

  let totalApplications = 0;
  for (const item of businessAppCounts) {
    if (item.status in applicationsByStatus) {
      applicationsByStatus[item.status] = item._count.status;
      totalApplications += item._count.status;
    }
  }

  const verificationStatus =
    businessProfile?.verification_status ?? VerificationStatus.PENDING;

  return {
    role: "BUSINESS",
    verification_status: verificationStatus,
    opportunities: {
      ...opportunitiesByStatus,
      total: totalOpportunities,
    },
    opportunities_by_status: opportunitiesByStatus,
    total_opportunities: totalOpportunities,
    active_opportunities: opportunitiesByStatus[OpportunityStatus.OPEN],
    applications: {
      ...applicationsByStatus,
      total: totalApplications,
    },
    applications_by_status: applicationsByStatus,
    total_applications: totalApplications,
    pending_applications: applicationsByStatus[ApplicationStatus.NEW],
    competition_registrations: totalRegistrations,
    total_competition_registrations: totalRegistrations,
  };
};

const getAdminDashboardSummary = async (): Promise<AdminDashboardSummary> => {
  const [userCounts, pendingVerifications, oppCounts, totalApplications] =
    await Promise.all([
      prisma.user.groupBy({
        by: ["role"],
        _count: { role: true },
      }),
      prisma.businessProfile.count({
        where: {
          verification_status: VerificationStatus.PENDING,
        },
      }),
      prisma.opportunity.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      prisma.application.count(),
    ]);

  const usersByRole = {
    [Role.STUDENT]: 0,
    [Role.BUSINESS]: 0,
    [Role.ADMIN]: 0,
  };

  let totalUsers = 0;
  for (const item of userCounts) {
    if (item.role in usersByRole) {
      usersByRole[item.role] = item._count.role;
      totalUsers += item._count.role;
    }
  }

  const opportunitiesByStatus = {
    [OpportunityStatus.OPEN]: 0,
    [OpportunityStatus.CLOSED]: 0,
  };

  let totalOpportunities = 0;
  for (const item of oppCounts) {
    if (item.status in opportunitiesByStatus) {
      opportunitiesByStatus[item.status] = item._count.status;
      totalOpportunities += item._count.status;
    }
  }

  return {
    role: "ADMIN",
    users: {
      ...usersByRole,
      total: totalUsers,
    },
    users_by_role: usersByRole,
    total_users: totalUsers,
    businesses_awaiting_verification: pendingVerifications,
    pending_verifications: pendingVerifications,
    opportunities: {
      ...opportunitiesByStatus,
      total: totalOpportunities,
    },
    total_opportunities: totalOpportunities,
    active_opportunities: opportunitiesByStatus[OpportunityStatus.OPEN],
    total_applications: totalApplications,
  };
};
