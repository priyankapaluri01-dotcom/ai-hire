import { describe, expect, it } from "vitest";
import { executeQuery } from "../executor/executor";
import type { Dataset } from "../executor/data-loader";
import type { QueryIR } from "../query-ir/schema";

const dataset = {
  jobs: [
    {
      jobId: "J001",
      department: "Engineering",
      status: "OPEN",
      timeToFill: 30,
    },
    {
      jobId: "J002",
      department: "Engineering",
      status: "CLOSED",
      timeToFill: 40,
    },
    {
      jobId: "J003",
      department: "Product",
      status: "OPEN",
      timeToFill: 20,
    },
  ],

  hires: [
    {
      hireId: "H001",
      jobId: "J001",
      department: "Engineering",
    },
    {
      hireId: "H002",
      jobId: "J002",
      department: "Engineering",
    },
    {
      hireId: "H003",
      jobId: "J003",
      department: "Product",
    },
  ],

  headcount: [
    {
      department: "Engineering",
      headcount: 10,
    },
    {
      department: "Product",
      headcount: 5,
    },
  ],
} as Dataset;

describe("Deterministic query executor", () => {
  it("counts open jobs correctly", () => {
    const query: QueryIR = {
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

    const result = executeQuery(query, dataset);

    expect(result.value).toEqual({
      count: 2,
    });
  });

  it("calculates average time-to-fill correctly", () => {
    const query: QueryIR = {
      version: "1",
      entity: "jobs",
      filters: [
        {
          field: "department",
          operator: "eq",
          value: "Engineering",
        },
      ],
      aggregation: {
        function: "avg",
        field: "timeToFill",
      },
      groupBy: [],
      limit: 50,
    };

    const result = executeQuery(query, dataset);

    expect(result.value).toEqual({
      avg: 35,
    });
  });

  it("groups hires by department", () => {
    const query: QueryIR = {
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

    const result = executeQuery(query, dataset);

    expect(result.value).toEqual([
      {
        department: "Engineering",
        count: 2,
      },
      {
        department: "Product",
        count: 1,
      },
    ]);
  });

  it("calculates total headcount", () => {
    const query: QueryIR = {
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

    const result = executeQuery(query, dataset);

    expect(result.value).toEqual({
      sum: 15,
    });
  });

  it("returns zero when no records match", () => {
    const query: QueryIR = {
      version: "1",
      entity: "jobs",
      filters: [
        {
          field: "department",
          operator: "eq",
          value: "Marketing",
        },
      ],
      aggregation: {
        function: "count",
        field: "jobId",
      },
      groupBy: [],
      limit: 50,
    };

    const result = executeQuery(query, dataset);

    expect(result.value).toEqual({
      count: 0,
    });
  });

  it("creates grounded sources for executed records", () => {
    const query: QueryIR = {
      version: "1",
      entity: "jobs",
      filters: [
        {
          field: "department",
          operator: "eq",
          value: "Engineering",
        },
      ],
      aggregation: {
        function: "avg",
        field: "timeToFill",
      },
      groupBy: [],
      limit: 50,
    };

    const result = executeQuery(query, dataset);

    expect(result.sources).toHaveLength(2);

    expect(result.sources[0]).toEqual({
      dataset: "jobs.json",
      recordId: "J001",
      fields: [
        "department",
        "timeToFill",
        "jobId",
      ],
    });

    expect(result.sources[1]).toEqual({
      dataset: "jobs.json",
      recordId: "J002",
      fields: [
        "department",
        "timeToFill",
        "jobId",
      ],
    });
  });
});