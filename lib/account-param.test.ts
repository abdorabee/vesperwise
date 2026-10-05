import { describe, expect, it } from "vitest";
import { accountHref, readAccountParam } from "./account-param";

describe("accountHref", () => {
  it("sets the account param and keeps other params", () => {
    expect(accountHref("/history", "range=7d&page=2", "stripe.com")).toBe("/history?range=7d&page=2&account=stripe.com");
  });

  it("replaces an existing account param", () => {
    expect(accountHref("/pipeline", "account=old.com", "new.com")).toBe("/pipeline?account=new.com");
  });

  it("removes the param and drops a trailing '?' when closing", () => {
    expect(accountHref("/watchlist", "account=stripe.com", null)).toBe("/watchlist");
    expect(accountHref("/watchlist", "account=stripe.com&view=hot", null)).toBe("/watchlist?view=hot");
  });
});

describe("readAccountParam", () => {
  it("normalises to a trimmed lowercase domain", () => {
    expect(readAccountParam("  Stripe.COM ")).toBe("stripe.com");
  });

  it("treats empty values as no account", () => {
    expect(readAccountParam(null)).toBeNull();
    expect(readAccountParam("   ")).toBeNull();
  });
});
