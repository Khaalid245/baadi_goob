import { Request, Response, NextFunction } from "express";
import { registerCompetitionParamSchema } from "../validations/registration.validation";
import {
  registerForCompetition,
  getCompetitionRegistrations,
} from "../services/registration.service";
import { AppError } from "../middleware/errorHandler";

export const postRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const parseResult = registerCompetitionParamSchema.safeParse(req.params);
    if (!parseResult.success) {
      const errorMessage =
        parseResult.error.issues[0]?.message || "Invalid opportunity ID";
      res.status(400).json({ error: errorMessage });
      return;
    }

    // Call service using strictly authenticated student ID and validated opportunity ID.
    // Client-supplied body or query parameters are never trusted or accepted.
    const registration = await registerForCompetition(
      parseResult.data.id,
      req.user.id
    );

    res.status(201).json({
      message: "Registration successful",
      registration,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const getOpportunityRegistrations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const parseResult = registerCompetitionParamSchema.safeParse(req.params);
    if (!parseResult.success) {
      const errorMessage =
        parseResult.error.issues[0]?.message || "Invalid opportunity ID";
      res.status(400).json({ error: errorMessage });
      return;
    }

    // Derive caller identity strictly from authenticated user token context.
    // Client-supplied query, body, or headers are never used to bypass authorization.
    const registrations = await getCompetitionRegistrations(
      parseResult.data.id,
      { id: req.user.id, role: req.user.role }
    );

    res.status(200).json({
      registrations,
      registrants: registrations,
    });
  } catch (error: unknown) {
    next(error);
  }
};
