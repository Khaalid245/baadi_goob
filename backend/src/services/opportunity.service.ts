import {
  Prisma,
  Opportunity,
  OpportunityStatus,
  OpportunityType,
  Role,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import {
  ListOpportunitiesQuery,
  CreateOpportunityInput,
  UpdateOpportunityInput,
} from "../validations/opportunity.validation";

export interface SafeOpportunity {
  id: string;
  posted_by: string;
  type: OpportunityType;
  title: string;
  description: string;
  skills_required: string[] | null;
  deadline: string;
  status: OpportunityStatus;
  is_expired: boolean;
  effective_status: "OPEN" | "CLOSED" | "EXPIRED";
  company_name: string | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ListOpportunitiesResponse {
  opportunities: SafeOpportunity[];
  pagination: PaginationMeta;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const formatOpportunity = (
  opp: Opportunity & {
    user?: {
      name: string;
      businessProfile?: { company_name: string } | null;
    } | null;
  }
): SafeOpportunity => {
  const isExpired = new Date(opp.deadline).getTime() < Date.now();
  let effectiveStatus: "OPEN" | "CLOSED" | "EXPIRED" = "OPEN";

  if (opp.status === OpportunityStatus.CLOSED) {
    effectiveStatus = "CLOSED";
  } else if (isExpired) {
    effectiveStatus = "EXPIRED";
  }

  let skills: string[] | null = null;
  if (Array.isArray(opp.skills_required)) {
    skills = opp.skills_required as string[];
  } else if (opp.skills_required !== null && opp.skills_required !== undefined) {
    skills = [String(opp.skills_required)];
  }

  const companyName =
    opp.user?.businessProfile?.company_name || opp.user?.name || null;

  return {
    id: opp.id,
    posted_by: opp.posted_by,
    type: opp.type,
    title: opp.title,
    description: opp.description,
    skills_required: skills,
    deadline: opp.deadline.toISOString(),
    status: opp.status,
    is_expired: isExpired,
    effective_status: effectiveStatus,
    company_name: companyName,
  };
};

export const listOpportunities = async (
  query: ListOpportunitiesQuery
): Promise<ListOpportunitiesResponse> => {
  const where: Prisma.OpportunityWhereInput = {};

  if (query.type) {
    where.type = query.type;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.deadline_from || query.deadline_to) {
    where.deadline = {};
    if (query.deadline_from) {
      where.deadline.gte = new Date(query.deadline_from);
    }
    if (query.deadline_to) {
      where.deadline.lte = new Date(query.deadline_to);
    }
  } else if (query.deadline) {
    const deadlineDate = new Date(query.deadline);
    if (query.deadline_operator === "lte") {
      where.deadline = { lte: deadlineDate };
    } else {
      where.deadline = { gte: deadlineDate };
    }
  }

  const andConditions: Prisma.OpportunityWhereInput[] = [];

  if (query.skill) {
    const trimmedSkill = query.skill.trim().toLowerCase();
    // In MySQL, JSON_CONTAINS is case-sensitive for string elements.
    // To support case-insensitive skill filtering safely without SQL injection,
    // we use Prisma.sql with a parameterized query for JSON_SEARCH on LOWER(skills_required).
    const matchedRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM Opportunity
      WHERE skills_required IS NOT NULL
        AND JSON_SEARCH(LOWER(skills_required), 'one', ${trimmedSkill}) IS NOT NULL
    `;
    const matchingIds = matchedRows.map((r) => r.id);
    where.id = { in: matchingIds };
  }

  if (query.q) {
    const trimmedQ = query.q.trim();
    andConditions.push({
      OR: [
        { title: { contains: trimmedQ } },
        { description: { contains: trimmedQ } },
      ],
    });
  }

  if (andConditions.length === 1) {
    const single = andConditions[0];
    if (single && single.OR) {
      where.OR = single.OR;
    }
  } else if (andConditions.length > 1) {
    where.AND = andConditions;
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const skip = (page - 1) * limit;

  const [total, opportunities] = await Promise.all([
    prisma.opportunity.count({ where }),
    prisma.opportunity.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ deadline: "asc" }, { id: "asc" }],
      include: {
        user: {
          select: {
            name: true,
            businessProfile: {
              select: { company_name: true },
            },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    opportunities: opportunities.map(formatOpportunity),
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

export const getOpportunityById = async (
  id: string
): Promise<SafeOpportunity> => {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          name: true,
          businessProfile: {
            select: { company_name: true },
          },
        },
      },
    },
  });

  if (!opportunity) {
    throw new AppError("Opportunity not found", 404);
  }

  return formatOpportunity(opportunity);
};

export const createOpportunity = async (
  userId: string,
  input: CreateOpportunityInput
): Promise<SafeOpportunity> => {
  const opportunity = await prisma.opportunity.create({
    data: {
      posted_by: userId,
      type: input.type,
      title: input.title,
      description: input.description,
      skills_required:
        input.skills_required === null || input.skills_required === undefined
          ? Prisma.DbNull
          : (input.skills_required as Prisma.InputJsonValue),
      deadline: new Date(input.deadline),
      status: OpportunityStatus.OPEN,
    },
    include: {
      user: {
        select: {
          name: true,
          businessProfile: {
            select: { company_name: true },
          },
        },
      },
    },
  });

  return formatOpportunity(opportunity);
};

export const updateOpportunity = async (
  opportunityId: string,
  userId: string,
  input: UpdateOpportunityInput
): Promise<SafeOpportunity> => {
  const existing = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });

  if (!existing) {
    throw new AppError("Opportunity not found", 404);
  }

  if (existing.posted_by !== userId) {
    throw new AppError("Access denied", 403);
  }

  const updateData: Prisma.OpportunityUpdateInput = {};

  if (input.type !== undefined) {
    updateData.type = input.type;
  }

  if (input.title !== undefined) {
    updateData.title = input.title;
  }

  if (input.description !== undefined) {
    updateData.description = input.description;
  }

  if (input.skills_required !== undefined) {
    updateData.skills_required =
      input.skills_required === null
        ? Prisma.DbNull
        : (input.skills_required as Prisma.InputJsonValue);
  }

  if (input.deadline !== undefined) {
    updateData.deadline = new Date(input.deadline);
  }

  const updated = await prisma.opportunity.update({
    where: { id: opportunityId },
    data: updateData,
    include: {
      user: {
        select: {
          name: true,
          businessProfile: {
            select: { company_name: true },
          },
        },
      },
    },
  });

  return formatOpportunity(updated);
};

export const closeOpportunity = async (
  opportunityId: string,
  userId: string
): Promise<SafeOpportunity> => {
  const existing = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: {
      user: {
        select: {
          name: true,
          businessProfile: {
            select: { company_name: true },
          },
        },
      },
    },
  });

  if (!existing) {
    throw new AppError("Opportunity not found", 404);
  }

  if (existing.posted_by !== userId) {
    throw new AppError("Access denied", 403);
  }

  if (existing.status === OpportunityStatus.CLOSED) {
    return formatOpportunity(existing);
  }

  const updated = await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      status: OpportunityStatus.CLOSED,
    },
    include: {
      user: {
        select: {
          name: true,
          businessProfile: {
            select: { company_name: true },
          },
        },
      },
    },
  });

  return formatOpportunity(updated);
};

export const deleteOpportunity = async (
  opportunityId: string,
  user: { id: string; role: Role }
): Promise<void> => {
  await prisma.$transaction(
    async (tx) => {
      // 1. Lock the opportunity row exclusively for update
      const lockedRows = await tx.$queryRaw<
        Array<{ id: string; posted_by: string }>
      >`SELECT id, posted_by FROM Opportunity WHERE id = ${opportunityId} FOR UPDATE`;

      if (lockedRows.length === 0) {
        throw new AppError("Opportunity not found", 404);
      }

      const opp = lockedRows[0];

      // 2. Authorization check: platform admin or owning business
      if (user.role !== Role.ADMIN && opp.posted_by !== user.id) {
        throw new AppError("Access denied", 403);
      }

      // 3. Atomically lock and check child Application records
      const lockedApps = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM Application WHERE opportunity_id = ${opportunityId} FOR UPDATE
      `;

      // 4. Atomically lock and check child CompetitionRegistration records
      const lockedRegs = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM CompetitionRegistration WHERE opportunity_id = ${opportunityId} FOR UPDATE
      `;

      // 5. If either has records, reject with 409 Conflict
      if (lockedApps.length > 0 || lockedRegs.length > 0) {
        throw new AppError(
          "Cannot delete opportunity with existing applications or registrations. Please close the opportunity instead.",
          409
        );
      }

      // 6. Safe to delete: relation counts are both zero and gaps are locked
      await tx.opportunity.delete({
        where: { id: opportunityId },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
};
