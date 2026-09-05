import type { QueryIR } from "../query-ir/schema";

export type UserRole = "RECRUITER" | "CHRO";

export type CurrentUser = {
  id: string;
  role: UserRole;
};

export type AccessScope =
  | {
      type: "RECRUITER";
      recruiterId: string;
    }
  | {
      type: "CHRO";
    };

export type ScopedQuery = QueryIR & {
  accessScope: AccessScope;
};

export function applyAccessScope(
  query: QueryIR,
  user: CurrentUser
): ScopedQuery {
  if (user.role === "CHRO") {
    return {
      ...query,
      accessScope: {
        type: "CHRO",
      },
    };
  }

  if (user.role === "RECRUITER") {
    if (query.entity === "headcount") {
      throw new Error(
        "OUT_OF_SCOPE: Recruiters do not have access to headcount data."
      );
    }

    return {
      ...query,
      accessScope: {
        type: "RECRUITER",
        recruiterId: user.id,
      },
    };
  }

  throw new Error("OUT_OF_SCOPE: Unknown user role.");
}