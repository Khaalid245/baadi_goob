import { Request, Response, NextFunction } from "express";
import {
  updateStudentProfileSchema,
  updateBusinessProfileSchema,
} from "../validations/profile.validation";
import {
  getStudentProfileByUserId,
  upsertStudentProfileByUserId,
  getBusinessProfileByUserId,
  upsertBusinessProfileByUserId,
} from "../services/profile.service";
import { AppError } from "../middleware/errorHandler";

export const getStudentProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const profile = await getStudentProfileByUserId(req.user.id);
    res.status(200).json({ profile });
  } catch (error: unknown) {
    next(error);
  }
};

export const updateStudentProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const parseResult = updateStudentProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage =
        parseResult.error.issues[0]?.message || "Invalid input";
      res.status(400).json({ error: errorMessage });
      return;
    }

    const profile = await upsertStudentProfileByUserId(
      req.user.id,
      parseResult.data
    );

    res.status(200).json({
      message: "Profile updated successfully",
      profile,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const getBusinessProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const profile = await getBusinessProfileByUserId(req.user.id);
    res.status(200).json({ profile });
  } catch (error: unknown) {
    next(error);
  }
};

export const updateBusinessProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const parseResult = updateBusinessProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage =
        parseResult.error.issues[0]?.message || "Invalid input";
      res.status(400).json({ error: errorMessage });
      return;
    }

    const profile = await upsertBusinessProfileByUserId(
      req.user.id,
      parseResult.data
    );

    res.status(200).json({
      message: "Company profile updated successfully",
      profile,
    });
  } catch (error: unknown) {
    next(error);
  }
};
