import "server-only";

import { currentUser } from "@clerk/nextjs/server";

import { createSupabaseAdmin } from "@/lib/supabase";
import {
  userRowOutcome,
  userUpsertOutcome,
  type UserProvisionResult,
} from "@/lib/user-provisioning-result";

export type { UserProvisionResult };

export async function ensureUserRecord(userId: string): Promise<UserProvisionResult> {
  let user;
  try {
    user = await currentUser();
  } catch {
    user = null;
  }

  const admin = createSupabaseAdmin();
  const upsert = await admin.from("users").upsert(
    {
      id: userId,
      email: user?.emailAddresses[0]?.emailAddress ?? "",
      plan: "free",
      credits_remaining: 20,
      onboarding_completed: false,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  const upsertResult = userUpsertOutcome({ error: upsert.error });
  if (!upsertResult.ok) {
    console.error("[user-provisioning] upsert failed", {
      userId,
      message: upsert.error?.message,
      code: upsert.error?.code,
    });
    return upsertResult;
  }

  const { data: row, error: readError } = await admin
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (readError) {
    console.error("[user-provisioning] read-after-upsert failed", {
      userId,
      message: readError.message,
      code: readError.code,
    });
    return { ok: false, message: readError.message };
  }

  const rowResult = userRowOutcome(row);
  if (!rowResult.ok) {
    console.error("[user-provisioning] users row missing after upsert", { userId });
  }
  return rowResult;
}
