import { z } from "zod";

export const applyOpportunityParamSchema = z
  .object({
    id: z
      .string({ message: "Opportunity ID is required" })
      .trim()
      .min(1, "Opportunity ID cannot be empty"),
  })
  .strict();

export type ApplyOpportunityParam = z.infer<typeof applyOpportunityParamSchema>;

export const updateApplicationStatusParamSchema = z
  .object({
    id: z
      .string({ message: "Application ID is required" })
      .trim()
      .min(1, "Application ID cannot be empty"),
  })
  .strict();

export type UpdateApplicationStatusParam = z.infer<
  typeof updateApplicationStatusParamSchema
>;

export const updateApplicationStatusBodySchema = z
  .object({
    status: z.enum(["SHORTLISTED", "REJECTED", "HIRED"], {
      message: "Status must be one of: SHORTLISTED, REJECTED, HIRED",
    }),
  })
  .strict();

export type UpdateApplicationStatusBody = z.infer<
  typeof updateApplicationStatusBodySchema
>;
