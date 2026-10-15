import { Request, Response, NextFunction } from "express";
import "../types/express";
import { Role, VerificationStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "./errorHandler";

export const requireVerifiedBusiness = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401));
  }

  if (req.user.role !== Role.BUSINESS) {
    return next(new AppError("Access denied", 403));
  }

  try {
    const profile = await prisma.businessProfile.findUnique({
      where: { user_id: req.user.id },
    });

    if (!profile) {
      return next(
        new AppError(
          "Company profile must be completed before posting opportunities",
          403
        )
      );
    }

    if (profile.verification_status !== VerificationStatus.VERIFIED) {
      if (profile.verification_status === VerificationStatus.PENDING) {
        return next(
          new AppError(
            "Business verification is pending. Verification is required before posting opportunities.",
            403
          )
        );
      }
      return next(
        new AppError(
          "Business verification was rejected. Verification is required before posting opportunities.",
          403
        )
      );
    }

    next();
  } catch (error: unknown) {
    next(error);
  }
};
