import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api-body";

const MAX_DOMAIN_LENGTH = 253;

const stageSchema = z.object({
  domain: z.string().trim().min(1).max(MAX_DOMAIN_LENGTH),
  stage: z.enum(["cold", "warming", "hot", "engaged", "converted"]),
});

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody(req, stageSchema);
  if (!parsed.ok) return parsed.response;
  const { domain, stage } = parsed.data;

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("watchlist")
    .update({
      pipeline_stage: stage,
      stage_changed_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("domain", domain.toLowerCase().trim())
    .eq("is_active", true);

  if (error) return NextResponse.json({ error: "Failed to update stage" }, { status: 500 });

  return NextResponse.json({ success: true, domain, stage });
}
