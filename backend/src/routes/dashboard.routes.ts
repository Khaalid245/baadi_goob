import { Router } from "express";
import { getDashboardSummaryHandler } from "../controllers/dashboard.controller";
import { authenticate } from "../middleware/auth.middleware";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", authenticate, getDashboardSummaryHandler);
