import { Request, Response, NextFunction } from "express";
import { deleteUserAccount } from "../services/user.service";
import { AppError } from "../middleware/errorHandler";

/**
 * Controller for DELETE /api/v1/users/me (FR-020).
 * Derives user ID strictly from the authenticated JWT session context (req.user.id).
 * Guarantees a user can delete only their own account.
 */
export const deleteMeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      return next(new AppError("Authentication required", 401));
    }

    const result = await deleteUserAccount(req.user.id);
    res.status(200).json(result);
  } catch (error: unknown) {
    next(error);
  }
};
