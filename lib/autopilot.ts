import { createSupabaseAdmin } from "@/lib/supabase";
import {
  domainToCompanyName,
  InsufficientCreditsError,
  scoreCompany,
} from "@/lib/score-service";
import type {
  AutopilotCondition,
  AutopilotConditionLogic,
  AutopilotAction,
  DbAutopilotWorkflow,
  DbUser,
  IntentScore,
  ScoreBand,
  SignalSet,
} from "@/lib/types";
import { canUseFeature, parsePlan } from "@/lib/plan-features";
import { evaluateV2ScoreTransition } from "@/lib/score-transition";
import { actionSchema, type ValidAction } from "@/lib/autopilot-schema";
import { postBulkWebhook, WebhookDeliveryError } from "@/lib/webhook-url";

// ─── Condition Evaluation ───────────────────────────────────────────────────

interface EvalContext {
  oldScore: number | null;
  newScore: number;
  oldBand: ScoreBand | null;
  newBand: ScoreBand;
  signals: SignalSet;
}

interface EvalResult {
  triggered: boolean;
  reasons: string[];
}

function evaluateSingleCondition(condition: AutopilotCondition, ctx: EvalContext): string | null {
  const { oldScore, newScore, oldBand, newBand, signals } = ctx;
  const p = condition.params;

  switch (condition.type) {
    case "score_above": {
      const threshold = p.threshold as number;
      if (newScore >= threshold) return `Score ${newScore} is above ${threshold}`;
      return null;
    }
    case "score_below": {
      const threshold = p.threshold as number;
      if (newScore < threshold) return `Score ${newScore} is below ${threshold}`;
      return null;
    }
    case "score_change": {
      if (oldScore === null) return null;
      const direction = p.direction as "up" | "down" | "any";
      const minChange = p.min_change as number;
      const delta = newScore - oldScore;
      const absDelta = Math.abs(delta);
      if (absDelta < minChange) return null;
      if (direction === "up" && delta > 0) return `Score increased by ${delta} (${oldScore} → ${newScore})`;
      if (direction === "down" && delta < 0) return `Score decreased by ${absDelta} (${oldScore} → ${newScore})`;
      if (direction === "any") return `Score changed by ${delta > 0 ? "+" : ""}${delta} (${oldScore} → ${newScore})`;
      return null;
    }
    case "band_change": {
      if (!oldBand || oldBand === newBand) return null;
      const from = p.from as ScoreBand | undefined;
      const to = p.to as ScoreBand | undefined;
      if (from && oldBand !== from) return null;
      if (to && newBand !== to) return null;
      return `Band changed ${oldBand} → ${newBand}`;
    }
    case "signal_spike": {
      const signalKey = p.signal as keyof Omit<SignalSet, "latestSignalDate">;
      const minRatio = (p.min_ratio as number) ?? 0.7;
      const signal = signals[signalKey];
      if (!signal) return null;
      const ratio = signal.score / signal.max;
      if (ratio >= minRatio) return `${signalKey} signal at ${Math.round(ratio * 100)}% (${signal.score}/${signal.max})`;
      return null;
    }
    default:
      return null;
  }
}

export function evaluateConditions(
  conditions: AutopilotCondition[],
  conditionLogic: AutopilotConditionLogic,
  ctx: EvalContext
): EvalResult {
  if (conditions.length === 0) return { triggered: false, reasons: [] };

  const reasons: string[] = [];
  for (const condition of conditions) {
    const reason = evaluateSingleCondition(condition, ctx);
    if (reason) reasons.push(reason);
  }

  const triggered =
    conditionLogic === "any"
      ? reasons.length > 0
      : reasons.length === conditions.length;

  return { triggered, reasons };
}

// ─── Action Execution ───────────────────────────────────────────────────────

export interface ActionContext {
  domain: string;
  companyName: string;
  scoreResult: IntentScore;
  triggerReasons: string[];
  userId: string;
  workflowName: string;
}

