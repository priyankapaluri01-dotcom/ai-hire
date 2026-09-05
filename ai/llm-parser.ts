import { queryIRSchema, type QueryIR } from "@/query-ir/schema";
import { generateWithLLM } from "./provider";
import { QUERY_IR_SYSTEM_PROMPT } from "./prompt-registry";

export async function parseQuestionWithLLM(
  question: string
): Promise<QueryIR> {
  const prompt = `
${QUERY_IR_SYSTEM_PROMPT}

USER QUESTION:
${question}

Return ONLY the QueryIR JSON object.
`;

  const rawResponse = await generateWithLLM(prompt);

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    throw new Error(
      `LLM returned invalid JSON: ${rawResponse}`
    );
  }

  const validatedQuery = queryIRSchema.safeParse(parsed);

  if (!validatedQuery.success) {
    console.error(
      "Invalid QueryIR from LLM:",
      validatedQuery.error.flatten()
    );

    throw new Error(
      "The AI generated an invalid hiring query."
    );
  }

  return validatedQuery.data;
}