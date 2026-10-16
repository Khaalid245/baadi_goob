import {
  Prisma,
  Role,
  CompetitionRegistration,
  OpportunityType,
  OpportunityStatus,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

export interface SafeCompetitionRegistration {
  id: string;
  student_id: string;
  opportunity_id: string;
  registered_at: string;
}

export const formatRegistration = (
  reg: CompetitionRegistration
): SafeCompetitionRegistration => {
  return {
    id: reg.id,
    student_id: reg.student_id,
    opportunity_id: reg.opportunity_id,
    registered_at: reg.registered_at.toISOString(),
  };
};

/**
 * Registers the authenticated student for a competition opportunity (FR-006).
 * Enforces:
 * - Opportunity existence (HTTP 404)
 * - Opportunity type must be COMPETITION (HTTP 400)
 * - Opportunity status must be OPEN (HTTP 400)
 * - Opportunity deadline must not have passed (HTTP 400)
 * - Duplicate prevention with HTTP 409
 * - Concurrency safeguard via compound unique constraint (student_id, opportunity_id) handling P2002
 */
export const registerForCompetition = async (
  opportunityId: string,
  studentId: string
): Promise<SafeCompetitionRegistration> => {
  // 1. Fetch the opportunity
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });

  if (!opportunity) {
    throw new AppError("Opportunity not found", 404);
  }

  // 2. Reject non-competition opportunities
  if (opportunity.type !== OpportunityType.COMPETITION) {
    throw new AppError(
      "Competition registration is only allowed for competitions.",
      400
    );
  }

  // 3. Reject closed competitions
  if (opportunity.status === OpportunityStatus.CLOSED) {
    throw new AppError("Competition is closed for registrations.", 400);
  }

  // 4. Reject competitions whose deadline has passed
  if (new Date(opportunity.deadline).getTime() <= Date.now()) {
    throw new AppError("Competition deadline has passed.", 400);
  }

  // 5. Pre-check for duplicate registration
  const existing = await prisma.competitionRegistration.findUnique({
    where: {
      student_id_opportunity_id: {
        student_id: studentId,
        opportunity_id: opportunityId,
      },
    },
  });

  if (existing) {
    throw new AppError("Already registered for this competition", 409);
  }

  // 6. Create registration record, catching concurrent P2002 duplicate errors safely
  try {
    const registration = await prisma.competitionRegistration.create({
      data: {
        student_id: studentId,
        opportunity_id: opportunityId,
      },
    });

    return formatRegistration(registration);
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
        target.includes("CompetitionRegistration_student_id_opportunity_id_key")
      ) {
        throw new AppError("Already registered for this competition", 409);
      }
    }
    throw error;
  }
};

export interface CompetitionRegistrantItem {
  id: string;
  student_id: string;
  registered_at: string;
  name: string;
  email: string;
  education: string | null;
  skills: unknown;
  project_links: unknown;
}

/**
 * Retrieves all registered students for a posted competition opportunity (FR-018).
 * Enforces:
 * - Opportunity existence check (HTTP 404)
 * - Opportunity type must be COMPETITION (HTTP 400)
 * - Ownership & Role authorization:
 *   - Platform ADMIN has platform-wide access (Section 5)
 *   - BUSINESS must be the creator/owner of the competition (opportunity.posted_by === user.id)
 *   - Other roles or non-owners are rejected with HTTP 403 Access denied
 * - Deterministic ordering: newest registrations first with id as stable tie-breaker
 * - Safe field selection: student name, email, education, skills, project_links
 *   (never exposes password hashes, tokens, or private user details)
 * - Avoids N+1 queries by joining user and studentProfile in a single query
 */
export const getCompetitionRegistrations = async (
  opportunityId: string,
  user: { id: string; role: Role }
): Promise<CompetitionRegistrantItem[]> => {
  // 1. Fetch opportunity to verify existence, type, and ownership
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    select: {
      id: true,
      posted_by: true,
      type: true,
    },
  });

  if (!opportunity) {
    throw new AppError("Opportunity not found", 404);
  }

  // 2. Reject non-competition opportunities
  if (opportunity.type !== OpportunityType.COMPETITION) {
    throw new AppError(
      "Competition registrations are only available for competitions.",
      400
    );
  }

  // 3. Authorization check: Platform Admin or owning Business (FR-018 / Section 5)
  if (user.role !== Role.ADMIN && opportunity.posted_by !== user.id) {
    throw new AppError("Access denied", 403);
  }

  // 4. Retrieve registrations with associated student and profile details
  const registrations = await prisma.competitionRegistration.findMany({
    where: { opportunity_id: opportunityId },
    orderBy: [
      { registered_at: "desc" },
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

  return registrations.map((reg) => ({
    id: reg.id,
    student_id: reg.student_id,
    registered_at: reg.registered_at.toISOString(),
    name: reg.user.name,
    email: reg.user.email,
    education: reg.user.studentProfile?.education ?? null,
    skills: reg.user.studentProfile?.skills ?? null,
    project_links: reg.user.studentProfile?.project_links ?? null,
  }));
};

