import type { QueryIR } from "@/query-ir/schema";
import type { Dataset } from "./data-loader";
import type { ScopedQuery } from "./access-control";

type RecordValue = Record<string, unknown>;

type Source = {
  dataset: string;
  recordId: string;
  fields: string[];
};

type ExecutionResult = {
  value: unknown;
  sources: Source[];
};

export function executeQuery(
  query: QueryIR | ScopedQuery,
  dataset: Dataset
): ExecutionResult {
  let records = [
    ...dataset[query.entity],
  ] as RecordValue[];

  // --------------------------------------------------
  // SERVER-SIDE ACCESS CONTROL
  // --------------------------------------------------

  if (
    "accessScope" in query &&
    query.accessScope.type === "RECRUITER"
  ) {
    const recruiterId =
      query.accessScope.recruiterId;

    // Recruiters can only see jobs assigned to them.
    if (query.entity === "jobs") {
      records = records.filter(
        (record) =>
          record.recruiterId === recruiterId
      );
    }

    // Recruiters can only see hires belonging to
    // jobs assigned to them.
    if (query.entity === "hires") {
      const allowedJobIds = new Set(
        dataset.jobs
          .filter(
            (job) =>
              job.recruiterId ===
              recruiterId
          )
          .map((job) => job.jobId)
      );

      records = records.filter(
        (record) =>
          typeof record.jobId ===
            "string" &&
          allowedJobIds.has(
            record.jobId
          )
      );
    }
  }

  // --------------------------------------------------
  // QUERY FILTERS
  // --------------------------------------------------

  for (const filter of query.filters) {
    records = records.filter((record) => {
      const fieldValue =
        record[filter.field];

      switch (filter.operator) {
        case "eq":
          return (
            fieldValue ===
            filter.value
          );

        case "neq":
          return (
            fieldValue !==
            filter.value
          );

        case "gt":
          return (
            compareValues(
              fieldValue,
              filter.value
            ) > 0
          );

        case "gte":
          return (
            compareValues(
              fieldValue,
              filter.value
            ) >= 0
          );

        case "lt":
          return (
            compareValues(
              fieldValue,
              filter.value
            ) < 0
          );

        case "lte":
          return (
            compareValues(
              fieldValue,
              filter.value
            ) <= 0
          );

        case "contains":
          return String(fieldValue)
            .toLowerCase()
            .includes(
              String(
                filter.value
              ).toLowerCase()
            );

        default:
          return false;
      }
    });
  }

  // --------------------------------------------------
  // GROUNDED SOURCES
  // --------------------------------------------------

  const sources =
    createSources(
      query.entity,
      records,
      query
    );

  // --------------------------------------------------
  // GROUP BY
  // --------------------------------------------------

  if (query.groupBy.length > 0) {
    const groups = new Map<
      string,
      RecordValue[]
    >();

    for (const record of records) {
      const key = query.groupBy
        .map((field) =>
          String(record[field])
        )
        .join("|");

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups
        .get(key)!
        .push(record);
    }

    const groupedResults =
      Array.from(
        groups.values()
      ).map((group) => {
        const result: Record<
          string,
          unknown
        > = {};

        for (const field of query.groupBy) {
          result[field] =
            group[0][field];
        }

        result[
          query.aggregation.function
        ] = aggregate(
          group,
          query.aggregation.function,
          query.aggregation.field
        );

        return result;
      });

    return {
      value: groupedResults,
      sources,
    };
  }

  // --------------------------------------------------
  // AGGREGATION
  // --------------------------------------------------

  if (query.aggregation) {
    return {
      value: {
        [query.aggregation.function]:
          aggregate(
            records,
            query.aggregation.function,
            query.aggregation.field
          ),
      },
      sources,
    };
  }

  // --------------------------------------------------
  // SORTING
  // --------------------------------------------------

  if (query.sort) {
    const {
      field,
      direction,
    } = query.sort;

    records.sort((first, second) => {
      const comparison =
        compareValues(
          first[field],
          second[field]
        );

      return direction === "asc"
        ? comparison
        : -comparison;
    });
  }

  // --------------------------------------------------
  // RAW RECORD RESULTS
  // --------------------------------------------------

  return {
    value: records.slice(
      0,
      query.limit
    ),
    sources,
  };
}

// --------------------------------------------------
// GROUNDED SOURCE CREATION
// --------------------------------------------------

function createSources(
  entity: QueryIR["entity"],
  records: RecordValue[],
  query: QueryIR
): Source[] {
  const fields =
    new Set<string>();

  for (const filter of query.filters) {
    fields.add(filter.field);
  }

  if (query.aggregation) {
    fields.add(
      query.aggregation.field
    );
  }

  for (const field of query.groupBy) {
    fields.add(field);
  }

  let idField = "";

  switch (entity) {
    case "jobs":
      idField = "jobId";
      break;

    case "hires":
      idField = "hireId";
      break;

    case "headcount":
      idField = "department";
      break;

    default:
      idField = "";
  }

  if (idField) {
    fields.add(idField);
  }

  return records.map((record) => ({
    dataset: `${entity}.json`,
    recordId: String(
      record[idField]
    ),
    fields: Array.from(fields),
  }));
}

// --------------------------------------------------
// DETERMINISTIC AGGREGATION
// --------------------------------------------------

function aggregate(
  records: RecordValue[],
  functionName:
    QueryIR["aggregation"]["function"],
  field: string
): number | null {
  if (records.length === 0) {
    return 0;
  }

  const values = records
    .map((record) => record[field])
    .filter(
      (value) =>
        value !== null &&
        value !== undefined
    );

  switch (functionName) {
    case "count":
      return records.length;

    case "sum": {
      const numericValues =
        values.map(Number);

      return numericValues.reduce(
        (
          total: number,
          value: number
        ) => total + value,
        0
      );
    }

    case "avg": {
      if (values.length === 0) {
        return null;
      }

      const numericValues =
        values.map(Number);

      return (
        numericValues.reduce(
          (
            total: number,
            value: number
          ) => total + value,
          0
        ) /
        numericValues.length
      );
    }

    case "min": {
      if (values.length === 0) {
        return null;
      }

      const numericValues =
        values.map(Number);

      return Math.min(
        ...numericValues
      );
    }

    case "max": {
      if (values.length === 0) {
        return null;
      }

      const numericValues =
        values.map(Number);

      return Math.max(
        ...numericValues
      );
    }

    default:
      return null;
  }
}

// --------------------------------------------------
// SAFE VALUE COMPARISON
// --------------------------------------------------

function compareValues(
  first: unknown,
  second: unknown
): number {
  if (
    typeof first === "number" &&
    typeof second === "number"
  ) {
    return first - second;
  }

  if (
    typeof first === "string" &&
    typeof second === "string"
  ) {
    return first.localeCompare(
      second
    );
  }

  const firstNumber =
    Number(first);

  const secondNumber =
    Number(second);

  if (
    !Number.isNaN(firstNumber) &&
    !Number.isNaN(secondNumber)
  ) {
    return (
      firstNumber - secondNumber
    );
  }

  return String(first).localeCompare(
    String(second)
  );
}