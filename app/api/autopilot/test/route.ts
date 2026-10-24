import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { canUseFeature, featureDeniedMessage, parsePlan, requiredPlanFor } from "@/lib/plan-features";
import { scoreCompany, domainToCompanyName } from "@/lib/score-service";
import { evaluateConditions } from "@/lib/autopilot";
import { evaluateV2ScoreTransition } from "@/lib/score-transition";
import type { DbAutopilotWorkflow } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workflow_id, domain } = (await req.json()) as { workflow_id: string; domain: string };
  if (!workflow_id || !domain) {
    return NextResponse.json({ error: "workflow_id and domain are required" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  const [{ data: workflow }, { data: user }] = await Promise.all([
    supabase.from("autopilot_workflows").select("*").eq("id", workflow_id).eq("user_id", userId).single(),
    supabase.from("users").select("*").eq("id", userId).single(),
  ]);

  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const plan = parsePlan(user.plan);
  if (!canUseFeature(plan, "autopilot")) {
    return NextResponse.json(
      { error: featureDeniedMessage(plan, "autopilot"), upgrade_to: requiredPlanFor("autopilot") },
      { status: 403 },
    );
  }

  const typedWorkflow = workflow as DbAutopilotWorkflow;

  // Score the company (costs 1 credit)
  const scoreResult = await scoreCompany({
    domain,
    userId,
    companyName: domainToCompanyName(domain),
    productCategory: user.product_category ?? "B2B SaaS",
    businessProfile: user.business_profile,
  });

  const transition = evaluateV2ScoreTransition(scoreResult);
  const oldScore = transition.previousScore;
  const oldBand = transition.previousBand;

  if (
    scoreResult.score_status !== "complete" ||
    scoreResult.intent_score === null ||
    scoreResult.score_band === null ||
    !transition.canTriggerAutomation
  ) {
    return NextResponse.json({
      test_result: {
        domain,
        company: scoreResult.company,
        old_score: oldScore,
        new_score: scoreResult.intent_score,
        old_band: oldBand,
        new_band: scoreResult.score_band,
        triggered: false,
        trigger_reasons: [
          scoreResult.is_baseline
            ? "Automation suppressed for the first v2 baseline"
            : scoreResult.cached || scoreResult.idempotent_replayed
              ? "Automation suppressed for a cached or replayed result"
              : scoreResult.score_status !== "complete"
                ? `Automation suppressed for ${scoreResult.score_status} scoring coverage`
                : "Automation suppressed because no persisted v2 score transition occurred",
        ],
        actions_that_would_fire: [],
      },
    });
  }

  const { triggered, reasons } = evaluateConditions(
    typedWorkflow.conditions,
    typedWorkflow.condition_logic,
    {
      oldScore,
      newScore: scoreResult.intent_score,
      oldBand,
      newBand: scoreResult.score_band,
      signals: scoreResult.signals,
    }
  );

  return NextResponse.json({
    test_result: {
      domain,
      company: scoreResult.company,
      old_score: oldScore,
      new_score: scoreResult.intent_score,
      old_band: oldBand,
      new_band: scoreResult.score_band,
      triggered,
      trigger_reasons: reasons,
      actions_that_would_fire: triggered ? typedWorkflow.actions.map((a) => a.type) : [],
    },
  });
}
