import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { ChatView } from "./chat-view";

export const metadata = { title: "Chat" };

export default async function ChatPage() {
  const { userId } = await auth();
  if (!userId) return null;
  const supabase = createSupabaseAdmin();
  const { data } = await supabase.from("users").select("credits_remaining").eq("id", userId).single();
  return <ChatView creditsRemaining={data?.credits_remaining ?? 0} />;
}
