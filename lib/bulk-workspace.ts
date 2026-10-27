import { BULK_INLINE_MAX_ROWS } from "@/lib/plan-features";

import { parseCsvRecords, parseCsvRows } from "./csv-parse";

interface BulkFileLike {
  name: string;
}

/** Same rejection the dashboard CSV route returns, so the page can show it before Score. */
export function bulkCsvIssue(rows: Array<Record<string, string>>): string | null {
  if (rows.length === 0) return "No rows found in CSV";
  if (rows.length > BULK_INLINE_MAX_ROWS) {
    return `Maximum ${BULK_INLINE_MAX_ROWS} companies per batch. Your file has ${rows.length} rows.`;
  }
  if (!rows[0]?.domain && !rows[0]?.company) {
    return "CSV must have a 'domain' or 'company' column";
  }
  return null;
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
    error: bulkCsvIssue(records),
  };
}
