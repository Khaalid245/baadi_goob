import { Request, Response, NextFunction } from "express";
import { registerSchema } from "../validations/auth.validation";
import { registerUser } from "../services/auth.service";

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