async function executeEmailDraft(
  action: ValidAction,
  ctx: ActionContext
): Promise<{ result: unknown; credits: number }> {
  const { scoreResult } = ctx;
  return {
    result: {
      email_subject: scoreResult.email_subject,
      talk_track: scoreResult.talk_track,
      ai_summary: scoreResult.ai_summary,
      recommended_action: scoreResult.recommended_action,
      key_triggers: scoreResult.key_triggers,
      tone: (action.type === "email_draft" ? action.params.tone : undefined) ?? "casual",
    },
    credits: 0.5,
  };
}

/** Fixed, coarse codes stored for a failed action. Never remote status, body, or raw error text. */
export type ActionFailureCode =
  | "blocked_url"
  | "request_failed"
  | "timeout"
  | "invalid_action"
  | "action_failed";

export const ACTION_DELIVERED = "delivered";

class ActionFailure extends Error {
  readonly code: ActionFailureCode;
  constructor(code: ActionFailureCode) {
    super(code);
    this.name = "ActionFailure";
    this.code = code;
  }
}

function toDeliveryFailure(err: unknown): ActionFailure {
  if (!(err instanceof WebhookDeliveryError)) return new ActionFailure("request_failed");
  if (/deadline|timeout/i.test(err.message)) return new ActionFailure("timeout");
  if (err.responded) return new ActionFailure("request_failed");
  if (err.permanent) return new ActionFailure("blocked_url");
  return new ActionFailure("request_failed");
}

/** Validated, DNS-pinned, redirect-free POST. Only Content-Type is ever sent. */
async function deliver(url: string, payload: unknown): Promise<{ result: unknown; credits: number }> {
  try {
    await postBulkWebhook(url, payload);
  } catch (err) {
    throw toDeliveryFailure(err);
  }
  return { result: ACTION_DELIVERED, credits: 0 };
}

async function executeWebhook(
  action: ValidAction,
  ctx: ActionContext
): Promise<{ result: unknown; credits: number }> {
  if (action.type !== "webhook") throw new ActionFailure("invalid_action");
  return deliver(action.params.url, {
    event: "autopilot.triggered",
    workflow: ctx.workflowName,
    company: ctx.companyName,
    domain: ctx.domain,
    score: ctx.scoreResult.intent_score,
    score_band: ctx.scoreResult.score_band,
    triggers: ctx.triggerReasons,
    ai_summary: ctx.scoreResult.ai_summary,
    recommended_action: ctx.scoreResult.recommended_action,
    timestamp: new Date().toISOString(),
  });
}

async function executeSlack(
  action: ValidAction,
  ctx: ActionContext
): Promise<{ result: unknown; credits: number }> {
  if (action.type !== "slack") throw new ActionFailure("invalid_action");
  const text = [
    `*Autopilot: ${ctx.workflowName}*`,
    `Company: *${ctx.companyName}* (${ctx.domain})`,
    `Score: *${ctx.scoreResult.intent_score}/100* [${ctx.scoreResult.score_band}]`,
    `Triggers: ${ctx.triggerReasons.join(", ")}`,
    `Action: ${ctx.scoreResult.recommended_action}`,
  ].join("\n");
  return deliver(action.params.webhook_url, { text });
}

async function executePipelineStage(
  action: ValidAction,
  ctx: ActionContext
): Promise<{ result: unknown; credits: number }> {
  if (action.type !== "pipeline_stage") throw new ActionFailure("invalid_action");
  const stage = action.params.stage;
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from("watchlist")
    .update({ pipeline_stage: stage, stage_changed_at: new Date().toISOString() })
    .eq("user_id", ctx.userId)
    .eq("domain", ctx.domain)
    .eq("is_active", true);

  if (error) {
    console.error("[autopilot] pipeline_stage update failed:", error.message);
    throw new ActionFailure("action_failed");
  }
  return { result: { stage, message: `Moved to ${stage}` }, credits: 0 };
}

async function executeNotification(
  _action: ValidAction,
  ctx: ActionContext
): Promise<{ result: unknown; credits: number }> {
  return {
    result: {
      title: `${ctx.companyName} triggered "${ctx.workflowName}"`,
      body: ctx.triggerReasons.join("; "),
      score: ctx.scoreResult.intent_score,
      score_band: ctx.scoreResult.score_band,
    },
    credits: 0,
  };
}

