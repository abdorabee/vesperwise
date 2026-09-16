export type ChatSseEvent =
  | { type: "text"; content: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; result: unknown }
  | { type: "ui"; blocks: unknown; billing?: string }
  | { type: "done"; session_id: string }
  | { type: "error"; message: string };

import type { UiBlock } from "@/lib/gen-ui";
import type { ToolChip } from "@/lib/score-presentation";

export interface ChatSessionSummary { id: string; title: string; created_at: string; updated_at: string }
export interface StoredChatMessage { id: string; role: "user" | "assistant" | "tool"; content: string; tool_result: unknown; created_at: string }

export function extractDomain(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  try {
    const url = trimmed.includes("://") ? new URL(trimmed) : new URL(`https://${trimmed}`);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (!host.includes(".") || host.endsWith(".")) return null;
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9-]+)+$/i.test(host)) return null;
    return host;
  } catch {
    return null;
  }
}

export async function streamChat(
  body: { message: string; session_id?: string },
  onEvent: (event: ChatSseEvent) => void,
): Promise<string | undefined> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error ?? "Chat failed");
  }

  if (!response.body) throw new Error("Chat stream unavailable");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sessionId = body.session_id;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.split("\n").find((entry) => entry.startsWith("data: "));
      if (!line) continue;
      const event = JSON.parse(line.slice(6)) as ChatSseEvent;
      onEvent(event);
      if (event.type === "done") sessionId = event.session_id;
      if (event.type === "error") throw new Error(event.message);
    }
  }

  return sessionId;
}

export async function seedChatSession(opts: {
  sessionId?: string;
  title: string;
  user: string;
  assistant: string;
  presentation?: UiBlock[];
  tools?: ToolChip[];
  billing?: string;
}): Promise<string> {
  const response = await fetch("/api/chat/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: opts.sessionId,
      title: opts.title,
      seed: { user: opts.user, assistant: opts.assistant, presentation: opts.presentation, tools: opts.tools, billing: opts.billing },
    }),
  });
  const payload = await response.json() as { session?: { id: string }; error?: string };
  if (!response.ok || !payload.session?.id) {
    throw new Error(payload.error ?? "Failed to start chat session");
  }
  return payload.session.id;
}

export async function listChatSessions(): Promise<ChatSessionSummary[]> {
  const response = await fetch("/api/chat/sessions");
  const payload = await response.json() as { sessions?: ChatSessionSummary[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Failed to load threads");
  return payload.sessions ?? [];
}

export async function loadChatSession(id: string): Promise<{ session: ChatSessionSummary; messages: StoredChatMessage[] }> {
  const response = await fetch(`/api/chat/sessions/${encodeURIComponent(id)}`);
  const payload = await response.json() as { session?: ChatSessionSummary; messages?: StoredChatMessage[]; error?: string };
  if (!response.ok || !payload.session) throw new Error(payload.error ?? "Failed to load thread");
  return { session: payload.session, messages: payload.messages ?? [] };
}
