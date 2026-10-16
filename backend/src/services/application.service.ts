import {
  Prisma,
  Application,
  ApplicationStatus,
  OpportunityType,
  OpportunityStatus,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

export interface SafeApplication {
  id: string;
  student_id: string;
  opportunity_id: string;
  status: ApplicationStatus;
  submitted_at: string;
}

export interface StudentApplicationOpportunitySummary {
  id: string;
  title: string;
  type: OpportunityType;
  deadline: string;
  status: OpportunityStatus;
  company_name: string | null;
}

export interface StudentApplicationItem {
  id: string;
  student_id: string;
  opportunity_id: string;
  status: ApplicationStatus;
  submitted_at: string;
  opportunity: StudentApplicationOpportunitySummary | null;
}

export const formatApplication = (app: Application): SafeApplication => {
  return {
    id: app.id,
    student_id: app.student_id,
    opportunity_id: app.opportunity_id,
    status: app.status,
    submitted_at: app.submitted_at.toISOString(),
  };
};

/**
 * Submits an application for the authenticated student to an opportunity.
 * Enforces:
 * - StudentProfile existence and at least one non-empty skill (HTTP 403)
 * - Opportunity existence (HTTP 404)
 * - Rejection of COMPETITION opportunities with dedicated message (HTTP 400)
 * - Rejection of CLOSED opportunities (HTTP 400)
 * - Rejection of opportunities with past/elapsed deadline (HTTP 400)
 * - Acceptance only for INTERNSHIP and JOB opportunities
 * - Initial status NEW
 * - Duplicate prevention with HTTP 409
 * - Safe handling of Prisma P2002 unique constraint violations for concurrency safety
 */
export const applyToOpportunity = async (
  opportunityId: string,
  studentId: string
): Promise<SafeApplication> => {
  // 1. Require an existing StudentProfile with at least one skill.
  const profile = await prisma.studentProfile.findUnique({
    where: { user_id: studentId },
  });

  if (!profile) {
    throw new AppError(
      "Please complete your student profile with at least one skill before applying.",
      403
    );
  }

  let hasSkill = false;
  if (Array.isArray(profile.skills)) {
    hasSkill = profile.skills.some(
      (s: unknown) => typeof s === "string" && s.trim().length > 0
    );
  }

  if (!hasSkill) {
    throw new AppError(
      "Please complete your student profile with at least one skill before applying.",
      403
    );
  }

  // 2. Fetch the opportunity
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });

  if (!opportunity) {
    throw new AppError("Opportunity not found", 404);
  }

  // 3. Reject COMPETITION opportunities
  if (opportunity.type === OpportunityType.COMPETITION) {
    throw new AppError(
      "Cannot apply to a competition. Competition registration is a separate flow.",
      400
    );
  }

  // 4. Reject closed opportunities
  if (opportunity.status === OpportunityStatus.CLOSED) {
    throw new AppError("Opportunity is closed for applications.", 400);
  }

  // 5. Reject opportunities whose deadline has passed
  if (new Date(opportunity.deadline).getTime() <= Date.now()) {
    throw new AppError("Opportunity deadline has passed.", 400);
  }

  // 6. Defensive check: only INTERNSHIP and JOB are eligible
  if (
    opportunity.type !== OpportunityType.INTERNSHIP &&
    opportunity.type !== OpportunityType.JOB
  ) {
    throw new AppError(
      "Applications are only accepted for internships and jobs.",
      400
    );
  }

  // 7. Duplicate application check
  const existing = await prisma.application.findUnique({
    where: {
      student_id_opportunity_id: {
        student_id: studentId,
        opportunity_id: opportunityId,
      },
    },
  });

  if (existing) {
    throw new AppError("Already applied to this opportunity", 409);
  }

  // 8. Create Application with status NEW, catching concurrent P2002 duplicate errors safely
  try {
    const created = await prisma.application.create({
      data: {
        student_id: studentId,
        opportunity_id: opportunityId,
        status: ApplicationStatus.NEW,
      },
    });

    return formatApplication(created);
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = String(error.meta?.target || "");
      if (
        !error.meta?.target ||
        target.includes("student_id") ||
        target.includes("opportunity_id") ||
        target.includes("Application_student_id_opportunity_id_key")
      ) {
        throw new AppError("Already applied to this opportunity", 409);
      }
    }
    throw error;
  }
};

/**
 * Retrieves all applications submitted by the authenticated student.
 * Includes relevant application fields and related opportunity summary.
 * Returns safe fields only (never exposes password hashes or sensitive account details).
 * Uses deterministic ordering: newest submissions first.
 * Loads opportunities in a single optimized query with relation join, avoiding N+1 queries.
 */
