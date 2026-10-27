import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

// See docs/wiki/motion.md: repeat-use UI is instant; motion is for panels,
// real waits, and brief exits.
describe("motion policy", () => {
  it.each(["./dropdown-menu.tsx", "./select.tsx", "./hover-card.tsx"])(
    "%s opens instantly and only fades on close",
    (file) => {
      const source = read(file);
      expect(source).not.toContain("data-[state=open]:animate-in");
      expect(source).not.toContain("zoom-in-95");
      expect(source).not.toContain("zoom-out-95");
      expect(source).toContain("data-[state=closed]:fade-out-0");
    },
  );

  it("delays the first tooltip, then shows the next ones instantly", () => {
    const tooltip = read("./tooltip.tsx");
    expect(tooltip).toContain("delayDuration = 400");
    expect(tooltip).toContain("skipDelayDuration = 300");
    expect(tooltip).toContain("data-[state=delayed-open]:animate-in");
    expect(tooltip).not.toContain("zoom-in-95");
    expect(read("./sidebar.tsx")).not.toContain("delayDuration={0}");
  });

  it("switches tabs without a transition", () => {
    const trigger = read("./tabs.tsx");
    expect(trigger).not.toContain("duration-200");
  });

  it("never uses linear easing for UI movement", () => {
    expect(read("./sidebar.tsx")).not.toContain("ease-linear");
    expect(read("../dashboard/site-header.tsx")).not.toContain("ease-linear");
  });

  it("keeps sheets short", () => {
    const sheet = read("./sheet.tsx");
    expect(sheet).not.toContain("duration-500");
  });

  it("does not animate dashboard route changes", () => {
    expect(read("../../app/(dashboard)/template.tsx")).not.toContain("route-enter");
    expect(read("../../app/motion.css")).not.toContain("@keyframes route-enter");
  });

  it("does not lift rows or KPIs on hover", () => {
    const css = read("../../app/globals.css");
    expect(css).not.toMatch(/\.kpi:hover[^{]*\{[^}]*translateY/);
    expect(css).not.toMatch(/\.wl-row[^{]*\{[^}]*transition:[^;]*transform/);
  });
});
