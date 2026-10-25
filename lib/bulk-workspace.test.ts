import { describe, expect, it } from "vitest";

import { bulkCreditEstimateMessage } from "./bulk-inline";
import {
  bulkTemplateCsv,
  formatBulkFileSize,
  formatCoverage,
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

describe("formatCoverage", () => {
  it("converts fractional coverage to a whole percentage", () => {
    expect(formatCoverage(0.836)).toBe("84%");
  });
});
