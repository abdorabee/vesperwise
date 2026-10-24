import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { canUseFeature, featureDeniedMessage, parsePlan, requiredPlanFor } from "@/lib/plan-features";
import { PLAN_AUTOPILOT_LIMIT } from "@/lib/types";
import type { AutopilotCondition, AutopilotAction, AutopilotSchedule, AutopilotSourceType, AutopilotConditionLogic } from "@/lib/types";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("autopilot_workflows")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 });
  return NextResponse.json({ workflows: data ?? [] });
}

interface CreateBody {
  name: string;
  source_type?: AutopilotSourceType;
  source_domains?: string[];
  schedule?: AutopilotSchedule;
  conditions: AutopilotCondition[];
  condition_logic?: AutopilotConditionLogic;
  actions: AutopilotAction[];
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as CreateBody;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!body.conditions || body.conditions.length === 0) {
    return NextResponse.json({ error: "At least one condition is required" }, { status: 400 });
  }
  if (!body.actions || body.actions.length === 0) {
    return NextResponse.json({ error: "At least one action is required" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  // Check plan limit
  const [{ data: user }, { count }] = await Promise.all([
    supabase.from("users").select("plan").eq("id", userId).single(),
    supabase.from("autopilot_workflows").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const plan = parsePlan(user?.plan);
  if (!canUseFeature(plan, "autopilot")) {
    return NextResponse.json(
      { error: featureDeniedMessage(plan, "autopilot"), upgrade_to: requiredPlanFor("autopilot") },
      { status: 403 },
    );
  }
  const limit = PLAN_AUTOPILOT_LIMIT[plan];
  if (limit !== null && (count ?? 0) >= limit) {
    return NextResponse.json(
      { error: `Workflow limit (${limit}) reached for your ${plan} plan. Upgrade to create more.` },
      { status: 403 }
    );
  }

  const schedule = body.schedule ?? "daily";
  const intervalMs = schedule === "daily" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

  const { data, error } = await supabase
    .from("autopilot_workflows")
    .insert({
      user_id: userId,
      name: body.name.trim(),
      source_type: body.source_type ?? "watchlist",
      source_domains: body.source_domains ?? null,
      schedule,
      next_run_at: new Date(Date.now() + intervalMs).toISOString(),
      conditions: body.conditions,
      condition_logic: body.condition_logic ?? "any",
      actions: body.actions,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
