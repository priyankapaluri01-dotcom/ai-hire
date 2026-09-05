import { NextResponse } from "next/server";

import type { QueryIR } from "@/query-ir/schema";
import { queryRequestSchema } from "./schema";
import { loadDataset } from "../../../executor/data-loader";
import { executeQuery } from "../../../executor/executor";

import {
  applyAccessScope,
  type CurrentUser,
} from "../../../executor/access-control";

import { parseQuestionWithLLM } from "@/ai/llm-parser";

// ----------------------------------
// POST /api/query
// ----------------------------------

export async function POST(request: Request) {
  try {
    // ----------------------------------
    // 1. READ REQUEST
    // ----------------------------------

    const body = await request.json();

    // ----------------------------------
    // 2. VALIDATE REQUEST WITH ZOD
    // ----------------------------------

    const parsedRequest =
      queryRequestSchema.safeParse(body);

    if (!parsedRequest.success) {
      return NextResponse.json(
        {
          error: "Invalid request.",
          details:
            parsedRequest.error.flatten(),
        },
        {
          status: 400,
        }
      );
    }

    const {
      question,
      role,
    } = parsedRequest.data;

    // ----------------------------------
    // 3. TEMPORARY DEMO USER
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
    // 4. LLM → QUERY IR / REFUSAL
    // ----------------------------------

    const planned =
      await parseQuestionWithLLM(
        question
      );

    console.log(
      "Question:",
      question
    );

    console.log(
      "User:",
      user
    );

    console.log(
      "LLM Response:",
      planned
    );

    // ----------------------------------
    // 5. HANDLE REFUSAL
    // ----------------------------------

    if (
      planned.type === "refusal"
    ) {
      return NextResponse.json({
        type: "refusal",
        answer: planned.reason,
        query: null,
        result: null,
        sources: [],
        visualization: null,
      });
    }

    // ----------------------------------
    // 6. GET VALIDATED QUERY IR
    // ----------------------------------

    const query =
      planned.query;

    console.log(
      "Validated QueryIR:",
      query
    );

    // ----------------------------------
    // 7. SERVER-SIDE ACCESS CONTROL
    // ----------------------------------

    const scopedQuery =
      applyAccessScope(
        query,
        user
      );

    console.log(
      "Scoped Query:",
      scopedQuery
    );

    // ----------------------------------
    // 8. LOAD DATASET
    // ----------------------------------

    const dataset =
      loadDataset();

    // ----------------------------------
    // 9. EXECUTE QUERY
    // ----------------------------------

    const execution =
      executeQuery(
        scopedQuery,
        dataset
      );

    const result =
      execution.value;

    const sources =
      execution.sources;

    console.log(
      "Execution Result:",
      result
    );

    console.log(
      "Grounded Sources:",
      sources
    );

    // ----------------------------------
    // 10. BUILD CHART-READY RESPONSE
    // ----------------------------------

    const visualization =
      buildVisualization(
        scopedQuery,
        result
      );

    console.log(
      "Visualization:",
      visualization
    );

    // ----------------------------------
    // 11. CREATE HUMAN-READABLE ANSWER
    // ----------------------------------

    const answer =
      formatAnswer(
        question,
        result
      );

    // ----------------------------------
    // 12. RETURN RESPONSE
    // ----------------------------------

    return NextResponse.json({
      type: "query",
      answer,
      query: scopedQuery,
      result,
      sources,
      visualization,
    });
  } catch (error) {
    console.error(
      "Query API error:",
      error
    );

    if (
      error instanceof Error
    ) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to process the question.",
      },
      {
        status: 500,
      }
    );
  }
}

// ----------------------------------
// VISUALIZATION BUILDER
// ----------------------------------

