export type ChatSseEvent =
  | { type: "text"; content: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; result: unknown }
  | { type: "ui"; blocks: unknown }
  | { type: "done"; session_id: string }
  | { type: "error"; message: string };

export type ScoreStreamEvent =
  | {
      type: "stage";
      stage: "domain";
      company: string;
      domain: string;
    }
  | {
      type: "stage";
      stage: "signals";
      company: string;
      domain: string;
      signals: import("@/lib/types").SignalSet;
    }
  | {
      type: "stage";
      stage: "score";
      company: string;
      domain: string;
      intent_score: number;
      score_band: import("@/lib/types").ScoreBand;
      buying_stage?: string;
      urgency?: string;
      data_coverage?: number;
      score_status?: string;
      icp_fit_score?: number | null;
      signals: import("@/lib/types").SignalSet;
      latest_signal_at?: string;
    }
  | {
      type: "stage";
      stage: "action";
      recommended_action?: string;
      why_now?: string;
      urgency?: string;
    }
  | {
      type: "done";
      result: import("@/lib/types").IntentScore & {
        charged?: boolean;
        cached?: boolean;
      };
      billing?: string;
    }
  | { type: "error"; message: string };

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

async function readSseStream(
  response: Response,
  onEvent: (event: ScoreStreamEvent) => void,
): Promise<void> {
  if (!response.body) throw new Error("Score stream unavailable");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.split("\n").find((entry) => entry.startsWith("data: "));
      if (!line) continue;
      const event = JSON.parse(line.slice(6)) as ScoreStreamEvent;
      onEvent(event);
      if (event.type === "error") throw new Error(event.message);
    }
  }
}

/** Stream a score run with honest pipeline stage events. */
export async function streamScore(
  domain: string,
  onEvent: (event: ScoreStreamEvent) => void,
): Promise<void> {
  const response = await fetch("/api/v1/score/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error ?? "Scoring failed");
  }

  await readSseStream(response, onEvent);
}

export async function seedChatSession(opts: {
  sessionId?: string;
  title: string;
  user: string;
  assistant: string;
}): Promise<string> {
  const response = await fetch("/api/chat/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: opts.sessionId,
      title: opts.title,
      seed: { user: opts.user, assistant: opts.assistant },
    }),
  });
  const payload = await response.json() as { session?: { id: string }; error?: string };
  if (!response.ok || !payload.session?.id) {
    throw new Error(payload.error ?? "Failed to start chat session");
  }
  return payload.session.id;
}
