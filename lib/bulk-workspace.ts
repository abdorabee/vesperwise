import { parseCsvRecords, parseCsvRows } from "./csv-parse";


interface BulkFileLike {
  name: string;
}

export function validateBulkFile(file: BulkFileLike): string | null {
  return file.name.toLowerCase().endsWith(".csv")
    ? null
    : "Choose a CSV file to continue.";
}

export function bulkTemplateCsv(): string {
  return "domain,company\n";
}

export function formatBulkFileSize(bytes: number): string {
  if (bytes < 1_024) return `${bytes} B`;

  const kilobytes = bytes / 1_024;
  if (kilobytes < 1_024) {
    return `${Number(kilobytes.toFixed(1))} KB`;
  }

  return `${Number((kilobytes / 1_024).toFixed(1))} MB`;
}

export function formatCoverage(coverage: number): string {
  return `${Math.round(coverage * 100)}%`;
}

export const BULK_MAX_ROWS = 50;
const SAMPLE_SIZE = 5;

export interface BulkCsvSummary {
  rowCount: number;
  column: "domain" | "company" | null;
  sample: string[];
  error: string | null;
}

/** Client-side preflight that mirrors the bulk-inline route's CSV checks. */
export function summarizeBulkCsv(text: string): BulkCsvSummary {
  const records = parseCsvRecords(text);
  const headers = new Set(
    (parseCsvRows(text.replace(/^﻿/, ""))[0] ?? []).map((header) =>
      header.trim().toLowerCase(),
    ),
  );
  const column = headers.has("domain")
    ? "domain"
    : headers.has("company")
      ? "company"
      : null;
  const sample = column
    ? records
        .map((record) => record[column])
        .filter((value) => value !== "")
        .slice(0, SAMPLE_SIZE)
    : [];

  return {
    rowCount: records.length,
    column,
    sample,
    error: bulkCsvError(records.length, column),
  };
}

function bulkCsvError(
  rowCount: number,
  column: BulkCsvSummary["column"],
): string | null {
  if (!column) return "Add a domain or company column header.";
  if (rowCount === 0) return "This CSV has no company rows.";
  if (rowCount > BULK_MAX_ROWS) {
    return `This CSV has ${rowCount} rows. The limit is ${BULK_MAX_ROWS} per batch.`;
  }
  return null;
}
