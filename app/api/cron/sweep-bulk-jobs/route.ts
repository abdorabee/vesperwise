import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sweepStaleBulkJobs } from "@/lib/bulk-job-runner";
import { createSupabaseAdmin } from "@/lib/supabase";

function isAuthorized(req: NextRequest, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(req.headers.get("authorization") ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Marks bulk jobs that stopped making progress as failed so they release the concurrency cap. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }
  if (!isAuthorized(req, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const failed = await sweepStaleBulkJobs(createSupabaseAdmin());
  return NextResponse.json({ failed });
}
