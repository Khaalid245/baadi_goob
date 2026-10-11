import bcrypt from "bcryptjs";
import { Prisma, Role, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { RegisterInput } from "../validations/auth.validation";
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
