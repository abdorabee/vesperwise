import { describe, expect, it } from "vitest";

import { modKeyFor, shortcutLabel } from "./use-mod-key";

describe("modKeyFor", () => {
  it.each(["MacIntel", "macOS", "iPhone", "iPad", "iPod"])("uses ⌘ on %s", (platform) => {
    expect(modKeyFor(platform)).toBe("⌘");
  });

  it.each(["Win32", "Windows", "Linux x86_64", "Android", ""])("uses Ctrl on %s", (platform) => {
    expect(modKeyFor(platform)).toBe("Ctrl");
  });
});

describe("shortcutLabel", () => {
  it("joins the modifier and key per platform convention", () => {
    expect(shortcutLabel("Ctrl", "K")).toBe("Ctrl K");
    expect(shortcutLabel("⌘", "K")).toBe("⌘K");
  });
});
