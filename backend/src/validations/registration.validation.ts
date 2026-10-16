import { z } from "zod";

export const registerCompetitionParamSchema = z
  .object({
    id: z
      .string({ message: "Opportunity ID is required" })
      .trim()
      .uuid("Invalid opportunity ID"),
  })
  .strict();

export type RegisterCompetitionParam = z.infer<
  typeof registerCompetitionParamSchema
>;