/** Re-validates the stored action (rows may predate validation) before running it. */
export async function executeAction(
  rawAction: AutopilotAction,
  ctx: ActionContext
): Promise<{ result: unknown; credits: number; status: "success" | "failed" }> {
  const parsed = actionSchema.safeParse(rawAction);
  if (!parsed.success) return failedAction("invalid_action");
  const action = parsed.data;
  try {
    const out = await runAction(action, ctx);
    return { ...out, status: "success" };
  } catch (err) {
    if (err instanceof ActionFailure) return failedAction(err.code);
    console.error("[autopilot] action failed:", action.type);
    return failedAction("action_failed");
  }
}

function failedAction(code: ActionFailureCode) {
  return { result: { error: code }, credits: 0, status: "failed" as const };
}

function runAction(action: ValidAction, ctx: ActionContext): Promise<{ result: unknown; credits: number }> {
  switch (action.type) {
    case "email_draft":
      return executeEmailDraft(action, ctx);
    case "webhook":
      return executeWebhook(action, ctx);
    case "slack":
      return executeSlack(action, ctx);
    case "pipeline_stage":
      return executePipelineStage(action, ctx);
    case "notification":
      return executeNotification(action, ctx);
  }
}

// ─── Workflow Execution ─────────────────────────────────────────────────────

interface WorkflowWithUser extends DbAutopilotWorkflow {
  user: DbUser;
}

export async function getWorkflowsDue(): Promise<WorkflowWithUser[]> {
  const supabase = createSupabaseAdmin();

  const { data: workflows, error } = await supabase
    .from("autopilot_workflows")
    .select("*")
    .eq("is_enabled", true)
    .lte("next_run_at", new Date().toISOString())
    .limit(50);

  if (error || !workflows || workflows.length === 0) return [];

  const userIds = [...new Set(workflows.map((w: DbAutopilotWorkflow) => w.user_id))];
  const { data: users } = await supabase
    .from("users")
    .select("*")
    .in("id", userIds);

  if (!users) return [];

  const userMap = new Map(users.map((u: DbUser) => [u.id, u]));

  return workflows
    .map((w: DbAutopilotWorkflow) => {
      const user = userMap.get(w.user_id);
      if (!user) return null;
      return { ...w, user } as WorkflowWithUser;
    })
    .filter(Boolean) as WorkflowWithUser[];
}

async function getCompaniesForWorkflow(
  workflow: DbAutopilotWorkflow
): Promise<Array<{ domain: string; company_name: string; score: number | null; score_band: ScoreBand | null }>> {
  const supabase = createSupabaseAdmin();

  if (workflow.source_type === "watchlist") {
    const { data } = await supabase
      .from("watchlist")
      .select("domain, company_name, score, score_band")
      .eq("user_id", workflow.user_id)
      .eq("is_active", true);
    return (data ?? []).map((d) => ({
      domain: d.domain,
      company_name: d.company_name,
      score: d.score,
      score_band: d.score_band as ScoreBand | null,
    }));
  }

  // specific_domains
  return (workflow.source_domains ?? []).map((domain) => ({
    domain,
    company_name: domainToCompanyName(domain),
    score: null,
    score_band: null,
  }));
}

