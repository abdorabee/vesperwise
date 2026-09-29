import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase";
import type { InboxNotification } from "@/lib/types";
import type { DbList } from "@/lib/lists-types";
import { InboxView } from "./inbox-view";

export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const admin = createSupabaseAdmin();

  const [{ data: notifications }, { data: lists }] = await Promise.all([
    admin
      .from("inbox_notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .or("is_snoozed.eq.false,snoozed_until.lt.now()")
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("lists")
      .select("id, name, color, icon_initials")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <InboxView
      initialNotifications={(notifications ?? []) as InboxNotification[]}
      lists={(lists ?? []) as Pick<DbList, "id" | "name" | "color" | "icon_initials">[]}
    />
  );
}
