import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../../../app/shell.css", import.meta.url), "utf8");

// Declarations for a class, merged across every rule whose selector list names it.
function declarationsFor(className: string) {
  const rules = css.matchAll(/([^{}]+)\{([^{}]*)\}/g);
  const declarations = new Map<string, string>();
  for (const [, selectorList, body] of rules) {
    const selectors = selectorList.split(",").map((selector) => selector.trim());
    if (!selectors.includes(`.${className}`)) continue;
    for (const declaration of body.split(";")) {
      const [property, ...value] = declaration.split(":");
      if (property?.trim() && value.length) {
        declarations.set(property.trim(), value.join(":").trim());
      }
    }
  }
  return declarations;
}

// Slot targets let clicks fall through while empty, so the content portaled
// into them must turn pointer events back on or nothing inside is clickable.
const SLOTS = [
  { target: "dashboard-shell-list-target", content: "dashboard-shell-list" },
  { target: "dashboard-shell-panel-target", content: "dashboard-shell-panel" },
];

describe("shell slot pointer events", () => {
  it.each(SLOTS)("$content receives clicks inside $target", ({ target, content }) => {
    expect(declarationsFor(target).get("pointer-events")).toBe("none");
    expect(declarationsFor(content).get("pointer-events")).toBe("auto");
  });
});
