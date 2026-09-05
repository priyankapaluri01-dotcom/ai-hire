import { describe, expect, it } from "vitest";
import {
  applyAccessScope,
  type CurrentUser,
} from "../executor/access-control";
import type { QueryIR } from "../query-ir/schema";

const jobsQuery: QueryIR = {
  version: "1",
  entity: "jobs",
  filters: [],
  aggregation: {
    function: "count",
    field: "jobId",
  },
  groupBy: [],
  limit: 50,
};

const headcountQuery: QueryIR = {
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

describe("Server-side access control", () => {
  it("allows CHRO to access jobs", () => {
    const user: CurrentUser = {
      id: "R004",
      role: "CHRO",
    };

    const result = applyAccessScope(
      jobsQuery,
      user
    );

    expect(result.accessScope).toEqual({
      type: "CHRO",
    });
  });

  it("allows CHRO to access headcount", () => {
    const user: CurrentUser = {
      id: "R004",
      role: "CHRO",
    };

    const result = applyAccessScope(
      headcountQuery,
      user
    );

    expect(result.accessScope).toEqual({
      type: "CHRO",
    });
  });

  it("allows recruiters to access jobs", () => {
    const user: CurrentUser = {
      id: "R001",
      role: "RECRUITER",
    };

    const result = applyAccessScope(
      jobsQuery,
      user
    );

    expect(result.accessScope).toEqual({
      type: "RECRUITER",
      recruiterId: "R001",
    });
  });

  it("rejects recruiter access to headcount", () => {
    const user: CurrentUser = {
      id: "R001",
      role: "RECRUITER",
    };

    expect(() =>
      applyAccessScope(
        headcountQuery,
        user
      )
    ).toThrow(
      "OUT_OF_SCOPE: Recruiters do not have access to headcount data."
    );
  });

  it("rejects an unknown role", () => {
    const user = {
      id: "R999",
      role: "ADMIN",
    } as unknown as CurrentUser;

    expect(() =>
      applyAccessScope(
        jobsQuery,
        user
      )
    ).toThrow(
      "OUT_OF_SCOPE: Unknown user role."
    );
  });
});