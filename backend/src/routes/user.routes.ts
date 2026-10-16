import { Router } from "express";
import { deleteMeHandler } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";

export const userRouter = Router();

userRouter.delete("/me", authenticate, deleteMeHandler);
