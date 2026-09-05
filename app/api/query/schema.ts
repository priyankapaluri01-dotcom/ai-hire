import { z } from "zod";

export const queryRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Please provide a valid question."),

  role: z.enum(["RECRUITER", "CHRO"]),
});

export type QueryRequest = z.infer<typeof queryRequestSchema>;