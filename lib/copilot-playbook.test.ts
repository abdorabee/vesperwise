import { describe, expect, it } from "vitest";

import { SANDBOX_DESIGN_CSS } from "@/components/score/sandbox-tool/frame-content";
import { buildCopilotSystemPrompt } from "./copilot";
import type { DbUser } from "./types";

function cssNames(css: string, prefix: "--" | "."): string[] {
  const pattern = prefix === "--" ? /(--[a-z0-9-]+)\s*:/g : /\.([a-z][a-z0-9-]*)\b/g;
  return [...css.matchAll(pattern)].map((match) => prefix === "--" ? match[1]! : `.${match[1]!}`);
}

const user = {
  id: "user_1",
  role: "ae",
  plan: "pro",
  credits_remaining: 12,
  product_category: "B2B SaaS",
  business_profile: null,
} as DbUser;

describe("buildCopilotSystemPrompt interactive tool playbook", () => {
  it("includes routing, bridge names, data refs, and the four recipes", () => {
    const prompt = buildCopilotSystemPrompt(user, {
      recentScores: [{ domain: "notion.so", company_name: "Notion", score: 84, score_band: "HOT" }],
      watchlist: [],
    });

    expect(prompt).toContain("INTERACTIVE TOOLS (build_interactive_tool)");
    expect(prompt).toContain("quick fact or advice -> plain text");
    expect(prompt).toContain("exact comparison or a stored score -> present_ui");
    expect(prompt).toContain("calculator, chart, diagram, or tool for the moment -> build_interactive_tool");
    expect(prompt).toContain("prefillPrompt({ text })");
    expect(prompt).toContain("openAccount({ domain })");
    expect(prompt).toContain("openLink({ url })");
    expect(prompt).toContain("account:<domain>");
    expect(prompt).toContain("accounts:recent");
    expect(prompt).toContain("pipeline");
    expect(prompt).toContain("ROI / deal calculator");
    expect(prompt).toContain("Signal timeline chart");
    expect(prompt).toContain("Account comparison chart");
    expect(prompt).toContain("Stakeholder map");
  });

  it("keeps the prompt design token and class list in sync with SANDBOX_DESIGN_CSS", () => {
    const prompt = buildCopilotSystemPrompt(user, { recentScores: [], watchlist: [] });

    for (const token of cssNames(SANDBOX_DESIGN_CSS, "--")) {
      expect(prompt).toContain(token);
    }
    for (const className of cssNames(SANDBOX_DESIGN_CSS, ".")) {
      expect(prompt).toContain(className);
    }
  });
});
