import { Request, Response, NextFunction } from "express";
import "../types/express";
import { UserStatus } from "@prisma/client";
import {
  verifyToken,
  TokenExpiredError,
  JsonWebTokenError,
  JwtPayload,
} from "../common/jwt";
import { prisma } from "../lib/prisma";
import { AppError } from "./errorHandler";

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
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

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
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

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return next(new AppError("User account no longer exists", 401));
    }

    if (user.status === UserStatus.SUSPENDED) {
      return next(
        new AppError("Account is suspended. Please contact support.", 403)
      );
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (dbError: unknown) {
    next(dbError);
  }
};
