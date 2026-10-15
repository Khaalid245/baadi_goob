import request from "supertest";
import bcrypt from "bcryptjs";
import {
  Role,
  UserStatus,
  OpportunityType,
  OpportunityStatus,
  VerificationStatus,
} from "@prisma/client";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { generateToken } from "../src/common/jwt";
import {
  listOpportunitiesQuerySchema,
  opportunityIdParamSchema,
  createOpportunitySchema,
  updateOpportunitySchema,
} from "../src/validations/opportunity.validation";

describe("Opportunity Module Validation Schemas (Unit)", () => {
  describe("listOpportunitiesQuerySchema", () => {
    it("should accept empty query and supply default page and limit", () => {
      const result = listOpportunitiesQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
        expect(result.data.deadline_operator).toBe("gte");
      }
    });

    it("should accept valid query inputs and normalize type to uppercase", () => {
      const valid = {
        type: "internship",
        skill: "React",
        deadline: "2026-12-31T23:59:59.000Z",
        deadline_operator: "lte",
        q: "AI",
        status: "open",
        page: "2",
        limit: "20",
      };
      const result = listOpportunitiesQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe(OpportunityType.INTERNSHIP);
        expect(result.data.skill).toBe("React");
        expect(result.data.deadline).toBe("2026-12-31T23:59:59.000Z");
        expect(result.data.deadline_operator).toBe("lte");
        expect(result.data.q).toBe("AI");
        expect(result.data.status).toBe(OpportunityStatus.OPEN);
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(20);
      }
    });

    it("should reject invalid opportunity type", () => {
      const result = listOpportunitiesQuerySchema.safeParse({
        type: "VOLUNTEER",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Type must be one of: INTERNSHIP, JOB, COMPETITION"
        );
      }
    });

    it("should reject invalid deadline strings", () => {
      const result = listOpportunitiesQuerySchema.safeParse({
        deadline: "not-a-valid-date",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Deadline must be a valid date or datetime string"
        );
      }
    });

    it("should reject negative or zero page", () => {
      const zeroPage = listOpportunitiesQuerySchema.safeParse({ page: 0 });
      expect(zeroPage.success).toBe(false);

      const negativePage = listOpportunitiesQuerySchema.safeParse({ page: -1 });
      expect(negativePage.success).toBe(false);
    });

    it("should reject limit exceeding 100", () => {
      const tooLarge = listOpportunitiesQuerySchema.safeParse({ limit: 101 });
      expect(tooLarge.success).toBe(false);
      if (!tooLarge.success) {
        expect(tooLarge.error.issues[0]?.message).toBe(
          "Limit cannot exceed 100"
        );
      }
    });

    it("should reject unknown query fields in strict mode", () => {
      const result = listOpportunitiesQuerySchema.safeParse({
        unexpectedParam: "malicious",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("opportunityIdParamSchema", () => {
    it("should accept non-empty id", () => {
      const result = opportunityIdParamSchema.safeParse({
        id: "a5204482-140b-4171-aa30-e85d9da63645",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty id", () => {
      const result = opportunityIdParamSchema.safeParse({ id: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("createOpportunitySchema", () => {
    const futureDate = new Date(Date.now() + 86400000 * 30).toISOString();

    it("should accept valid opportunity input", () => {
      const valid = {
        type: "INTERNSHIP",
        title: "Frontend Engineering Intern",
        description: "Join our UI team to build modern interfaces with React.",
        skills_required: ["React", "TypeScript", "CSS"],
        deadline: futureDate,
      };
      const result = createOpportunitySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should accept valid input with omitted skills_required", () => {
      const valid = {
        type: "JOB",
        title: "General Developer",
        description: "Open role for software developers in Mogadishu.",
        deadline: futureDate,
      };
      const result = createOpportunitySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should reject missing required fields", () => {
      const missingTitle = createOpportunitySchema.safeParse({
        type: "JOB",
        description: "Some description here that is long enough.",
        deadline: futureDate,
      });
      expect(missingTitle.success).toBe(false);

      const missingType = createOpportunitySchema.safeParse({
        title: "Title Here",
        description: "Some description here that is long enough.",
        deadline: futureDate,
      });
      expect(missingType.success).toBe(false);

      const missingDeadline = createOpportunitySchema.safeParse({
        type: "JOB",
        title: "Title Here",
        description: "Some description here that is long enough.",
      });
      expect(missingDeadline.success).toBe(false);
    });

    it("should reject invalid enum type", () => {
      const result = createOpportunitySchema.safeParse({
        type: "FREELANCE",
        title: "Valid Title",
        description: "Valid description here that is long enough.",
        deadline: futureDate,
      });
      expect(result.success).toBe(false);
    });

    it("should reject short title or description", () => {
      const shortTitle = createOpportunitySchema.safeParse({
        type: "JOB",
        title: "AB",
        description: "Valid description here that is long enough.",
        deadline: futureDate,
      });
      expect(shortTitle.success).toBe(false);

      const shortDesc = createOpportunitySchema.safeParse({
        type: "JOB",
        title: "Valid Title",
        description: "Too short",
        deadline: futureDate,
      });
      expect(shortDesc.success).toBe(false);
    });

    it("should reject deadline in the past", () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const result = createOpportunitySchema.safeParse({
        type: "JOB",
        title: "Valid Title",
        description: "Valid description here that is long enough.",
        deadline: pastDate,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Deadline must be in the future"
        );
      }
    });

    it("should reject unknown or forged properties (id, posted_by, status)", () => {
      const result = createOpportunitySchema.safeParse({
        type: "JOB",
        title: "Valid Title",
        description: "Valid description here that is long enough.",
        deadline: futureDate,
        posted_by: "forged-user-id",
        status: "CLOSED",
        id: "forged-id",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateOpportunitySchema", () => {
    const futureDate = new Date(Date.now() + 86400000 * 30).toISOString();

    it("should accept valid partial update with only title", () => {
      const result = updateOpportunitySchema.safeParse({
        title: "Updated Senior AI Engineer",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid update with multiple fields", () => {
      const result = updateOpportunitySchema.safeParse({
        type: "JOB",
        title: "Staff Machine Learning Engineer",
        description: "Leading model deployment and architecture at scale.",
        skills_required: ["Python", "PyTorch", "Kubernetes"],
        deadline: futureDate,
      });
      expect(result.success).toBe(true);
    });

    it("should accept null skills_required to clear skills", () => {
      const result = updateOpportunitySchema.safeParse({
        skills_required: null,
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid enum type", () => {
      const result = updateOpportunitySchema.safeParse({
        type: "CONTRACTOR",
      });
      expect(result.success).toBe(false);
    });

    it("should reject short title or short description", () => {
      const shortTitle = updateOpportunitySchema.safeParse({ title: "AB" });
      expect(shortTitle.success).toBe(false);

      const shortDesc = updateOpportunitySchema.safeParse({
        description: "Short",
      });
      expect(shortDesc.success).toBe(false);
    });

    it("should reject deadline in the past or present", () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const resultPast = updateOpportunitySchema.safeParse({
        deadline: pastDate,
      });
      expect(resultPast.success).toBe(false);

      const nowDeadline = new Date(Date.now()).toISOString();
      const resultNow = updateOpportunitySchema.safeParse({
        deadline: nowDeadline,
      });
      expect(resultNow.success).toBe(false);
    });

    it("should reject forged properties (id, posted_by, status)", () => {
      const result = updateOpportunitySchema.safeParse({
        title: "Updated Title",
        posted_by: "another-owner-id",
        status: "CLOSED",
        id: "custom-id",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Opportunity Module HTTP Endpoints (Integration)", () => {
  const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const createdUserIds = new Set<string>();
  const createdOpportunityIds = new Set<string>();

  let businessUserId: string;
  let oppInternshipAI: { id: string; title: string; skills_required: string[] };
  let oppJobQA: { id: string; title: string; skills_required: string[] };
  let oppCompetition: { id: string; title: string; skills_required: string[] };
  let oppExpired: { id: string; title: string; deadline: Date };
  let oppClosed: { id: string; title: string; status: OpportunityStatus };

  beforeAll(async () => {
    // Create business user with BusinessProfile
    const email = `opp_business_${runId}@test.local`.toLowerCase();
    const password_hash = await bcrypt.hash("Password123!", 10);

    const user = await prisma.user.create({
      data: {
        name: "Test Business User",
        email,
        password_hash,
        role: Role.BUSINESS,
        status: UserStatus.ACTIVE,
        businessProfile: {
          create: {
            company_name: "Somali Tech Hub",
          },
        },
      },
    });

    businessUserId = user.id;
    createdUserIds.add(user.id);

    // 1. Internship with AI keyword in title and skills
    const opp1 = await prisma.opportunity.create({
      data: {
        posted_by: businessUserId,
        type: OpportunityType.INTERNSHIP,
        title: "AI Research Assistant",
        description: "Join our machine learning team to train neural networks and LLMs.",
        skills_required: ["Python", "AI", "PyTorch"],
        deadline: new Date("2026-12-01T12:00:00.000Z"),
        status: OpportunityStatus.OPEN,
      },
    });
    oppInternshipAI = {
      id: opp1.id,
      title: opp1.title,
      skills_required: ["Python", "AI", "PyTorch"],
    };
    createdOpportunityIds.add(opp1.id);

    // 2. Job with QA keyword in description and skills
    const opp2 = await prisma.opportunity.create({
      data: {
        posted_by: businessUserId,
        type: OpportunityType.JOB,
        title: "Software Test Engineer",
        description: "We are hiring for QA automation and test verification.",
        skills_required: ["TypeScript", "QA", "Jest"],
        deadline: new Date("2026-11-15T12:00:00.000Z"),
        status: OpportunityStatus.OPEN,
      },
    });
    oppJobQA = {
      id: opp2.id,
      title: opp2.title,
      skills_required: ["TypeScript", "QA", "Jest"],
    };
    createdOpportunityIds.add(opp2.id);

    // 3. Competition opportunity
    const opp3 = await prisma.opportunity.create({
      data: {
        posted_by: businessUserId,
        type: OpportunityType.COMPETITION,
        title: "National Hackathon 2026",
        description: "Compete in Mogadishu annual software innovation challenge.",
        skills_required: ["Node.js", "React"],
        deadline: new Date("2026-12-20T12:00:00.000Z"),
        status: OpportunityStatus.OPEN,
      },
    });
    oppCompetition = {
      id: opp3.id,
      title: opp3.title,
      skills_required: ["Node.js", "React"],
    };
    createdOpportunityIds.add(opp3.id);

    // 4. Expired opportunity (deadline in the past)
    const opp4 = await prisma.opportunity.create({
      data: {
        posted_by: businessUserId,
        type: OpportunityType.INTERNSHIP,
        title: "Expired Summer Internship",
        description: "Old listing whose deadline has elapsed.",
        skills_required: ["HTML", "CSS"],
        deadline: new Date("2020-01-01T00:00:00.000Z"),
        status: OpportunityStatus.OPEN,
      },
    });
    oppExpired = {
      id: opp4.id,
      title: opp4.title,
      deadline: opp4.deadline,
    };
    createdOpportunityIds.add(opp4.id);

    // 5. Closed opportunity (explicit status CLOSED)
    const opp5 = await prisma.opportunity.create({
      data: {
        posted_by: businessUserId,
        type: OpportunityType.JOB,
        title: "Closed Backend Developer",
        description: "Listing that was manually closed by the owner.",
        skills_required: ["Go", "Docker"],
        deadline: new Date("2026-12-31T23:59:59.000Z"),
        status: OpportunityStatus.CLOSED,
      },
    });
    oppClosed = {
      id: opp5.id,
      title: opp5.title,
      status: opp5.status,
    };
    createdOpportunityIds.add(opp5.id);
  });

  afterAll(async () => {
    if (createdOpportunityIds.size > 0) {
      try {
        await prisma.opportunity.deleteMany({
          where: { id: { in: Array.from(createdOpportunityIds) } },
        });
      } catch {
        // Ignored during cleanup
      }
    }
    if (createdUserIds.size > 0) {
      try {
        await prisma.user.deleteMany({
          where: { id: { in: Array.from(createdUserIds) } },
        });
      } catch {
        // Ignored during cleanup
      }
    }
    await prisma.$disconnect();
  });

  describe("GET /api/v1/opportunities - Listing & Pagination", () => {
    it("should list opportunities with pagination metadata without requiring authentication", async () => {
      const res = await request(app).get("/api/v1/opportunities");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("opportunities");
      expect(Array.isArray(res.body.opportunities)).toBe(true);
      expect(res.body.opportunities.length).toBeGreaterThanOrEqual(5);

      expect(res.body).toHaveProperty("pagination");
      expect(res.body.pagination).toHaveProperty("total");
      expect(res.body.pagination).toHaveProperty("page", 1);
      expect(res.body.pagination).toHaveProperty("limit", 10);
      expect(res.body.pagination).toHaveProperty("totalPages");
      expect(res.body.pagination).toHaveProperty("hasNextPage");
      expect(res.body.pagination).toHaveProperty("hasPrevPage", false);

      // Verify backwards-compatible top-level properties
      expect(res.body.total).toBe(res.body.pagination.total);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
    });

    it("should paginate correctly with custom page and limit", async () => {
      const page1Res = await request(app)
        .get("/api/v1/opportunities")
        .query({ page: 1, limit: 2 });

      expect(page1Res.status).toBe(200);
      expect(page1Res.body.opportunities.length).toBe(2);
      expect(page1Res.body.pagination.page).toBe(1);
      expect(page1Res.body.pagination.limit).toBe(2);
      expect(page1Res.body.pagination.hasNextPage).toBe(true);

      const page2Res = await request(app)
        .get("/api/v1/opportunities")
        .query({ page: 2, limit: 2 });

      expect(page2Res.status).toBe(200);
      expect(page2Res.body.opportunities.length).toBe(2);
      expect(page2Res.body.pagination.page).toBe(2);
      expect(page2Res.body.pagination.hasPrevPage).toBe(true);

      // Verify that page 1 and page 2 items are different
      const idPage1 = page1Res.body.opportunities.map(
        (o: { id: string }) => o.id
      );
      const idPage2 = page2Res.body.opportunities.map(
        (o: { id: string }) => o.id
      );
      expect(idPage1.some((id: string) => idPage2.includes(id))).toBe(false);
    });
  });

  describe("GET /api/v1/opportunities - Filtering by Type, Skill, and Deadline", () => {
    it("should filter opportunities by type INTERNSHIP", async () => {
      const res = await request(app)
        .get("/api/v1/opportunities")
        .query({ type: "INTERNSHIP" });

      expect(res.status).toBe(200);
      expect(res.body.opportunities.length).toBeGreaterThanOrEqual(1);
      res.body.opportunities.forEach((opp: { type: string }) => {
        expect(opp.type).toBe("INTERNSHIP");
      });
      const ids = res.body.opportunities.map((o: { id: string }) => o.id);
      expect(ids).toContain(oppInternshipAI.id);
    });

    it("should normalize lowercase type parameter (e.g. type=job)", async () => {
      const res = await request(app)
        .get("/api/v1/opportunities")
        .query({ type: "job" });

      expect(res.status).toBe(200);
      expect(res.body.opportunities.length).toBeGreaterThanOrEqual(1);
      res.body.opportunities.forEach((opp: { type: string }) => {
        expect(opp.type).toBe("JOB");
      });
      const ids = res.body.opportunities.map((o: { id: string }) => o.id);
      expect(ids).toContain(oppJobQA.id);
    });

    it("should filter opportunities by skill (exact case and case-insensitively)", async () => {
      const resExact = await request(app)
        .get("/api/v1/opportunities")
        .query({ skill: "PyTorch" });

      expect(resExact.status).toBe(200);
      const exactIds = resExact.body.opportunities.map(
        (o: { id: string }) => o.id
      );
      expect(exactIds).toContain(oppInternshipAI.id);

      // Test lowercase variant
      const resLower = await request(app)
        .get("/api/v1/opportunities")
        .query({ skill: "pytorch" });

      expect(resLower.status).toBe(200);
      const lowerIds = resLower.body.opportunities.map(
        (o: { id: string }) => o.id
      );
      expect(lowerIds).toContain(oppInternshipAI.id);
    });

    it("should return empty list when filtering by a non-existent skill", async () => {
      const res = await request(app)
        .get("/api/v1/opportunities")
        .query({ skill: "NonExistentSkillXYZ123" });

      expect(res.status).toBe(200);
      expect(res.body.opportunities.length).toBe(0);
      expect(res.body.pagination.total).toBe(0);
    });

    it("should filter by deadline using default gte operator (on or after date)", async () => {
      const res = await request(app)
        .get("/api/v1/opportunities")
        .query({ deadline: "2026-12-01T00:00:00.000Z" });

      expect(res.status).toBe(200);
      const ids = res.body.opportunities.map((o: { id: string }) => o.id);
      expect(ids).toContain(oppInternshipAI.id);
      expect(ids).toContain(oppCompetition.id);
      // oppExpired (2020) and oppJobQA (Nov 15, 2026) must not be returned
      expect(ids).not.toContain(oppExpired.id);
      expect(ids).not.toContain(oppJobQA.id);
    });

    it("should filter by deadline using lte operator (on or before date)", async () => {
      const res = await request(app)
        .get("/api/v1/opportunities")
        .query({
          deadline: "2026-11-20T00:00:00.000Z",
          deadline_operator: "lte",
        });

      expect(res.status).toBe(200);
      const ids = res.body.opportunities.map((o: { id: string }) => o.id);
      expect(ids).toContain(oppExpired.id);
      expect(ids).toContain(oppJobQA.id);
      expect(ids).not.toContain(oppInternshipAI.id);
    });

    it("should filter within date range using deadline_from and deadline_to", async () => {
      const res = await request(app)
        .get("/api/v1/opportunities")
        .query({
          deadline_from: "2026-11-01T00:00:00.000Z",
          deadline_to: "2026-11-30T23:59:59.000Z",
        });

      expect(res.status).toBe(200);
      const ids = res.body.opportunities.map((o: { id: string }) => o.id);
      expect(ids).toContain(oppJobQA.id);
      expect(ids).not.toContain(oppExpired.id);
      expect(ids).not.toContain(oppInternshipAI.id);
    });
  });

  describe("GET /api/v1/opportunities - Keyword Search (q)", () => {
    it("should match keyword in title", async () => {
      const res = await request(app)
        .get("/api/v1/opportunities")
        .query({ q: "Hackathon" });

      expect(res.status).toBe(200);
      const ids = res.body.opportunities.map((o: { id: string }) => o.id);
      expect(ids).toContain(oppCompetition.id);
    });

    it("should match keyword in description", async () => {
      const res = await request(app)
        .get("/api/v1/opportunities")
        .query({ q: "Mogadishu" });

      expect(res.status).toBe(200);
      const ids = res.body.opportunities.map((o: { id: string }) => o.id);
      expect(ids).toContain(oppCompetition.id);
    });

    it("should successfully search short keyword 'AI' in title and description", async () => {
      const res = await request(app)
        .get("/api/v1/opportunities")
        .query({ q: "AI" });

      expect(res.status).toBe(200);
      const ids = res.body.opportunities.map((o: { id: string }) => o.id);
      expect(ids).toContain(oppInternshipAI.id);
    });

    it("should successfully search short keyword 'QA' in title and description", async () => {
      const res = await request(app)
        .get("/api/v1/opportunities")
        .query({ q: "QA" });

      expect(res.status).toBe(200);
      const ids = res.body.opportunities.map((o: { id: string }) => o.id);
      expect(ids).toContain(oppJobQA.id);
    });

    it("should search case-insensitively (e.g. 'ai' and 'qa')", async () => {
      const resAI = await request(app)
        .get("/api/v1/opportunities")
        .query({ q: "ai" });
      expect(resAI.status).toBe(200);
      const aiIds = resAI.body.opportunities.map((o: { id: string }) => o.id);
      expect(aiIds).toContain(oppInternshipAI.id);

      const resQA = await request(app)
        .get("/api/v1/opportunities")
        .query({ q: "qa" });
      expect(resQA.status).toBe(200);
      const qaIds = resQA.body.opportunities.map((o: { id: string }) => o.id);
      expect(qaIds).toContain(oppJobQA.id);
    });
  });

  describe("GET /api/v1/opportunities - Expired & Closed Opportunities Handling", () => {
    it("should include expired and closed opportunities by default and clearly identify status", async () => {
      const res = await request(app).get("/api/v1/opportunities");

      expect(res.status).toBe(200);

      // Find expired opportunity in list
      const expiredOpp = res.body.opportunities.find(
        (o: { id: string }) => o.id === oppExpired.id
      );
      expect(expiredOpp).toBeDefined();
      expect(expiredOpp.is_expired).toBe(true);
      expect(expiredOpp.effective_status).toBe("EXPIRED");
      expect(expiredOpp.deadline).toBe(oppExpired.deadline.toISOString());

      // Find closed opportunity in list
      const closedOpp = res.body.opportunities.find(
        (o: { id: string }) => o.id === oppClosed.id
      );
      expect(closedOpp).toBeDefined();
      expect(closedOpp.status).toBe("CLOSED");
      expect(closedOpp.effective_status).toBe("CLOSED");

      // Find open active opportunity in list
      const openOpp = res.body.opportunities.find(
        (o: { id: string }) => o.id === oppInternshipAI.id
      );
      expect(openOpp).toBeDefined();
      expect(openOpp.status).toBe("OPEN");
      expect(openOpp.is_expired).toBe(false);
      expect(openOpp.effective_status).toBe("OPEN");
    });

    it("should allow filtering specifically by status=OPEN or status=CLOSED", async () => {
      const resClosed = await request(app)
        .get("/api/v1/opportunities")
        .query({ status: "CLOSED" });

      expect(resClosed.status).toBe(200);
      const idsClosed = resClosed.body.opportunities.map(
        (o: { id: string }) => o.id
      );
      expect(idsClosed).toContain(oppClosed.id);
      expect(idsClosed).not.toContain(oppInternshipAI.id);
    });
  });

  describe("GET /api/v1/opportunities/:id - Fetch Single Opportunity", () => {
    it("should return opportunity details with company name for a valid id", async () => {
      const res = await request(app).get(
        `/api/v1/opportunities/${oppInternshipAI.id}`
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("opportunity");
      const opp = res.body.opportunity;
      expect(opp.id).toBe(oppInternshipAI.id);
      expect(opp.title).toBe(oppInternshipAI.title);
      expect(opp.posted_by).toBe(businessUserId);
      expect(opp.company_name).toBe("Somali Tech Hub");
      expect(opp.skills_required).toEqual(oppInternshipAI.skills_required);
      expect(opp.status).toBe("OPEN");
      expect(opp.is_expired).toBe(false);
      expect(opp.effective_status).toBe("OPEN");
    });

    it("should return clear expired and closed flags when fetching by id", async () => {
      const resExpired = await request(app).get(
        `/api/v1/opportunities/${oppExpired.id}`
      );
      expect(resExpired.status).toBe(200);
      expect(resExpired.body.opportunity.is_expired).toBe(true);
      expect(resExpired.body.opportunity.effective_status).toBe("EXPIRED");

      const resClosed = await request(app).get(
        `/api/v1/opportunities/${oppClosed.id}`
      );
      expect(resClosed.status).toBe(200);
      expect(resClosed.body.opportunity.status).toBe("CLOSED");
      expect(resClosed.body.opportunity.effective_status).toBe("CLOSED");
    });

    it("should return standard 404 when opportunity id does not exist", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app).get(
        `/api/v1/opportunities/${nonExistentId}`
      );

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Opportunity not found" });
    });
  });

  describe("Invalid Query Parameters & Error Handling", () => {
    it("should return 400 when type is invalid", async () => {
      const res = await request(app)
        .get("/api/v1/opportunities")
        .query({ type: "UNKNOWN_TYPE" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain(
        "Type must be one of: INTERNSHIP, JOB, COMPETITION"
      );
    });

    it("should return 400 when page is less than 1 or not a number", async () => {
      const resNegative = await request(app)
        .get("/api/v1/opportunities")
        .query({ page: -5 });
      expect(resNegative.status).toBe(400);
      expect(resNegative.body.error).toBe("Page must be at least 1");

      const resNaN = await request(app)
        .get("/api/v1/opportunities")
        .query({ page: "not-a-number" });
      expect(resNaN.status).toBe(400);
      expect(resNaN.body.error).toBe("Page must be a valid number");
    });

    it("should return 400 when limit exceeds 100", async () => {
      const res = await request(app)
        .get("/api/v1/opportunities")
        .query({ limit: 150 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Limit cannot exceed 100");
    });

    it("should return 400 when deadline is an invalid date string", async () => {
      const res = await request(app)
        .get("/api/v1/opportunities")
        .query({ deadline: "invalid-date" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        "Deadline must be a valid date or datetime string"
      );
    });

    it("should return 400 when unknown query parameter is passed", async () => {
      const res = await request(app)
        .get("/api/v1/opportunities")
        .query({ injection: "select * from users" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("POST /api/v1/opportunities - Create Opportunity", () => {
    let studentToken: string;
    let adminToken: string;
    let businessNoProfileToken: string;
    let businessPendingToken: string;
    let businessRejectedToken: string;
    let businessVerifiedToken: string;
    let verifiedBusinessUser: { id: string };

    const validPayload = {
      type: "INTERNSHIP",
      title: "Mobile App Developer Intern",
      description: "Build innovative cross-platform applications using React Native.",
      skills_required: ["React Native", "TypeScript", "Mobile"],
      deadline: new Date(Date.now() + 86400000 * 20).toISOString(),
    };

    beforeAll(async () => {
      // 1. Student User
      const student = await prisma.user.create({
        data: {
          name: "Student Tester",
          email: `student_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase(),
          password_hash: await bcrypt.hash("Password123!", 10),
          role: Role.STUDENT,
        },
      });
      createdUserIds.add(student.id);
      studentToken = generateToken({ id: student.id, email: student.email, role: student.role });

      // 2. Admin User
      const admin = await prisma.user.create({
        data: {
          name: "Admin Tester",
          email: `admin_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase(),
          password_hash: await bcrypt.hash("Password123!", 10),
          role: Role.ADMIN,
        },
      });
      createdUserIds.add(admin.id);
      adminToken = generateToken({ id: admin.id, email: admin.email, role: admin.role });

      // 3. Business User WITHOUT profile
      const bizNoProfile = await prisma.user.create({
        data: {
          name: "Biz No Profile",
          email: `biz_noprof_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase(),
          password_hash: await bcrypt.hash("Password123!", 10),
          role: Role.BUSINESS,
        },
      });
      createdUserIds.add(bizNoProfile.id);
      businessNoProfileToken = generateToken({ id: bizNoProfile.id, email: bizNoProfile.email, role: bizNoProfile.role });

      // 4. Business User with PENDING profile
      const bizPending = await prisma.user.create({
        data: {
          name: "Biz Pending",
          email: `biz_pend_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase(),
          password_hash: await bcrypt.hash("Password123!", 10),
          role: Role.BUSINESS,
          businessProfile: {
            create: {
              company_name: "Pending Tech Inc",
              verification_status: VerificationStatus.PENDING,
            },
          },
        },
      });
      createdUserIds.add(bizPending.id);
      businessPendingToken = generateToken({ id: bizPending.id, email: bizPending.email, role: bizPending.role });

      // 5. Business User with REJECTED profile
      const bizRejected = await prisma.user.create({
        data: {
          name: "Biz Rejected",
          email: `biz_rej_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase(),
          password_hash: await bcrypt.hash("Password123!", 10),
          role: Role.BUSINESS,
          businessProfile: {
            create: {
              company_name: "Rejected Co",
              verification_status: VerificationStatus.REJECTED,
            },
          },
        },
      });
      createdUserIds.add(bizRejected.id);
      businessRejectedToken = generateToken({ id: bizRejected.id, email: bizRejected.email, role: bizRejected.role });

      // 6. Business User with VERIFIED profile
      const bizVerified = await prisma.user.create({
        data: {
          name: "Biz Verified",
          email: `biz_ver_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase(),
          password_hash: await bcrypt.hash("Password123!", 10),
          role: Role.BUSINESS,
          businessProfile: {
            create: {
              company_name: "Verified Innovations Ltd",
              verification_status: VerificationStatus.VERIFIED,
            },
          },
        },
      });
      createdUserIds.add(bizVerified.id);
      verifiedBusinessUser = { id: bizVerified.id };
      businessVerifiedToken = generateToken({ id: bizVerified.id, email: bizVerified.email, role: bizVerified.role });
    });

    it("should return 401 when request is unauthenticated", async () => {
      const res = await request(app)
        .post("/api/v1/opportunities")
        .send(validPayload);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Authentication token is required" });
    });

    it("should return 403 when called by a student", async () => {
      const res = await request(app)
        .post("/api/v1/opportunities")
        .set("Authorization", `Bearer ${studentToken}`)
        .send(validPayload);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied" });
    });

    it("should return 403 when called by an administrator", async () => {
      const res = await request(app)
        .post("/api/v1/opportunities")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validPayload);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied" });
    });

    it("should return 403 with helpful message when business has not created a BusinessProfile", async () => {
      const res = await request(app)
        .post("/api/v1/opportunities")
        .set("Authorization", `Bearer ${businessNoProfileToken}`)
        .send(validPayload);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain(
        "Company profile must be completed before posting opportunities"
      );
    });

    it("should return 403 when business verification status is PENDING", async () => {
      const res = await request(app)
        .post("/api/v1/opportunities")
        .set("Authorization", `Bearer ${businessPendingToken}`)
        .send(validPayload);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain("Business verification is pending");
    });

    it("should return 403 when business verification status is REJECTED", async () => {
      const res = await request(app)
        .post("/api/v1/opportunities")
        .set("Authorization", `Bearer ${businessRejectedToken}`)
        .send(validPayload);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain("Business verification was rejected");
    });

    it("should allow a VERIFIED business to create an opportunity and persist it correctly", async () => {
      const res = await request(app)
        .post("/api/v1/opportunities")
        .set("Authorization", `Bearer ${businessVerifiedToken}`)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty(
        "message",
        "Opportunity created successfully"
      );
      expect(res.body).toHaveProperty("opportunity");

      const opp = res.body.opportunity;
      createdOpportunityIds.add(opp.id);

      expect(opp.posted_by).toBe(verifiedBusinessUser.id);
      expect(opp.type).toBe("INTERNSHIP");
      expect(opp.title).toBe(validPayload.title);
      expect(opp.description).toBe(validPayload.description);
      expect(opp.skills_required).toEqual(validPayload.skills_required);
      expect(opp.status).toBe("OPEN");
      expect(opp.is_expired).toBe(false);
      expect(opp.effective_status).toBe("OPEN");
      expect(opp.company_name).toBe("Verified Innovations Ltd");

      // Verify DB persistence
      const dbRecord = await prisma.opportunity.findUnique({
        where: { id: opp.id },
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.posted_by).toBe(verifiedBusinessUser.id);
      expect(dbRecord?.title).toBe(validPayload.title);

      // Verify GET /api/v1/opportunities/:id returns the created opportunity
      const getRes = await request(app).get(`/api/v1/opportunities/${opp.id}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.opportunity.id).toBe(opp.id);
      expect(getRes.body.opportunity.title).toBe(validPayload.title);
    });

    it("should reject invalid type with 400 Bad Request", async () => {
      const res = await request(app)
        .post("/api/v1/opportunities")
        .set("Authorization", `Bearer ${businessVerifiedToken}`)
        .send({
          ...validPayload,
          type: "INVALID_TYPE",
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain(
        "Type must be one of: INTERNSHIP, JOB, COMPETITION"
      );
    });

    it("should reject missing required fields with 400 Bad Request", async () => {
      const resMissingTitle = await request(app)
        .post("/api/v1/opportunities")
        .set("Authorization", `Bearer ${businessVerifiedToken}`)
        .send({
          type: "JOB",
          description: "A description that is sufficiently long.",
          deadline: validPayload.deadline,
        });

      expect(resMissingTitle.status).toBe(400);
      expect(resMissingTitle.body).toHaveProperty("error");

      const resMissingDeadline = await request(app)
        .post("/api/v1/opportunities")
        .set("Authorization", `Bearer ${businessVerifiedToken}`)
        .send({
          type: "JOB",
          title: "Title Here",
          description: "A description that is sufficiently long.",
        });

      expect(resMissingDeadline.status).toBe(400);
      expect(resMissingDeadline.body).toHaveProperty("error");
    });

    it("should reject deadline in the past with 400 Bad Request", async () => {
      const pastDeadline = new Date(Date.now() - 3600000).toISOString();
      const res = await request(app)
        .post("/api/v1/opportunities")
        .set("Authorization", `Bearer ${businessVerifiedToken}`)
        .send({
          ...validPayload,
          deadline: pastDeadline,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Deadline must be in the future");
    });

    it("should reject deadline equal to current time with 400 Bad Request", async () => {
      const nowDeadline = new Date(Date.now()).toISOString();
      const res = await request(app)
        .post("/api/v1/opportunities")
        .set("Authorization", `Bearer ${businessVerifiedToken}`)
        .send({
          ...validPayload,
          deadline: nowDeadline,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Deadline must be in the future");
    });

    it("should reject forged posted_by, status, or id fields with 400 Bad Request", async () => {
      const res = await request(app)
        .post("/api/v1/opportunities")
        .set("Authorization", `Bearer ${businessVerifiedToken}`)
        .send({
          ...validPayload,
          posted_by: "victim-user-id",
          status: "CLOSED",
          id: "custom-id-value",
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("PUT /api/v1/opportunities/:id - Edit Opportunity", () => {
    let ownerToken: string;
    let otherBusinessToken: string;
    let studentToken: string;
    let adminToken: string;
    let targetOpportunity: { id: string; posted_by: string; title: string };

    const updatePayload = {
      title: "Updated Senior AI Researcher",
      description: "Advanced model training with PyTorch and distributed clusters.",
      skills_required: ["PyTorch", "CUDA", "Python"],
      type: "JOB",
      deadline: new Date(Date.now() + 86400000 * 45).toISOString(),
    };

    beforeAll(async () => {
      // 1. Owner Business User
      const ownerUser = await prisma.user.create({
        data: {
          name: "Owner Biz",
          email: `owner_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase(),
          password_hash: await bcrypt.hash("Password123!", 10),
          role: Role.BUSINESS,
          businessProfile: {
            create: {
              company_name: "Original Owner Corp",
              verification_status: VerificationStatus.VERIFIED,
            },
          },
        },
      });
      createdUserIds.add(ownerUser.id);
      ownerToken = generateToken({
        id: ownerUser.id,
        email: ownerUser.email,
        role: ownerUser.role,
      });

      // 2. Other Business User
      const otherUser = await prisma.user.create({
        data: {
          name: "Other Biz",
          email: `other_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase(),
          password_hash: await bcrypt.hash("Password123!", 10),
          role: Role.BUSINESS,
          businessProfile: {
            create: {
              company_name: "Competitor Co",
              verification_status: VerificationStatus.VERIFIED,
            },
          },
        },
      });
      createdUserIds.add(otherUser.id);
      otherBusinessToken = generateToken({
        id: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
      });

      // 3. Student User
      const student = await prisma.user.create({
        data: {
          name: "Student Updater",
          email: `student_up_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase(),
          password_hash: await bcrypt.hash("Password123!", 10),
          role: Role.STUDENT,
        },
      });
      createdUserIds.add(student.id);
      studentToken = generateToken({
        id: student.id,
        email: student.email,
        role: student.role,
      });

      // 4. Admin User
      const admin = await prisma.user.create({
        data: {
          name: "Admin Updater",
          email: `admin_up_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase(),
          password_hash: await bcrypt.hash("Password123!", 10),
          role: Role.ADMIN,
        },
      });
      createdUserIds.add(admin.id);
      adminToken = generateToken({
        id: admin.id,
        email: admin.email,
        role: admin.role,
      });

      // 5. Target Opportunity created by ownerUser
      const opp = await prisma.opportunity.create({
        data: {
          posted_by: ownerUser.id,
          type: OpportunityType.INTERNSHIP,
          title: "Initial AI Research Intern",
          description: "Initial description that is long enough.",
          skills_required: ["Python"],
          deadline: new Date(Date.now() + 86400000 * 15),
          status: OpportunityStatus.OPEN,
        },
      });
      createdOpportunityIds.add(opp.id);
      targetOpportunity = {
        id: opp.id,
        posted_by: ownerUser.id,
        title: opp.title,
      };
    });

    it("should return 401 when request is unauthenticated", async () => {
      const res = await request(app)
        .put(`/api/v1/opportunities/${targetOpportunity.id}`)
        .send(updatePayload);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Authentication token is required" });
    });

    it("should return 403 when called by a student", async () => {
      const res = await request(app)
        .put(`/api/v1/opportunities/${targetOpportunity.id}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send(updatePayload);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied" });
    });

    it("should return 403 when called by an administrator", async () => {
      const res = await request(app)
        .put(`/api/v1/opportunities/${targetOpportunity.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updatePayload);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied" });
    });

    it("should return 404 when opportunity does not exist", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app)
        .put(`/api/v1/opportunities/${nonExistentId}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send(updatePayload);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Opportunity not found" });
    });

    it("should return 403 when another business attempts to update the opportunity", async () => {
      const res = await request(app)
        .put(`/api/v1/opportunities/${targetOpportunity.id}`)
        .set("Authorization", `Bearer ${otherBusinessToken}`)
        .send(updatePayload);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied" });
    });

    it("should allow the owner business to update the opportunity and return updated data", async () => {
      const res = await request(app)
        .put(`/api/v1/opportunities/${targetOpportunity.id}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty(
        "message",
        "Opportunity updated successfully"
      );
      expect(res.body).toHaveProperty("opportunity");

      const opp = res.body.opportunity;
      expect(opp.id).toBe(targetOpportunity.id);
      expect(opp.posted_by).toBe(targetOpportunity.posted_by);
      expect(opp.title).toBe(updatePayload.title);
      expect(opp.description).toBe(updatePayload.description);
      expect(opp.skills_required).toEqual(updatePayload.skills_required);
      expect(opp.type).toBe(updatePayload.type);
      expect(opp.deadline).toBe(updatePayload.deadline);

      // Verify DB persistence
      const dbOpp = await prisma.opportunity.findUnique({
        where: { id: targetOpportunity.id },
      });
      expect(dbOpp).not.toBeNull();
      expect(dbOpp?.title).toBe(updatePayload.title);
      expect(dbOpp?.type).toBe(updatePayload.type);
      expect(dbOpp?.posted_by).toBe(targetOpportunity.posted_by);
    });

    it("should preserve omitted fields on partial update", async () => {
      const partialPayload = {
        title: "Partially Updated Title Only",
      };

      const res = await request(app)
        .put(`/api/v1/opportunities/${targetOpportunity.id}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send(partialPayload);

      expect(res.status).toBe(200);
      expect(res.body.opportunity.title).toBe(partialPayload.title);
      // All other fields from the previous test must remain preserved!
      expect(res.body.opportunity.description).toBe(updatePayload.description);
      expect(res.body.opportunity.skills_required).toEqual(
        updatePayload.skills_required
      );
      expect(res.body.opportunity.type).toBe(updatePayload.type);
      expect(res.body.opportunity.deadline).toBe(updatePayload.deadline);
      expect(res.body.opportunity.posted_by).toBe(targetOpportunity.posted_by);
      expect(res.body.opportunity.status).toBe("OPEN");
    });

    it("should reject invalid field values with 400 Bad Request", async () => {
      const resInvalidType = await request(app)
        .put(`/api/v1/opportunities/${targetOpportunity.id}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ type: "INVALID_TYPE" });

      expect(resInvalidType.status).toBe(400);
      expect(resInvalidType.body).toHaveProperty("error");

      const resShortTitle = await request(app)
        .put(`/api/v1/opportunities/${targetOpportunity.id}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ title: "AB" });

      expect(resShortTitle.status).toBe(400);
      expect(resShortTitle.body).toHaveProperty("error");
    });

    it("should reject forged ownership or status fields with 400 Bad Request", async () => {
      const res = await request(app)
        .put(`/api/v1/opportunities/${targetOpportunity.id}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          title: "Forged Title Attempt",
          posted_by: "new-forged-owner",
          status: "CLOSED",
          id: "new-id",
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should reject deadline in the past with 400 Bad Request", async () => {
      const pastDeadline = new Date(Date.now() - 3600000).toISOString();
      const res = await request(app)
        .put(`/api/v1/opportunities/${targetOpportunity.id}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ deadline: pastDeadline });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Deadline must be in the future");
    });

    it("should reject deadline equal to current time with 400 Bad Request", async () => {
      const nowDeadline = new Date(Date.now()).toISOString();
      const res = await request(app)
        .put(`/api/v1/opportunities/${targetOpportunity.id}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ deadline: nowDeadline });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Deadline must be in the future");
    });
  });

  describe("POST /api/v1/opportunities/:id/close - Close Opportunity", () => {
    let ownerToken: string;
    let ownerUserId: string;
    let otherBusinessToken: string;
    let studentToken: string;
    let studentUserId: string;
    let adminToken: string;
    let targetOpportunity: {
      id: string;
      posted_by: string;
      title: string;
      description: string;
      skills_required: string[];
      type: OpportunityType;
      deadline: string;
    };
    let testApplicationId: string;
    let testRegistrationId: string;

    beforeAll(async () => {
      // 1. Owner Business User
      const ownerUser = await prisma.user.create({
        data: {
          name: "Close Test Owner Biz",
          email: `close_owner_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase(),
          password_hash: await bcrypt.hash("Password123!", 10),
          role: Role.BUSINESS,
          businessProfile: {
            create: {
              company_name: "Close Owner Corp",
              verification_status: VerificationStatus.VERIFIED,
            },
          },
        },
      });
      createdUserIds.add(ownerUser.id);
      ownerUserId = ownerUser.id;
      ownerToken = generateToken({
        id: ownerUser.id,
        email: ownerUser.email,
        role: ownerUser.role,
      });

      // 2. Other Business User
      const otherUser = await prisma.user.create({
        data: {
          name: "Close Other Biz",
          email: `close_other_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase(),
          password_hash: await bcrypt.hash("Password123!", 10),
          role: Role.BUSINESS,
          businessProfile: {
            create: {
              company_name: "Close Other Corp",
              verification_status: VerificationStatus.VERIFIED,
            },
          },
        },
      });
      createdUserIds.add(otherUser.id);
      otherBusinessToken = generateToken({
        id: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
      });

      // 3. Student User
      const student = await prisma.user.create({
        data: {
          name: "Close Test Student",
          email: `close_student_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase(),
          password_hash: await bcrypt.hash("Password123!", 10),
          role: Role.STUDENT,
        },
      });
      createdUserIds.add(student.id);
      studentUserId = student.id;
      studentToken = generateToken({
        id: student.id,
        email: student.email,
        role: student.role,
      });

      // 4. Admin User
      const admin = await prisma.user.create({
        data: {
          name: "Close Test Admin",
          email: `close_admin_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase(),
          password_hash: await bcrypt.hash("Password123!", 10),
          role: Role.ADMIN,
        },
      });
      createdUserIds.add(admin.id);
      adminToken = generateToken({
        id: admin.id,
        email: admin.email,
        role: admin.role,
      });

      // 5. Target Open Opportunity
      const deadlineDate = new Date(Date.now() + 86400000 * 20);
      const opp = await prisma.opportunity.create({
        data: {
          posted_by: ownerUserId,
          type: OpportunityType.COMPETITION,
          title: "Hackathon Competition for Closing Test",
          description: "Building next-generation open solutions in East Africa.",
          skills_required: ["TypeScript", "Next.js", "Docker"],
          deadline: deadlineDate,
          status: OpportunityStatus.OPEN,
        },
      });
      createdOpportunityIds.add(opp.id);
      targetOpportunity = {
        id: opp.id,
        posted_by: opp.posted_by,
        title: opp.title,
        description: opp.description,
        skills_required: ["TypeScript", "Next.js", "Docker"],
        type: opp.type,
        deadline: opp.deadline.toISOString(),
      };

      // 6. Related Application and Competition Registration to verify they are not deleted
      const appRecord = await prisma.application.create({
        data: {
          student_id: studentUserId,
          opportunity_id: opp.id,
        },
      });
      testApplicationId = appRecord.id;

      const regRecord = await prisma.competitionRegistration.create({
        data: {
          student_id: studentUserId,
          opportunity_id: opp.id,
        },
      });
      testRegistrationId = regRecord.id;
    });

    it("should return 401 when request is unauthenticated", async () => {
      const res = await request(app).post(
        `/api/v1/opportunities/${targetOpportunity.id}/close`
      );

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Authentication token is required" });
    });

    it("should return 403 when called by a student", async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${targetOpportunity.id}/close`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied" });
    });

    it("should return 403 when called by an administrator", async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${targetOpportunity.id}/close`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied" });
    });

    it("should return 404 when opportunity does not exist", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app)
        .post(`/api/v1/opportunities/${nonExistentId}/close`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Opportunity not found" });
    });

    it("should return 403 when another business attempts to close the opportunity", async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${targetOpportunity.id}/close`)
        .set("Authorization", `Bearer ${otherBusinessToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied" });
    });

    it("should allow the owner business to close an open opportunity and return formatted opportunity", async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${targetOpportunity.id}/close`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty(
        "message",
        "Opportunity closed successfully"
      );
      expect(res.body).toHaveProperty("opportunity");

      const opp = res.body.opportunity;
      expect(opp.id).toBe(targetOpportunity.id);
      expect(opp.posted_by).toBe(targetOpportunity.posted_by);
      expect(opp.status).toBe("CLOSED");
      expect(opp.effective_status).toBe("CLOSED");
      expect(opp.title).toBe(targetOpportunity.title);
      expect(opp.description).toBe(targetOpportunity.description);
      expect(opp.skills_required).toEqual(targetOpportunity.skills_required);
      expect(opp.type).toBe(targetOpportunity.type);
      expect(opp.deadline).toBe(targetOpportunity.deadline);
      expect(opp.company_name).toBe("Close Owner Corp");
    });

    it("should persist CLOSED status in database", async () => {
      const dbOpp = await prisma.opportunity.findUnique({
        where: { id: targetOpportunity.id },
      });

      expect(dbOpp).not.toBeNull();
      expect(dbOpp?.status).toBe(OpportunityStatus.CLOSED);
      expect(dbOpp?.title).toBe(targetOpportunity.title);
      expect(dbOpp?.posted_by).toBe(targetOpportunity.posted_by);
    });

    it("should not delete related applications or competition registrations", async () => {
      const appInDb = await prisma.application.findUnique({
        where: { id: testApplicationId },
      });
      expect(appInDb).not.toBeNull();
      expect(appInDb?.opportunity_id).toBe(targetOpportunity.id);
      expect(appInDb?.student_id).toBe(studentUserId);

      const regInDb = await prisma.competitionRegistration.findUnique({
        where: { id: testRegistrationId },
      });
      expect(regInDb).not.toBeNull();
      expect(regInDb?.opportunity_id).toBe(targetOpportunity.id);
      expect(regInDb?.student_id).toBe(studentUserId);
    });

    it("should remain retrievable through the public detail endpoint as CLOSED", async () => {
      const getRes = await request(app).get(
        `/api/v1/opportunities/${targetOpportunity.id}`
      );

      expect(getRes.status).toBe(200);
      expect(getRes.body.opportunity.id).toBe(targetOpportunity.id);
      expect(getRes.body.opportunity.status).toBe("CLOSED");
      expect(getRes.body.opportunity.effective_status).toBe("CLOSED");
      expect(getRes.body.opportunity.title).toBe(targetOpportunity.title);
    });

    it("should behave consistently and idempotently when closing an already closed opportunity", async () => {
      const secondCloseRes = await request(app)
        .post(`/api/v1/opportunities/${targetOpportunity.id}/close`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(secondCloseRes.status).toBe(200);
      expect(secondCloseRes.body).toHaveProperty(
        "message",
        "Opportunity closed successfully"
      );
      expect(secondCloseRes.body.opportunity.status).toBe("CLOSED");
      expect(secondCloseRes.body.opportunity.effective_status).toBe("CLOSED");
      expect(secondCloseRes.body.opportunity.title).toBe(targetOpportunity.title);

      const thirdCloseRes = await request(app)
        .post(`/api/v1/opportunities/${targetOpportunity.id}/close`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(thirdCloseRes.status).toBe(200);
      expect(thirdCloseRes.body.opportunity.status).toBe("CLOSED");
    });

    it("should not allow the endpoint to modify owner or unrelated fields even if sent in request body", async () => {
      const freshOpp = await prisma.opportunity.create({
        data: {
          posted_by: ownerUserId,
          type: OpportunityType.JOB,
          title: "Immutable Fields Test Job",
          description: "This job title and description should never change via close.",
          skills_required: ["Rust"],
          deadline: new Date(Date.now() + 86400000 * 10),
          status: OpportunityStatus.OPEN,
        },
      });
      createdOpportunityIds.add(freshOpp.id);

      const res = await request(app)
        .post(`/api/v1/opportunities/${freshOpp.id}/close`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          title: "Attempted Malicious Title",
          description: "Attempted Malicious Description",
          posted_by: studentUserId,
          status: "OPEN",
          skills_required: ["Hacked"],
          type: "INTERNSHIP",
        });

      expect(res.status).toBe(200);
      expect(res.body.opportunity.id).toBe(freshOpp.id);
      expect(res.body.opportunity.status).toBe("CLOSED");
      expect(res.body.opportunity.title).toBe("Immutable Fields Test Job");
      expect(res.body.opportunity.description).toBe(
        "This job title and description should never change via close."
      );
      expect(res.body.opportunity.posted_by).toBe(ownerUserId);
      expect(res.body.opportunity.skills_required).toEqual(["Rust"]);
      expect(res.body.opportunity.type).toBe("JOB");

      // Verify in DB as well
      const dbOpp = await prisma.opportunity.findUnique({
        where: { id: freshOpp.id },
      });
      expect(dbOpp?.status).toBe(OpportunityStatus.CLOSED);
      expect(dbOpp?.title).toBe("Immutable Fields Test Job");
      expect(dbOpp?.posted_by).toBe(ownerUserId);
    });
  });

  describe("DELETE /api/v1/opportunities/:id - Delete Opportunity", () => {
    let ownerToken: string;
    let ownerUserId: string;
    let otherBusinessToken: string;
    let otherBusinessUserId: string;
    let studentToken: string;
    let studentUserId: string;
    let adminToken: string;

    beforeAll(async () => {
      // 1. Owner Business User
      const ownerUser = await prisma.user.create({
        data: {
          name: "Delete Test Owner Biz",
          email: `del_owner_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase(),
          password_hash: await bcrypt.hash("Password123!", 10),
          role: Role.BUSINESS,
          businessProfile: {
            create: {
              company_name: "Del Owner Corp",
              verification_status: VerificationStatus.VERIFIED,
            },
          },
        },
      });
      createdUserIds.add(ownerUser.id);
      ownerUserId = ownerUser.id;
      ownerToken = generateToken({
        id: ownerUser.id,
        email: ownerUser.email,
        role: ownerUser.role,
      });

      // 2. Other Business User
      const otherUser = await prisma.user.create({
        data: {
          name: "Del Other Biz",
          email: `del_other_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase(),
          password_hash: await bcrypt.hash("Password123!", 10),
          role: Role.BUSINESS,
          businessProfile: {
            create: {
              company_name: "Del Other Corp",
              verification_status: VerificationStatus.VERIFIED,
            },
          },
        },
      });
      createdUserIds.add(otherUser.id);
      otherBusinessUserId = otherUser.id;
      otherBusinessToken = generateToken({
        id: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
      });

      // 3. Student User
      const student = await prisma.user.create({
        data: {
          name: "Del Test Student",
          email: `del_student_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase(),
          password_hash: await bcrypt.hash("Password123!", 10),
          role: Role.STUDENT,
        },
      });
      createdUserIds.add(student.id);
      studentUserId = student.id;
      studentToken = generateToken({
        id: student.id,
        email: student.email,
        role: student.role,
      });

      // 4. Admin User
      const admin = await prisma.user.create({
        data: {
          name: "Del Test Admin",
          email: `del_admin_${runId}_${Math.random().toString(36).slice(2, 6)}@test.local`.toLowerCase(),
          password_hash: await bcrypt.hash("Password123!", 10),
          role: Role.ADMIN,
        },
      });
      createdUserIds.add(admin.id);
      adminToken = generateToken({
        id: admin.id,
        email: admin.email,
        role: admin.role,
      });
    });

    it("should return 401 when request is unauthenticated", async () => {
      const opp = await prisma.opportunity.create({
        data: {
          posted_by: ownerUserId,
          type: OpportunityType.JOB,
          title: "Unauth Test Job",
          description: "Testing unauthenticated delete requests.",
          deadline: new Date(Date.now() + 86400000 * 5),
        },
      });
      createdOpportunityIds.add(opp.id);

      const res = await request(app).delete(
        `/api/v1/opportunities/${opp.id}`
      );

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Authentication token is required" });
    });

    it("should return 403 when called by a student", async () => {
      const opp = await prisma.opportunity.create({
        data: {
          posted_by: ownerUserId,
          type: OpportunityType.JOB,
          title: "Student Forbidden Test Job",
          description: "Testing student forbidden delete requests.",
          deadline: new Date(Date.now() + 86400000 * 5),
        },
      });
      createdOpportunityIds.add(opp.id);

      const res = await request(app)
        .delete(`/api/v1/opportunities/${opp.id}`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied" });
    });

    it("should return 404 when opportunity does not exist", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app)
        .delete(`/api/v1/opportunities/${nonExistentId}`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Opportunity not found" });
    });

    it("should return 403 when a non-owning business attempts to delete an opportunity", async () => {
      const opp = await prisma.opportunity.create({
        data: {
          posted_by: ownerUserId,
          type: OpportunityType.INTERNSHIP,
          title: "Owner Intern Opp",
          description: "Only owner or admin can delete this opportunity.",
          deadline: new Date(Date.now() + 86400000 * 5),
        },
      });
      createdOpportunityIds.add(opp.id);

      const res = await request(app)
        .delete(`/api/v1/opportunities/${opp.id}`)
        .set("Authorization", `Bearer ${otherBusinessToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied" });

      // Verify still exists in DB
      const dbOpp = await prisma.opportunity.findUnique({
        where: { id: opp.id },
      });
      expect(dbOpp).not.toBeNull();
    });

    it("should reject forged owner IDs in request body and reject unauthorized business", async () => {
      const opp = await prisma.opportunity.create({
        data: {
          posted_by: ownerUserId,
          type: OpportunityType.JOB,
          title: "Forged Owner Test Job",
          description: "Testing body forgery defense.",
          deadline: new Date(Date.now() + 86400000 * 5),
        },
      });
      createdOpportunityIds.add(opp.id);

      const res = await request(app)
        .delete(`/api/v1/opportunities/${opp.id}`)
        .set("Authorization", `Bearer ${otherBusinessToken}`)
        .send({ posted_by: otherBusinessUserId });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied" });

      const dbOpp = await prisma.opportunity.findUnique({
        where: { id: opp.id },
      });
      expect(dbOpp?.posted_by).toBe(ownerUserId);
    });

    it("should reject deletion with 409 Conflict when opportunity has existing applications", async () => {
      const opp = await prisma.opportunity.create({
        data: {
          posted_by: ownerUserId,
          type: OpportunityType.JOB,
          title: "Job with Active Applications",
          description: "This job has applications and must not be deleted.",
          deadline: new Date(Date.now() + 86400000 * 5),
        },
      });
      createdOpportunityIds.add(opp.id);

      const application = await prisma.application.create({
        data: {
          student_id: studentUserId,
          opportunity_id: opp.id,
        },
      });

      // Owner attempt
      const ownerRes = await request(app)
        .delete(`/api/v1/opportunities/${opp.id}`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(ownerRes.status).toBe(409);
      expect(ownerRes.body).toHaveProperty(
        "error",
        "Cannot delete opportunity with existing applications or registrations. Please close the opportunity instead."
      );

      // Admin attempt
      const adminRes = await request(app)
        .delete(`/api/v1/opportunities/${opp.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(409);
      expect(adminRes.body).toHaveProperty(
        "error",
        "Cannot delete opportunity with existing applications or registrations. Please close the opportunity instead."
      );

      // Verify opportunity and application are retained in database
      const dbOpp = await prisma.opportunity.findUnique({
        where: { id: opp.id },
      });
      expect(dbOpp).not.toBeNull();

      const dbApp = await prisma.application.findUnique({
        where: { id: application.id },
      });
      expect(dbApp).not.toBeNull();
      expect(dbApp?.opportunity_id).toBe(opp.id);
    });

    it("should reject deletion with 409 Conflict when opportunity has existing competition registrations", async () => {
      const opp = await prisma.opportunity.create({
        data: {
          posted_by: ownerUserId,
          type: OpportunityType.COMPETITION,
          title: "Competition with Active Registrants",
          description: "This competition has registrants and must not be deleted.",
          deadline: new Date(Date.now() + 86400000 * 5),
        },
      });
      createdOpportunityIds.add(opp.id);

      const registration = await prisma.competitionRegistration.create({
        data: {
          student_id: studentUserId,
          opportunity_id: opp.id,
        },
      });

      // Owner attempt
      const ownerRes = await request(app)
        .delete(`/api/v1/opportunities/${opp.id}`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(ownerRes.status).toBe(409);
      expect(ownerRes.body).toHaveProperty(
        "error",
        "Cannot delete opportunity with existing applications or registrations. Please close the opportunity instead."
      );

      // Admin attempt
      const adminRes = await request(app)
        .delete(`/api/v1/opportunities/${opp.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(409);
      expect(adminRes.body).toHaveProperty(
        "error",
        "Cannot delete opportunity with existing applications or registrations. Please close the opportunity instead."
      );

      // Verify opportunity and registration are retained in database
      const dbOpp = await prisma.opportunity.findUnique({
        where: { id: opp.id },
      });
      expect(dbOpp).not.toBeNull();

      const dbReg = await prisma.competitionRegistration.findUnique({
        where: { id: registration.id },
      });
      expect(dbReg).not.toBeNull();
      expect(dbReg?.opportunity_id).toBe(opp.id);
    });

    it("should allow the owning business to delete an opportunity with zero applications and registrations", async () => {
      const opp = await prisma.opportunity.create({
        data: {
          posted_by: ownerUserId,
          type: OpportunityType.INTERNSHIP,
          title: "Clean Internship for Owner Deletion",
          description: "No applicants, safe for owner to delete completely.",
          deadline: new Date(Date.now() + 86400000 * 5),
        },
      });
      createdOpportunityIds.add(opp.id);

      const res = await request(app)
        .delete(`/api/v1/opportunities/${opp.id}`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});

      // Verify removed from database
      const dbOpp = await prisma.opportunity.findUnique({
        where: { id: opp.id },
      });
      expect(dbOpp).toBeNull();

      // Verify public detail endpoint now returns 404
      const getRes = await request(app).get(`/api/v1/opportunities/${opp.id}`);
      expect(getRes.status).toBe(404);
      expect(getRes.body).toEqual({ error: "Opportunity not found" });
    });

    it("should allow a platform administrator to delete any opportunity with zero applications and registrations", async () => {
      const opp = await prisma.opportunity.create({
        data: {
          posted_by: otherBusinessUserId,
          type: OpportunityType.JOB,
          title: "Policy Violating Listing for Admin Deletion",
          description: "Violates platform rules and will be removed by admin.",
          deadline: new Date(Date.now() + 86400000 * 5),
        },
      });
      createdOpportunityIds.add(opp.id);

      const res = await request(app)
        .delete(`/api/v1/opportunities/${opp.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});

      // Verify removed from database
      const dbOpp = await prisma.opportunity.findUnique({
        where: { id: opp.id },
      });
      expect(dbOpp).toBeNull();

      // Verify public detail endpoint returns 404
      const getRes = await request(app).get(`/api/v1/opportunities/${opp.id}`);
      expect(getRes.status).toBe(404);
    });

    it("should safely handle concurrent deletion requests idempotently and atomically", async () => {
      const opp = await prisma.opportunity.create({
        data: {
          posted_by: ownerUserId,
          type: OpportunityType.JOB,
          title: "Concurrent Deletion Test Opp",
          description: "Testing concurrent race condition handling.",
          deadline: new Date(Date.now() + 86400000 * 5),
        },
      });
      createdOpportunityIds.add(opp.id);

      // Fire two delete requests simultaneously
      const [res1, res2] = await Promise.all([
        request(app)
          .delete(`/api/v1/opportunities/${opp.id}`)
          .set("Authorization", `Bearer ${ownerToken}`),
        request(app)
          .delete(`/api/v1/opportunities/${opp.id}`)
          .set("Authorization", `Bearer ${ownerToken}`),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly one must succeed (204) and the other must report not found (404)
      expect(statuses).toEqual([204, 404]);

      const dbOpp = await prisma.opportunity.findUnique({
        where: { id: opp.id },
      });
      expect(dbOpp).toBeNull();
    });
  });
});
