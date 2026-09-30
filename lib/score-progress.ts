import type { SignalResult, SignalStatus } from "@/lib/types";

/**
 * Real progress emitted while a score is computed. Each `signal_done` fires
 * when that provider actually resolves — never on a timer.
 */
export type ScoreProgressEvent =
  | {
      type: "signal_done";
      key: string;
      status: SignalStatus;
      detail?: string;
      observed_at?: string | null;
      source?: string;
    }
  | { type: "reasoning_start" }
  | { type: "reasoning_done" };

export type ScoreProgressHandler = (event: ScoreProgressEvent) => void;

export function signalDoneEvent(key: string, signal: SignalResult | undefined): ScoreProgressEvent {
  return {
    type: "signal_done",
    key,
    status: signal?.status ?? (signal ? "ok" : "unavailable"),
    detail: signal?.detail,
    observed_at: signal?.observed_at ?? null,
    source: signal?.source,
  };
}

/** Calls the handler but never lets a listener failure break scoring. */
export function emitProgress(handler: ScoreProgressHandler | undefined, event: ScoreProgressEvent) {
  if (!handler) return;
  try {
    handler(event);
  } catch (error) {
    console.warn("[score-progress] listener threw; ignoring", error);
  }
}

// ─── Server-sent events framing ──────────────────────────────────────────────

export function formatSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export interface SseMessage {
  event: string;
  data: string;
}

/**
 * Incremental SSE parser for fetch() bodies (EventSource cannot POST).
 * Feed decoded chunks; returns complete messages and keeps the remainder.
 */
export function createSseParser() {
  let buffer = "";
  return function push(chunk: string): SseMessage[] {
    buffer += chunk.replace(/\r\n/g, "\n");
    const messages: SseMessage[] = [];
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      let event = "message";
      const data: string[] = [];
      for (const line of raw.split("\n")) {
        if (line.startsWith(":")) continue;
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
      }
      if (data.length > 0) messages.push({ event, data: data.join("\n") });
      boundary = buffer.indexOf("\n\n");
    }
    return messages;
  };
}
