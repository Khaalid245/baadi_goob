import { Request, Response, NextFunction } from "express";
import {
  applyOpportunityParamSchema,
  updateApplicationStatusParamSchema,
  updateApplicationStatusBodySchema,
} from "../validations/application.validation";
import {
  applyToOpportunity,
  getStudentApplications,
  getOpportunityApplications as getOpportunityApplicationsService,
  updateApplicationStatus as updateApplicationStatusService,
} from "../services/application.service";
import { AppError } from "../middleware/errorHandler";

export const postApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const parseResult = applyOpportunityParamSchema.safeParse(req.params);
    if (!parseResult.success) {
      const errorMessage =
        parseResult.error.issues[0]?.message || "Invalid opportunity ID";
      res.status(400).json({ error: errorMessage });
      return;
    }

    // Call service using strictly authenticated student ID and validated opportunity ID.
    // Any fields from req.body (student_id, status, id, etc.) are ignored.
    const application = await applyToOpportunity(
      parseResult.data.id,
      req.user.id
    );

    res.status(201).json({
      message: "Application submitted successfully",
      application,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const getMyApplications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    // Student ID is derived exclusively from authenticated user token.
    // Query parameters, body, or route parameters are never used as student ID.
    const applications = await getStudentApplications(req.user.id);

    res.status(200).json({ applications });
  } catch (error: unknown) {
    next(error);
  }
};

export const getOpportunityApplications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const parseResult = applyOpportunityParamSchema.safeParse(req.params);
    if (!parseResult.success) {
      const errorMessage =
        parseResult.error.issues[0]?.message || "Invalid opportunity ID";
      res.status(400).json({ error: errorMessage });
      return;
    }

    // Never trust business or user ID from body or query params.
    // Strictly derive the business user ID from req.user.id.
    const applications = await getOpportunityApplicationsService(
      parseResult.data.id,
      req.user.id
    );

    res.status(200).json({
      applications,
      applicants: applications,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const patchApplicationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const paramResult = updateApplicationStatusParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      const errorMessage =
        paramResult.error.issues[0]?.message || "Invalid application ID";
      res.status(400).json({ error: errorMessage });
      return;
    }

    const bodyResult = updateApplicationStatusBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      const errorMessage =
        bodyResult.error.issues[0]?.message || "Invalid status";
      res.status(400).json({ error: errorMessage });
      return;
    }

    // Business user ID is derived strictly from req.user.id.
    // Unvalidated or forged fields from req.body (e.g. student_id, user_id, opportunity_id)
    // are rejected by schema or ignored, and cannot bypass authorization.
    const application = await updateApplicationStatusService(
      paramResult.data.id,
      req.user.id,
      bodyResult.data.status
    );

    res.status(200).json({
      message: "Application status updated successfully",
      application,
    });
  } catch (error: unknown) {
    next(error);
  }
};
