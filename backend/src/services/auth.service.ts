import bcrypt from "bcryptjs";
import { Prisma, Role, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { generateToken } from "../common/jwt";
import { RegisterInput, LoginInput } from "../validations/auth.validation";
import { AppError } from "../middleware/errorHandler";

const BCRYPT_SALT_ROUNDS = 10;

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
