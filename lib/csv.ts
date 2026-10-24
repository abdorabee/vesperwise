/**
 * Shared CSV utility — RFC 4180-compliant formatting with Excel compatibility.
 */

// ─── Field Escaping ─────────────────────────────────────────────────────────

function escapeField(value: unknown): string {
  if (value === null || value === undefined) return '""';
  if (Array.isArray(value)) return escapeField(value.join("; "));
  const str = String(value);
  // Always quote for consistency (RFC 4180 allows it, Excel prefers it)
  return `"${str.replace(/"/g, '""')}"`;
}

// ─── Signal Formatting ──────────────────────────────────────────────────────

interface SignalLike {
  score: number;
  max: number;
  detail?: string;
}

export function formatSignal(signal: SignalLike | undefined | null): string {
  if (!signal) return "";
  return `${signal.score}/${signal.max}`;
}

// ─── CSV Generation ─────────────────────────────────────────────────────────

export interface CsvColumn {
  key: string;
  label: string;
}

/**
 * Convert rows to a CSV string with:
 * - UTF-8 BOM for Excel compatibility
 * - Human-readable column headers
 * - All fields quoted (RFC 4180)
 * - CRLF line endings
 */
export function toCSV(
  columns: CsvColumn[],
  rows: Array<Record<string, unknown>>
): string {
  const BOM = "\uFEFF";
  const headerLine = columns.map((c) => escapeField(c.label)).join(",");
  const dataLines = rows.map((row) =>
    columns.map((c) => escapeField(row[c.key])).join(",")
  );
  return BOM + [headerLine, ...dataLines].join("\r\n");
}

/**
 * Server-side variant: same as toCSV but without BOM (for API responses
 * where the Content-Type header handles encoding).
 */
export function toCSVRaw(
  columns: CsvColumn[],
  rows: Array<Record<string, unknown>>
): string {
  const headerLine = columns.map((c) => escapeField(c.label)).join(",");
  const dataLines = rows.map((row) =>
    columns.map((c) => escapeField(row[c.key])).join(",")
  );
  return [headerLine, ...dataLines].join("\r\n");
}

/**
 * Trigger a browser file download with CSV content.
 */
/**
 * Ask the server to authorize the export, then download the CSV it returns.
 * Free and Starter get 403 from `/api/v1/export/csv`.
 */
export async function downloadAuthorizedCsv(
  filename: string,
  columns: CsvColumn[],
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  const response = await fetch("/api/v1/export/csv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, columns, rows }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error ?? "Export failed");
  }
  downloadCSV(await response.text(), filename);
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate a timestamped filename: `vesperwise-bulk-scores-2026-04-02.csv`
 */
export function csvFilename(prefix: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix}-${date}.csv`;
}
