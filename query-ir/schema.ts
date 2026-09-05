import { z } from "zod";

const filterSchema = z.object({
  field: z.string().min(1),
  operator: z.enum([
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "contains",
  ]),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

const aggregationSchema = z.object({
  function: z.enum(["count", "sum", "avg", "min", "max"]),
  field: z.string().min(1),
});

const sortSchema = z.object({
  field: z.string().min(1),
  direction: z.enum(["asc", "desc"]),
});

export const queryIRSchema = z.object({
  version: z.literal("1"),

  entity: z.enum([
    "jobs",
    "hires",
    "headcount",
  ]),

  filters: z.array(filterSchema).default([]),

  aggregation: aggregationSchema,

  groupBy: z.array(z.string()).default([]),

  sort: sortSchema.optional(),

  limit: z.number().int().min(1).max(100).default(50),
});

export type QueryIR = z.infer<typeof queryIRSchema>;