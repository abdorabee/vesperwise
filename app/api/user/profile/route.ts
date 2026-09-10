import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  mergeBusinessProfile,
  profilePatchSchema,
  profileUpdateSchema,
} from "@/lib/business-profile";
import { createSupabaseAdmin } from "@/lib/supabase";
import { profileWriteOutcome } from "@/lib/user-provisioning-result";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("business_profile, onboarding_completed, product_category, workspace_name")
    .eq("id", userId)
    .single();

  if (error) return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });

  return NextResponse.json({
    business_profile: data?.business_profile ?? null,
    onboarding_completed: data?.onboarding_completed ?? false,
    workspace_name: data?.workspace_name ?? null,
  });
}

/**
 * Settings ICP saves. Unlike PUT (which onboarding owns) this never touches
 * `onboarding_completed` or `workspace_name`, and accepts a partial body:
 * the patch is merged onto the stored profile and the MERGED result is what
 * gets validated, so an edit can't leave the row invalid.
 *
 * Known and accepted: the read-modify-write has a lost-update window. The only
 * writer is the owning user's own Settings form, so last-write-wins is correct
 * enough to not warrant a jsonb-merge RPC.
 *
 * Not handled: a `scoring_policies` row pinned to the pre-edit profile hash via
 * `icp_key` silently drops a rank after an ICP change. Nothing in the product
 * can create such a row today (no caller sends `icp_key`), and re-pointing it
 * would mean pulling server-only hashing into this route.
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

  const parsed = profilePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid business_profile",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdmin();

  const { data: current, error: readError } = await supabase
    .from("users")
    .select("business_profile")
    .eq("id", userId)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json(
      { error: "Workspace not found. Reload and try again." },
      { status: 404 }
    );
  }

  const merged = mergeBusinessProfile(current.business_profile, parsed.data.business_profile);
  if (!merged.ok) {
    return NextResponse.json(
      { error: "Invalid business_profile", issues: merged.issues },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("users")
    .update({
      business_profile: merged.profile,
      // Denormalized copy the scorer and copilot read. PUT keeps it in sync, so
      // PATCH must too or an ICP edit would leave it stale.
      product_category: merged.profile.product_category,
    })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  const outcome = profileWriteOutcome({ data, error });
  if (outcome.status !== 200) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }

  return NextResponse.json({ success: true, business_profile: merged.profile });
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const hasProfile = typeof body === "object" && body !== null && "business_profile" in body;
    return NextResponse.json(
      {
        error: hasProfile ? "Invalid business_profile" : "business_profile is required",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }
  const profile = parsed.data.business_profile;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .update({
      business_profile: profile,
      product_category: profile.product_category,
      workspace_name: profile.workspace_name ?? null,
      onboarding_completed: true,
    })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  const outcome = profileWriteOutcome({ data, error });
  if (outcome.status !== 200) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }

  return NextResponse.json({ success: true });
}
