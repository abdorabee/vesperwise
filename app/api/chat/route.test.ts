import { describe, expect, it, vi } from "vitest";

import {
  SandboxToolStreamController,
  sandboxToolCallEvent,
  sandboxToolResultOutput,
} from "@/lib/sandbox-stream";

describe("chat route sandbox tool stream helper", () => {
  it("streams widget data before the final widget and forwards reduced tool-call args", async () => {
    const resolveDataRefs = vi.fn(async () => ({
      "account:notion.so": { company: "Notion", score: 84 },
    }));
    const controller = new SandboxToolStreamController({
      throttleMs: 0,
      parsePartialJson: async (text) => ({ value: JSON.parse(text) }),
    });
    const events = [];

    for (const part of [
      { type: "tool-input-start" as const, id: "call_1", toolName: "build_interactive_tool" },
      {
        type: "tool-input-delta" as const,
        id: "call_1",
        delta: JSON.stringify({
          title: "ROI calculator",
          data_refs: ["account:notion.so"],
          css: ".card{}",
          html: "<section>ROI</section>",
        }),
      },
      { type: "tool-input-end" as const, id: "call_1" },
      {
        type: "tool-call" as const,
        toolCallId: "call_1",
        toolName: "build_interactive_tool",
        input: {
          title: "ROI calculator",
          data_refs: ["account:notion.so"],
          css: ".card{}",
          html: "<section>ROI</section>",
        },
      },
    ]) {
      events.push(...await controller.handlePart(part, { resolveDataRefs }));
    }

    events.push(sandboxToolCallEvent("build_interactive_tool", {
      title: "ROI calculator",
      css: ".card{}",
      html: "<section>ROI</section>",
    }));

    const finalWidgetIndex = events.findLastIndex((event) => event.type === "widget");
    const dataIndex = events.findIndex((event) => event.type === "widget_data");
    expect(dataIndex).toBeGreaterThanOrEqual(0);
    expect(dataIndex).toBeLessThan(finalWidgetIndex);
    expect(events[finalWidgetIndex]).toMatchObject({
      type: "widget",
      id: "call_1",
      content: { title: "ROI calculator", generating: false },
    });
    expect(events.at(-1)).toEqual({
      type: "tool_call",
      name: "build_interactive_tool",
      args: { title: "ROI calculator" },
    });
  });

  it("strips resolved widget data from forwarded sandbox tool results", () => {
    expect(sandboxToolResultOutput("build_interactive_tool", {
      ok: true,
      title: "ROI calculator",
      data: { "account:notion.so": { score: 84 } },
      data_summary: ["account:notion.so -> 4 signals"],
    })).toEqual({
      ok: true,
      title: "ROI calculator",
      data_summary: ["account:notion.so -> 4 signals"],
    });
  });
});
