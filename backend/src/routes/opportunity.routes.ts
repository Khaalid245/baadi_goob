import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "../middleware/auth.middleware";
import { roleCheck } from "../middleware/roleCheck";
import { requireVerifiedBusiness } from "../middleware/verifiedBusiness.middleware";
import {
  getOpportunities,
  getOpportunityById,
  postOpportunity,
  updateOpportunity,
  closeOpportunity,
  deleteOpportunity,
} from "../controllers/opportunity.controller";
import {
  postApplication,
  getOpportunityApplications,
} from "../controllers/application.controller";

export const opportunityRouter = Router();

opportunityRouter.get("/", getOpportunities);
opportunityRouter.get("/:id", getOpportunityById);
opportunityRouter.post(
  "/",
  authenticate,
  roleCheck([Role.BUSINESS]),
  requireVerifiedBusiness,
  postOpportunity
);
opportunityRouter.put(
  "/:id",
  authenticate,
  roleCheck([Role.BUSINESS]),
  updateOpportunity
);
opportunityRouter.post(
  "/:id/close",
  authenticate,
  roleCheck([Role.BUSINESS]),
  closeOpportunity
);
opportunityRouter.delete(
  "/:id",
  authenticate,
  roleCheck([Role.BUSINESS, Role.ADMIN]),
  deleteOpportunity
);
opportunityRouter.post(
  "/:id/applications",
  authenticate,
  roleCheck([Role.STUDENT]),
  postApplication
);
opportunityRouter.get(
  "/:id/applications",
  authenticate,
  roleCheck([Role.BUSINESS]),
  getOpportunityApplications
);
