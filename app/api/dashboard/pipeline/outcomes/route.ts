import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api-body";
import {
  isScoreId,
  parseScoreOutcomeInput,
} from "@/lib/score-outcomes";

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const input = parseScoreOutcomeInput(rawBody);
  if (!input) return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const { data: score, error: scoreError } = await supabase
    .from("scores")
    .select("id, domain")
    .eq("id", input.scoreId)
    .eq("user_id", userId)
    .maybeSingle();
  if (scoreError) return NextResponse.json({ error: "Unable to verify score" }, { status: 500 });
  if (!score) return NextResponse.json({ error: "Score not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("score_outcomes")
    .upsert({
      score_id: input.scoreId,
      user_id: userId,
      domain: score.domain,
      outcome: input.outcome,
      occurred_at: input.occurredAt,
      value: input.value,
      reason: input.reason,
      source: "manual",
      actor_id: userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "score_id" })
    .select("score_id, outcome, occurred_at, value, reason, source")
    .single();
  if (error) return NextResponse.json({ error: "Unable to save outcome" }, { status: 500 });

  return NextResponse.json({ outcome: data });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = await parseJsonBody(req, z.object({ score_id: z.string() }));
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (!isScoreId(body.score_id)) {
    return NextResponse.json({ error: "Invalid score ID" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("score_outcomes")
    .delete()
    .eq("score_id", body.score_id)
    .eq("user_id", userId);
  if (error) return NextResponse.json({ error: "Unable to clear outcome" }, { status: 500 });
  return NextResponse.json({ success: true });
}