function buildVisualization(
  query: QueryIR,
  result: unknown
) {
  // ----------------------------------
  // 1. GROUPED RESULTS
  // ----------------------------------

  if (
    Array.isArray(result) &&
    result.length > 0 &&
    query.groupBy.length > 0
  ) {
    const groupField =
      query.groupBy[0];

    const valueField =
      query.aggregation.function;

    // ----------------------------------
    // HEADCOUNT BY DEPARTMENT
    // → PIE CHART
    // ----------------------------------

    if (
      query.entity === "headcount" &&
      groupField === "department"
    ) {
      return {
        type: "pie" as const,
        nameKey: groupField,
        valueKey: valueField,
        data: result,
      };
    }

    // ----------------------------------
    // OTHER GROUPED ANALYTICS
    // → BAR CHART
    // ----------------------------------

    return {
      type: "bar" as const,
      xKey: groupField,
      yKey: valueField,
      data: result,
    };
  }

  // ----------------------------------
  // 2. SIMPLE NUMERIC RESULT
  // → METRIC CARD
  // ----------------------------------

  if (
    typeof result === "object" &&
    result !== null &&
    !Array.isArray(result)
  ) {
    const entries =
      Object.entries(
        result as Record<
          string,
          unknown
        >
      );

    if (
      entries.length === 1 &&
      typeof entries[0][1] ===
        "number"
    ) {
      return {
        type: "metric" as const,
        data: {
          label:
            entries[0][0],
          value:
            entries[0][1],
        },
      };
    }
  }

  // ----------------------------------
  // 3. NO VISUALIZATION
  // ----------------------------------

  return null;
}

// ----------------------------------
// ANSWER FORMATTER
// ----------------------------------

function formatAnswer(
  question: string,
  result: unknown
): string {
  // ----------------------------------
  // OBJECT RESULT
  // ----------------------------------

  if (
    typeof result === "object" &&
    result !== null &&
    !Array.isArray(result)
  ) {
    const data =
      result as Record<
        string,
        unknown
      >;

    const entries =
      Object.entries(data);

    if (
      entries.length === 1
    ) {
      const [
        key,
        value,
      ] = entries[0];

      // ----------------------------------
      // NO MATCHING RECORDS
      // ----------------------------------

      if (
        value === 0
      ) {
        return "I couldn't find any matching records in the provided hiring data.";
      }

      return `${formatLabel(
        key
      )}: ${formatValue(
        value
      )}`;
    }
  }

  // ----------------------------------
  // ARRAY RESULT
  // ----------------------------------

  if (
    Array.isArray(result)
  ) {
    // ----------------------------------
    // NO MATCHING RECORDS
    // ----------------------------------

    if (
      result.length === 0
    ) {
      return "I couldn't find any matching records in the provided hiring data.";
    }

    const first =
      result[0];

    // ----------------------------------
    // ARRAY OF OBJECTS
    // ----------------------------------

    if (
      typeof first ===
        "object" &&
      first !== null
    ) {
      const rows =
        result as Record<
          string,
          unknown
        >[];

      const text =
        rows
          .map(
            (row) => {
              return Object.entries(
                row
              )
                .map(
                  ([
                    key,
                    value,
                  ]) =>
                    `${formatLabel(
                      key
                    )}: ${formatValue(
                      value
                    )}`
                )
                .join(
                  ", "
                );
            }
          )
          .join(
            " | "
          );

      return text;
    }

    // ----------------------------------
    // ARRAY OF VALUES
    // ----------------------------------

    return `${result.length} matching records.`;
  }

  // ----------------------------------
  // SIMPLE VALUE
  // ----------------------------------

  return `Result: ${formatValue(
    result
  )}`;
}

// ----------------------------------
// FORMAT LABEL
// ----------------------------------

function formatLabel(
  value: string
): string {
  return value
    .replace(
      /([A-Z])/g,
      " $1"
    )
    .replace(
      /^./,
      (char) =>
        char.toUpperCase()
    )
    .trim();
}

// ----------------------------------
// FORMAT VALUE
// ----------------------------------

function formatValue(
  value: unknown
): string {
  if (
    typeof value ===
    "number"
  ) {
    return Number.isInteger(
      value
    )
      ? String(value)
      : value.toFixed(2);
  }

  if (
    typeof value ===
    "boolean"
  ) {
    return value
      ? "Yes"
      : "No";
  }

  return String(value);
}