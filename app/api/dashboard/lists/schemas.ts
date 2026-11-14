import { z } from "zod";
import type { ListRule } from "@/lib/lists-types";

const MAX_NAME = 120;
const MAX_DESCRIPTION = 500;
const MAX_COLOR = 32;
const MAX_RULES = 20;
const MAX_DOMAIN = 253;
const MAX_COMPANY_NAME = 200;
export const MAX_LIST_DOMAINS = 500;

const SIGNALS = ["funding", "hiring", "news", "technology", "web"] as const;

const scoreRule = z.object({
  field: z.literal("score"),
  op: z.enum([">=", "<=", "="]),
  value: z.number().min(0).max(100),
});
const bandRule = z.object({
  field: z.literal("score_band"),
  op: z.literal("is"),
  value: z.enum(["HOT", "WARM", "COLD"]),
});
const watchlistRule = z.object({
  field: z.literal("in_watchlist"),
  op: z.literal("is"),
  value: z.boolean(),
});
const signalRule = z.object({
  field: z.literal("signal"),
  signal: z.enum(SIGNALS),
  op: z.literal("active"),
  minStrength: z.number().min(0).max(100).optional(),
});

export const listRulesSchema: z.ZodType<ListRule[]> = z
  .array(z.discriminatedUnion("field", [scoreRule, bandRule, watchlistRule, signalRule]))
  .max(MAX_RULES);

export const domainSchema = z.string().trim().min(1).max(MAX_DOMAIN);
const companyNameSchema = z.string().max(MAX_COMPANY_NAME);

export const createListSchema = z.object({
  name: z.string().trim().min(1).max(MAX_NAME),
  description: z.string().max(MAX_DESCRIPTION).optional(),
  list_type: z.enum(["manual", "smart"]).optional(),
  color: z.string().max(MAX_COLOR).optional(),
  rules: listRulesSchema.optional(),
  auto_refresh: z.boolean().optional(),
  domains: z
    .array(z.object({ domain: domainSchema, company_name: companyNameSchema.optional() }))
    .max(MAX_LIST_DOMAINS)
    .optional(),
});

export const previewRulesSchema = z.object({ rules: listRulesSchema });

export const updateListSchema = z.object({
  name: z.string().trim().min(1).max(MAX_NAME).optional(),
  description: z.string().max(MAX_DESCRIPTION).nullish(),
  color: z.string().max(MAX_COLOR).optional(),
  rules: listRulesSchema.optional(),
  auto_refresh: z.boolean().optional(),
});

export const addMemberSchema = z.object({
  domain: domainSchema,
  company_name: companyNameSchema.optional(),
});
