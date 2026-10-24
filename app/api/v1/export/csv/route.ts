import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { toCSVRaw, type CsvColumn } from "@/lib/csv";
import { canUseFeature, featureDeniedMessage, parsePlan, requiredPlanFor } from "@/lib/plan-features";
import { createSupabaseAdmin } from "@/lib/supabase";

const MAX_ROWS = 5_000;

function isColumn(value: unknown): value is CsvColumn {
  if (!value || typeof value !== "object") return false;
  const column = value as { key?: unknown; label?: unknown };
  return typeof column.key === "string" && typeof column.label === "string";
}

/** Server gate for dashboard CSV export. Free and Starter receive 403. */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();
  const { data: planRow } = await supabase.from("users").select("plan").eq("id", userId).maybeSingle();
  const plan = parsePlan(planRow?.plan);
  if (!canUseFeature(plan, "csv")) {
    return NextResponse.json(
      { error: featureDeniedMessage(plan, "csv"), upgrade_to: requiredPlanFor("csv") },
      { status: 403 },
    );
  }

  let body: { columns?: unknown; rows?: unknown; filename?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.columns) || !body.columns.every(isColumn) || body.columns.length === 0) {
    return NextResponse.json({ error: "columns are required" }, { status: 400 });
  }
  if (!Array.isArray(body.rows)) {
    return NextResponse.json({ error: "rows are required" }, { status: 400 });
  }
  if (body.rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Maximum ${MAX_ROWS} rows` }, { status: 400 });
  }

  const filename = typeof body.filename === "string" && body.filename.trim()
    ? body.filename.trim().replace(/[^\w.-]+/g, "-")
    : "vesperwise-export.csv";
  const csv = toCSVRaw(body.columns, body.rows as Array<Record<string, unknown>>);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
