import { Router } from "express";
import {
  register,
  login,
  getMe,
  requestPasswordResetHandler,
  confirmPasswordResetHandler,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import {
  loginRateLimiter,
  passwordResetRateLimiter,
} from "../middleware/rateLimiter";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", loginRateLimiter, login);
authRouter.get("/me", authenticate, getMe);
authRouter.post(
  "/password-reset",
  passwordResetRateLimiter,
  requestPasswordResetHandler
);
authRouter.post(
  "/password-reset/confirm",
  confirmPasswordResetHandler
);
