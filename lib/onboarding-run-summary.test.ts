import { describe, expect, it } from "vitest";

import type { ScoringRunEntry } from "./onboarding-run";
import { summarizeRun } from "./onboarding-run-summary";
import type { IntentScore } from "./types";

const RESULT = { company: "Acme", intent_score: 62 } as IntentScore;

function entry(domain: string, status: ScoringRunEntry["status"]): ScoringRunEntry {
  return status === "done"
    ? { domain, status, result: RESULT }
    : status === "error"
      ? { domain, status, error: "We couldn't find enough signal to score this domain." }
      : { domain, status };
}

describe("summarizeRun", () => {
  it("lets the user continue when every preview account was unscorable", () => {
    // Arrange: the local MOCK_SIGNALS=false run, where /api/v1/score answers 422 for all of them
    const entries = [entry("stripe.com", "error"), entry("linear.app", "error")];

    // Act
    const summary = summarizeRun(entries, false);

    // Assert
    expect(summary).toMatchObject({ doneCount: 0, failedCount: 2, settled: true, allFailed: true, canContinue: true });
    expect(summary.continueLabel).toBe("Save and continue without scores");
  });

  it("lets the user continue with a single unscorable account", () => {
    const summary = summarizeRun([entry("stripe.com", "error")], false);

    expect(summary.canContinue).toBe(true);
    expect(summary.allFailed).toBe(true);
  });

  it("holds the button while the run is still going and nothing has scored", () => {
    const summary = summarizeRun([entry("stripe.com", "error"), entry("linear.app", "scoring")], true);

    expect(summary.canContinue).toBe(false);
    expect(summary.allFailed).toBe(false);
    expect(summary.continueLabel).toBe("See the 0 ready now");
  });

  it("lets the user see results as soon as one account has scored", () => {
    const summary = summarizeRun([entry("stripe.com", "done"), entry("linear.app", "queued")], true);

    expect(summary.canContinue).toBe(true);
    expect(summary.continueLabel).toBe("See the 1 ready now");
  });

  it("does not treat an empty, never-started run as settled", () => {
    const summary = summarizeRun([], false);

    expect(summary.settled).toBe(false);
    expect(summary.canContinue).toBe(false);
  });
});
