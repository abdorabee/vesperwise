import { describe, expect, it } from "vitest";
import { accountReportFromResponse } from "./use-account-report";

const score = {
  company: "Stripe",
  domain: "stripe.com",
  intent_score: 29,
  score_band: "COLD" as const,
  created_at: "2026-09-30T10:00:00Z",
};

describe("accountReportFromResponse", () => {
  it("builds report blocks from a stored score", () => {
    const state = accountReportFromResponse(200, { score });
    expect(state.status).toBe("ready");
    if (state.status !== "ready") return;
    expect(state.blocks.some((block) => block.type === "intent_hero")).toBe(true);
    expect(state.stored).toEqual({ domain: "stripe.com", createdAt: "2026-09-30T10:00:00Z" });
  });

  it("treats 404 as an account that has not been scored", () => {
    expect(accountReportFromResponse(404, { error: "No stored score" })).toEqual({ status: "missing" });
  });

  it("surfaces the server error message, or a default", () => {
    expect(accountReportFromResponse(500, { error: "Failed to load score" })).toEqual({ status: "error", message: "Failed to load score" });
    expect(accountReportFromResponse(200, null)).toEqual({ status: "error", message: "Couldn't load this account's score." });
  });
});

import { scoreHref } from "./account-panel";

describe("scoreHref", () => {
  it("carries a follow-up prompt to the stored score view", () => {
    expect(scoreHref("acme.com")).toBe("/score?domain=acme.com");
    expect(scoreHref("acme.com", "last")).toBe("/score?domain=acme.com&view=last");
    expect(scoreHref("acme.com", "last", "Draft to the CFO & lead with hiring"))
      .toBe("/score?domain=acme.com&view=last&prompt=Draft%20to%20the%20CFO%20%26%20lead%20with%20hiring");
  });
});
