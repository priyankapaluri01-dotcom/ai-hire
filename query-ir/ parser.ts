import { z } from "zod";
import { queryIRSchema, type QueryIR } from "@/query-ir/schema";
import { generateWithLLM } from "../ai/provider";
import { QUERY_IR_SYSTEM_PROMPT } from "../ai/prompt-registry";

const refusalSchema = z.object({
  type: z.literal("refusal"),
  reason: z.string(),
});

const queryResponseSchema = z.object({
  type: z.literal("query"),
  query: queryIRSchema,
});

const plannerResponseSchema = z.discriminatedUnion("type", [
  queryResponseSchema,
  refusalSchema,
]);

export type LLMQueryResult =
  | {
      type: "query";
      query: QueryIR;
    }
  | {
      type: "refusal";
      reason: string;
    };

export async function parseQuestionWithLLM(
  question: string
): Promise<LLMQueryResult> {
  const prompt = `
${QUERY_IR_SYSTEM_PROMPT}

USER QUESTION:
${question}

Return ONLY valid JSON.

For a valid hiring analytics question, return:

{
  "type": "query",
  "query": {
    "version": "1",
    "entity": "jobs",
    "filters": [],
    "aggregation": {
      "function": "count",
      "field": "jobId"
    },
    "groupBy": [],
    "limit": 50
  }
}

For an unrelated or unsupported question, return:

{
  "type": "refusal",
  "reason": "The question is outside the available hiring data."
}
`;

  const rawResponse = await generateWithLLM(prompt);

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    throw new Error("LLM returned invalid JSON.");
  }

  const result = plannerResponseSchema.safeParse(parsed);

  if (!result.success) {
    console.error(
      "Invalid LLM response:",
      result.error.flatten()
    );

    throw new Error(
      "The AI generated an invalid hiring query."
    );
  }

  return result.data;
}