import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "../middleware/auth.middleware";
import { roleCheck } from "../middleware/roleCheck";
import {
  listBusinesses,
  verifyBusiness,
} from "../controllers/admin.controller";

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(roleCheck([Role.ADMIN]));

adminRouter.get("/businesses", listBusinesses);
adminRouter.patch("/businesses/:id/verification", verifyBusiness);
