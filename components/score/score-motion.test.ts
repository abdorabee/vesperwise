import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const view = readFileSync(new URL("../../app/(dashboard)/score/score-view.tsx", import.meta.url), "utf8");
const research = readFileSync(new URL("./score-research-status.tsx", import.meta.url), "utf8");

describe("Score motion contract", () => {
  it("ties progress to real request or tool state instead of fake provider steps", () => {
    expect(view).not.toContain("STEPS");
    expect(view).not.toContain("setInterval");
    expect(view).toContain("tool.status === \"running\"");
    expect(research).toContain("Verifying current signals");
  });

  it("uses the shared easing, restrained offsets, and reduced-motion fallback", () => {
    expect(css).toContain("cubic-bezier(0.22, 1, 0.36, 1)");
    expect(css).toContain("translateY(6px)");
    expect(css).toContain("translateY(4px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation: none !important");
  });
});
