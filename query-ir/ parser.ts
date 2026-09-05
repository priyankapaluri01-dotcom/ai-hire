import type { QueryIR } from "./schema";

export function parseQuestion(question: string): QueryIR {
  const q = question.toLowerCase().trim();

  // ----------------------------------
  // HOW MANY OPEN JOBS
  // ----------------------------------
  if (
    q.includes("open jobs") ||
    q.includes("open job") ||
    q.includes("how many open")
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

  // ----------------------------------
  // HIRES BY DEPARTMENT
  // ----------------------------------
  if (
    q.includes("hires by department") ||
    q.includes("hiring by department") ||
    q.includes("hires per department")
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

  // ----------------------------------
  // AVERAGE TIME TO FILL
  // ----------------------------------
  if (
    q.includes("average time-to-fill") ||
    q.includes("average time to fill") ||
    q.includes("average time") ||
    q.includes("avg time")
  ) {
    const filters = [];

    if (q.includes("engineering")) {
      filters.push({
        field: "department",
        operator: "eq" as const,
        value: "Engineering",
      });
    }

    if (q.includes("product")) {
      filters.push({
        field: "department",
        operator: "eq" as const,
        value: "Product",
      });
    }

    if (q.includes("sales")) {
      filters.push({
        field: "department",
        operator: "eq" as const,
        value: "Sales",
      });
    }

    return {
      version: "1",
      entity: "jobs",
      filters,
      aggregation: {
        function: "avg",
        field: "timeToFill",
      },
      groupBy: [],
      limit: 50,
    };
  }

  // ----------------------------------
  // HEADCOUNT BY DEPARTMENT
  // ----------------------------------
  if (
    q.includes("headcount") ||
    q.includes("head count")
  ) {
    return {
      version: "1",
      entity: "headcount",
      filters: [],
      aggregation: {
        function: "sum",
        field: "headcount",
      },
      groupBy: [],
      limit: 50,
    };
  }

  // ----------------------------------
  // FALLBACK
  // ----------------------------------
  throw new Error(
    "I don't understand that question yet. Try asking about open jobs, hires by department, average time-to-fill, or headcount."
  );
}