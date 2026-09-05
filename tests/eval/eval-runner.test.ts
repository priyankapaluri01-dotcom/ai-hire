import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { queryIRSchema } from "../../query-ir/schema";
import { executeQuery } from "../../executor/executor";
import type { Dataset } from "../../executor/data-loader";
import type { QueryIR } from "../../query-ir/schema";

type EvalCase = {
  id: string;
  question: string;
  expected:
    | {
        type: "query";
        entity: "jobs" | "hires" | "headcount";
        aggregation:
          | "count"
          | "sum"
          | "avg"
          | "min"
          | "max";
        department?: string;
        groupBy?: string[];
        status?: string;
      }
    | {
        type: "refusal";
      };
};

const cases = JSON.parse(
  readFileSync(
    "tests/eval/hiring-eval.json",
    "utf-8"
  )
) as EvalCase[];

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

describe("Hiring analytics evaluation set", () => {
  it("contains 20 evaluation cases", () => {
    expect(cases).toHaveLength(20);
  });

  it("contains unique evaluation IDs", () => {
    const ids = cases.map(
      (testCase) => testCase.id
    );

    expect(new Set(ids).size).toBe(
      ids.length
    );
  });

  it("contains both query and refusal cases", () => {
    const queryCases = cases.filter(
      (testCase) =>
        testCase.expected.type === "query"
    );

    const refusalCases = cases.filter(
      (testCase) =>
        testCase.expected.type === "refusal"
    );

    expect(queryCases.length).toBeGreaterThan(
      0
    );

    expect(
      refusalCases.length
    ).toBeGreaterThan(0);
  });

  it("validates query evaluation cases through Zod", () => {
    const queryCases = cases.filter(
      (
        testCase
      ): testCase is EvalCase & {
        expected: Extract<
          EvalCase["expected"],
          { type: "query" }
        >;
      } =>
        testCase.expected.type ===
        "query"
    );

    for (const testCase of queryCases) {
      const expected =
        testCase.expected;

      let aggregationField:
        | "jobId"
        | "hireId"
        | "headcount"
        | "timeToFill";

      if (
        expected.entity === "hires"
      ) {
        aggregationField = "hireId";
      } else if (
        expected.entity === "headcount"
      ) {
        aggregationField = "headcount";
      } else if (
        expected.aggregation === "count"
      ) {
        aggregationField = "jobId";
      } else {
        aggregationField =
          "timeToFill";
      }

      const filters: QueryIR["filters"] =
        [];

      if (expected.department) {
        filters.push({
          field: "department",
          operator: "eq",
          value: expected.department,
        });
      }

      if (expected.status) {
        filters.push({
          field: "status",
          operator: "eq",
          value: expected.status,
        });
      }

      const query: QueryIR = {
        version: "1",
        entity: expected.entity,
        filters,
        aggregation: {
          function:
            expected.aggregation,
          field: aggregationField,
        },
        groupBy:
          expected.groupBy ?? [],
        limit: 50,
      };

      const validation =
        queryIRSchema.safeParse(
          query
        );

      expect(
        validation.success,
        `${testCase.id} should produce a valid QueryIR`
      ).toBe(true);
    }
  });

  it("executes representative evaluation queries correctly", () => {
    const openJobs =
      executeQuery(
        {
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
        },
        dataset
      );

    expect(openJobs.value).toEqual({
      count: 2,
    });

    const engineeringHires =
      executeQuery(
        {
          version: "1",
          entity: "hires",
          filters: [
            {
              field: "department",
              operator: "eq",
              value: "Engineering",
            },
          ],
          aggregation: {
            function: "count",
            field: "hireId",
          },
          groupBy: [],
          limit: 50,
        },
        dataset
      );

    expect(
      engineeringHires.value
    ).toEqual({
      count: 2,
    });

    const totalHeadcount =
      executeQuery(
        {
          version: "1",
          entity: "headcount",
          filters: [],
          aggregation: {
            function: "sum",
            field: "headcount",
          },
          groupBy: [],
          limit: 50,
        },
        dataset
      );

    expect(
      totalHeadcount.value
    ).toEqual({
      sum: 15,
    });
  });

  it("contains explicit refusal cases", () => {
    const refusalQuestions =
      cases
        .filter(
          (testCase) =>
            testCase.expected.type ===
            "refusal"
        )
        .map(
          (testCase) =>
            testCase.question
        );

    expect(
      refusalQuestions
    ).toContain(
      "What is the weather today?"
    );

    expect(
      refusalQuestions
    ).toContain(
      "What is the company's revenue?"
    );
  });
});