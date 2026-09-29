import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { PLAN_ORDER, planFeatures } from "@/lib/plan-features";

// Autopilot, Slack/webhook alerts and People scoring are hidden in the app,
// so public pages must not sell them.
const PUBLIC_SOURCES = [
  "components/landing/LandingPage.tsx",
  "components/landing/LandingNav.tsx",
  "components/site-footer.tsx",
  "app/about/about-view.tsx",
  "app/terms/terms-view.tsx",
  "app/privacy/privacy-view.tsx",
  "app/legal/dpa/dpa-view.tsx",
  "app/legal/subprocessors/subprocessors-view.tsx",
].map((file) => ({ file, src: readFileSync(new URL(`../../${file}`, import.meta.url), "utf8") }));

describe("public pages only sell what the app ships", () => {
  it("has no Autopilot nav or section links", () => {
    for (const { file, src } of PUBLIC_SOURCES) {
      expect(src, file).not.toMatch(/#autopilot/);
    }
  });

  it.each([
    ["Autopilot", /Autopilot/],
    ["Slack alerts", /\bSlack\b/],
    ["People scoring", /Score the person|people scoring/i],
  ])("landing page does not advertise %s", (_label, pattern) => {
    const landing = PUBLIC_SOURCES.find((s) => s.file.endsWith("LandingPage.tsx"))!;
    expect(landing.src).not.toMatch(pattern);
  });

  it("plan features list no Autopilot workflows or Slack alerts", () => {
    for (const plan of PLAN_ORDER) {
      expect(planFeatures(plan).join(" | "), plan).not.toMatch(/Autopilot|Slack|webhook/i);
    }
  });
});
