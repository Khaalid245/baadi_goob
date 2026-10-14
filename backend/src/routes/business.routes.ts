import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "../middleware/auth.middleware";
import { roleCheck } from "../middleware/roleCheck";
import {
  getBusinessProfile,
  updateBusinessProfile,
} from "../controllers/profile.controller";

export const businessRouter = Router();

businessRouter.use(authenticate);
businessRouter.use(roleCheck([Role.BUSINESS]));

businessRouter.get("/me/profile", getBusinessProfile);
businessRouter.put("/me/profile", updateBusinessProfile);
