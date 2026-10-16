import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "../middleware/auth.middleware";
import { roleCheck } from "../middleware/roleCheck";
import {
  getStudentProfile,
  updateStudentProfile,
} from "../controllers/profile.controller";
import { getMyApplications } from "../controllers/application.controller";

export const studentRouter = Router();

studentRouter.use(authenticate);
studentRouter.use(roleCheck([Role.STUDENT]));

studentRouter.get("/me/profile", getStudentProfile);
studentRouter.put("/me/profile", updateStudentProfile);
studentRouter.get("/me/applications", getMyApplications);
