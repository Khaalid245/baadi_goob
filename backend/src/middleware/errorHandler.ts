import { Request, Response, NextFunction } from "express";

export interface CustomError extends Error {
  status?: number;
  statusCode?: number;
}

export class AppError extends Error {
  public status: number;
  public statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.status = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 404 Not Found handler for unmatched routes.
 * Placed after all route declarations so it catches any unhandled API path.
 */
export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({ error: "Route not found" });
};

/**
 * Centralized Express error-handling middleware.
 * - Handles JSON body parser syntax errors gracefully with HTTP 400.
 * - Handles operational errors with their defined status codes.
 * - Hides stack traces and sensitive internal error details on 500 errors.
 * - Logs errors server-side via pino logger or console.
 */
export const errorHandler = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) {
    return next(err);
  }

  // Handle JSON parsing syntax error from express.json()
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Invalid JSON format" });
    return;
  }

  const statusCode =
    typeof err.status === "number"
      ? err.status
      : typeof err.statusCode === "number"
      ? err.statusCode
      : 500;

  // Log server-side securely without leaking to client
  const reqWithLog = req as Request & {
    log?: { error: (err: unknown) => void };
  };
  if (reqWithLog.log && typeof reqWithLog.log.error === "function") {
    reqWithLog.log.error(err);
  } else if (process.env.NODE_ENV !== "test") {
    console.error(err);
  }

  // Obfuscate internal 500 messages to prevent secret or stack trace leakage
  const message =
    statusCode >= 500
      ? "Internal Server Error"
      : err.message || "An error occurred";

  res.status(statusCode).json({ error: message });
};
