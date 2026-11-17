import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { parseJsonBody } from "@/lib/api-body";
import { addMemberSchema } from "../../schemas";

const SYSTEM_LIST_ERROR = "Members of the watchlist list are managed from your watchlist";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const parsed = await parseJsonBody(req, addMemberSchema);
  if (!parsed.ok) return parsed.response;
  const { domain, company_name } = parsed.data;

  const supabase = createSupabaseAdmin();
  const { data: list } = await supabase
    .from("lists")
    .select("list_type, is_system")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (list.is_system) return NextResponse.json({ error: SYSTEM_LIST_ERROR }, { status: 409 });
  if (list.list_type !== "manual") {
    return NextResponse.json({ error: "Only manual lists support members" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("list_members")
    .upsert(
      {
        list_id: id,
        user_id: userId,
        domain: domain.toLowerCase(),
        company_name: company_name ?? domain,
      },
      { onConflict: "list_id,domain" },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to add member" }, { status: 500 });

  await supabase.from("lists").update({ updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);

  return NextResponse.json({ member: data });
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const domain = req.nextUrl.searchParams.get("domain");
  if (!domain) return NextResponse.json({ error: "domain required" }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const { data: list } = await supabase
    .from("lists")
    .select("list_type, is_system")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (list.is_system) return NextResponse.json({ error: SYSTEM_LIST_ERROR }, { status: 409 });
  if (list.list_type !== "manual") {
    return NextResponse.json({ error: "Only manual lists support members" }, { status: 400 });
  }

  const { error } = await supabase
    .from("list_members")
    .delete()
    .eq("list_id", id)
    .eq("user_id", userId)
    .eq("domain", domain.toLowerCase());

  if (error) return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });

  await supabase.from("lists").update({ updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);

  return NextResponse.json({ ok: true });
}
