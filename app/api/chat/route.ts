import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createOpenAI } from "@ai-sdk/openai";
import { isStepCount, streamText, type ModelMessage } from "ai";

import { createSupabaseAdmin } from "@/lib/supabase";
import { isDevCreditBypassEnabled } from "@/lib/dev-credit-bypass";
import { buildCopilotContext, buildCopilotSystemPrompt, type CopilotUser } from "@/lib/copilot";
import { copilotSdkTools } from "@/lib/copilot-ai-tools";
import { createToolTurnGuard, guardTools, limitHistory, CHAT_HISTORY_MAX_MESSAGES } from "@/lib/chat-limits";
import { enforcePlanRateLimit } from "@/lib/rate-limit";
import { CHAT_CREDIT_COST } from "@/lib/types";
import { sanitizeUiBlocks } from "@/lib/gen-ui";
import { redactPublicSources } from "@/lib/public-source";
import { serializePresentation, type ToolChip } from "@/lib/score-presentation";

import { deductChatCredit, refundChatCredit } from "./credits";
import { parseChatRequest, type ParsedChatImage } from "./parse-request";

const COPILOT_MODEL = process.env.COPILOT_MODEL ?? "anthropic/claude-sonnet-4";
const COPILOT_MAX_TOKENS = Number(process.env.COPILOT_MAX_TOKENS) || 1024;
const COPILOT_MAX_STEPS = 8;
const SESSION_TITLE_MAX_CHARS = 80;
const USER_COLUMNS = "id, plan, role, credits_remaining, product_category, business_profile";

const AI_UNAVAILABLE_MESSAGE = "The AI service is unavailable.";
const CHAT_FAILED_MESSAGE = "Something went wrong while processing your request. Please try again.";

type Supabase = ReturnType<typeof createSupabaseAdmin>;

function jsonError(error: string, status: number, code?: string): Response {
  return new Response(JSON.stringify(code ? { error, code } : { error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function openRouterProvider() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  return createOpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    name: "openrouter",
  });
}

function logChatError(label: string, err: unknown): void {
  const detail = err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 300) : typeof err;
  console.error(`[chat] ${label}:`, detail);
}

interface TurnInput {
  supabase: Supabase;
  userId: string;
  user: CopilotUser;
  sessionId: string;
  message: string;
  image: ParsedChatImage | null;
  history: ModelMessage[];
  billingLabel: string;
  refund: () => Promise<void>;
}

function buildUserMessage(message: string, image: ParsedChatImage | null): ModelMessage {
  if (!image) return { role: "user", content: message };
  return {
    role: "user",
    content: [
      { type: "image", image: Buffer.from(image.base64, "base64"), mediaType: image.mediaType },
      { type: "text", text: message || "Analyze this conversation screenshot for buying intent signals." },
    ],
  };
}

function createChatStream(input: TurnInput, instructions: string): ReadableStream {
  const { supabase, userId, user, sessionId, message, image, history, billingLabel } = input;
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      let producedOutput = false;

      try {
        const result = streamText({
          model: openRouterProvider().chat(COPILOT_MODEL),
          instructions,
          messages: [...history, buildUserMessage(message, image)],
          tools: guardTools(
            copilotSdkTools(userId, user.product_category ?? "B2B SaaS", user.business_profile ?? null),
            createToolTurnGuard()
          ),
          stopWhen: isStepCount(COPILOT_MAX_STEPS),
          maxOutputTokens: COPILOT_MAX_TOKENS,
          temperature: 0.4,
        });

        let fullAssistantText = "";
        let presentation = [] as ReturnType<typeof sanitizeUiBlocks>;
        let streamedTools: ToolChip[] = [];

        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            producedOutput = true;
            fullAssistantText += part.text;
            send({ type: "text", content: part.text });
            continue;
          }
          if (part.type === "tool-call") {
            producedOutput = true;
            streamedTools = [...streamedTools, { name: part.toolName, status: "running" }];
            send({ type: "tool_call", name: part.toolName, args: part.input ?? {} });
            continue;
          }
          if (part.type === "tool-result") {
            const output = redactPublicSources(part.output);
            streamedTools = streamedTools.map((tool) => tool.name === part.toolName && tool.status === "running" ? { ...tool, status: "done", result: output } : tool);
            if (part.toolName === "present_ui") {
              const blocks = redactPublicSources(sanitizeUiBlocks(
                output && typeof output === "object" && "blocks" in output
                  ? (output as { blocks: unknown }).blocks
                  : output
              ));
              presentation = blocks;
              send({ type: "ui", blocks, billing: billingLabel });
            }
            send({ type: "tool_result", name: part.toolName, result: output });
            continue;
          }
          if (part.type === "error") {
            logChatError("model stream error", "error" in part ? part.error : undefined);
            throw new ChatStreamError(AI_UNAVAILABLE_MESSAGE);
          }
        }

        if (fullAssistantText || presentation.length > 0) {
          await supabase.from("chat_messages").insert({
            session_id: sessionId,
            role: "assistant",
            content: fullAssistantText,
            tool_result: presentation.length > 0
              ? serializePresentation({ presentation, tools: streamedTools, billing: billingLabel })
              : null,
          });
        }

        await supabase
          .from("chat_sessions")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", sessionId);

        const { data: balance } = await supabase
          .from("users")
          .select("credits_remaining")
          .eq("id", userId)
          .maybeSingle();
        send({
          type: "done",
          session_id: sessionId,
          credits_remaining: balance?.credits_remaining ?? null,
        });
        controller.close();
      } catch (err) {
        logChatError("stream failed", err);
        if (!producedOutput) await input.refund();
        send({
          type: "error",
          message: err instanceof ChatStreamError ? err.publicMessage : CHAT_FAILED_MESSAGE,
        });
        controller.close();
      }
    },
  });
}

