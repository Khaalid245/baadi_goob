import { Request, Response, NextFunction } from "express";
import "../types/express";
import { Role } from "@prisma/client";
import { AppError } from "./errorHandler";

export const roleCheck = (allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("Access denied", 403));
    }

    next();
  };
};
