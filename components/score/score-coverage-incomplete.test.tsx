import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ScoreCoverageIncomplete } from "./score-coverage-incomplete";

describe("ScoreCoverageIncomplete", () => {
  it("explains incomplete coverage without presenting unavailable evidence as zero", () => {
    const html = renderToStaticMarkup(
      <ScoreCoverageIncomplete
        result={{
          company: "Facebook",
          domain: "facebook.com",
          coveragePercent: 40,
          signals: [
            { key: "funding", label: "Funding", state: "checked", statusLabel: "Checked", currentRead: "0 / 25", detail: "No recent funding activity detected", source: "Explorium" },
            { key: "technology", label: "Technology", state: "unavailable", statusLabel: "Unavailable", currentRead: "Unavailable", detail: "Technology data unavailable", source: "BuiltWith" },
          ],
        }}
        onRetry={() => undefined}
        onReset={() => undefined}
      />
    );

    expect(html).toContain("We couldn’t calculate a reliable score");
    expect(html).toContain("40% coverage");
    expect(html).toContain("0 / 25");
    expect(html).toContain("Unavailable");
    expect(html).toContain("No score was produced");
    expect(html).toContain("No credit charged");
    expect(html).toContain("Retry sources");
    expect(html).toContain("Score another company");
  });
});
