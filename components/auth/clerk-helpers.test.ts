import { describe, expect, it } from "vitest";
import { distinctGlobalError } from "./clerk-helpers";

describe("distinctGlobalError", () => {
  it("hides a form-level error that repeats a field error", () => {
    expect(distinctGlobalError("Couldn't find your account.", ["Couldn't find your account.", undefined])).toBeUndefined();
  });

  it("keeps a form-level error that adds new information", () => {
    expect(distinctGlobalError("Too many attempts.", ["Couldn't find your account."])).toBe("Too many attempts.");
  });

  it("returns undefined when there is no message", () => {
    expect(distinctGlobalError(null, [])).toBeUndefined();
  });
});
