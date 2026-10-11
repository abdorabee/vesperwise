import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

import { projectScore, type BriefContribution } from "@/lib/brief";
import { FRAME_HELPERS_JS } from "./frame-helpers";

type FrameVW = { projectScore: (c: BriefContribution[], offset: number) => ReturnType<typeof projectScore> };

function loadHelpers(): FrameVW {
  const sandbox: { window: { VW?: FrameVW }; Date: DateConstructor; Math: Math; isFinite: typeof isFinite } = {
    window: {},
    Date,
    Math,
    isFinite,
  };
  runInNewContext(FRAME_HELPERS_JS, sandbox);
  return sandbox.window.VW as FrameVW;
}

const contributions: BriefContribution[] = [
  { type: "funding", rawScore: 92, effectiveWeight: 22, daysAgo: 42, observedAt: "2026-08-28T00:00:00Z", summary: "Series B", contribution: 20.9, status: "ok" },
  { type: "hiring", rawScore: 65, effectiveWeight: 19, daysAgo: 10, observedAt: "2026-09-29T00:00:00Z", summary: "6 roles", contribution: 15.2, status: "ok" },
  { type: "news", rawScore: 70, effectiveWeight: 18, daysAgo: 15, observedAt: "2026-09-24T00:00:00Z", summary: "New CEO", contribution: 15.1, status: "ok", halfLifeDays: 30 },
  { type: "technology", rawScore: 0, effectiveWeight: 18, daysAgo: null, observedAt: null, summary: "None", contribution: 0, status: "no_signal" },
];

describe("frame VW helpers", () => {
  it("match lib/brief projectScore exactly for v2, v3 and no-signal inputs", () => {
    const vw = loadHelpers();
    for (const offset of [0, 7, 30, 60, 120]) {
      expect(vw.projectScore(contributions, offset)).toEqual(projectScore(contributions, offset));
    }
  });
});
