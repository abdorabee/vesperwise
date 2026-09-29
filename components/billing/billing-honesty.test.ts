import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dir = new URL("./", import.meta.url);
const sources = readdirSync(dir)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => ({ file: f, src: readFileSync(new URL(f, dir), "utf8") }));

describe("billing shows only what the app actually knows", () => {
  it.each([
    ["hard-coded card brand", /\bVISA\b/],
    ["unverified compliance badge", /PCI-COMPLIANT/],
    ["made-up tax line", /Tax · estimated/],
    ["dead statement download", /Download statement/],
    ["pause (Polar has no pause)", /Pause workspace/],
    ["previous-cycle tab with no data", /Last cycle/],
    ["ranges without data", /"90D"|"YTD"/],
    ["placeholder delta", /▲ —/],
    ["coming-soon copy", /coming soon/i],
  ])("has no %s", (_label, pattern) => {
    for (const { file, src } of sources) {
      expect(src, file).not.toMatch(pattern);
    }
  });
});
