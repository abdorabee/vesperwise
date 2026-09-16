import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createOpenAI } from "@ai-sdk/openai";
import { isStepCount, streamText, type ModelMessage } from "ai";

import { createSupabaseAdmin } from "@/lib/supabase";
import { isDevCreditBypassEnabled } from "@/lib/dev-credit-bypass";
import { buildCopilotContext, buildCopilotSystemPrompt } from "@/lib/copilot";
import { copilotSdkTools } from "@/lib/copilot-ai-tools";
import { CHAT_CREDIT_COST } from "@/lib/types";
import type { DbUser } from "@/lib/types";
import { sanitizeUiBlocks } from "@/lib/gen-ui";
import { serializePresentation, type ToolChip } from "@/lib/score-presentation";

const COPILOT_MODEL = process.env.COPILOT_MODEL ?? "anthropic/claude-sonnet-4";
const COPILOT_MAX_TOKENS = Number(process.env.COPILOT_MAX_TOKENS) || 1024;

function openRouterProvider() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  return createOpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    name: "openrouter",
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";
  let message: string;
  let session_id: string | undefined;
  let imageBase64: string | null = null;
  let imageMediaType = "image/jpeg";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    message = (formData.get("message") as string | null) ?? "";
    session_id = (formData.get("session_id") as string | null) ?? undefined;
    const imageFile = formData.get("image") as File | null;
    if (imageFile && imageFile.size > 0) {
      const buffer = await imageFile.arrayBuffer();
      imageBase64 = Buffer.from(buffer).toString("base64");
      imageMediaType = imageFile.type || "image/jpeg";
    }
  } else {
    const body = await req.json();
    message = body.message;
    session_id = body.session_id;
  }

  if (!message?.trim() && !imageBase64) {
    return new Response(JSON.stringify({ error: "Message or image is required" }), { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const bypassCredits = isDevCreditBypassEnabled();
  const billingLabel = bypassCredits
    ? "Testing mode · no credit charged"
    : `${CHAT_CREDIT_COST} credits`;

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (!user) return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });

  if (!bypassCredits && user.credits_remaining < CHAT_CREDIT_COST) {
    return new Response(JSON.stringify({ error: "Insufficient credits" }), { status: 402 });
  }

  let sessionId = session_id;
  if (!sessionId) {
    const { data: session, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: userId, title: (message || "Screenshot").slice(0, 80) })
      .select("id")
      .single();
    if (error || !session) {
      return new Response(JSON.stringify({ error: "Failed to create session" }), { status: 500 });
    }
    sessionId = session.id;
  } else {
    const { data: session } = await supabase
      .from("chat_sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single();

    if (!session || session.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Session not found" }), { status: 404 });
    }
  }

  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(50);

  const conversationHistory: ModelMessage[] = (history ?? []).map((row) => ({
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
  }));

  const persistContent = imageBase64
    ? `[Screenshot] ${message}`.trim()
    : message;
  await supabase.from("chat_messages").insert({
    session_id: sessionId,
    role: "user",
    content: persistContent,
  });

  if (!bypassCredits) {
    await supabase.rpc("deduct_chat_credit", { p_user_id: userId, p_amount: CHAT_CREDIT_COST });
  }

  const context = await buildCopilotContext(userId);
  const instructions = buildCopilotSystemPrompt(user as DbUser, context);

  const userMessage: ModelMessage = imageBase64
    ? {
        role: "user",
        content: [
          { type: "image", image: Buffer.from(imageBase64, "base64"), mediaType: imageMediaType },
          { type: "text", text: message || "Analyze this conversation screenshot for buying intent signals." },
        ],
      }
    : { role: "user", content: message };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const result = streamText({
          model: openRouterProvider().chat(COPILOT_MODEL),
          instructions,
          messages: [...conversationHistory, userMessage],
          tools: copilotSdkTools(
            userId,
            user.product_category ?? "B2B SaaS",
            user.business_profile ?? null
          ),
          stopWhen: isStepCount(8),
          maxOutputTokens: COPILOT_MAX_TOKENS,
          temperature: 0.4,
        });

        let fullAssistantText = "";
        let presentation = [] as ReturnType<typeof sanitizeUiBlocks>;
        let streamedTools: ToolChip[] = [];

        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            fullAssistantText += part.text;
            send({ type: "text", content: part.text });
            continue;
          }
          if (part.type === "tool-call") {
            streamedTools = [...streamedTools, { name: part.toolName, status: "running" }];
            send({ type: "tool_call", name: part.toolName, args: part.input ?? {} });
            continue;
          }
          if (part.type === "tool-result") {
            const output = part.output;
            streamedTools = streamedTools.map((tool) => tool.name === part.toolName && tool.status === "running" ? { ...tool, status: "done", result: output } : tool);
            if (part.toolName === "present_ui") {
              const blocks = sanitizeUiBlocks(
                output && typeof output === "object" && "blocks" in output
                  ? (output as { blocks: unknown }).blocks
                  : output
              );
              presentation = blocks;
              send({ type: "ui", blocks, billing: billingLabel });
            }
            send({ type: "tool_result", name: part.toolName, result: output });
            continue;
          }
          if (part.type === "error") {
            const errorText =
              "error" in part && part.error instanceof Error
                ? part.error.message
                : "An error occurred while processing your request.";
            if (errorText.includes("402")) {
              throw new Error(
                "The AI service has run out of credits. Please top up your OpenRouter balance or reduce COPILOT_MAX_TOKENS."
              );
            }
            throw new Error(errorText);
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

        send({ type: "done", session_id: sessionId });
        controller.close();
      } catch (err) {
        console.error("[chat] error:", err);
        const msg = err instanceof Error ? err.message : "An error occurred while processing your request.";
        send({ type: "error", message: msg });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
