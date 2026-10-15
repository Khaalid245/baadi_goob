import express, { Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import fs from "fs";

import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth.routes";
import { studentRouter } from "./routes/student.routes";
import { businessRouter } from "./routes/business.routes";
import { opportunityRouter } from "./routes/opportunity.routes";

export const app = express();

// Security and utility middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(
  pinoHttp({
    autoLogging: process.env.NODE_ENV !== "test",
    level: process.env.NODE_ENV === "test" ? "silent" : "info",
  })
);

// Health check endpoint
app.get("/api/v1/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Authentication routes
app.use("/api/v1/auth", authRouter);

// Profile routes
app.use("/api/v1/students", studentRouter);
app.use("/api/v1/businesses", businessRouter);

// Opportunity routes
app.use("/api/v1/opportunities", opportunityRouter);

// Swagger API Documentation
const swaggerPath = path.resolve(__dirname, "../../docs/openapi.yaml");
if (fs.existsSync(swaggerPath)) {
  const swaggerDocument = YAML.load(swaggerPath);
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

// 404 handler for unknown routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);
