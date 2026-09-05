import { NextResponse } from "next/server";

import { loadDataset } from "../../../executor/data-loader";
import { executeQuery } from "../../../executor/executor";

import {
  applyAccessScope,
  type CurrentUser,
} from "../../../executor/access-control";

import { parseQuestionWithLLM } from "@/ai/llm-parser";

export async function POST(request: Request) {
  try {
    // ----------------------------------
    // 1. READ REQUEST
    // ----------------------------------

    const body = await request.json();

    const question = body.question;
    const role = body.role;

    // ----------------------------------
    // 2. VALIDATE REQUEST
    // ----------------------------------

    if (
      typeof question !== "string" ||
      !question.trim()
    ) {
      return NextResponse.json(
        {
          error: "Please provide a valid question.",
        },
        { status: 400 }
      );
    }

    if (
      role !== "RECRUITER" &&
      role !== "CHRO"
    ) {
      return NextResponse.json(
        {
          error: "Invalid role.",
        },
        { status: 400 }
      );
    }

    // ----------------------------------
    // 3. TEMPORARY USER
    // ----------------------------------

    const user: CurrentUser =
      role === "CHRO"
        ? {
            id: "R004",
            role: "CHRO",
          }
        : {
            id: "R001",
            role: "RECRUITER",
          };

    // ----------------------------------
    // 4. LLM → QueryIR
    // ----------------------------------

    const query = await parseQuestionWithLLM(
      question
    );

    console.log("Question:", question);
    console.log("User:", user);
    console.log("LLM QueryIR:", query);

    // ----------------------------------
    // 5. SERVER-SIDE ACCESS CONTROL
    // ----------------------------------

    const scopedQuery = applyAccessScope(
      query,
      user
    );

    console.log(
      "Scoped Query:",
      scopedQuery
    );

    // ----------------------------------
    // 6. LOAD DATA
    // ----------------------------------

    const dataset = loadDataset();

    // ----------------------------------
    // 7. EXECUTE QUERY
    // ----------------------------------

    const result = executeQuery(
      scopedQuery,
      dataset
    );

    console.log("Execution Result:", result);

    // ----------------------------------
    // 8. CREATE HUMAN-READABLE ANSWER
    // ----------------------------------

    const answer = formatAnswer(
      question,
      result
    );

    // ----------------------------------
    // 9. RETURN RESPONSE
    // ----------------------------------

    return NextResponse.json({
      answer,
      query: scopedQuery,
      result,
    });
  } catch (error) {
    console.error(
      "Query API error:",
      error
    );

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to process the question.",
      },
      { status: 500 }
    );
  }
}

// ----------------------------------
// ANSWER FORMATTER
// ----------------------------------

function formatAnswer(
  question: string,
  result: unknown
): string {
  if (
    typeof result === "object" &&
    result !== null &&
    !Array.isArray(result)
  ) {
    const data =
      result as Record<string, unknown>;

    const entries = Object.entries(data);

    if (entries.length === 1) {
      const [key, value] = entries[0];

      return `${formatLabel(key)}: ${formatValue(
        value
      )}`;
    }
  }

  if (Array.isArray(result)) {
    if (result.length === 0) {
      return "No matching records found.";
    }

    const first = result[0];

    if (
      typeof first === "object" &&
      first !== null
    ) {
      const rows = result as Record<
        string,
        unknown
      >[];

      const text = rows
        .map((row) => {
          return Object.entries(row)
            .map(
              ([key, value]) =>
                `${formatLabel(
                  key
                )}: ${formatValue(value)}`
            )
            .join(", ");
        })
        .join(" | ");

      return text;
    }

    return `${result.length} matching records.`;
  }

  return `Result: ${formatValue(result)}`;
}

function formatLabel(
  value: string
): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) =>
      char.toUpperCase()
    )
    .trim();
}

function formatValue(
  value: unknown
): string {
  if (
    typeof value === "number"
  ) {
    return Number.isInteger(value)
      ? String(value)
      : value.toFixed(2);
  }

  if (
    typeof value === "boolean"
  ) {
    return value ? "Yes" : "No";
  }

  return String(value);
}