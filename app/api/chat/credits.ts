import { createSupabaseAdmin } from "@/lib/supabase";
import { CHAT_CREDIT_COST } from "@/lib/types";

type Supabase = ReturnType<typeof createSupabaseAdmin>;

export type DeductResult = "ok" | "insufficient" | "error";

/** Atomically charges one chat message; `deduct_chat_credit` raises when the balance is too low. */
export async function deductChatCredit(supabase: Supabase, userId: string): Promise<DeductResult> {
  const { error } = await supabase.rpc("deduct_chat_credit", {
    p_user_id: userId,
    p_amount: CHAT_CREDIT_COST,
  });
  if (!error) return "ok";
  if (String(error.message ?? "").includes("insufficient_credits")) return "insufficient";
  console.error("[chat] deduct_chat_credit failed:", error.code ?? "unknown");
  return "error";
}

/**
 * Returns a charge via the atomic `increment_credits` RPC (single UPDATE ... SET
 * credits_remaining = credits_remaining + amount). Best effort: it does not write a
 * credits_log row.
 */
export async function refundChatCredit(supabase: Supabase, userId: string): Promise<void> {
  const { error } = await supabase.rpc("increment_credits", {
    p_user_id: userId,
    p_amount: CHAT_CREDIT_COST,
  });
  if (error) console.error("[chat] refund failed:", error.code ?? "unknown");
}