export const getStudentApplications = async (
  studentId: string
): Promise<StudentApplicationItem[]> => {
  const applications = await prisma.application.findMany({
    where: { student_id: studentId },
    orderBy: [
      { submitted_at: "desc" },
      { id: "desc" },
    ],
    include: {
      opportunity: {
        select: {
          id: true,
          title: true,
          type: true,
          deadline: true,
          status: true,
          user: {
            select: {
              name: true,
              businessProfile: {
                select: {
                  company_name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return applications.map((app) => ({
    id: app.id,
    student_id: app.student_id,
    opportunity_id: app.opportunity_id,
    status: app.status,
    submitted_at: app.submitted_at.toISOString(),
    opportunity: app.opportunity
      ? {
          id: app.opportunity.id,
          title: app.opportunity.title,
          type: app.opportunity.type,
          deadline: app.opportunity.deadline.toISOString(),
          status: app.opportunity.status,
          company_name:
            app.opportunity.user?.businessProfile?.company_name ||
            app.opportunity.user?.name ||
            null,
        }
      : null,
  }));
};

export interface OpportunityApplicantItem {
  id: string;
  student_id: string;
  name: string;
  email: string;
  education: string | null;
  skills: unknown;
  project_links: unknown;
  status: ApplicationStatus;
  submitted_at: string;
}

/**
 * Retrieves all applicants for a posted opportunity.
 * Restricted to the owner business (FR-009).
 * Enforces:
 * - Opportunity existence check (HTTP 404)
 * - Ownership check: opportunity.posted_by === businessUserId (HTTP 403)
 * - Deterministic ordering: newest submissions first
 * - Safe field selection: never exposes password hashes, tokens, or private data
 * - Avoids N+1 queries by including student user and studentProfile in a single query
 */
export const getOpportunityApplications = async (
  opportunityId: string,
  businessUserId: string
): Promise<OpportunityApplicantItem[]> => {
  // 1. Check opportunity existence and ownership
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    select: {
      id: true,
      posted_by: true,
    },
  });

  if (!opportunity) {
    throw new AppError("Opportunity not found", 404);
  }

  if (opportunity.posted_by !== businessUserId) {
    throw new AppError("Access denied", 403);
  }

  // 2. Fetch applicants for this opportunity
  const applications = await prisma.application.findMany({
    where: { opportunity_id: opportunityId },
    orderBy: [
      { submitted_at: "desc" },
      { id: "desc" },
    ],
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          studentProfile: {
            select: {
              education: true,
              skills: true,
              project_links: true,
            },
          },
        },
      },
    },
  });

  return applications.map((app) => ({
    id: app.id,
    student_id: app.student_id,
    name: app.user.name,
    email: app.user.email,
    education: app.user.studentProfile?.education ?? null,
    skills: app.user.studentProfile?.skills ?? null,
    project_links: app.user.studentProfile?.project_links ?? null,
    status: app.status,
    submitted_at: app.submitted_at.toISOString(),
  }));
};

/**
 * Updates an applicant's status and atomically creates a notification for the student (FR-010, FR-014).
 * Enforces:
 * - Application existence check (HTTP 404)
 * - Ownership check: application.opportunity.posted_by === businessUserId (HTTP 403)
 * - Status transition: target statuses SHORTLISTED, REJECTED, HIRED
 * - Atomic persistence of application status and notification in a Prisma transaction
 * - Rollback on any failure so status cannot change without its required notification
 * - Safe return fields (SafeApplication) without exposing passwords, tokens, or sensitive user data
 */
export const updateApplicationStatus = async (
  applicationId: string,
  businessUserId: string,
  targetStatus: ApplicationStatus
): Promise<SafeApplication> => {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch application with opportunity to check existence and ownership
    const application = await tx.application.findUnique({
      where: { id: applicationId },
      include: {
        opportunity: {
          select: {
            id: true,
            posted_by: true,
            title: true,
          },
        },
      },
    });

    if (!application || !application.opportunity) {
      throw new AppError("Application not found", 404);
    }

    if (application.opportunity.posted_by !== businessUserId) {
      throw new AppError("Access denied", 403);
    }

    // 2. Update application status
    const updatedApplication = await tx.application.update({
      where: { id: applicationId },
      data: { status: targetStatus },
    });

    // 3. Atomically create notification for the student
    await tx.notification.create({
      data: {
        user_id: application.student_id,
        type: `APPLICATION_${targetStatus}`,
        message: `Your application for "${application.opportunity.title}" has been updated to ${targetStatus.toLowerCase()}.`,
        channel: "EMAIL",
      },
    });

    return formatApplication(updatedApplication);
  });
};

