import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import type { ApiKeySummary } from "@/lib/api-keys";
import { ApiKeysView } from "@/components/api-keys/api-keys-view";

export const metadata = { title: "API keys" };

export default async function ApiKeysPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("api_keys")
    .select("id, label, last_used, is_active, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (
    <ApiKeysView
      initialKeys={(data ?? []) as ApiKeySummary[]}
      initialError={error ? "We couldn't load your keys. Refresh to try again." : null}
    />
  );
}
