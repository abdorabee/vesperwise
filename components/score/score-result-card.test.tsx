import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { UiBlock } from "@/lib/gen-ui";
import { buildScoreReport } from "./score-report-panel";
import { ScoreResultCard } from "./score-result-card";

const blocks: UiBlock[] = [
  { type: "intent_hero", company: "Ramp", domain: "ramp.com", intent_score: 78, score_band: "HOT" },
  { type: "action_rail", company: "Ramp", domain: "ramp.com" },
];

function findButton(element: ReactNode): ReactElement<{ onClick?: () => void }> | null {
  if (!element || typeof element !== "object" || !("props" in element)) return null;
  const reactElement = element as ReactElement<{ children?: ReactNode }>;
  if (reactElement.type === "button") return reactElement as ReactElement<{ onClick?: () => void }>;
  const children = reactElement.props.children;
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    const found = findButton(child);
    if (found) return found;
  }
  return null;
}

describe("ScoreResultCard", () => {
  it("invokes the report view action from the compact card", () => {
    const report = buildScoreReport("ramp", blocks, { current: true });
    const onView = vi.fn();
    const button = findButton(ScoreResultCard({ report, onView }));

    expect(button).not.toBeNull();
    button?.props.onClick?.();
    expect(onView).toHaveBeenCalledWith("ramp");
  });
});
