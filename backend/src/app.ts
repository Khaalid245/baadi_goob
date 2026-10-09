import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";

import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";

const app = express();

app.use(helmet());
app.use(express.json());
app.use(pinoHttp());

// JSON error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: "Invalid JSON format" });
  }
  next();
});

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Swagger Docs
const swaggerDocument = YAML.load(path.join(__dirname, "../../docs/openapi.yaml"));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export default app;