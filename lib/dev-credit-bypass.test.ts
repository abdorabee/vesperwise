import { describe, expect, it } from "vitest";

import { isDevCreditBypassEnabled } from "@/lib/dev-credit-bypass";

describe("isDevCreditBypassEnabled", () => {
  it("allows the explicit testing flag outside production", () => {
    expect(
      isDevCreditBypassEnabled({
        NODE_ENV: "development",
        DEV_BYPASS_CREDITS: "true",
      })
    ).toBe(true);
  });

  it("never bypasses credits in production", () => {
    expect(
      isDevCreditBypassEnabled({
        NODE_ENV: "production",
        DEV_BYPASS_CREDITS: "true",
      })
    ).toBe(false);
  });

  it("keeps charging when the testing flag is absent or disabled", () => {
    expect(isDevCreditBypassEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(
      isDevCreditBypassEnabled({
        NODE_ENV: "test",
        DEV_BYPASS_CREDITS: "false",
      })
    ).toBe(false);
  });
});
