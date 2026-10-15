import { z } from "zod";
import { OpportunityType, OpportunityStatus } from "@prisma/client";

export const listOpportunitiesQuerySchema = z
  .object({
    type: z
      .preprocess(
        (val) => (typeof val === "string" ? val.toUpperCase() : val),
        z.nativeEnum(OpportunityType, {
          message: "Type must be one of: INTERNSHIP, JOB, COMPETITION",
        })
      )
      .optional(),
    skill: z
      .string({ message: "Skill must be a string" })
      .trim()
      .min(1, "Skill name cannot be empty")
      .optional(),
    deadline: z
      .string({ message: "Deadline must be a string" })
      .trim()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Deadline must be a valid date or datetime string",
      })
      .optional(),
    deadline_operator: z
      .enum(["gte", "lte"], {
        message: "deadline_operator must be 'gte' or 'lte'",
      })
      .optional()
      .default("gte"),
    deadline_from: z
      .string({ message: "deadline_from must be a string" })
      .trim()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "deadline_from must be a valid date or datetime string",
      })
      .optional(),
    deadline_to: z
      .string({ message: "deadline_to must be a string" })
      .trim()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "deadline_to must be a valid date or datetime string",
      })
      .optional(),
    q: z
      .string({ message: "Search query must be a string" })
      .trim()
      .max(100, "Search query must not exceed 100 characters")
      .optional(),
    status: z
      .preprocess(
        (val) => (typeof val === "string" ? val.toUpperCase() : val),
        z.nativeEnum(OpportunityStatus, {
          message: "Status must be one of: OPEN, CLOSED",
        })
      )
      .optional(),
    page: z
      .preprocess(
        (val) => {
          if (val === undefined || val === null || val === "") return 1;
          const parsed = Number(val);
          return isNaN(parsed) ? val : parsed;
        },
        z
          .number({ message: "Page must be a valid number" })
          .int("Page must be an integer")
          .min(1, "Page must be at least 1")
      )
      .optional()
      .default(1),
    limit: z
      .preprocess(
        (val) => {
          if (val === undefined || val === null || val === "") return 10;
          const parsed = Number(val);
          return isNaN(parsed) ? val : parsed;
        },
        z
          .number({ message: "Limit must be a valid number" })
          .int("Limit must be an integer")
          .min(1, "Limit must be at least 1")
          .max(100, "Limit cannot exceed 100")
      )
      .optional()
      .default(10),
  })
  .strict();

export type ListOpportunitiesQuery = z.infer<
  typeof listOpportunitiesQuerySchema
>;

export const opportunityIdParamSchema = z
  .object({
    id: z
      .string({ message: "Opportunity ID is required" })
      .trim()
      .min(1, "Opportunity ID cannot be empty"),
  })
  .strict();

export type OpportunityIdParam = z.infer<typeof opportunityIdParamSchema>;

export const createOpportunitySchema = z
  .object({
    type: z.nativeEnum(OpportunityType, {
      message: "Type must be one of: INTERNSHIP, JOB, COMPETITION",
    }),
    title: z
      .string({ message: "Title is required" })
      .trim()
      .min(3, "Title must be between 3 and 191 characters")
      .max(191, "Title must be between 3 and 191 characters"),
    description: z
      .string({ message: "Description is required" })
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(10000, "Description cannot exceed 10000 characters"),
    skills_required: z
      .array(
        z
          .string({ message: "Skill must be a string" })
          .trim()
          .min(1, "Skill name cannot be empty")
          .max(50, "Skill name must not exceed 50 characters"),
        { message: "skills_required must be an array of strings" }
      )
      .max(30, "Maximum of 30 skills allowed")
      .nullable()
      .optional(),
    deadline: z
      .string({ message: "Deadline is required" })
      .trim()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Deadline must be a valid date or datetime string",
      })
      .refine((val) => new Date(val).getTime() > Date.now(), {
        message: "Deadline must be in the future",
      }),
  })
  .strict();

export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;

export const updateOpportunitySchema = z
  .object({
    type: z
      .nativeEnum(OpportunityType, {
        message: "Type must be one of: INTERNSHIP, JOB, COMPETITION",
      })
      .optional(),
    title: z
      .string({ message: "Title must be a string" })
      .trim()
      .min(3, "Title must be between 3 and 191 characters")
      .max(191, "Title must be between 3 and 191 characters")
      .optional(),
    description: z
      .string({ message: "Description must be a string" })
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(10000, "Description cannot exceed 10000 characters")
      .optional(),
    skills_required: z
      .array(
        z
          .string({ message: "Skill must be a string" })
          .trim()
          .min(1, "Skill name cannot be empty")
          .max(50, "Skill name must not exceed 50 characters"),
        { message: "skills_required must be an array of strings" }
      )
      .max(30, "Maximum of 30 skills allowed")
      .nullable()
      .optional(),
    deadline: z
      .string({ message: "Deadline must be a string" })
      .trim()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Deadline must be a valid date or datetime string",
      })
      .refine((val) => new Date(val).getTime() > Date.now(), {
        message: "Deadline must be in the future",
      })
      .optional(),
  })
  .strict();

export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;
