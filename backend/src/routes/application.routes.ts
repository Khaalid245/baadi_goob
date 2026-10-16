import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "../middleware/auth.middleware";
import { roleCheck } from "../middleware/roleCheck";
import { patchApplicationStatus } from "../controllers/application.controller";

export const applicationRouter = Router();

applicationRouter.patch(
  "/:id/status",
  authenticate,
  roleCheck([Role.BUSINESS]),
  patchApplicationStatus
);
