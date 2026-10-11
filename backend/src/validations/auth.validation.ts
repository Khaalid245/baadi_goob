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
