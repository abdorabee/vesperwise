import { describe, expect, it } from "vitest";

import {
  CHAT_HISTORY_MAX_MESSAGE_CHARS,
  CHAT_HISTORY_MAX_TOTAL_CHARS,
  COPILOT_MAX_CREDIT_TOOL_CALLS_PER_TURN,
  COPILOT_MAX_TOOL_CALLS_PER_TURN,
  TOOL_LIMIT_RESULT,
  checkImage,
  createToolTurnGuard,
  guardTools,
  limitHistory,
} from "@/lib/chat-limits";

describe("checkImage", () => {
  it("accepts allowed types within the byte cap", () => {
    expect(checkImage({ type: "image/webp", size: 10 }).ok).toBe(true);
  });
  it("rejects other types and oversized files", () => {
    expect(checkImage({ type: "image/svg+xml", size: 10 }).ok).toBe(false);
    expect(checkImage({ type: "image/png", size: 5 * 1024 * 1024 + 1 }).ok).toBe(false);
  });
});

describe("limitHistory", () => {
  it("truncates each message and keeps the newest within the total budget", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ role: "user", content: `${i}`.padEnd(10_000, "x") }));
    const kept = limitHistory(rows);
    const total = kept.reduce((sum, row) => sum + row.content.length, 0);
    expect(total).toBeLessThanOrEqual(CHAT_HISTORY_MAX_TOTAL_CHARS);
    expect(kept.every((row) => row.content.length <= CHAT_HISTORY_MAX_MESSAGE_CHARS)).toBe(true);
    expect(kept.at(-1)?.content.startsWith("19")).toBe(true);
  });
});

describe("tool turn guard", () => {
  it("caps credit-spending tools per turn but not read-only tools", () => {
    const guard = createToolTurnGuard();
    const results = Array.from({ length: 5 }, () => guard.tryAcquire("score_company"));
    expect(results.filter(Boolean)).toHaveLength(COPILOT_MAX_CREDIT_TOOL_CALLS_PER_TURN);
    expect(guard.tryAcquire("get_pipeline_summary")).toBe(true);
  });

  it("blocks all tools past the total cap", () => {
    const guard = createToolTurnGuard();
    for (let i = 0; i < COPILOT_MAX_TOOL_CALLS_PER_TURN; i += 1) guard.tryAcquire("get_pipeline_summary");
    expect(guard.tryAcquire("get_pipeline_summary")).toBe(false);
  });

  it("guardTools returns the fixed result instead of executing over budget", async () => {
    let executed = 0;
    const tools = guardTools(
      {
        score_company: {
          execute: async () => {
            executed += 1;
            return "ok";
          },
        },
      },
      createToolTurnGuard()
    );
    const run = tools.score_company.execute as () => Promise<unknown>;
    const outputs = await Promise.all(Array.from({ length: 5 }, () => run()));
    expect(executed).toBe(COPILOT_MAX_CREDIT_TOOL_CALLS_PER_TURN);
    expect(outputs.filter((o) => o === TOOL_LIMIT_RESULT)).toHaveLength(2);
  });
});
