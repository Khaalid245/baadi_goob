import { Request, Response, NextFunction } from "express";
import "../types/express";
import {
  verifyToken,
  TokenExpiredError,
  JsonWebTokenError,
} from "../common/jwt";
import { AppError } from "./errorHandler";

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || authHeader.trim() === "") {
    return next(new AppError("Authentication token is required", 401));
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts[0] !== "Bearer") {
    return next(
      new AppError("Invalid authorization format. Expected Bearer token", 401)
    );
  }

  if (parts.length === 1) {
    return next(new AppError("Authentication token is required", 401));
  }

  if (parts.length > 2) {
    return next(
      new AppError("Invalid authorization format. Expected Bearer token", 401)
    );
  }

  const token = parts[1];
  if (!token) {
    return next(new AppError("Authentication token is required", 401));
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error: unknown) {
    if (error instanceof TokenExpiredError) {
      return next(new AppError("Token has expired", 401));
    }
    if (error instanceof JsonWebTokenError) {
      return next(new AppError("Invalid authentication token", 401));
    }
    if (error instanceof Error && error.message.includes("JWT_SECRET")) {
      return next(error);
    }
    return next(new AppError("Invalid authentication token", 401));
  }
};