class ChatStreamError extends Error {
  constructor(readonly publicMessage: string) {
    super(publicMessage);
  }
}

async function resolveSessionId(
  supabase: Supabase,
  userId: string,
  sessionId: string | undefined
): Promise<{ ok: true; id: string | undefined } | { ok: false; response: Response }> {
  if (!sessionId) return { ok: true, id: undefined };
  const { data: session } = await supabase
    .from("chat_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .single();
  if (!session || session.user_id !== userId) {
    return { ok: false, response: jsonError("Session not found", 404) };
  }
  return { ok: true, id: sessionId };
}

async function loadHistory(supabase: Supabase, sessionId: string | undefined): Promise<ModelMessage[]> {
  if (!sessionId) return [];
  const { data } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(CHAT_HISTORY_MAX_MESSAGES);
  const chronological = [...(data ?? [])].reverse();
  return limitHistory(chronological).map((row) => ({
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
  }));
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return jsonError("Unauthorized", 401);

  const supabase = createSupabaseAdmin();
  const { data: user } = await supabase.from("users").select(USER_COLUMNS).eq("id", userId).single();
  if (!user) return jsonError("User not found", 404);

  const limited = await enforcePlanRateLimit(userId, user.plan, "chat");
  if (limited) return limited;

  const parsed = await parseChatRequest(req);
  if (!parsed.ok) return jsonError(parsed.error, parsed.status);
  const { message, image } = parsed;

  const resolved = await resolveSessionId(supabase, userId, parsed.sessionId);
  if (!resolved.ok) return resolved.response;

  const bypassCredits = isDevCreditBypassEnabled();
  const billingLabel = bypassCredits ? "Testing mode · no credit charged" : `${CHAT_CREDIT_COST} credits`;

  // Charge atomically before any model work; concurrent requests cannot both pass.
  if (!bypassCredits) {
    const charge = await deductChatCredit(supabase, userId);
    if (charge === "insufficient") return jsonError("Insufficient credits", 402, "insufficient_credits");
    if (charge === "error") return jsonError("Could not process your request.", 500);
  }
  let hasRefunded = false;
  const refund = async () => {
    if (bypassCredits || hasRefunded) return;
    hasRefunded = true;
    await refundChatCredit(supabase, userId);
  };

  try {
    let sessionId = resolved.id;
    if (!sessionId) {
      const { data: session, error } = await supabase
        .from("chat_sessions")
        .insert({ user_id: userId, title: (message || "Screenshot").slice(0, SESSION_TITLE_MAX_CHARS) })
        .select("id")
        .single();
      if (error || !session) {
        await refund();
        return jsonError("Failed to create session", 500);
      }
      sessionId = session.id as string;
    }

    const history = await loadHistory(supabase, resolved.id);
    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      role: "user",
      content: image ? `[Screenshot] ${message}`.trim() : message,
    });

    const copilotUser = user as unknown as CopilotUser;
    const context = await buildCopilotContext(userId);
    const instructions = buildCopilotSystemPrompt(copilotUser, context);
    const stream = createChatStream(
      { supabase, userId, user: copilotUser, sessionId, message, image, history, billingLabel, refund },
      instructions
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    logChatError("setup failed", err);
    await refund();
    return jsonError("Could not process your request.", 500);
  }
}
