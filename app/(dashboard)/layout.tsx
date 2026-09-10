import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOnboardingRedirect } from "@/lib/onboarding-profile";
import { createSupabaseAdmin } from "@/lib/supabase";
import { ensureUserRecord } from "@/lib/user-provisioning";
import { storedWorkspaceName } from "@/lib/workspace-label";
import DashboardShell from "@/components/dashboard/dashboard-shell";
import { WorkspaceSetupError } from "@/components/workspace-setup-error";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const provisioned = await ensureUserRecord(userId);
  if (!provisioned.ok) return <WorkspaceSetupError />;

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin
    .from("users")
    .select("credits_remaining, onboarding_completed, plan, workspace_name, business_profile")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return <WorkspaceSetupError />;

  const creditsRemaining = profile.credits_remaining ?? 0;
  const onboardingCompleted = profile.onboarding_completed ?? false;
  const plan = (profile.plan as "free" | "starter" | "growth" | "pro" | "agency" | undefined) ?? "free";

  const onboardingRedirect = getOnboardingRedirect(onboardingCompleted, "dashboard");
  if (onboardingRedirect) redirect(onboardingRedirect);

  const { count: inboxCount } = await admin
    .from("inbox_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)
    .eq("is_archived", false);

  const [{ count: watchlistCount }, { count: pipelineHotCount }] = await Promise.all([
    admin
      .from("watchlist")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true),
    admin
      .from("watchlist")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true)
      .eq("score_band", "HOT"),
  ]);

  return (
    <DashboardShell
      creditsRemaining={creditsRemaining}
      plan={plan}
      workspaceName={storedWorkspaceName(profile)}
      inboxCount={inboxCount ?? 0}
      watchlistCount={watchlistCount ?? 0}
      pipelineHotCount={pipelineHotCount ?? 0}
    >
      {children}
    </DashboardShell>
  );
}
