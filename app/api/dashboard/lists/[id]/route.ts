import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { buildListDetailForId } from "@/lib/lists-data";
import { parseJsonBody } from "@/lib/api-body";
import { updateListSchema } from "../schemas";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const detail = await buildListDetailForId(userId, id);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(detail);
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const parsed = await parseJsonBody(req, updateListSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const supabase = createSupabaseAdmin();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.color !== undefined) updates.color = body.color;
  if (body.rules !== undefined) updates.rules = body.rules;
  if (body.auto_refresh !== undefined) updates.auto_refresh = body.auto_refresh;

  const { data, error } = await supabase
    .from("lists")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ list: data });
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const supabase = createSupabaseAdmin();
  const { data: list } = await supabase
    .from("lists")
    .select("is_system")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (list.is_system) {
    return NextResponse.json({ error: "The watchlist list is synced and cannot be deleted" }, { status: 409 });
  }

  const { error } = await supabase.from("lists").delete().eq("id", id).eq("user_id", userId);

  if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
