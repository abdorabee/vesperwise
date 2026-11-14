import { parseCsvRecords } from "@/lib/csv-parse";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { toCSVRaw } from "@/lib/csv";
import { BULK_MAX_PER_JOB, canUseFeature, featureDeniedMessage, parsePlan, requiredPlanFor } from "@/lib/plan-features";
import { canonicalizeDomain } from "@/lib/score-service";
import { createSupabaseAdmin } from "@/lib/supabase";
import { getActiveScoringVersion } from "@/lib/scorer";
import { enforceV1RateLimit } from "@/app/api/v1/rate-limit";

const MAX_UPLOAD_BYTES = 1024 * 1024;
const DOMAIN_QUERY_CHUNK = 200;

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();
  const { data: planRow } = await supabase.from("users").select("plan").eq("id", userId).maybeSingle();
  const limited = await enforceV1RateLimit(userId, planRow?.plan ?? null);
  if (limited) return limited;
  const plan = parsePlan(planRow?.plan);
  if (!canUseFeature(plan, "csv")) {
    return NextResponse.json(
      { error: featureDeniedMessage(plan, "csv"), upgrade_to: requiredPlanFor("csv") },
      { status: 403 },
    );
  }

  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_UPLOAD_BYTES * 2) return uploadTooLarge();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "CSV file required (field: file)" }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) return uploadTooLarge();

  const text = await file.text();
  const rows = parseCsvRecords(text);

  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows found in CSV" }, { status: 400 });
  }
  if (rows.length > BULK_MAX_PER_JOB) {
    return NextResponse.json(
      { error: `Maximum ${BULK_MAX_PER_JOB} rows per upload. Your file has ${rows.length} rows.` },
      { status: 413 },
    );
  }

  // Resolve the caller's latest persisted v2 score. Scores are personalized,
  // so a global domain cache is neither authoritative nor safe to reuse.
  const domains = [...new Set(rows.flatMap((row) => {
    const candidate = row.domain ?? row.company ?? "";
    try {
      return [canonicalizeDomain(candidate)];
    } catch {
      return [];
    }
  }))];
  const scoringVersion = getActiveScoringVersion();
  const { rows: scoreRows, failed: scoreError } = await loadScoreRows(supabase, userId, scoringVersion, domains);
  if (scoreError) {
    return NextResponse.json({ error: "Failed to load personalized scores" }, { status: 500 });
  }

  const latestByDomain = new Map<string, ScoreRow>();
  for (const score of scoreRows) {
    if (!latestByDomain.has(score.domain)) latestByDomain.set(score.domain, score);
  }
  const scored: Array<Record<string, string | number>> = [];
  for (const row of rows) {
    let domain = "";
    try {
      domain = canonicalizeDomain(row.domain ?? row.company ?? "");
    } catch {
      // Preserve the input row and leave score fields blank.
    }
    const latest = latestByDomain.get(domain);
    const targetingEligible =
      latest?.score_status === "complete" &&
      Number(latest.data_coverage ?? 0) >= 1;
    scored.push({
      ...row,
      intent_score: latest?.score ?? "",
      score_band: latest?.score_band ?? "",
      score_status: latest?.score_status ?? "not_scored",
      targeting_eligible: targetingEligible ? "yes" : "no",
      data_coverage: latest?.data_coverage == null
        ? ""
        : `${Math.round(Number(latest.data_coverage) * 100)}%`,
      icp_fit_score: latest?.icp_fit_score ?? "",
      scoring_version: latest ? scoringVersion : "",
      ai_summary: latest?.ai_summary ?? "Score not available — call /api/v1/score first",
    });
  }

  // Sort by intent score descending
  scored.sort((a, b) => {
    const eligibility = Number(b.targeting_eligible === "yes") -
      Number(a.targeting_eligible === "yes");
    return eligibility || Number(b.intent_score || -1) - Number(a.intent_score || -1);
  });

  // Build dynamic columns from the data keys
  if (scored.length === 0) {
    return new NextResponse("", {
      headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="vesperwise_prioritized.csv"` },
    });
  }

  const columns = Object.keys(scored[0]).map((key) => ({ key, label: key }));
  const csvOutput = toCSVRaw(columns, scored);

  return new NextResponse(csvOutput, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vesperwise_prioritized.csv"`,
    },
  });
}

async function getUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const { createHash } = await import("node:crypto");
    const keyHash = createHash("sha256").update(authHeader.slice(7)).digest("hex");
    const { data } = await createSupabaseAdmin()
      .from("api_keys")
      .select("user_id, is_active")
      .eq("key_hash", keyHash)
      .maybeSingle();
    return data?.is_active ? data.user_id : null;
  }

  const session = await auth();
  return session.userId;
}

type ScoreRow = {
  domain: string;
  score: number | null;
  score_band: string | null;
  ai_summary: string | null;
  score_status: string | null;
  data_coverage: number | null;
  icp_fit_score: number | null;
  created_at: string;
};

function uploadTooLarge(): NextResponse {
  return NextResponse.json(
    { error: `CSV must be ${MAX_UPLOAD_BYTES / 1024 / 1024} MB or smaller` },
    { status: 413 },
  );
}

/** Loads unexpired scores in `.in()` chunks, newest first within each chunk. */
async function loadScoreRows(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  userId: string,
  scoringVersion: string,
  domains: string[],
): Promise<{ rows: ScoreRow[]; failed: boolean }> {
  const rows: ScoreRow[] = [];
  for (let i = 0; i < domains.length; i += DOMAIN_QUERY_CHUNK) {
    const { data, error } = await supabase
      .from("scores")
      .select("domain, score, score_band, ai_summary, score_status, data_coverage, icp_fit_score, created_at")
      .eq("user_id", userId)
      .eq("scoring_version", scoringVersion)
      .in("domain", domains.slice(i, i + DOMAIN_QUERY_CHUNK))
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (error) return { rows: [], failed: true };
    rows.push(...((data ?? []) as ScoreRow[]));
  }
  return { rows, failed: false };
}
