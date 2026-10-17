import cors, { CorsOptions } from "cors";

/**
 * Resolves and validates the list of allowed CORS origins based on the environment.
 * - In production: Requires FRONTEND_URL to be set and well-formed. Throws if missing or invalid.
 * - In development/test: Defaults to http://localhost:5173 and automatically includes
 *   http://127.0.0.1:5173 if localhost:5173 is configured.
 * - Normalizes all entries by trimming whitespace and trailing slashes.
 */
export const getAllowedOrigins = (): string[] => {
  const isProduction = process.env.NODE_ENV === "production";
  const rawFrontendUrl = process.env.FRONTEND_URL?.trim();

  if (!rawFrontendUrl) {
    if (isProduction) {
      throw new Error(
        "CRITICAL CONFIGURATION ERROR: FRONTEND_URL must be configured in production"
      );
    }
    return ["http://localhost:5173", "http://127.0.0.1:5173"];
  }

  const origins = rawFrontendUrl
    .split(",")
    .map((entry) => {
      const trimmed = entry.trim().replace(/\/+$/, "");
      if (!trimmed) return "";
      try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          throw new Error(`Unsupported protocol '${parsed.protocol}'`);
        }
        return `${parsed.protocol}//${parsed.host}`;
      } catch {
        if (isProduction) {
          throw new Error(
            `CRITICAL CONFIGURATION ERROR: Malformed FRONTEND_URL entry '${trimmed}' in production`
          );
        }
        return trimmed;
      }
    })
    .filter(Boolean);

  if (origins.length === 0 && isProduction) {
    throw new Error(
      "CRITICAL CONFIGURATION ERROR: FRONTEND_URL contains no valid origins in production"
    );
  }

  // In non-production, if localhost:5173 is configured, also permit 127.0.0.1:5173 loopback
  if (!isProduction) {
    if (origins.includes("http://localhost:5173") && !origins.includes("http://127.0.0.1:5173")) {
      origins.push("http://127.0.0.1:5173");
    }
  }

  return origins;
};

/**
 * Returns the CORS configuration options for Express.
 */
export const getCorsOptions = (): CorsOptions => {
  return {
    origin: (origin, callback) => {
      // 1. Allow non-browser or direct requests without an Origin header
      // (health checks, Swagger UI, server-to-server calls, curl, Supertest)
      if (!origin) {
        return callback(null, true);
      }

      let allowed: string[];
      try {
        allowed = getAllowedOrigins();
      } catch (err) {
        return callback(err as Error);
      }

      const normalizedOrigin = origin.trim().replace(/\/+$/, "");

      if (allowed.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Disallow all other origins (omits Access-Control-Allow-Origin header)
      return callback(null, false);
    },
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  };
};

/**
 * Pre-configured CORS middleware instance.
 */
export const corsMiddleware = cors(getCorsOptions());
