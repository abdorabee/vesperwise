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
    expect(
      isDevCreditBypassEnabled({
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        DISABLE_CREDIT_CHECK: "true",
      })
    ).toBe(false);
    expect(
      isDevCreditBypassEnabled({
        NODE_ENV: "development",
        VERCEL_ENV: "production",
        DISABLE_CREDIT_CHECK: "true",
      })
    ).toBe(false);
  });

  it("honors DISABLE_CREDIT_CHECK only outside production", () => {
    expect(
      isDevCreditBypassEnabled({
        NODE_ENV: "development",
        DISABLE_CREDIT_CHECK: "true",
      })
    ).toBe(true);
    expect(
      isDevCreditBypassEnabled({
        NODE_ENV: "test",
        DISABLE_CREDIT_CHECK: "false",
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
