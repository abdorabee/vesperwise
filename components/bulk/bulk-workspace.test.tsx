import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  BulkProcessingPanel,
  BulkResultsPanel,
  BulkResultsPreview,
  BulkUploadPanel,
  type BulkResponse,
} from "./bulk-workspace";

const noop = vi.fn();

describe("BulkUploadPanel", () => {
  it("renders the empty upload state with format guidance", () => {
    const html = renderToStaticMarkup(
      <BulkUploadPanel
        file={null}
        summary={null}
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
    expect(html).toContain('id="bulk-file-requirements"');
    expect(html).toContain("stripe.com");
    expect(html).toContain("domain");
    expect(html).toContain("company");
    expect(html).toContain("50 companies");
  });

  it("renders the selected file summary and enables submission", () => {
    const html = renderToStaticMarkup(
      <BulkUploadPanel
        file={{ name: "target-accounts.csv", size: 1_536 }}
        summary={{
          rowCount: 7,
          column: "domain",
          sample: ["a.com", "b.com", "c.com", "d.com", "e.com"],
          error: null,
        }}
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
    expect(html).toContain("7 companies");
    expect(html).toContain("+2 more");
    expect(html).toContain("Score 7 companies");
    expect(html).not.toContain('disabled=""');
  });

  it("blocks submission when the CSV fails preflight", () => {
    const html = renderToStaticMarkup(
      <BulkUploadPanel
        file={{ name: "too-many.csv", size: 4_096 }}
        summary={{
          rowCount: 51,
          column: "domain",
          sample: ["a.com"],
          error: "This CSV has 51 rows. The limit is 50 per batch.",
        }}
        loading={false}
        dragActive={false}
        error="This CSV has 51 rows. The limit is 50 per batch."
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

    expect(html).toContain('role="alert"');
    expect(html).toContain("Score companies</button>");
    expect(html).toMatch(/disabled=""[^>]*>.*Score companies/);
  });
});

describe("BulkResultsPreview", () => {
  it("previews the result columns before any batch runs", () => {
    const html = renderToStaticMarkup(<BulkResultsPreview />);

    expect(html).toContain("Ranked results");
    expect(html).toContain("AI thesis");
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
