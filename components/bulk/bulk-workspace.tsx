"use client";

import type {
  ChangeEventHandler,
  DragEventHandler,
  Ref,
} from "react";
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import {
  formatBulkFileSize,
  formatCoverage,
  type BulkCsvSummary,
} from "../../lib/bulk-workspace";
import { BULK_INLINE_MAX_ROWS, formatCount } from "../../lib/plan-features";
import type { SignalSet } from "../../lib/types";

export interface BulkResult {
  domain: string;
  company_name: string;
  intent_score: number;
  score_band: string;
  buying_stage: string;
  urgency: string;
  ai_summary: string;
  why_now: string;
  recommended_action: string;
  key_triggers: string[];
  email_subject: string;
  talk_track: string;
  signals: SignalSet;
  score_status: "complete" | "partial";
  data_coverage: number;
  icp_fit_score: number | null;
  cached: boolean;
  charged: boolean;
  last_updated: string;
}

export interface BulkResponse {
  total: number;
  scored: number;
  failed: number;
  results: BulkResult[];
  errors?: Array<{ domain: string; error: string }>;
}

interface BulkFileSummary {
  name: string;
  size: number;
}

interface BulkUploadPanelProps {
  file: BulkFileSummary | null;
  summary: BulkCsvSummary | null;
  loading: boolean;
  dragActive: boolean;
  error: string | null;
  inputRef?: Ref<HTMLInputElement>;
  onBrowse: () => void;
  onRemove: () => void;
  onSubmit: () => void;
  onDragEnter: DragEventHandler<HTMLDivElement>;
  onDragLeave: DragEventHandler<HTMLDivElement>;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDrop: DragEventHandler<HTMLDivElement>;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
}

const SAMPLE_ROWS = [
  ["stripe.com", "Stripe"],
  ["linear.app", "Linear"],
  ["notion.so", "Notion"],
] as const;

function pluralCompanies(count: number): string {
  return `${count} ${count === 1 ? "company" : "companies"}`;
}

function CsvSample() {
  return (
    <div className="bulk-csv-sample" aria-hidden="true">
      <div className="bulk-csv-row is-head">
        <span>domain</span>
        <span>company</span>
      </div>
      {SAMPLE_ROWS.map(([domain, company]) => (
        <div className="bulk-csv-row" key={domain}>
          <span>{domain}</span>
          <span>{company}</span>
        </div>
      ))}
      <div className="bulk-csv-row is-fade">
        <span>…</span>
        <span />
      </div>
    </div>
  );
}

function EmptyDropTarget({
  dragActive,
  disabled,
  onBrowse,
}: {
  dragActive: boolean;
  disabled: boolean;
  onBrowse: () => void;
}) {
  return (
    <button
      type="button"
      className="bulk-drop-target"
      aria-label="Choose a CSV file"
      disabled={disabled}
      onClick={onBrowse}
    >
      <span className="bulk-drop-lead">
        <span className="bulk-drop-icon" aria-hidden="true">
          <Upload />
        </span>
        <span className="bulk-drop-title">
          {dragActive ? "Release to attach" : "Drop a CSV of companies"}
        </span>
        <span className="bulk-drop-copy">
          or <span className="bulk-drop-link">browse files</span>
        </span>
      </span>
      <CsvSample />
    </button>
  );
}

function SelectedFile({
  file,
  summary,
  disabled,
  onRemove,
}: {
  file: BulkFileSummary;
  summary: BulkCsvSummary | null;
  disabled: boolean;
  onRemove: () => void;
}) {
  const extra = summary ? summary.rowCount - summary.sample.length : 0;

  return (
    <div className="bulk-selected">
      <div className="bulk-selected-file">
        <div className="bulk-file-icon" aria-hidden="true">
          <FileSpreadsheet />
        </div>
        <div className="bulk-file-copy">
          <strong>{file.name}</strong>
          <span>
            {formatBulkFileSize(file.size)}
            {summary ? ` · ${pluralCompanies(summary.rowCount)}` : ""}
            {summary?.column ? ` · ${summary.column} column` : ""}
          </span>
        </div>
        <button
          type="button"
          className="bulk-icon-button"
          aria-label={`Remove ${file.name}`}
          disabled={disabled}
          onClick={onRemove}
        >
          <X />
        </button>
      </div>
      {summary?.sample.length ? (
        <ul className="bulk-sample-list" aria-label="First companies in this file">
          {summary.sample.map((value, index) => (
            <li key={`${value}-${index}`}>{value}</li>
          ))}
          {extra > 0 ? <li className="is-more">+{extra} more</li> : null}
        </ul>
      ) : null}
    </div>
  );
}