export async function executeWorkflow(
  workflow: WorkflowWithUser
): Promise<{ companiesChecked: number; companiesTriggered: number; creditsUsed: number }> {
  const supabase = createSupabaseAdmin();
  const { user } = workflow;
  const plan = parsePlan(user.plan);

  if (!canUseFeature(plan, "autopilot")) {
    const intervalMs = workflow.schedule === "daily" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    await supabase
      .from("autopilot_workflows")
      .update({ next_run_at: new Date(Date.now() + intervalMs).toISOString() })
      .eq("id", workflow.id);
    return { companiesChecked: 0, companiesTriggered: 0, creditsUsed: 0 };
  }

  // Create run record
  const { data: run, error: runError } = await supabase
    .from("autopilot_runs")
    .insert({
      workflow_id: workflow.id,
      user_id: workflow.user_id,
      status: "running",
    })
    .select("id")
    .single();

  if (runError || !run) {
    console.error("[autopilot] Failed to create run:", runError);
    return { companiesChecked: 0, companiesTriggered: 0, creditsUsed: 0 };
  }

  const companies = await getCompaniesForWorkflow(workflow);
  let companiesChecked = 0;
  let companiesTriggered = 0;
  let totalCreditsUsed = 0;
  let hasError = false;

  for (const company of companies) {
    try {
      // Rescore the company (this deducts 1 credit internally)
      const scoreResult = await scoreCompany({
        domain: company.domain,
        userId: workflow.user_id,
        companyName: company.company_name,
        productCategory: user.product_category ?? "B2B SaaS",
        businessProfile: user.business_profile,
      });
      if (scoreResult.charged) totalCreditsUsed += 1;
      companiesChecked++;

      // Partial/unscorable results cannot drive workflow actions. Baselines,
      // cached/replayed results, and unchanged scores are filtered by the
      // persisted same-version transition below.
      if (
        scoreResult.score_status !== "complete" ||
        scoreResult.intent_score === null ||
        scoreResult.score_band === null
      ) {
        continue;
      }

      const transition = evaluateV2ScoreTransition(scoreResult);
      if (!transition.canTriggerAutomation) continue;

      // Evaluate conditions
      const ctx: EvalContext = {
        oldScore: transition.previousScore,
        newScore: scoreResult.intent_score,
        oldBand: transition.previousBand,
        newBand: scoreResult.score_band,
        signals: scoreResult.signals,
      };

      const { triggered, reasons } = evaluateConditions(
        workflow.conditions,
        workflow.condition_logic,
        ctx
      );

      if (!triggered) continue;
      companiesTriggered++;

      // Execute each action
      const actionCtx: ActionContext = {
        domain: company.domain,
        companyName: scoreResult.company,
        scoreResult,
        triggerReasons: reasons,
        userId: workflow.user_id,
        workflowName: workflow.name,
      };

      for (const action of workflow.actions) {
        const { result, credits, status } = await executeAction(action, actionCtx);
        totalCreditsUsed += credits;

        // Deduct credits for AI actions
        if (credits > 0) {
          await supabase.rpc("deduct_autopilot_credits", {
            p_user_id: workflow.user_id,
            p_amount: credits,
            p_reason: `Autopilot: ${action.type} for ${company.domain}`,
          });
        }

        // Log the action
        await supabase.from("autopilot_actions").insert({
          run_id: run.id,
          workflow_id: workflow.id,
          user_id: workflow.user_id,
          domain: company.domain,
          company_name: scoreResult.company,
          trigger_reason: reasons.join("; "),
          old_score: transition.previousScore,
          new_score: scoreResult.intent_score,
          old_band: transition.previousBand,
          new_band: scoreResult.score_band,
          action_type: action.type,
          action_result: result,
          action_status: status,
          credits_used: credits,
        });
      }
    } catch (err) {
      console.error(`[autopilot] Error processing ${company.domain}:`, err);
      hasError = true;
      // Cached scores are free, so only the transactional scorer knows whether
      // a balance is actually required. Stop once a true cache miss is rejected.
      if (err instanceof InsufficientCreditsError) break;
    }
  }

  // Advance next_run_at
  const intervalMs = workflow.schedule === "daily" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const nextRun = new Date(Date.now() + intervalMs).toISOString();

  // Update workflow metadata
  await supabase
    .from("autopilot_workflows")
    .update({
      next_run_at: nextRun,
      last_run_at: new Date().toISOString(),
      total_runs: workflow.total_runs + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workflow.id);

  // Finalize run
  const finalStatus = hasError
    ? companiesChecked > 0 ? "partial" : "failed"
    : "completed";

  await supabase
    .from("autopilot_runs")
    .update({
      status: finalStatus,
      companies_checked: companiesChecked,
      companies_triggered: companiesTriggered,
      credits_used: totalCreditsUsed,
      error_message: hasError ? "Insufficient credits or processing error" : null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", run.id);

  return { companiesChecked, companiesTriggered, creditsUsed: totalCreditsUsed };
}
