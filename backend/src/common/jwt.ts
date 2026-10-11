import jwt, {
  SignOptions,
  VerifyOptions,
  JsonWebTokenError,
  TokenExpiredError,
} from "jsonwebtoken";
import { Role } from "@prisma/client";

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
}

export interface GenerateTokenOptions {
  expiresIn?: SignOptions["expiresIn"];
}

/**
 * Retrieves and validates the JWT_SECRET environment variable.
 * Throws immediately if the secret is missing or empty.
 * Never uses a hardcoded fallback secret.
 */
export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === "") {
    throw new Error("JWT_SECRET is not configured or is empty");
  }
  return secret;
};

/**
 * Type guard to verify whether an unknown value is a valid Prisma Role enum value.
 */
export const isValidRole = (value: unknown): value is Role => {
  return typeof value === "string" && Object.values(Role).includes(value as Role);
};

/**
 * Validates untrusted token claims to ensure they conform to JwtPayload.
 * Guarantees untrusted claims are not blindly treated as application payloads.
 */
export const validateJwtPayload = (decoded: unknown): JwtPayload => {
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token payload: expected an object");
  }

  const { id, email, role } = decoded as Record<string, unknown>;

  if (typeof id !== "string" || id.trim() === "") {
    throw new Error("Invalid token payload: missing or invalid 'id'");
  }

  if (typeof email !== "string" || email.trim() === "") {
    throw new Error("Invalid token payload: missing or invalid 'email'");
  }

  if (!isValidRole(role)) {
    throw new Error("Invalid token payload: missing or invalid 'role'");
  }

  return {
    id,
    email,
    role,
  };
};

/**
 * Generates and signs a JSON Web Token with the provided payload.
 * Defaults to 15 minutes expiration.
 */
export const generateToken = (
  payload: JwtPayload,
  options?: GenerateTokenOptions
): string => {
  const secret = getJwtSecret();
  validateJwtPayload(payload);

  const signOptions: SignOptions = {
    expiresIn: options?.expiresIn ?? "15m",
  };

  return jwt.sign({ ...payload }, secret, signOptions);
};

/**
 * Verifies a JWT token signature, expiration, and claims structure.
 * Returns the strongly-typed JwtPayload.
 */
export const verifyToken = (
  token: string,
  options?: VerifyOptions
): JwtPayload => {
  const secret = getJwtSecret();

  if (!token || typeof token !== "string" || token.trim() === "") {
    throw new Error("Token must be a non-empty string");
  }

  const decoded = jwt.verify(token, secret, options);
  return validateJwtPayload(decoded);
};

export { JsonWebTokenError, TokenExpiredError };
