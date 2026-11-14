import { z } from "zod";

const MAX_URL_LENGTH = 2048;
const MAX_NAME_LENGTH = 120;
const MAX_ACTIONS = 20;
const MAX_CONDITIONS = 20;
const MAX_SOURCE_DOMAINS = 100;
const MAX_DOMAIN_LENGTH = 253;
const SLACK_WEBHOOK_HOST = "hooks.slack.com";

const httpsUrl = z
  .string()
  .max(MAX_URL_LENGTH)
  .refine((value) => {
    try {
      const url = new URL(value);
      // Bracketed IPv6 literals are refused: URL.hostname keeps the brackets, which
      // the shared guard's isIP() check does not recognise.
      return (
        url.protocol === "https:" && !url.username && !url.password && !url.hostname.startsWith("[")
      );
    } catch {
      return false;
    }
  }, "Must be an https URL without credentials");

const slackUrl = httpsUrl.refine((value) => {
  try {
    return new URL(value).hostname.toLowerCase() === SLACK_WEBHOOK_HOST;
  } catch {
    return false;
  }
}, `Host must be ${SLACK_WEBHOOK_HOST}`);

const score = z.number().min(0).max(100);
const scoreBand = z.enum(["HOT", "WARM", "COLD"]);

export const conditionSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("score_above"), params: z.strictObject({ threshold: score }) }),
  z.strictObject({ type: z.literal("score_below"), params: z.strictObject({ threshold: score }) }),
  z.strictObject({
    type: z.literal("score_change"),
    params: z.strictObject({ direction: z.enum(["up", "down", "any"]), min_change: score }),
  }),
  z.strictObject({
    type: z.literal("band_change"),
    params: z.strictObject({ from: scoreBand.optional(), to: scoreBand.optional() }),
  }),
  z.strictObject({
    type: z.literal("signal_spike"),
    params: z.strictObject({
      signal: z.enum(["funding", "hiring", "news", "technology", "web_activity", "web", "github"]),
      min_ratio: z.number().min(0).max(1).optional(),
    }),
  }),
]);

export const actionSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("email_draft"),
    params: z.strictObject({ tone: z.enum(["formal", "casual", "executive"]).optional() }),
  }),
  z.strictObject({ type: z.literal("webhook"), params: z.strictObject({ url: httpsUrl }) }),
  z.strictObject({ type: z.literal("slack"), params: z.strictObject({ webhook_url: slackUrl }) }),
  z.strictObject({
    type: z.literal("pipeline_stage"),
    params: z.strictObject({ stage: z.enum(["cold", "warming", "hot", "engaged", "converted"]) }),
  }),
  z.strictObject({ type: z.literal("notification"), params: z.strictObject({}) }),
]);

const name = z.string().trim().min(1).max(MAX_NAME_LENGTH);
const sourceDomains = z.array(z.string().trim().min(1).max(MAX_DOMAIN_LENGTH)).max(MAX_SOURCE_DOMAINS).nullable();
const conditions = z.array(conditionSchema).min(1).max(MAX_CONDITIONS);
const actions = z.array(actionSchema).min(1).max(MAX_ACTIONS);

export const createWorkflowSchema = z.strictObject({
  name,
  source_type: z.enum(["watchlist", "specific_domains"]).optional(),
  source_domains: sourceDomains.optional(),
  schedule: z.enum(["daily", "weekly"]).optional(),
  conditions,
  condition_logic: z.enum(["any", "all"]).optional(),
  actions,
});

export const updateWorkflowSchema = z.strictObject({
  name: name.optional(),
  is_enabled: z.boolean().optional(),
  source_type: z.enum(["watchlist", "specific_domains"]).optional(),
  source_domains: sourceDomains.optional(),
  schedule: z.enum(["daily", "weekly"]).optional(),
  conditions: conditions.optional(),
  condition_logic: z.enum(["any", "all"]).optional(),
  actions: actions.optional(),
});

export const testWorkflowSchema = z.strictObject({
  workflow_id: z.string().min(1).max(64),
  domain: z.string().trim().min(1).max(MAX_DOMAIN_LENGTH),
});

export type ValidAction = z.infer<typeof actionSchema>;

export interface RequestIssue {
  path: string;
  message: string;
}

/** Field paths and messages only, never the submitted values. */
export function toIssues(error: z.ZodError): RequestIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}
