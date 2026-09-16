import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("product typography", () => {
  it("loads Instrument Sans as the sole product font", () => {
    const layout = read("../../app/layout.tsx");
    const globals = read("../../app/globals.css");

    expect(layout).toContain("Instrument_Sans");
    expect(layout).not.toMatch(/\bGeist\b|\bInter\b/);
    expect(globals).toContain("--font-sans: var(--font-instrument-sans)");
    expect(globals).toContain("--font-mono: var(--font-instrument-sans)");
  });

  it("does not hardcode mono fonts in customer-facing product surfaces", () => {
    const surfaces = [
      "../../app/(auth)/layout.tsx",
      "../../app/about/about-view.tsx",
      "../../app/contact/contact-view.tsx",
      "../../app/pricing/pricing-view.tsx",
      "../../app/privacy/privacy-view.tsx",
      "../../app/terms/terms-view.tsx",
      "../../app/legal/dpa/dpa-view.tsx",
      "../../app/legal/security/security-view.tsx",
      "../../app/legal/subprocessors/subprocessors-view.tsx",
      "../score/score-result-card.tsx",
    ];

    for (const path of surfaces) {
      expect(read(path), path).not.toMatch(/JetBrains Mono|Fira Code|ui-monospace|font-jetbrains|\bInter\b/);
    }
  });

  it("reserves the code font token for literal developer code", () => {
    const codeBlock = read("../ai-elements/code-block.tsx");
    const docs = read("../../app/docs/docs-view.tsx");

    expect(codeBlock).toContain("var(--font-code)");
    expect(docs).toContain("var(--font-code)");
  });
});
