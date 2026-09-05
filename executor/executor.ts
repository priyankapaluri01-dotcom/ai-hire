import type { QueryIR } from "@/query-ir/schema";
import type { Dataset } from "./data-loader";

export function executeQuery(
  query: QueryIR,
  dataset: Dataset
): unknown {
  let records: any[] = [...dataset[query.entity]];

  // -----------------------------
  // 1. FILTER
  // -----------------------------
  for (const filter of query.filters) {
    records = records.filter((record) => {
      const fieldValue = record[filter.field];

      switch (filter.operator) {
        case "eq":
          return fieldValue === filter.value;

        case "neq":
          return fieldValue !== filter.value;

        case "gt":
          return fieldValue > filter.value;

        case "gte":
          return fieldValue >= filter.value;

        case "lt":
          return fieldValue < filter.value;

        case "lte":
          return fieldValue <= filter.value;

        case "contains":
          return String(fieldValue)
            .toLowerCase()
            .includes(String(filter.value).toLowerCase());

        default:
          return false;
      }
    });
  }

  // -----------------------------
  // 2. GROUP BY
  // -----------------------------
  if (query.groupBy.length > 0) {
    const groups = new Map<string, any[]>();

    for (const record of records) {
      const key = query.groupBy
        .map((field) => String(record[field]))
        .join("|");

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key)!.push(record);
    }

    return Array.from(groups.entries()).map(([_, group]) => {
      const result: Record<string, unknown> = {};

      for (const field of query.groupBy) {
        result[field] = group[0][field];
      }

      result[query.aggregation.function] = aggregate(
        group,
        query.aggregation.function,
        query.aggregation.field
      );

      return result;
    });
  }

  // -----------------------------
  // 3. AGGREGATION
  // -----------------------------
  if (query.aggregation) {
    return {
      [query.aggregation.function]: aggregate(
        records,
        query.aggregation.function,
        query.aggregation.field
      ),
    };
  }

  // -----------------------------
  // 4. SORT
  // -----------------------------
  if (query.sort) {
    const { field, direction } = query.sort;

    records.sort((a, b) => {
      if (a[field] < b[field]) {
        return direction === "asc" ? -1 : 1;
      }

      if (a[field] > b[field]) {
        return direction === "asc" ? 1 : -1;
      }

      return 0;
    });
  }

  // -----------------------------
  // 5. LIMIT
  // -----------------------------
  return records.slice(0, query.limit);
}

function aggregate(
  records: any[],
  functionName: QueryIR["aggregation"]["function"],
  field: string
): number | null {
  if (records.length === 0) {
    return 0;
  }

  const values = records
    .map((record) => record[field])
    .filter((value) => value !== null && value !== undefined);

  switch (functionName) {
    case "count":
      return records.length;

    case "sum":
      return values.reduce(
        (total, value) => total + Number(value),
        0
      );

    case "avg":
      if (values.length === 0) return null;

      return (
        values.reduce(
          (total, value) => total + Number(value),
          0
        ) / values.length
      );

    case "min":
      if (values.length === 0) return null;

      return Math.min(...values.map(Number));

    case "max":
      if (values.length === 0) return null;

      return Math.max(...values.map(Number));

    default:
      return null;
  }
}