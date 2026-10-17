import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Prisma, Role, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { generateToken } from "../common/jwt";
import {
  RegisterInput,
  LoginInput,
  PasswordResetRequestInput,
  PasswordResetConfirmInput,
} from "../validations/auth.validation";
import { AppError } from "../middleware/errorHandler";

const BCRYPT_SALT_ROUNDS = 10;
export const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
export const PASSWORD_RESET_GENERIC_MESSAGE =
  "If that email is registered, a password reset link has been sent.";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  created_at: Date;
}

export interface LoginResult {
  user: SafeUser;
  token: string;
}

/**
 * Computes SHA-256 hash of a reset token for secure storage and comparison.
 */
export const hashResetToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Registers a new user with hashed password and default or specified role.
 * Throws AppError(409) if the email is already in use or upon concurrent P2002 conflict.
 */
export const registerUser = async (input: RegisterInput): Promise<SafeUser> => {
  const { name, email, password, role } = input;

  // Initial duplicate email check
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError("Email already in use", 409);
  }

  // Hash password with bcryptjs (work factor 10)
  const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        created_at: true,
      },
    });

    return user;
  } catch (error: unknown) {
    if (
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002") ||
      (typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "P2002")
    ) {
      throw new AppError("Email already in use", 409);
    }

    throw error;
  }
};

/**
 * Authenticates user credentials and issues a signed JWT token.
 * Returns identical 401 error for nonexistent emails and incorrect passwords.
 * Rejects suspended accounts with HTTP 403 without issuing a token.
 */
export const loginUser = async (input: LoginInput): Promise<LoginResult> => {
  const { email, password } = input;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  if (user.status === UserStatus.DELETED) {
    throw new AppError("Account has been deleted", 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  if (user.status === UserStatus.SUSPENDED) {
    throw new AppError("Account is suspended. Please contact support.", 403);
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const safeUser: SafeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
  };

  return {
    user: safeUser,
    token,
  };
};

/**
 * Retrieves the safe user identity profile for the currently authenticated user (FR-016).
 * Returns the exact safe fields matching loginUser: id, name, email, role, status, created_at.
 * Throws AppError(401) if the account no longer exists or is deleted.
 * Throws AppError(403) if the account is suspended.
 */
export const getCurrentUser = async (userId: string): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      created_at: true,
    },
  });

  if (!user) {
    throw new AppError("User account no longer exists", 401);
  }

  if (user.status === UserStatus.DELETED) {
    throw new AppError("Account has been deleted", 401);
  }

  if (user.status === UserStatus.SUSPENDED) {
    throw new AppError("Account is suspended. Please contact support.", 403);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
  };
};

/**
 * Initiates a password reset request (FR-017).
 * - Validates email and returns identical generic response regardless of whether
 *   the user exists or is suspended (anti-enumeration).
 * - Generates cryptographically secure single-use token and stores only its SHA-256 hash.
 * - Supersedes any existing unused tokens for this user.
 */
export const requestPasswordReset = async (
  input: PasswordResetRequestInput
): Promise<{ message: string }> => {
  const { email } = input;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Anti-enumeration: Return generic message if user not found
  if (!user) {
    return { message: PASSWORD_RESET_GENERIC_MESSAGE };
  }

  // Anti-enumeration & security: Do not generate active tokens for suspended or deleted accounts
  if (
    user.status === UserStatus.SUSPENDED ||
    user.status === UserStatus.DELETED
  ) {
    return { message: PASSWORD_RESET_GENERIC_MESSAGE };
  }

  // Invalidate any previous unexpired reset tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: {
      user_id: user.id,
      used_at: null,
    },
    data: {
      used_at: new Date(),
    },
  });

  // Generate cryptographically secure random token (32 bytes = 256 bits = 64 hex characters)
  const rawToken = crypto.randomBytes(32).toString("hex");
  const token_hash = hashResetToken(rawToken);
  const expires_at = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  await prisma.passwordResetToken.create({
    data: {
      user_id: user.id,
      token_hash,
      expires_at,
    },
  });

  // Note on outbound email:
  // No external SMTP or email service provider is currently configured in the environment.
  // When an email provider is configured, the reset link with rawToken should be sent via email here.
  // Security guard: NEVER log rawToken and NEVER expose it in API responses.

  return { message: PASSWORD_RESET_GENERIC_MESSAGE };
};

/**
 * Confirms a password reset request (FR-017).
 * - Validates token against stored SHA-256 hash.
 * - Rejects invalid, expired, or already-used tokens.
 * - Rejects reset for suspended accounts with HTTP 403.
 * - Atomically marks token as used and updates password with bcrypt hash.
 */
export const confirmPasswordReset = async (
  input: PasswordResetConfirmInput
): Promise<{ message: string }> => {
  const { token, newPassword } = input;

  const token_hash = hashResetToken(token);

  const tokenRecord = await prisma.passwordResetToken.findUnique({
    where: { token_hash },
    include: { user: true },
  });

  if (
    !tokenRecord ||
    tokenRecord.used_at !== null ||
    tokenRecord.expires_at < new Date()
  ) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  if (
    tokenRecord.user.status === UserStatus.SUSPENDED ||
    tokenRecord.user.status === UserStatus.DELETED
  ) {
    throw new AppError("Account is suspended. Please contact support.", 403);
  }

  const password_hash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  // Atomically invalidate token and update password in single transaction
  await prisma.$transaction(async (tx) => {
    const updateResult = await tx.passwordResetToken.updateMany({
      where: {
        id: tokenRecord.id,
        used_at: null,
        expires_at: { gt: new Date() },
      },
      data: {
        used_at: new Date(),
      },
    });

    if (updateResult.count === 0) {
      throw new AppError("Invalid or expired reset token", 400);
    }

    await tx.user.update({
      where: { id: tokenRecord.user_id },
      data: { password_hash },
    });
  });

  return { message: "Password has been reset successfully" };
};