export function BulkUploadPanel({
  file,
  summary,
  loading,
  dragActive,
  error,
  inputRef,
  onBrowse,
  onRemove,
  onSubmit,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileChange,
}: BulkUploadPanelProps) {
  const isReady = Boolean(file && summary) && !error && !summary?.error;
  const submitLabel = summary && isReady
    ? `Score ${pluralCompanies(summary.rowCount)}`
    : "Score companies";

  return (
    <section className="bulk-panel bulk-upload-panel" aria-label="Upload CSV">
      <input
        ref={inputRef}
        id="bulk-csv-input"
        className="sr-only"
        type="file"
        accept=".csv,text/csv"
        disabled={loading}
        aria-label="CSV file"
        aria-describedby="bulk-file-requirements"
        onChange={onFileChange}
      />

      <div
        className={`bulk-drop-shell${dragActive ? " is-dragging" : ""}${loading ? " is-disabled" : ""}${file ? " has-file" : ""}`}
        aria-busy={loading}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {file ? (
          <SelectedFile
            file={file}
            summary={summary}
            disabled={loading}
            onRemove={onRemove}
          />
        ) : (
          <EmptyDropTarget
            dragActive={dragActive}
            disabled={loading}
            onBrowse={onBrowse}
          />
        )}
      </div>

      {error ? (
        <div className="bulk-inline-error" role="alert">
          <AlertTriangle aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <footer className="bulk-upload-actions">
        <ul className="bulk-rules" id="bulk-file-requirements">
          <li><code>domain</code> or <code>company</code> column</li>
          <li>Up to {formatCount(BULK_INLINE_MAX_ROWS)} companies</li>
          <li>1 credit per new score · cached are free</li>
        </ul>
        <div className="bulk-action-group">
          {file ? (
            <button
              type="button"
              className="tb-btn outlined"
              disabled={loading}
              onClick={onBrowse}
            >
              Replace file
            </button>
          ) : null}
          <button
            type="button"
            className="btn-primary bulk-submit"
            disabled={!isReady || loading}
            onClick={onSubmit}
          >
            {loading ? <LoaderCircle className="bulk-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
            {loading ? "Scoring…" : submitLabel}
          </button>
        </div>
      </footer>
    </section>
  );
}

const PREVIEW_COLUMNS = ["Company", "Score", "Band", "Coverage", "AI thesis"];

export function BulkResultsPreview() {
  return (
    <section className="bulk-panel bulk-results-preview" aria-labelledby="bulk-preview-heading">
      <header className="bulk-results-head">
        <h2 id="bulk-preview-heading">Ranked results</h2>
        <span className="bulk-panel-meta">Sorted by intent · export as CSV</span>
      </header>
      <div className="bulk-preview-grid" aria-hidden="true">
        <div className="bulk-preview-row is-head">
          {PREVIEW_COLUMNS.map((column) => (
            <span key={column}>{column}</span>
          ))}
        </div>
        {[0, 1, 2, 3].map((row) => (
          <div className="bulk-preview-row" key={row}>
            <span className="bulk-preview-company">
              <i className="bulk-ghost is-mark" />
              <i className="bulk-ghost is-name" />
            </span>
            <span><i className="bulk-ghost is-num" /></span>
            <span><i className="bulk-ghost is-pill" /></span>
            <span><i className="bulk-ghost is-num" /></span>
            <span><i className="bulk-ghost is-text" /></span>
          </div>
        ))}
      </div>
      <p className="bulk-preview-note">
        Attach a CSV above. Each company gets an intent score, band, and a short
        thesis you can export.
      </p>
    </section>
  );
}

export function BulkProcessingPanel({ fileName }: { fileName: string }) {
  return (
    <section className="bulk-panel bulk-processing-panel" role="status" aria-live="polite">
      <div className="bulk-processing-icon" aria-hidden="true">
        <LoaderCircle className="bulk-spin" />
      </div>
      <div className="bulk-processing-copy">
        <h2>Scoring companies</h2>
        <p>
          We’re checking current signals and building the ranked result set. Larger
          files can take a few minutes.
        </p>
        <span className="bulk-processing-file">{fileName}</span>
      </div>
      <div className="bulk-progress" aria-hidden="true">
        <span />
      </div>
    </section>
  );
}

function bandClass(band: string): string {
  if (band === "HOT") return "is-hot";
  if (band === "WARM") return "is-warm";
  return "is-cold";
}

export function BulkResultsPanel({
  response,
  onDownload,
}: {
  response: BulkResponse;
  onDownload: () => void;
}) {
  return (
    <section className="bulk-panel bulk-results-panel" aria-labelledby="bulk-results-heading">
      <header className="bulk-results-head">
        <h2 id="bulk-results-heading">Batch results</h2>
        <div className="bulk-results-tools">
          <div className="bulk-metrics" aria-label={`${response.total} companies processed`}>
            <span className="bulk-metric">
              <strong>{response.total}</strong>
              <small>total</small>
            </span>
            <span className="bulk-metric is-success" aria-label={`${response.scored} scored`}>
              <strong>{response.scored}</strong>
              <small>scored</small>
            </span>
            <span className={`bulk-metric${response.failed > 0 ? " is-failed" : ""}`} aria-label={`${response.failed} failed`}>
              <strong>{response.failed}</strong>
              <small>failed</small>
            </span>
          </div>
          <button
            type="button"
            className="tb-btn outlined"
            disabled={response.results.length === 0}
            onClick={onDownload}
          >
            <Download aria-hidden="true" />
            Download CSV
          </button>
        </div>
      </header>

      {response.results.length > 0 ? (
        <div className="bulk-table-wrap">
          <table className="bulk-results-table">
            <caption className="sr-only">Ranked bulk scoring results</caption>
            <thead>
              <tr>
                <th scope="col">Company</th>
                <th scope="col">Score</th>
                <th scope="col">Band</th>
                <th scope="col">Coverage</th>
                <th scope="col">AI thesis</th>
              </tr>
            </thead>
            <tbody>
              {response.results.map((result, index) => (
                <tr key={`${result.domain}-${index}`}>
                  <td>
                    <div className="bulk-company">
                      <span className="bulk-company-mark" aria-hidden="true">
                        {result.company_name.slice(0, 1).toUpperCase()}
                      </span>
                      <span>
                        <strong>{result.company_name}</strong>
                        <small>{result.domain}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="bulk-score">{result.intent_score}</span>
                  </td>
                  <td>
                    <span className={`bulk-band ${bandClass(result.score_band)}`}>
                      <i aria-hidden="true" />
                      {result.score_band}
                    </span>
                  </td>
                  <td>
                    <span className="bulk-coverage">{formatCoverage(result.data_coverage)}</span>
                  </td>
                  <td>
                    <p className="bulk-thesis">{result.ai_summary || "No summary available."}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bulk-empty-results">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>No companies were scored</strong>
            <span>Review the failures below, then update the CSV and try again.</span>
          </div>
        </div>
      )}

      {response.errors?.length ? (
        <div className="bulk-failures">
          <div className="bulk-failures-head">
            <div>
              <AlertTriangle aria-hidden="true" />
              <strong>Failed to score</strong>
            </div>
            <span>{response.errors.length} row{response.errors.length === 1 ? "" : "s"}</span>
          </div>
          <div className="bulk-failure-list">
            {response.errors.map((failure, index) => (
              <div className="bulk-failure-row" key={`${failure.domain}-${index}`}>
                <span>{failure.domain}</span>
                <small>{failure.error}</small>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
