import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { EMPTY_BUSINESS_PROFILE } from "@/lib/onboarding-profile";
import { createSupabaseAdmin } from "@/lib/supabase";
import type { BusinessProfile } from "@/lib/types";
import { ProfileForm } from "@/components/settings/profile-form";

export const metadata = { title: "Business profile · Settings" };

export default async function SettingsProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("business_profile")
    .eq("id", userId)
    .maybeSingle();

  const stored = (data?.business_profile ?? null) as BusinessProfile | null;

  // The dashboard layout redirects to /onboarding until it completes, so a null
  // profile here means a legacy row. Seed the form rather than dead-ending.
  const profile: BusinessProfile = { ...EMPTY_BUSINESS_PROFILE, ...(stored ?? {}) };

  return <ProfileForm initialProfile={profile} />;
}
