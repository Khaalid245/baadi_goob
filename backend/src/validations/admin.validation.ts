import { z } from "zod";
import { VerificationStatus } from "@prisma/client";

export const listBusinessesQuerySchema = z
  .object({
    status: z
      .preprocess(
        (val) => {
          if (val === undefined || val === null || val === "") {
            return "PENDING";
          }
          return typeof val === "string" ? val.toUpperCase() : val;
        },
        z.nativeEnum(VerificationStatus, {
          message: "Status must be one of: PENDING, VERIFIED, REJECTED",
        })
      )
      .optional()
      .default(VerificationStatus.PENDING),
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

export type ListBusinessesQuery = z.infer<typeof listBusinessesQuerySchema>;

export const verifyBusinessParamSchema = z
  .object({
    id: z
      .string({ message: "Business ID is required" })
      .trim()
      .uuid("Invalid business ID"),
  })
  .strict();

export type VerifyBusinessParam = z.infer<typeof verifyBusinessParamSchema>;

export const verifyBusinessBodySchema = z
  .object({
    status: z
      .preprocess(
        (val) => (typeof val === "string" ? val.toUpperCase() : val),
        z.enum(["VERIFIED", "REJECTED"], {
          message: "Verification status must be VERIFIED or REJECTED",
        })
      )
      .optional(),
    verification_status: z
      .preprocess(
        (val) => (typeof val === "string" ? val.toUpperCase() : val),
        z.enum(["VERIFIED", "REJECTED"], {
          message: "Verification status must be VERIFIED or REJECTED",
        })
      )
      .optional(),
    decision: z
      .preprocess(
        (val) => (typeof val === "string" ? val.toUpperCase() : val),
        z.enum(["VERIFIED", "REJECTED"], {
          message: "Verification decision must be VERIFIED or REJECTED",
        })
      )
      .optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.status !== undefined ||
      data.verification_status !== undefined ||
      data.decision !== undefined,
    {
      message:
        "Verification status is required and must be VERIFIED or REJECTED",
    }
  );

export type VerifyBusinessBody = z.infer<typeof verifyBusinessBodySchema>;
