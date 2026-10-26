import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { BULK_INLINE_MAX_ROWS, formatCount } from "@/lib/plan-features";
import {
  BulkProcessingPanel,
  BulkResultsPanel,
  BulkUploadPanel,
  type BulkResponse,
} from "./bulk-workspace";

const noop = vi.fn();

describe("BulkUploadPanel", () => {
  it("renders the empty upload state with format guidance", () => {
    const html = renderToStaticMarkup(
      <BulkUploadPanel
        file={null}
        loading={false}
        dragActive={false}
        error={null}
        onBrowse={noop}
        onRemove={noop}
        onSubmit={noop}
        onDragEnter={noop}
        onDragLeave={noop}
        onDragOver={noop}
        onDrop={noop}
        onFileChange={noop}
      />,
    );

    expect(html).toContain('aria-label="CSV file"');
    expect(html).toContain('aria-label="Choose a CSV file"');
    expect(html).toContain('aria-labelledby="bulk-format-heading"');
    expect(html).toContain('<h3 id="bulk-format-heading">CSV requirements</h3>');
    expect(html).toContain("domain");
    expect(html).toContain("company");
    expect(html).toContain(`Up to ${formatCount(BULK_INLINE_MAX_ROWS)} companies`);
    expect(html).toContain(`Maximum ${formatCount(BULK_INLINE_MAX_ROWS)} companies`);
    expect(BULK_INLINE_MAX_ROWS).toBe(50);
  });

  it("renders the selected file summary and enables submission", () => {
    const html = renderToStaticMarkup(
      <BulkUploadPanel
        file={{ name: "target-accounts.csv", size: 1_536 }}
        loading={false}
        dragActive={false}
        error={null}
        onBrowse={noop}
        onRemove={noop}
        onSubmit={noop}
        onDragEnter={noop}
        onDragLeave={noop}
        onDragOver={noop}
        onDrop={noop}
        onFileChange={noop}
      />,
    );

    expect(html).toContain("target-accounts.csv");
    expect(html).toContain("1.5 KB");
    expect(html).toContain("Ready to score");
    expect(html).not.toContain('disabled=""');
  });
});

describe("BulkProcessingPanel", () => {
  it("announces indeterminate processing without claiming numeric progress", () => {
    const html = renderToStaticMarkup(
      <BulkProcessingPanel fileName="target-accounts.csv" />,
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Scoring companies");
    expect(html).not.toContain("%");
  });
});

describe("BulkResultsPanel", () => {
  it("renders batch metrics, coverage, results, and failures", () => {
    const response = {
      total: 2,
      scored: 1,
      failed: 1,
      results: [
        {
          domain: "linear.app",
          company_name: "Linear",
          intent_score: 82,
          score_band: "HOT",
          ai_summary: "Recent hiring and product activity indicate active expansion.",
          data_coverage: 0.836,
        },
      ],
      errors: [{ domain: "missing.example", error: "Insufficient data coverage" }],
    } as BulkResponse;

    const html = renderToStaticMarkup(
      <BulkResultsPanel response={response} onDownload={noop} />,
    );

    expect(html).toContain("2");
    expect(html).toContain("1 scored");
    expect(html).toContain("1 failed");
    expect(html).toContain("Linear");
    expect(html).toContain("84%");
    expect(html).toContain("<caption");
    expect(html).toContain("Ranked bulk scoring results");
    expect(html).toContain("missing.example");
    expect(html).toContain("Insufficient data coverage");
  });
});
