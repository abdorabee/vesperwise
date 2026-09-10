import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { accountUpdateColumns, accountUpdateSchema } from "@/lib/account-settings";
import { createSupabaseAdmin } from "@/lib/supabase";
import type { DbUser, UserRole } from "@/lib/types";
import { rowWriteOutcome } from "@/lib/user-provisioning-result";
import { storedWorkspaceName } from "@/lib/workspace-label";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("workspace_name, business_profile, role, email, plan")
    .eq("id", userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Failed to fetch account" }, { status: 500 });
  if (!data) {
    return NextResponse.json(
      { error: "Workspace not found. Reload and try again." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    workspace_name: storedWorkspaceName(data),
    // `users.role` has a DB default of 'sdr'; this is the first route to read it.
    role: (data.role ?? "sdr") as UserRole,
    email: data.email ?? "",
    plan: (data.plan ?? "free") as DbUser["plan"],
  });
}

/**
 * Writes the account attributes Settings owns. `workspace_name` is canonical on
 * this column — the copy inside `business_profile` is a legacy mirror that only
 * onboarding still writes, and `storedWorkspaceName` resolves between them.
 *
 * `role` is stored but not yet read by anything except the GET above. It is a
 * deliberate seam for per-role defaults, not dead code.
 */
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = accountUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid account settings",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }

  const columns = accountUpdateColumns(parsed.data);

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .update(columns)
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  const outcome = rowWriteOutcome({ data, error }, "Failed to save account settings");
  if (outcome.status !== 200) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }

  return NextResponse.json({ success: true, ...columns });
}
