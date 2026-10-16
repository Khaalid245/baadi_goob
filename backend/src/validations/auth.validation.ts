import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string({ message: "Name is required" })
    .trim()
    .min(2, "Name must be between 2 and 100 characters")
    .max(100, "Name must be between 2 and 100 characters"),
  email: z
    .string({ message: "Email is required" })
    .trim()
    .email("Invalid email address")
    .toLowerCase(),
  password: z
    .string({ message: "Password is required" })
    .min(8, "Password must be at least 8 characters"),
  role: z
    .enum(["STUDENT", "BUSINESS"], {
      message: "Role must be either STUDENT or BUSINESS",
    })
    .default("STUDENT"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string({ message: "Email is required" })
    .trim()
    .email("Invalid email address")
    .toLowerCase(),
  password: z
    .string({ message: "Password is required" })
    .min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const passwordResetRequestSchema = z.object({
  email: z
    .string({ message: "Email is required" })
    .trim()
    .email("Invalid email address")
    .toLowerCase(),
});

export type PasswordResetRequestInput = z.infer<
  typeof passwordResetRequestSchema
>;

export const passwordResetConfirmSchema = z
  .object({
    token: z
      .string({ message: "Token is required" })
      .trim()
      .min(1, "Token is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .optional(),
  })
  .superRefine((data, ctx) => {
    const rawPwd = data.newPassword ?? data.password;
    if (!rawPwd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password is required",
        path: ["newPassword"],
      });
      return;
    }
    if (typeof rawPwd === "string" && rawPwd.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must be at least 8 characters",
        path: ["newPassword"],
      });
    }
  })
  .transform((data) => ({
    token: data.token,
    newPassword: (data.newPassword ?? data.password) as string,
  }));

export type PasswordResetConfirmInput = z.infer<
  typeof passwordResetConfirmSchema
>;
