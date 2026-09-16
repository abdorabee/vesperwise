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
