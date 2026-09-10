import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import OnboardingWizard from "@/components/onboarding/onboarding-wizard";
import { WorkspaceSetupError } from "@/components/workspace-setup-error";
import { getOnboardingRedirect } from "@/lib/onboarding-profile";
import { getWorkspaceLabel, storedWorkspaceName } from "@/lib/workspace-label";
import { createSupabaseAdmin } from "@/lib/supabase";
import type { BusinessProfile } from "@/lib/types";
import { ensureUserRecord } from "@/lib/user-provisioning";

export const metadata: Metadata = {
  title: "Set Up Your Profile",
  robots: { index: false, follow: false },
};

function domainFromEmail(email: string | null | undefined): string | null {
  const at = email?.split("@")[1]?.trim().toLowerCase();
  return at || null;
}

export default async function OnboardingPage() {
  // Outside production, proxy.ts leaves /onboarding public so reviewers can see
  // the flow without a Clerk account. Resolve the session first regardless: a
  // signed-in visitor gets the real, fully working flow even on a preview
  // deploy, and only a signed-out one falls back to the static stub (where
  // /api/v1/score would 401 and no scoring is possible).
  const isPreview = process.env.VERCEL_ENV !== "production";
  const { userId } = await auth();

  if (!userId) {
    if (!isPreview) redirect("/login");
    return (
      <OnboardingWizard
        initialProfile={{ workspace_name: "" }}
        emailDomain={null}
        email="preview@example.com"
        creditsRemaining={20}
        readOnlyPreview
      />
    );
  }

  const provisioned = await ensureUserRecord(userId);
  if (!provisioned.ok) return <WorkspaceSetupError />;

  const [admin, user] = await Promise.all([Promise.resolve(createSupabaseAdmin()), currentUser().catch(() => null)]);
  const { data: profile } = await admin
    .from("users")
    .select("business_profile, onboarding_completed, workspace_name, credits_remaining")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return <WorkspaceSetupError />;

  const onboardingRedirect = getOnboardingRedirect(profile.onboarding_completed ?? false, "onboarding");
  if (onboardingRedirect) redirect(onboardingRedirect);

  const email = user?.emailAddresses[0]?.emailAddress ?? "";
  const storedProfile =
    profile?.business_profile && typeof profile.business_profile === "object"
      ? (profile.business_profile as Partial<BusinessProfile>)
      : null;

  const workspaceName = getWorkspaceLabel({
    workspaceName: storedWorkspaceName(profile),
    fullName: user?.fullName,
    email,
  });

  const initialProfile: Partial<BusinessProfile> = {
    ...storedProfile,
    workspace_name: workspaceName,
  };

  return (
    <OnboardingWizard
      initialProfile={initialProfile}
      emailDomain={domainFromEmail(email)}
      email={email || "you@company.com"}
      creditsRemaining={profile?.credits_remaining ?? 20}
    />
  );
}
