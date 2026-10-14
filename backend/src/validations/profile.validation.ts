import { z } from "zod";

export const updateStudentProfileSchema = z
  .object({
    education: z
      .string({ message: "Education must be a string" })
      .trim()
      .max(191, "Education must not exceed 191 characters")
      .nullable()
      .optional(),
    skills: z
      .array(
        z
          .string({ message: "Skill must be a string" })
          .trim()
          .min(1, "Skill name cannot be empty")
          .max(50, "Skill name must not exceed 50 characters"),
        { message: "Skills must be an array of strings" }
      )
      .max(30, "Maximum of 30 skills allowed")
      .nullable()
      .optional(),
    project_links: z
      .array(
        z
          .string({ message: "Project link must be a valid URL string" })
          .trim()
          .url("Each project link must be a valid URL")
          .max(255, "Project link URL must not exceed 255 characters"),
        { message: "Project links must be an array of URL strings" }
      )
      .max(10, "Maximum of 10 project links allowed")
      .nullable()
      .optional(),
  })
  .strict();

export type UpdateStudentProfileInput = z.infer<
  typeof updateStudentProfileSchema
>;

export const updateBusinessProfileSchema = z
  .object({
    company_name: z
      .string({ message: "Company name is required" })
      .trim()
      .min(2, "Company name must be between 2 and 191 characters")
      .max(191, "Company name must be between 2 and 191 characters"),
  })
  .strict();

export type UpdateBusinessProfileInput = z.infer<
  typeof updateBusinessProfileSchema
>;
