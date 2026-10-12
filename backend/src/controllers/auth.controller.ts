import { Request, Response, NextFunction } from "express";
import { registerSchema, loginSchema } from "../validations/auth.validation";
import { registerUser, loginUser } from "../services/auth.service";
import { AppError } from "../middleware/errorHandler";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage =
        parseResult.error.issues[0]?.message || "Invalid input";
      res.status(400).json({ error: errorMessage });
      return;
    }

    const user = await registerUser(parseResult.data);

    res.status(201).json({
      message: "User registered successfully",
      user,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage =
        parseResult.error.issues[0]?.message || "Invalid input";
      res.status(400).json({ error: errorMessage });
      return;
    }

    const { user, token } = await loginUser(parseResult.data);

    res.status(200).json({
      message: "Login successful",
      user,
      token,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const getMe = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    res.status(200).json({
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
};
