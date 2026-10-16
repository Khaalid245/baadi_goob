import request from "supertest";
import bcrypt from "bcryptjs";
import {
  Role,
  UserStatus,
  VerificationStatus,
  OpportunityType,
} from "@prisma/client";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { generateToken } from "../src/common/jwt";

describe("Admin Business Verification Module (FR-012, FR-019)", () => {
  const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const createdUserIds = new Set<string>();
  const createdOpportunityIds = new Set<string>();

  // Tokens & Users
  let adminToken: string;
  let adminUserId: string;

  let suspendedAdminToken: string;
  let suspendedAdminUserId: string;

  let studentToken: string;
  let studentUserId: string;

  let pendingBusiness1Token: string;
  let pendingBusiness1UserId: string;
  let pendingBusiness1ProfileId: string;

  let pendingBusiness2UserId: string;
  let pendingBusiness2ProfileId: string;

  let pendingBusinessForRejectUserId: string;
  let pendingBusinessForRejectProfileId: string;

  let alreadyVerifiedBusinessUserId: string;
  let alreadyVerifiedBusinessProfileId: string;

  let businessPostingTestToken: string;
  let businessPostingTestUserId: string;

  beforeAll(async () => {
    const password_hash = await bcrypt.hash("Password123!", 10);

    // 1. Active Admin
    const adminUser = await prisma.user.create({
      data: {
        name: "Admin User",
        email: `admin_${runId}@test.local`.toLowerCase(),
        password_hash,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    adminUserId = adminUser.id;
    createdUserIds.add(adminUserId);
    adminToken = generateToken({
      id: adminUser.id,
      email: adminUser.email,
      role: Role.ADMIN,
    });

    // 2. Suspended Admin
    const suspendedAdmin = await prisma.user.create({
      data: {
        name: "Suspended Admin",
        email: `susp_admin_${runId}@test.local`.toLowerCase(),
        password_hash,
        role: Role.ADMIN,
        status: UserStatus.SUSPENDED,
      },
    });
    suspendedAdminUserId = suspendedAdmin.id;
    createdUserIds.add(suspendedAdminUserId);
    suspendedAdminToken = generateToken({
      id: suspendedAdmin.id,
      email: suspendedAdmin.email,
      role: Role.ADMIN,
    });

    // 3. Student User
    const studentUser = await prisma.user.create({
      data: {
        name: "Student Tester",
        email: `student_${runId}@test.local`.toLowerCase(),
        password_hash,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });
    studentUserId = studentUser.id;
    createdUserIds.add(studentUserId);
    studentToken = generateToken({
      id: studentUser.id,
      email: studentUser.email,
      role: Role.STUDENT,
    });

    // 4. Pending Business 1
    const pendingBiz1 = await prisma.user.create({
      data: {
        name: "Pending Business One",
        email: `biz_pending1_${runId}@test.local`.toLowerCase(),
        password_hash,
        role: Role.BUSINESS,
        status: UserStatus.ACTIVE,
        businessProfile: {
          create: {
            company_name: `Alpha Corp ${runId}`,
            verification_status: VerificationStatus.PENDING,
          },
        },
      },
      include: { businessProfile: true },
    });
    pendingBusiness1UserId = pendingBiz1.id;
    pendingBusiness1ProfileId = pendingBiz1.businessProfile!.id;
    createdUserIds.add(pendingBusiness1UserId);
    pendingBusiness1Token = generateToken({
      id: pendingBiz1.id,
      email: pendingBiz1.email,
      role: Role.BUSINESS,
    });

    // 5. Pending Business 2
    const pendingBiz2 = await prisma.user.create({
      data: {
        name: "Pending Business Two",
        email: `biz_pending2_${runId}@test.local`.toLowerCase(),
        password_hash,
        role: Role.BUSINESS,
        status: UserStatus.ACTIVE,
        businessProfile: {
          create: {
            company_name: `Beta Tech ${runId}`,
            verification_status: VerificationStatus.PENDING,
          },
        },
      },
      include: { businessProfile: true },
    });
    pendingBusiness2UserId = pendingBiz2.id;
    pendingBusiness2ProfileId = pendingBiz2.businessProfile!.id;
    createdUserIds.add(pendingBusiness2UserId);

    // 6. Pending Business For Rejection Test
    const pendingBizReject = await prisma.user.create({
      data: {
        name: "Pending Business Reject",
        email: `biz_reject_${runId}@test.local`.toLowerCase(),
        password_hash,
        role: Role.BUSINESS,
        status: UserStatus.ACTIVE,
        businessProfile: {
          create: {
            company_name: `Reject Logistics ${runId}`,
            verification_status: VerificationStatus.PENDING,
          },
        },
      },
      include: { businessProfile: true },
    });
    pendingBusinessForRejectUserId = pendingBizReject.id;
    pendingBusinessForRejectProfileId = pendingBizReject.businessProfile!.id;
    createdUserIds.add(pendingBusinessForRejectUserId);

    // 7. Already Verified Business
    const verifiedBiz = await prisma.user.create({
      data: {
        name: "Verified Business",
        email: `biz_verified_${runId}@test.local`.toLowerCase(),
        password_hash,
        role: Role.BUSINESS,
        status: UserStatus.ACTIVE,
        businessProfile: {
          create: {
            company_name: `Verified Solutions ${runId}`,
            verification_status: VerificationStatus.VERIFIED,
          },
        },
      },
      include: { businessProfile: true },
    });
    alreadyVerifiedBusinessUserId = verifiedBiz.id;
    alreadyVerifiedBusinessProfileId = verifiedBiz.businessProfile!.id;
    createdUserIds.add(alreadyVerifiedBusinessUserId);

    // 8. Business for posting opportunities lifecycle test
    const postingBiz = await prisma.user.create({
      data: {
        name: "Posting Flow Business",
        email: `biz_posting_${runId}@test.local`.toLowerCase(),
        password_hash,
        role: Role.BUSINESS,
        status: UserStatus.ACTIVE,
        businessProfile: {
          create: {
            company_name: `Posting Corp ${runId}`,
            verification_status: VerificationStatus.PENDING,
          },
        },
      },
      include: { businessProfile: true },
    });
    businessPostingTestUserId = postingBiz.id;
    createdUserIds.add(businessPostingTestUserId);
    businessPostingTestToken = generateToken({
      id: postingBiz.id,
      email: postingBiz.email,
      role: Role.BUSINESS,
    });
  });

  afterAll(async () => {
    // 1. Delete notifications
    if (createdUserIds.size > 0) {
      try {
        await prisma.notification.deleteMany({
          where: { user_id: { in: Array.from(createdUserIds) } },
        });
      } catch {
        // Ignored in cleanup
      }
    }

    // 2. Delete opportunities
    if (createdOpportunityIds.size > 0 || createdUserIds.size > 0) {
      try {
        await prisma.opportunity.deleteMany({
          where: {
            OR: [
              { id: { in: Array.from(createdOpportunityIds) } },
              { posted_by: { in: Array.from(createdUserIds) } },
            ],
          },
        });
      } catch {
        // Ignored in cleanup
      }
    }

    // 3. Delete business profiles & student profiles
    if (createdUserIds.size > 0) {
      try {
        await prisma.businessProfile.deleteMany({
          where: { user_id: { in: Array.from(createdUserIds) } },
        });
        await prisma.studentProfile.deleteMany({
          where: { user_id: { in: Array.from(createdUserIds) } },
        });
      } catch {
        // Ignored in cleanup
      }
    }

    // 4. Delete users
    if (createdUserIds.size > 0) {
      try {
        await prisma.user.deleteMany({
          where: { id: { in: Array.from(createdUserIds) } },
        });
      } catch {
        // Ignored in cleanup
      }
    }
  });

  describe("Access Control & Authorization (RBAC)", () => {
    it("should reject unauthenticated GET /admin/businesses with 401", async () => {
      const res = await request(app).get("/api/v1/admin/businesses");
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/authentication token is required/i);
    });

    it("should reject STUDENT accessing GET /admin/businesses with 403", async () => {
      const res = await request(app)
        .get("/api/v1/admin/businesses")
        .set("Authorization", `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/access denied/i);
    });

    it("should reject BUSINESS accessing GET /admin/businesses with 403", async () => {
      const res = await request(app)
        .get("/api/v1/admin/businesses")
        .set("Authorization", `Bearer ${pendingBusiness1Token}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/access denied/i);
    });

    it("should reject suspended ADMIN accessing GET /admin/businesses with 403", async () => {
      const res = await request(app)
        .get("/api/v1/admin/businesses")
        .set("Authorization", `Bearer ${suspendedAdminToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/account is suspended/i);
    });

    it("should reject unauthenticated PATCH /admin/businesses/:id/verification with 401", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/businesses/${pendingBusiness1ProfileId}/verification`)
        .send({ status: "VERIFIED" });
      expect(res.status).toBe(401);
    });

    it("should reject STUDENT accessing PATCH /admin/businesses/:id/verification with 403", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/businesses/${pendingBusiness1ProfileId}/verification`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ status: "VERIFIED" });
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/access denied/i);
    });

    it("should reject BUSINESS accessing PATCH /admin/businesses/:id/verification with 403", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/businesses/${pendingBusiness1ProfileId}/verification`)
        .set("Authorization", `Bearer ${pendingBusiness1Token}`)
        .send({ status: "VERIFIED" });
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/access denied/i);
    });

    it("should reject suspended ADMIN accessing PATCH /admin/businesses/:id/verification with 403", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/businesses/${pendingBusiness1ProfileId}/verification`)
        .set("Authorization", `Bearer ${suspendedAdminToken}`)
        .send({ status: "VERIFIED" });
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/account is suspended/i);
    });
  });

  describe("GET /api/v1/admin/businesses - Listing and Filtering (FR-012)", () => {
    it("should default to listing PENDING businesses when status query is omitted", async () => {
      const res = await request(app)
        .get("/api/v1/admin/businesses")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.businesses).toBeDefined();
      expect(Array.isArray(res.body.businesses)).toBe(true);

      // Verify every returned business has verification_status PENDING
      res.body.businesses.forEach(
        (b: { verification_status: VerificationStatus }) => {
          expect(b.verification_status).toBe("PENDING");
        }
      );

      // Verify our created pending businesses are in the list
      const ids = res.body.businesses.map((b: { id: string }) => b.id);
      expect(ids).toContain(pendingBusiness1ProfileId);
      expect(ids).toContain(pendingBusiness2ProfileId);
    });

    it("should accept case-insensitive status query 'pending' and 'PENDING'", async () => {
      const resLower = await request(app)
        .get("/api/v1/admin/businesses")
        .query({ status: "pending" })
        .set("Authorization", `Bearer ${adminToken}`);
      expect(resLower.status).toBe(200);

      const resUpper = await request(app)
        .get("/api/v1/admin/businesses")
        .query({ status: "PENDING" })
        .set("Authorization", `Bearer ${adminToken}`);
      expect(resUpper.status).toBe(200);
      expect(resUpper.body.total).toBe(resLower.body.total);
    });

    it("should filter by status=VERIFIED and return verified businesses", async () => {
      const res = await request(app)
        .get("/api/v1/admin/businesses")
        .query({ status: "verified" })
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.businesses.forEach(
        (b: { verification_status: VerificationStatus }) => {
          expect(b.verification_status).toBe("VERIFIED");
        }
      );
      const ids = res.body.businesses.map((b: { id: string }) => b.id);
      expect(ids).toContain(alreadyVerifiedBusinessProfileId);
    });

    it("should filter by status=REJECTED and return empty list when none exist yet", async () => {
      const res = await request(app)
        .get("/api/v1/admin/businesses")
        .query({ status: "rejected" })
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.businesses.forEach(
        (b: { verification_status: VerificationStatus }) => {
          expect(b.verification_status).toBe("REJECTED");
        }
      );
    });

    it("should reject unsupported status filter with HTTP 400", async () => {
      const res = await request(app)
        .get("/api/v1/admin/businesses")
        .query({ status: "UNKNOWN_STATUS" })
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status must be one of/i);
    });

    it("should support pagination (page and limit)", async () => {
      const res = await request(app)
        .get("/api/v1/admin/businesses")
        .query({ limit: 1, page: 1 })
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.businesses.length).toBeLessThanOrEqual(1);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.limit).toBe(1);
      expect(res.body.page).toBe(1);
    });

    it("should reject invalid pagination parameters (e.g. limit > 100, page < 1) with 400", async () => {
      const resOverLimit = await request(app)
        .get("/api/v1/admin/businesses")
        .query({ limit: 150 })
        .set("Authorization", `Bearer ${adminToken}`);
      expect(resOverLimit.status).toBe(400);

      const resZeroPage = await request(app)
        .get("/api/v1/admin/businesses")
        .query({ page: 0 })
        .set("Authorization", `Bearer ${adminToken}`);
      expect(resZeroPage.status).toBe(400);
    });

    it("should never expose password hashes, tokens, or private secrets in response", async () => {
      const res = await request(app)
        .get("/api/v1/admin/businesses")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.businesses.length).toBeGreaterThan(0);

      res.body.businesses.forEach(
        (b: {
          id: string;
          user_id: string;
          company_name: string;
          verification_status: string;
          user: Record<string, unknown>;
          password_hash?: string;
        }) => {
          expect(b.id).toBeDefined();
          expect(b.user_id).toBeDefined();
          expect(b.company_name).toBeDefined();
          expect(b.verification_status).toBeDefined();
          expect(b.password_hash).toBeUndefined();

          expect(b.user).toBeDefined();
          expect(b.user.id).toBeDefined();
          expect(b.user.name).toBeDefined();
          expect(b.user.email).toBeDefined();
          expect(b.user.role).toBe("BUSINESS");
          expect(b.user.status).toBeDefined();
          expect(b.user.password_hash).toBeUndefined();
          expect(b.user.token).toBeUndefined();
        }
      );
    });
  });

  describe("PATCH /api/v1/admin/businesses/:id/verification - Verification Decisions (FR-012, FR-019)", () => {
    it("should successfully verify a pending business by profile ID and create an in-database notification (FR-012, FR-019)", async () => {
      const res = await request(app)
        .patch(
          `/api/v1/admin/businesses/${pendingBusiness1ProfileId}/verification`
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "VERIFIED" });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/updated successfully/i);
      expect(res.body.business).toBeDefined();
      expect(res.body.business.id).toBe(pendingBusiness1ProfileId);
      expect(res.body.business.verification_status).toBe("VERIFIED");
      expect(res.body.business.user.id).toBe(pendingBusiness1UserId);
      expect(res.body.business.user.password_hash).toBeUndefined();

      // Check DB persistence
      const updatedInDb = await prisma.businessProfile.findUnique({
        where: { id: pendingBusiness1ProfileId },
      });
      expect(updatedInDb?.verification_status).toBe(VerificationStatus.VERIFIED);

      // Check atomic in-database notification creation (FR-019)
      const notification = await prisma.notification.findFirst({
        where: {
          user_id: pendingBusiness1UserId,
          type: "BUSINESS_VERIFIED",
        },
      });
      expect(notification).toBeDefined();
      expect(notification?.channel).toBe("EMAIL");
      expect(notification?.message).toMatch(/verified/i);
    });

    it("should successfully verify a pending business using user ID as route parameter", async () => {
      const res = await request(app)
        .patch(
          `/api/v1/admin/businesses/${pendingBusiness2UserId}/verification`
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "VERIFIED" });

      expect(res.status).toBe(200);
      expect(res.body.business.verification_status).toBe("VERIFIED");
      expect(res.body.business.user_id).toBe(pendingBusiness2UserId);

      // Check DB persistence
      const updatedInDb = await prisma.businessProfile.findUnique({
        where: { id: pendingBusiness2ProfileId },
      });
      expect(updatedInDb?.verification_status).toBe(VerificationStatus.VERIFIED);
    });

    it("should successfully reject a pending business and create an in-database notification (FR-012, FR-019)", async () => {
      const res = await request(app)
        .patch(
          `/api/v1/admin/businesses/${pendingBusinessForRejectProfileId}/verification`
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "REJECTED" });

      expect(res.status).toBe(200);
      expect(res.body.business.verification_status).toBe("REJECTED");

      // Check DB persistence
      const updatedInDb = await prisma.businessProfile.findUnique({
        where: { id: pendingBusinessForRejectProfileId },
      });
      expect(updatedInDb?.verification_status).toBe(VerificationStatus.REJECTED);

      // Check atomic in-database notification creation (FR-019)
      const notification = await prisma.notification.findFirst({
        where: {
          user_id: pendingBusinessForRejectUserId,
          type: "BUSINESS_REJECTED",
        },
      });
      expect(notification).toBeDefined();
      expect(notification?.channel).toBe("EMAIL");
      expect(notification?.message).toMatch(/rejected/i);
    });

    it("should reject redundant transition if business is already verified with HTTP 400", async () => {
      const res = await request(app)
        .patch(
          `/api/v1/admin/businesses/${alreadyVerifiedBusinessProfileId}/verification`
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "VERIFIED" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already verified/i);
    });

    it("should reject redundant transition if business is already rejected with HTTP 400", async () => {
      const res = await request(app)
        .patch(
          `/api/v1/admin/businesses/${pendingBusinessForRejectProfileId}/verification`
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "REJECTED" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already rejected/i);
    });

    it("should return HTTP 400 for invalid UUID route parameter", async () => {
      const res = await request(app)
        .patch("/api/v1/admin/businesses/not-a-valid-uuid/verification")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "VERIFIED" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid business id/i);
    });

    it("should return HTTP 404 for non-existent business UUID", async () => {
      const nonExistentUuid = "00000000-0000-4000-8000-000000000000";
      const res = await request(app)
        .patch(`/api/v1/admin/businesses/${nonExistentUuid}/verification`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "VERIFIED" });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/business not found/i);
    });

    it("should return HTTP 400 when attempting to verify a non-business user (e.g. STUDENT)", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/businesses/${studentUserId}/verification`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "VERIFIED" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(
        /only business accounts can be verified or rejected/i
      );
    });

    it("should return HTTP 400 for invalid decision value (e.g. PENDING or FOO)", async () => {
      const resPending = await request(app)
        .patch(
          `/api/v1/admin/businesses/${alreadyVerifiedBusinessProfileId}/verification`
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "PENDING" });
      expect(resPending.status).toBe(400);

      const resFoo = await request(app)
        .patch(
          `/api/v1/admin/businesses/${alreadyVerifiedBusinessProfileId}/verification`
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "APPROVED" });
      expect(resFoo.status).toBe(400);
    });

    it("should return HTTP 400 for empty request body", async () => {
      const res = await request(app)
        .patch(
          `/api/v1/admin/businesses/${alreadyVerifiedBusinessProfileId}/verification`
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it("should return HTTP 400 when unknown fields are present in body (strict validation)", async () => {
      const res = await request(app)
        .patch(
          `/api/v1/admin/businesses/${alreadyVerifiedBusinessProfileId}/verification`
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "VERIFIED", extra_field: 123 });

      expect(res.status).toBe(400);
    });
  });

  describe("Integration with Opportunity Posting Guard (FR-008 & requireVerifiedBusiness)", () => {
    it("should prevent a PENDING business from posting an opportunity (HTTP 403)", async () => {
      const res = await request(app)
        .post("/api/v1/opportunities")
        .set("Authorization", `Bearer ${businessPostingTestToken}`)
        .send({
          type: OpportunityType.JOB,
          title: `Software Engineer ${runId}`,
          description: "Full stack engineering role for talented graduates.",
          skills_required: ["TypeScript", "Node.js"],
          deadline: new Date(Date.now() + 86400000 * 30).toISOString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/business verification is pending/i);
    });

    it("should allow the business to post an opportunity after being verified by admin", async () => {
      // 1. Admin verifies the business
      const verifyRes = await request(app)
        .patch(
          `/api/v1/admin/businesses/${businessPostingTestUserId}/verification`
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "VERIFIED" });
      expect(verifyRes.status).toBe(200);

      // 2. Business posts opportunity now that it is verified
      const postRes = await request(app)
        .post("/api/v1/opportunities")
        .set("Authorization", `Bearer ${businessPostingTestToken}`)
        .send({
          type: OpportunityType.JOB,
          title: `Software Engineer ${runId}`,
          description: "Full stack engineering role for talented graduates.",
          skills_required: ["TypeScript", "Node.js"],
          deadline: new Date(Date.now() + 86400000 * 30).toISOString(),
        });

      expect(postRes.status).toBe(201);
      expect(postRes.body.opportunity).toBeDefined();
      expect(postRes.body.opportunity.id).toBeDefined();
      createdOpportunityIds.add(postRes.body.opportunity.id);
    });

    it("should prevent a REJECTED business from posting an opportunity (HTTP 403)", async () => {
      // Create a dedicated rejected business
      const rejectedBiz = await prisma.user.create({
        data: {
          name: "Rejected Posting Business",
          email: `biz_rej_post_${runId}@test.local`.toLowerCase(),
          password_hash: await bcrypt.hash("Password123!", 10),
          role: Role.BUSINESS,
          status: UserStatus.ACTIVE,
          businessProfile: {
            create: {
              company_name: `Rejected Posting Corp ${runId}`,
              verification_status: VerificationStatus.REJECTED,
            },
          },
        },
      });
      createdUserIds.add(rejectedBiz.id);
      const rejectedBizToken = generateToken({
        id: rejectedBiz.id,
        email: rejectedBiz.email,
        role: Role.BUSINESS,
      });

      const res = await request(app)
        .post("/api/v1/opportunities")
        .set("Authorization", `Bearer ${rejectedBizToken}`)
        .send({
          type: OpportunityType.INTERNSHIP,
          title: `Internship Opportunity ${runId}`,
          description: "Summer internship opportunity.",
          deadline: new Date(Date.now() + 86400000 * 30).toISOString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/business verification was rejected/i);
    });
  });
});
