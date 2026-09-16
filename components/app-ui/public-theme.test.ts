import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("public page themes", () => {
  it("uses semantic chrome that remains legible in light and dark modes", () => {
    const pages = [
      "../../app/about/about-view.tsx",
      "../../app/pricing/pricing-view.tsx",
      "../../app/contact/contact-view.tsx",
      "../../app/docs/docs-view.tsx",
      "../../app/privacy/privacy-view.tsx",
      "../../app/terms/terms-view.tsx",
      "../../app/legal/dpa/dpa-view.tsx",
      "../../app/legal/security/security-view.tsx",
      "../../app/legal/subprocessors/subprocessors-view.tsx",
    ];

    for (const path of pages) {
      const page = read(path);
      expect(page, path).not.toContain("rgba(8,9,10");
      expect(page, path).not.toContain("rgba(5,6,8");
      expect(page, path).not.toContain("color: #f7f8f8 !important");
    }
  });

  it("keeps landing chrome theme-aware and product copy sans-serif", () => {
    const landing = read("../landing/LandingPage.tsx");
    const globals = read("../../app/globals.css");

    expect(globals).not.toContain("background: rgba(8,9,10,0.72)");
    expect(landing).not.toContain("var(--font-mono)");
    expect(globals).toContain(".hero h1 .grad {\n  color: var(--foreground)");
  });
});
