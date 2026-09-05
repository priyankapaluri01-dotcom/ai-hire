import { z } from "zod";

import {
  queryIRSchema,
  type QueryIR,
} from "@/query-ir/schema";

import { generateWithLLM } from "./provider";
import { QUERY_IR_SYSTEM_PROMPT } from "./prompt-registry";

// ----------------------------------
// REFUSAL RESPONSE
// ----------------------------------

const refusalSchema = z.object({
  type: z.literal("refusal"),
  reason: z.string().min(1),
});

// ----------------------------------
// QUERY RESPONSE
// ----------------------------------

const queryResponseSchema = z.object({
  type: z.literal("query"),
  query: queryIRSchema,
});

// ----------------------------------
// LLM RESPONSE SCHEMA
// ----------------------------------

const plannerResponseSchema =
  z.discriminatedUnion("type", [
    queryResponseSchema,
    refusalSchema,
  ]);

// ----------------------------------
// EXPORTED RESULT TYPE
// ----------------------------------

export type LLMQueryResult =
  | {
      type: "query";
      query: QueryIR;
    }
  | {
      type: "refusal";
      reason: string;
    };

// ----------------------------------
// PARSE QUESTION WITH LLM
// ----------------------------------

export async function parseQuestionWithLLM(
  question: string
): Promise<LLMQueryResult> {
  const prompt = `
${QUERY_IR_SYSTEM_PROMPT}

USER QUESTION:
${question}

Return ONLY valid JSON.

If the question is a hiring analytics question
that can be answered using the available hiring
dataset, return:

{
  "type": "query",
  "query": {
    ...valid QueryIR...
  }
}

If the question is unrelated to hiring analytics,
cannot be answered using the available data,
or requests information outside the available
dataset, return:

{
  "type": "refusal",
  "reason": "Brief explanation of why the question is out of scope."
}

IMPORTANT RULES:

- Do not answer the user's question yourself.
- Do not calculate any values.
- Do not generate SQL.
- Do not generate JavaScript.
- Do not access files.
- Do not invent data.
- Do not invent fields.
- Do not invent entities.
- Only generate a valid QueryIR or a refusal.
`;

  const rawResponse =
    await generateWithLLM(prompt);

  console.log(
    "Raw Gemini response:",
    rawResponse
  );

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    throw new Error(
      `LLM returned invalid JSON: ${rawResponse}`
    );
  }

  const validatedResponse =
    plannerResponseSchema.safeParse(parsed);

  if (!validatedResponse.success) {
    console.error(
      "Invalid LLM response:",
      validatedResponse.error.flatten()
    );

    throw new Error(
      "The AI generated an invalid hiring query."
    );
  }

  return validatedResponse.data;
}