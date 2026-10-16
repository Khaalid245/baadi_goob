import { Request, Response, NextFunction } from "express";
import { getDashboardSummary } from "../services/dashboard.service";
import { AppError } from "../middleware/errorHandler";

/**
 * Controller for GET /api/v1/dashboard/summary (FR-022).
 */
export const getDashboardSummaryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const summary = await getDashboardSummary(req.user.id, req.user.role);
    res.status(200).json(summary);
  } catch (error: unknown) {
    next(error);
  }
};
