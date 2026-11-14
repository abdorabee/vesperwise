import { describe, expect, it } from "vitest";
import { toCSVRaw } from "./csv";

const COLUMNS = [{ key: "v", label: "Value" }];

function cell(value: unknown): string {
  return toCSVRaw(COLUMNS, [{ v: value }]).split("\r\n")[1];
}

describe("csv escaping", () => {
  it("quotes normal fields and doubles embedded quotes", () => {
    expect(cell('say "hi"')).toBe('"say ""hi"""');
    expect(cell("plain")).toBe('"plain"');
  });

  it("renders null and undefined as empty quoted fields", () => {
    expect(cell(null)).toBe('""');
    expect(cell(undefined)).toBe('""');
  });

  it("joins arrays with semicolons", () => {
    expect(cell(["a", "b"])).toBe('"a; b"');
  });

  it.each(["=SUM(A1)", "+cmd|' /C calc'!A0", "-2+3", "@SUM(1)", "\tfoo", "\rfoo"])(
    "neutralises formula-leading value %j",
    (value) => {
      expect(cell(value)).toBe(`"'${value.replace(/"/g, '""')}"`);
    },
  );

  it.each([-12.5, "-12.5", "+3", 0, "42", "-0.5e3"])("leaves plain number %j untouched", (value) => {
    expect(cell(value)).toBe(`"${String(value)}"`);
  });

  it("neutralises formulas in header labels too", () => {
    const out = toCSVRaw([{ key: "v", label: "=evil" }], []);
    expect(out).toBe(`"'=evil"`);
  });
});
