import type { QueryIR } from "../query-ir/schema";

export function parseQuestion(question: string): QueryIR {
  const q = question.toLowerCase().trim();

  // How many open jobs?
  if (
    q.includes("how many") &&
    q.includes("open") &&
    q.includes("job")
  ) {
    return {
      version: "1",
      entity: "jobs",
      filters: [
        {
          field: "status",
          operator: "eq",
          value: "OPEN",
        },
      ],
      aggregation: {
        function: "count",
        field: "jobId",
      },
      groupBy: [],
      limit: 50,
    };
  }

  // Average time-to-fill for Engineering
  if (
    q.includes("average") &&
    (q.includes("time-to-fill") || q.includes("time to fill")) &&
    q.includes("engineering")
  ) {
    return {
      version: "1",
      entity: "jobs",
      filters: [
        {
          field: "department",
          operator: "eq",
          value: "Engineering",
        },
        {
          field: "status",
          operator: "eq",
          value: "FILLED",
        },
      ],
      aggregation: {
        function: "avg",
        field: "timeToFill",
      },
      groupBy: [],
      limit: 50,
    };
  }

  // Hires by department
  if (
    q.includes("hires") &&
    q.includes("department")
  ) {
    return {
      version: "1",
      entity: "hires",
      filters: [],
      aggregation: {
        function: "count",
        field: "hireId",
      },
      groupBy: ["department"],
      limit: 50,
    };
  }

  throw new Error(
    "UNSUPPORTED_QUERY: I couldn't understand that hiring question yet."
  );
}