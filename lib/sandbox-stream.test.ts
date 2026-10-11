import { describe, expect, it, vi } from "vitest";

import {
  SandboxToolStreamController,
  widgetContentFromPartial,
} from "./sandbox-stream";

describe("widgetContentFromPartial", () => {
  it("marks ordered fields complete only after a later field appears or input ends", () => {
    expect(widgetContentFromPartial({ title: "ROI", css: ".card {" }, false)).toMatchObject({
      title: "ROI",
      css: ".card {",
      cssComplete: false,
      htmlComplete: false,
      jsFunctionsComplete: false,
      generating: true,
    });

    expect(widgetContentFromPartial({ title: "ROI", css: ".card {}", html: "<div>" }, false)).toMatchObject({
      cssComplete: true,
      htmlComplete: false,
      jsFunctionsComplete: false,
    });

    expect(widgetContentFromPartial({ title: "ROI", html: "<div></div>", jsFunctions: "function boot() {}" }, false)).toMatchObject({
      htmlComplete: true,
      jsFunctionsComplete: false,
    });

    expect(widgetContentFromPartial({ title: "ROI", html: "<div></div>" }, true)).toMatchObject({
      htmlComplete: true,
      jsFunctionsComplete: true,
      jsExpressionsComplete: true,
      generating: false,
    });
  });

  it("drops the last js expression while the expression array is still streaming", () => {
    expect(widgetContentFromPartial({ jsExpressions: ["drawChart();", "update" ] }, false)).toMatchObject({
      jsExpressions: ["drawChart();"],
      jsExpressionsComplete: false,
    });

    expect(widgetContentFromPartial({ jsExpressions: ["drawChart();", "updateTotals();" ] }, true)).toMatchObject({
      jsExpressions: ["drawChart();", "updateTotals();"],
      jsExpressionsComplete: true,
    });
  });
});

describe("SandboxToolStreamController", () => {
  it("does not emit a widget when parsed content is unchanged", async () => {
    const controller = new SandboxToolStreamController({
      throttleMs: 0,
      parsePartialJson: async (text) => ({ value: JSON.parse(text) }),
    });

    await controller.handlePart({ type: "tool-input-start", id: "call_1", toolName: "build_interactive_tool" });
    const first = await controller.handlePart({
      type: "tool-input-delta",
      id: "call_1",
      delta: JSON.stringify({ title: "ROI", html: "<div>Ready</div>" }),
    });
    const repeated = await controller.flush("call_1", { inputEnded: false, force: true });

    expect(first.filter((event) => event.type === "widget")).toHaveLength(1);
    expect(repeated).toEqual([]);
  });

  it("resolves data refs once they are complete and before the final widget", async () => {
    const resolveDataRefs = vi.fn(async () => ({ "account:notion.so": { score: 84 } }));
    const controller = new SandboxToolStreamController({
      throttleMs: 0,
      parsePartialJson: async (text) => ({ value: JSON.parse(text) }),
    });

    const events = [];
    events.push(...await controller.handlePart({ type: "tool-input-start", id: "call_1", toolName: "build_interactive_tool" }));
    events.push(...await controller.handlePart({
      type: "tool-input-delta",
      id: "call_1",
      delta: JSON.stringify({
        title: "ROI",
        data_refs: ["account:notion.so"],
        css: ".card{}",
        html: "<div>ROI</div>",
      }),
    }, { resolveDataRefs }));
    events.push(...await controller.handlePart({ type: "tool-input-end", id: "call_1" }, { resolveDataRefs }));
    events.push(...await controller.handlePart({
      type: "tool-call",
      toolCallId: "call_1",
      toolName: "build_interactive_tool",
      input: {
        title: "ROI",
        data_refs: ["account:notion.so"],
        css: ".card{}",
        html: "<div>ROI</div>",
      },
    }, { resolveDataRefs }));

    const dataIndex = events.findIndex((event) => event.type === "widget_data");
    const finalWidgetIndex = events.findLastIndex((event) => event.type === "widget");
    expect(dataIndex).toBeGreaterThanOrEqual(0);
    expect(finalWidgetIndex).toBeGreaterThan(dataIndex);
    expect(events[finalWidgetIndex]).toMatchObject({
      type: "widget",
      id: "call_1",
      content: { title: "ROI", generating: false, htmlComplete: true },
    });
    expect(resolveDataRefs).toHaveBeenCalledTimes(1);
  });
});
