import { describe, expect, it } from "vitest";

import { parsePersistedPresentation, serializePresentation } from "./score-presentation";

const presentation = [{
  type: "intent_hero" as const,
  company: "Stripe",
  domain: "stripe.com",
  intent_score: 82,
  score_band: "HOT" as const,
}];

describe("score presentation persistence", () => {
  it("serializes the existing UiBlock contract with tools and billing", () => {
    expect(serializePresentation({
      presentation,
      tools: [{ name: "score_company", status: "done", result: { ok: true } }],
      billing: "1 credit",
    })).toEqual({
      presentation,
      tools: [{ name: "score_company", status: "done", result: { ok: true } }],
      billing: "1 credit",
    });
  });

  it("round-trips sandbox widgets even when there are no UI blocks", () => {
    const widget = {
      id: "call_1",
      content: {
        title: "ROI calculator",
        html: "<section>ROI</section>",
        htmlComplete: true,
        generating: false,
      },
      data: { "account:notion.so": { score: 84 } },
    };

    expect(serializePresentation({
      presentation: [],
      tools: [{ name: "build_interactive_tool", status: "done", result: { ok: true } }],
      widgets: [widget],
      billing: "0.25 credits",
    })).toEqual({
      presentation: [],
      tools: [{ name: "build_interactive_tool", status: "done", result: { ok: true } }],
      widgets: [widget],
      billing: "0.25 credits",
    });

    expect(parsePersistedPresentation({ widgets: [widget] })).toEqual({
      presentation: [],
      tools: [],
      widgets: [widget],
    });
  });

  it("drops widget data instead of the widget when persisted widget JSON is too large", () => {
    const serialized = serializePresentation({
      presentation: [],
      tools: [],
      widgets: [{
        id: "call_1",
        content: {
          title: "Large comparison",
          html: "<section>Compare</section>",
          htmlComplete: true,
          generating: false,
        },
        data: { oversized: "x".repeat(260_000) },
      }],
    });

    expect(serialized.widgets).toEqual([{
      id: "call_1",
      content: {
        title: "Large comparison",
        html: "<section>Compare</section>",
        htmlComplete: true,
        generating: false,
      },
    }]);
  });

  it("sanitizes stored blocks again and tolerates legacy text-only rows", () => {
    expect(parsePersistedPresentation(null)).toBeNull();
    expect(parsePersistedPresentation({ presentation: [{ type: "unknown" }] })).toBeNull();
    expect(parsePersistedPresentation({ presentation, billing: "1 credit" })).toEqual({
      presentation,
      tools: [],
      billing: "1 credit",
    });
  });
});
