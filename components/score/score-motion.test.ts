import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  new URL("../../app/globals.css", import.meta.url),
  "utf8",
);
const motionUrl = new URL("../../app/motion.css", import.meta.url);
const motionCss = existsSync(motionUrl) ? readFileSync(motionUrl, "utf8") : "";
const allCss = `${css}\n${motionCss}`;
const view = readFileSync(
  new URL("../../app/(dashboard)/score/score-view.tsx", import.meta.url),
  "utf8",
);
const research = readFileSync(
  new URL("./score-research-status.tsx", import.meta.url),
  "utf8",
);
const thread = readFileSync(
  new URL("./score-conversation-thread.tsx", import.meta.url),
  "utf8",
);

function reducedMotionBlock() {
  const match = motionCss.match(
    /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*)\n\}/,
  );
  return match?.[1] ?? "";
}

describe("Score motion contract", () => {
  it("ties progress to real request or tool state instead of fake provider steps", () => {
    expect(view).not.toContain("STEPS");
    expect(view).not.toContain("setInterval");
    expect(view).toContain('tool.status === "running"');
    expect(research).toContain("Verifying current signals");
  });

  it("uses the shared easing, restrained offsets, and reduced-motion fallback", () => {
    expect(allCss).toContain("cubic-bezier(0.22, 1, 0.36, 1)");
    expect(allCss).toContain("translateY(6px)");
    expect(allCss).toContain("translateY(4px)");
    expect(allCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(allCss).toContain("animation: none !important");
  });

  it("uses the branded ThinkingOrb for active score research", () => {
    expect(research).toContain("ThinkingOrb");
    expect(research).not.toContain("score-research-dot");
  });

  it("keeps fresh-score meter motion scoped and reduced-motion-safe", () => {
    expect(motionCss).toContain('[data-motion="generated"] .score-meter-fill');
    expect(motionCss).toContain(
      "animation: score-meter-fill-in 600ms cubic-bezier(0.33, 1, 0.68, 1)",
    );
    expect(motionCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.route-enter[\s\S]*\.text-swap-in[\s\S]*\.headline-shimmer[\s\S]*\[data-motion="generated"\] \.score-meter-fill/,
    );
  });

  it("keeps the orb mounted while chat thinking labels blur-swap", () => {
    expect(research).toContain("<ThinkingOrb label={headline}");
    expect(research).toContain('<span key={headline} className="text-swap-in headline-shimmer">');
    expect(thread).toContain("const thinkingLabel = running");
    expect(thread).toContain("`Using ${toolLabel(running.name)}…`");
    expect(thread).toContain('"Thinking…"');
    expect(thread).not.toContain(
      "<ScoreResearchStatus mode={message.mode} progress={message.progress} />{running",
    );
  });

  it("keeps new score chat motion classes in motion.css and reduced-motion-safe", () => {
    const animatedClasses = [
      ".score-user-bubble-in",
      ".score-tool-chip",
      ".score-tool-spinner",
      ".score-tool-status",
      ".score-tool-check",
      ".score-suggestion-chip",
      ".score-submit-icon-swap",
      ".conversation-scroll-button-in",
      ".score-error-card-shake",
    ];

    const reduced = reducedMotionBlock();
    for (const className of animatedClasses) {
      expect(motionCss).toContain(className);
      expect(reduced).toContain(className);
    }
  });
});
