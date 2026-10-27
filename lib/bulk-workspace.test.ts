import { describe, expect, it } from "vitest";

import { parseCsvRecords } from "./csv-parse";
import { bulkCreditEstimateMessage } from "./bulk-inline";
import { BULK_INLINE_MAX_ROWS } from "./plan-features";
import {
  bulkCsvIssue,
  bulkTemplateCsv,
  formatBulkFileSize,
  formatCoverage,
  summarizeBulkCsv,
  validateBulkFile,
} from "./bulk-workspace";

describe("validateBulkFile", () => {
  it("accepts CSV filenames regardless of extension casing", () => {
    expect(validateBulkFile({ name: "accounts.CSV" })).toBeNull();
  });

  it("rejects files that are not CSV documents", () => {
    expect(validateBulkFile({ name: "accounts.xlsx" })).toBe(
      "Choose a CSV file to continue.",
    );
  });
});

describe("bulkTemplateCsv", () => {
  it("creates the supported domain and company headers without sample data", () => {
    expect(bulkTemplateCsv()).toBe("domain,company\n");
  });
});

describe("formatBulkFileSize", () => {
  it.each([
    [0, "0 B"],
    [1_536, "1.5 KB"],
    [1_048_576, "1 MB"],
  ])("formats %i bytes as %s", (bytes, expected) => {
    expect(formatBulkFileSize(bytes)).toBe(expected);
  });
});

describe("bulkCreditEstimateMessage", () => {
  it("says the run uses up to N credits and does not charge failed rows", () => {
    expect(bulkCreditEstimateMessage({
      estimatedFresh: 12,
      creditsRemaining: 495,
    })).toBe(
      "This run uses up to 12 credits for 12 fresh scores. Failed rows are not charged. You have 495 left.",
    );
  });

  it("pluralizes a single fresh score", () => {
    expect(bulkCreditEstimateMessage({
      estimatedFresh: 1,
      creditsRemaining: 1500,
    })).toBe(
      "This run uses up to 1 credit for 1 fresh score. Failed rows are not charged. You have 1,500 left.",
    );
  });
});

describe("bulk CSV credit estimate", () => {
  it("builds the banner from the parsed row count before a run starts", () => {
    const csv = ["domain,company", ...Array.from({ length: 12 }, (_, i) => `co${i}.example,Co ${i}`)].join("\n");
    const rows = parseCsvRecords(csv);
    expect(bulkCsvIssue(rows)).toBeNull();
    expect(bulkCreditEstimateMessage({
      estimatedFresh: rows.length,
      creditsRemaining: 495,
    })).toBe(
      "This run uses up to 12 credits for 12 fresh scores. Failed rows are not charged. You have 495 left.",
    );
  });

  it("rejects a file over the enforced batch size", () => {
    const rows = Array.from({ length: BULK_INLINE_MAX_ROWS + 1 }, () => ({ domain: "acme.com" }));
    expect(bulkCsvIssue(rows)).toBe(
      `Maximum ${BULK_INLINE_MAX_ROWS} companies per batch. Your file has ${rows.length} rows.`,
    );
  });
});

describe("formatCoverage", () => {
  it("converts fractional coverage to a whole percentage", () => {
    expect(formatCoverage(0.836)).toBe("84%");
  });
});

describe("summarizeBulkCsv", () => {
  it("counts rows and samples the domain column", () => {
    const summary = summarizeBulkCsv(
      "Domain,Company\nstripe.com,Stripe\nlinear.app,Linear\n\nnotion.so,Notion\n",
    );

    expect(summary).toEqual({
      rowCount: 3,
      column: "domain",
      sample: ["stripe.com", "linear.app", "notion.so"],
      error: null,
    });
  });

  it("falls back to the company column when domain is absent", () => {
    const summary = summarizeBulkCsv("company\nAcme\n");

    expect(summary.column).toBe("company");
    expect(summary.sample).toEqual(["Acme"]);
    expect(summary.error).toBeNull();
  });

  it("caps the sample at five entries", () => {
    const rows = Array.from({ length: 8 }, (_, i) => `c${i}.com`).join("\n");

    expect(summarizeBulkCsv(`domain\n${rows}`).sample).toHaveLength(5);
  });

  it("rejects files without a domain or company header", () => {
    expect(summarizeBulkCsv("name\nAcme\n").error).toBe(
      "CSV must have a 'domain' or 'company' column",
    );
  });

  it("rejects files with no company rows", () => {
    expect(summarizeBulkCsv("domain\n").error).toBe("No rows found in CSV");
  });

  it("rejects batches over the 50 row limit", () => {
    const rows = Array.from({ length: 51 }, (_, i) => `c${i}.com`).join("\n");

    expect(summarizeBulkCsv(`domain\n${rows}`).error).toBe(
      "Maximum 50 companies per batch. Your file has 51 rows.",
    );
  });
});
