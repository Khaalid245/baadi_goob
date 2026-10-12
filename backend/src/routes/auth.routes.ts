import { Router } from "express";
import { register, login, getMe } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { loginRateLimiter } from "../middleware/rateLimiter";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", loginRateLimiter, login);
authRouter.get("/me", authenticate, getMe);
