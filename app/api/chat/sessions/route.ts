import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { serializePresentation } from "@/lib/score-presentation";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();
  const { data: sessions, error } = await supabase
    .from("chat_sessions")
    .select("id, title, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });

  return NextResponse.json({ sessions: sessions ?? [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    title?: string;
    session_id?: string;
    seed?: { user?: string; assistant?: string; presentation?: unknown; tools?: unknown; billing?: string };
  };

  const supabase = createSupabaseAdmin();
  const title = typeof body.title === "string" && body.title.trim()
    ? body.title.trim().slice(0, 80)
    : undefined;

  let session: { id: string; title: string; created_at: string; updated_at: string };

  if (typeof body.session_id === "string" && body.session_id) {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id, title, created_at, updated_at")
      .eq("id", body.session_id)
      .eq("user_id", userId)
      .single();
    if (error || !data) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    session = data;
    if (title) {
      await supabase
        .from("chat_sessions")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", session.id);
    }
  } else {
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: userId, title: title ?? "New Chat" })
      .select("id, title, created_at, updated_at")
      .single();
    if (error || !data) return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    session = data;
  }

  const seed = body.seed;
  if (seed?.user) {
    await supabase.from("chat_messages").insert({
      session_id: session.id,
      role: "user",
      content: seed.user,
    });
  }
  if (seed?.assistant) {
    const toolResult = Array.isArray(seed.presentation)
      ? serializePresentation({
          presentation: seed.presentation as never[],
          tools: Array.isArray(seed.tools) ? seed.tools as never[] : [],
          billing: seed.billing,
        })
      : null;
    await supabase.from("chat_messages").insert({
      session_id: session.id,
      role: "assistant",
      content: seed.assistant,
      tool_result: toolResult,
    });
  }

  return NextResponse.json({ session });
}
