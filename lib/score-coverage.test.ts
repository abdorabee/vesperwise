import { describe, expect, it } from "vitest";

import { parseIncompleteCoverage } from "@/lib/score-coverage";

const unscorablePayload = {
  type: "error",
  code: "unscorable_domain",
  message: "Domain does not have enough reliable signal coverage to score",
  company: "Facebook",
  domain: "facebook.com",
  data_coverage: 0.4,
  score_status: "unscorable",
  charged: false,
  source_status: {
    funding: "no_signal",
    hiring: "ok",
    news: "stale",
    technology: "unavailable",
    web_activity: "unavailable",
  },
  signals: {
    funding: { score: 0, max: 25, detail: "No recent funding activity detected", source: "explorium" },
    hiring: { score: 9, max: 20, detail: "Hiring for revenue roles", source: "explorium-events" },
    news: { score: 4, max: 20, detail: "Older expansion evidence", source: "gnews" },
    technology: { score: 0, max: 20, detail: "Technology data unavailable", source: "builtwith" },
    web_activity: { score: 0, max: 15, detail: "Web activity evidence unavailable", source: "firecrawl" },
  },
};

describe("parseIncompleteCoverage", () => {
  it("preserves verified zero while marking missing provider evidence unavailable", () => {
    const result = parseIncompleteCoverage(unscorablePayload);

    expect(result).not.toBeNull();
    expect(result?.domain).toBe("facebook.com");
    expect(result?.coveragePercent).toBe(40);
    expect(result?.signals).toEqual([
      expect.objectContaining({ key: "funding", state: "checked", currentRead: "0 / 25" }),
      expect.objectContaining({ key: "hiring", state: "verified", currentRead: "9 / 20" }),
      expect.objectContaining({ key: "news", state: "stale", currentRead: "4 / 20" }),
      expect.objectContaining({ key: "technology", state: "unavailable", currentRead: "Unavailable" }),
      expect.objectContaining({ key: "web_activity", state: "unavailable", currentRead: "Unavailable" }),
    ]);
  });

  it("does not treat unrelated or malformed errors as coverage results", () => {
    expect(parseIncompleteCoverage({ code: "insufficient_credits" })).toBeNull();
    expect(parseIncompleteCoverage({ code: "unscorable_domain", domain: "facebook.com" })).toBeNull();
  });
});
