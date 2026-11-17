import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api-body";

const patchNotificationSchema = z.object({
  is_read: z.boolean().optional(),
  is_archived: z.boolean().optional(),
  is_snoozed: z.boolean().optional(),
  snoozed_until: z.iso.datetime({ offset: true }).nullish(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = await parseJsonBody(req, patchNotificationSchema);
  if (!parsed.ok) return parsed.response;

  // Only fields the client actually sent; schema output drops everything else.
  const updates = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined)
  );

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("inbox_notifications")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });

  return NextResponse.json({ notification: data });
}
