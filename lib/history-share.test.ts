import { describe, expect, it } from "vitest";
import { formatCreditPace, formatHistoryShare } from "@/lib/history-share";

describe("formatHistoryShare", () => {
  it("keeps the count and percent from reading as one number", () => {
    expect(formatHistoryShare(1, 9)).toBe("1 · 11.1%");
    expect(formatHistoryShare(3, 9)).toBe("3 · 33.3%");
    expect(formatHistoryShare(5, 9)).toBe("5 · 55.6%");
  });

  it("shows the count alone when there is nothing to divide by", () => {
    expect(formatHistoryShare(4, 0)).toBe("4");
  });
});

describe("formatCreditPace", () => {
  it("shows a sub-1 daily rate instead of rounding it to zero", () => {
    expect(formatCreditPace(5)).toBe("<1/day pace");
    expect(formatCreditPace(29)).toBe("<1/day pace");
  });

  it("keeps a zero pace and rounds rates of at least one per day", () => {
    expect(formatCreditPace(0)).toBe("≈ 0/day pace");
    expect(formatCreditPace(30)).toBe("≈ 1/day pace");
    expect(formatCreditPace(45)).toBe("≈ 2/day pace");
  });
});
