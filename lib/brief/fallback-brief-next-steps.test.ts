import { describe, expect, it } from "vitest";

import { buildFallbackBrief } from "./fallback-brief";

describe("buildFallbackBrief next steps", () => {
  it("adds interactive tool starter prompts", () => {
    const brief = buildFallbackBrief({
      company: "Acme",
      score: 84,
      band: "HOT",
      contributions: [],
    });
    const nextSteps = brief.layout.find((section) => section.type === "next_steps");

    expect(nextSteps?.type).toBe("next_steps");
    if (nextSteps?.type !== "next_steps") return;
    expect(nextSteps.actions).toEqual(expect.arrayContaining([
      { label: "ROI calculator", prompt: "Build an ROI calculator for pitching {company}" },
      { label: "Signal timeline", prompt: "Chart {company}'s signal timeline" },
    ]));
    expect(nextSteps.actions).toHaveLength(3);
  });
});
