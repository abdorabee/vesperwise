import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { serializePresentation } from "@/lib/score-presentation";
import { CHAT_MAX_MESSAGE_CHARS, CHAT_MAX_SESSION_ID_CHARS } from "@/lib/chat-limits";

const SEED_MAX_BLOCKS = 12;
const SEED_MAX_TOOLS = 20;
const SEED_MAX_BILLING_CHARS = 120;
const TITLE_MAX_CHARS = 80;

// presentation/tools are deep-sanitized by serializePresentation (gen-ui + tool chip schemas).
const seedSchema = z.object({
  user: z.string().max(CHAT_MAX_MESSAGE_CHARS).optional(),
  assistant: z.string().max(CHAT_MAX_MESSAGE_CHARS * 2).optional(),
  presentation: z.array(z.unknown()).max(SEED_MAX_BLOCKS).optional(),
  tools: z.array(z.unknown()).max(SEED_MAX_TOOLS).optional(),
  billing: z.string().max(SEED_MAX_BILLING_CHARS).optional(),
});

const sessionBodySchema = z.object({
  title: z.string().max(1_000).optional(),
  session_id: z.string().max(CHAT_MAX_SESSION_ID_CHARS).optional(),
  seed: seedSchema.optional(),
});

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

  const rawBody: unknown = await req.json().catch(() => ({}));
  const parsedBody = sessionBodySchema.safeParse(rawBody ?? {});
  if (!parsedBody.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const body = parsedBody.data;

  const supabase = createSupabaseAdmin();
  const title = body.title?.trim() ? body.title.trim().slice(0, TITLE_MAX_CHARS) : undefined;

  let session: { id: string; title: string; created_at: string; updated_at: string };

  if (body.session_id) {
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
    const toolResult = seed.presentation
      ? serializePresentation({
          presentation: seed.presentation as Parameters<typeof serializePresentation>[0]["presentation"],
          tools: (seed.tools ?? []) as Parameters<typeof serializePresentation>[0]["tools"],
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
