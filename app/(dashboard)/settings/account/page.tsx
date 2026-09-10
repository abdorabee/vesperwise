import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { createSupabaseAdmin } from "@/lib/supabase";
import type { DbUser, UserRole } from "@/lib/types";
import { storedWorkspaceName } from "@/lib/workspace-label";
import { AccountForm } from "@/components/settings/account-form";

export const metadata = { title: "Account · Settings" };

export default async function SettingsAccountPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("workspace_name, business_profile, role, email, plan")
    .eq("id", userId)
    .maybeSingle();

  return (
    <AccountForm
      initial={{
        workspaceName: storedWorkspaceName(data) ?? "",
        role: (data?.role ?? "sdr") as UserRole,
        email: data?.email ?? "",
        plan: (data?.plan ?? "free") as DbUser["plan"],
      }}
    />
  );
}
