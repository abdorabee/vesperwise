import { describe, expect, it } from "vitest";
import { formatHistoryShare } from "@/lib/history-share";

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
