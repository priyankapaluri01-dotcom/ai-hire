import { describe, expect, it } from "vitest";
import { queryIRSchema } from "../query-ir/schema";

describe("QueryIR schema", () => {
  it("accepts a valid jobs query", () => {
    const query = {
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

    const result = queryIRSchema.safeParse(query);

    expect(result.success).toBe(true);
  });

  it("rejects an invalid entity", () => {
    const query = {
      version: "1",
      entity: "employees",
      filters: [],
      aggregation: {
        function: "count",
        field: "employeeId",
      },
      groupBy: [],
      limit: 50,
    };

    const result = queryIRSchema.safeParse(query);

    expect(result.success).toBe(false);
  });

  it("rejects an invalid operator", () => {
    const query = {
      version: "1",
      entity: "jobs",
      filters: [
        {
          field: "status",
          operator: "LIKE",
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

    const result = queryIRSchema.safeParse(query);

    expect(result.success).toBe(false);
  });

  it("rejects an invalid aggregation function", () => {
    const query = {
      version: "1",
      entity: "jobs",
      filters: [],
      aggregation: {
        function: "median",
        field: "timeToFill",
      },
      groupBy: [],
      limit: 50,
    };

    const result = queryIRSchema.safeParse(query);

    expect(result.success).toBe(false);
  });

  it("rejects an invalid QueryIR version", () => {
    const query = {
      version: "2",
      entity: "jobs",
      filters: [],
      aggregation: {
        function: "count",
        field: "jobId",
      },
      groupBy: [],
      limit: 50,
    };

    const result = queryIRSchema.safeParse(query);

    expect(result.success).toBe(false);
  });

  it("applies defaults for filters, groupBy, and limit", () => {
    const query = {
      version: "1",
      entity: "jobs",
      aggregation: {
        function: "count",
        field: "jobId",
      },
    };

    const result = queryIRSchema.safeParse(query);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.filters).toEqual([]);
      expect(result.data.groupBy).toEqual([]);
      expect(result.data.limit).toBe(50);
    }
  });
});