import { describe, expect, it } from "vitest";
import { isInnerInteractiveClick } from "./row-click";

function target(closestHit: unknown) {
  return { closest: () => closestHit } as unknown as EventTarget;
}

describe("isInnerInteractiveClick", () => {
  const row = {} as EventTarget;

  it("ignores clicks that land on a link or button inside the row", () => {
    expect(isInnerInteractiveClick(target({ tagName: "A" }), row)).toBe(true);
  });

  it("handles clicks on plain row content", () => {
    expect(isInnerInteractiveClick(target(null), row)).toBe(false);
  });

  it("handles clicks when the nearest interactive element is the row itself", () => {
    expect(isInnerInteractiveClick(target(row), row)).toBe(false);
  });

  it("handles targets without closest (e.g. text nodes)", () => {
    expect(isInnerInteractiveClick({} as EventTarget, row)).toBe(false);
    expect(isInnerInteractiveClick(null, row)).toBe(false);
  });
});
