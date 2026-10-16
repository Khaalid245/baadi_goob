import { Request, Response, NextFunction } from "express";
import {
  listBusinessesQuerySchema,
  verifyBusinessParamSchema,
  verifyBusinessBodySchema,
  listUsersQuerySchema,
  updateUserStatusParamSchema,
  updateUserStatusBodySchema,
} from "../validations/admin.validation";
import {
  listBusinesses as listBusinessesService,
  verifyBusiness as verifyBusinessService,
  listUsers as listUsersService,
  updateUserStatus as updateUserService,
} from "../services/admin.service";
import { AppError } from "../middleware/errorHandler";
import { VerificationStatus } from "@prisma/client";

export const listBusinesses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const parseResult = listBusinessesQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const errorMessage =
        parseResult.error.issues[0]?.message || "Invalid query parameters";
      res.status(400).json({ error: errorMessage });
      return;
    }

    const result = await listBusinessesService(parseResult.data);
    res.status(200).json(result);
  } catch (error: unknown) {
    next(error);
  }
};

export const verifyBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const paramResult = verifyBusinessParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      const errorMessage =
        paramResult.error.issues[0]?.message || "Invalid business ID";
      res.status(400).json({ error: errorMessage });
      return;
    }

    const bodyResult = verifyBusinessBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      const errorMessage =
        bodyResult.error.issues[0]?.message || "Invalid verification decision";
      res.status(400).json({ error: errorMessage });
      return;
    }

    const targetStatus = (bodyResult.data.status ||
      bodyResult.data.verification_status ||
      bodyResult.data.decision) as VerificationStatus;

    const business = await verifyBusinessService(
      paramResult.data.id,
      targetStatus
    );

    res.status(200).json({
      message: "Business verification status updated successfully",
      business,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const listUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const parseResult = listUsersQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const errorMessage =
        parseResult.error.issues[0]?.message || "Invalid query parameters";
      res.status(400).json({ error: errorMessage });
      return;
    }

    const result = await listUsersService(parseResult.data);
    res.status(200).json(result);
  } catch (error: unknown) {
    next(error);
  }
};

export const updateUserStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const paramResult = updateUserStatusParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      const errorMessage =
        paramResult.error.issues[0]?.message || "Invalid user ID";
      res.status(400).json({ error: errorMessage });
      return;
    }

    const bodyResult = updateUserStatusBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      const errorMessage =
        bodyResult.error.issues[0]?.message || "Invalid status";
      res.status(400).json({ error: errorMessage });
      return;
    }

    const user = await updateUserService(
      paramResult.data.id,
      bodyResult.data.status,
      req.user.id
    );

    res.status(200).json({
      message: "User status updated successfully",
      user,
    });
  } catch (error: unknown) {
    next(error);
  }
};
