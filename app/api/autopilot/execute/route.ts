import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getWorkflowsDue, executeWorkflow } from "@/lib/autopilot";

/** Constant-time check of the `Authorization: Bearer <secret>` header. */
function isAuthorized(authHeader: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authHeader ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.AUTOPILOT_CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "AUTOPILOT_CRON_SECRET not configured" }, { status: 500 });
  }

  if (!isAuthorized(authHeader, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workflows = await getWorkflowsDue();

  if (workflows.length === 0) {
    return NextResponse.json({ message: "No workflows due", processed: 0 });
  }

  const results: Array<{
    workflow_id: string;
    name: string;
    companies_checked: number;
    companies_triggered: number;
    credits_used: number;
  }> = [];

  for (const workflow of workflows) {
    try {
      const result = await executeWorkflow(workflow);
      results.push({
        workflow_id: workflow.id,
        name: workflow.name,
        companies_checked: result.companiesChecked,
        companies_triggered: result.companiesTriggered,
        credits_used: result.creditsUsed,
      });
    } catch (err) {
      console.error(`[autopilot/execute] Workflow ${workflow.id} failed:`, err);
      results.push({
        workflow_id: workflow.id,
        name: workflow.name,
        companies_checked: 0,
        companies_triggered: 0,
        credits_used: 0,
      });
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
