"use client";

import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { useFeatureGuard, useSetCreditsRemaining } from "@/components/dashboard/workspace-state";

import {
  BulkProcessingPanel,
  BulkResultsPanel,
  BulkResultsPreview,
  BulkUploadPanel,
  type BulkResponse,
} from "@/components/bulk/bulk-workspace";
import {
  bulkTemplateCsv,
  formatCoverage,
  summarizeBulkCsv,
  validateBulkFile,
  type BulkCsvSummary,
} from "@/lib/bulk-workspace";
import {
  csvFilename,
  downloadAuthorizedCsv,
  downloadCSV as triggerDownload,
  formatSignal,
} from "@/lib/csv";

export default function BulkScorerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<BulkCsvSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [response, setResponse] = useState<BulkResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const guardBulk = useFeatureGuard("bulk");
  const setCreditsRemaining = useSetCreditsRemaining();

  async function selectFile(candidate: File | null) {
    if (!candidate) return;

    const validationError = validateBulkFile(candidate);
    if (validationError) {
      setError(validationError);
      setAnnouncement(validationError);
      return;
    }

    let nextSummary: BulkCsvSummary;
    try {
      nextSummary = summarizeBulkCsv(await candidate.text());
    } catch {
      const message = "This file could not be read. Try exporting it again.";
      setError(message);
      setAnnouncement(message);
      return;
    }

    setFile(candidate);
    setSummary(nextSummary);
    setResponse(null);
    setError(nextSummary.error);
    setAnnouncement(
      nextSummary.error ??
        `${candidate.name} attached with ${nextSummary.rowCount} companies.`,
    );
  }

  function clearFile() {
    setFile(null);
    setSummary(null);
    setResponse(null);
    setError(null);
    setAnnouncement("CSV removed.");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!file || loading || summary?.error) return;
    if (guardBulk()) return;

    setLoading(true);
    setError(null);
    setResponse(null);
    setAnnouncement(`Scoring companies from ${file.name}.`);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/v1/score/bulk-inline", {
        method: "POST",
        body: form,
      });
      const data = await res.json() as BulkResponse & { error?: string; credits_remaining?: number };

      if (!res.ok) {
        throw new Error(data.error ?? "Scoring failed");
      }

      if (typeof data.credits_remaining === "number") setCreditsRemaining(data.credits_remaining);
      setResponse(data);
      setAnnouncement(
        `Batch complete. ${data.scored} scored and ${data.failed} failed.`,
      );
    } catch (caught) {
      const message = (caught as Error).message;
      setError(message);
      setAnnouncement(`Batch failed. ${message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadTemplate() {
    triggerDownload(bulkTemplateCsv(), "vesperwise-bulk-template.csv");
  }

  function handleDownloadResults() {
    if (!response?.results.length) return;

    const columns = [
      { key: "company_name", label: "Company" },
      { key: "domain", label: "Domain" },
      { key: "intent_score", label: "Intent Score" },
      { key: "score_band", label: "Score Band" },
      { key: "score_status", label: "Score Status" },
      { key: "data_coverage", label: "Data Coverage" },
      { key: "icp_fit_score", label: "ICP Fit Score" },
      { key: "cached", label: "Cache Hit" },
      { key: "charged", label: "Credit Charged" },
      { key: "buying_stage", label: "Buying Stage" },
      { key: "urgency", label: "Urgency" },
      { key: "ai_summary", label: "AI Summary" },
      { key: "why_now", label: "Why Now" },
      { key: "recommended_action", label: "Recommended Action" },
      { key: "key_triggers", label: "Key Triggers" },
      { key: "email_subject", label: "Email Subject" },
      { key: "talk_track", label: "Talk Track" },
      { key: "funding_signal", label: "Funding Signal" },
      { key: "hiring_signal", label: "Hiring Signal" },
      { key: "news_signal", label: "News Signal" },
      { key: "technology_signal", label: "Technology Signal" },
      { key: "web_context", label: "Web Context" },
      { key: "github_context", label: "GitHub Context" },
      { key: "scored_at", label: "Scored At" },
    ];

    const rows = response.results.map((result) => ({
      company_name: result.company_name,
      domain: result.domain,
      intent_score: result.intent_score,
      score_band: result.score_band,
      score_status: result.score_status,
      data_coverage: formatCoverage(result.data_coverage),
      icp_fit_score: result.icp_fit_score ?? "",
      cached: result.cached,
      charged: result.charged,
      buying_stage: result.buying_stage,
      urgency: result.urgency,
      ai_summary: result.ai_summary,
      why_now: result.why_now,
      recommended_action: result.recommended_action,
      key_triggers: (result.key_triggers ?? []).join("; "),
      email_subject: result.email_subject,
      talk_track: result.talk_track,
      funding_signal: formatSignal(result.signals?.funding),
      hiring_signal: formatSignal(result.signals?.hiring),
      news_signal: formatSignal(result.signals?.news),
      technology_signal: formatSignal(result.signals?.technology),
      web_context: formatSignal(result.signals?.web),
      github_context: formatSignal(result.signals?.github),
      scored_at: result.last_updated,
    }));

    void downloadAuthorizedCsv(csvFilename("vesperwise-bulk-scores"), columns, rows).catch((error: Error) => {
      setError(error.message);
    });
  }

  return (
    <div className="bulk-page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Bulk score</h1>
          <p className="page-sub">
            Score up to 50 companies in one batch, then export the ranked results.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="tb-btn outlined"
            onClick={handleDownloadTemplate}
          >
            <Download className="ic" aria-hidden="true" />
            Download CSV template
          </button>
        </div>
      </header>

      <div className="bulk-workspace">
        <BulkUploadPanel
          file={file}
          summary={summary}
          loading={loading}
          dragActive={dragActive}
          error={error}
          inputRef={inputRef}
          onBrowse={() => inputRef.current?.click()}
          onRemove={clearFile}
          onSubmit={handleSubmit}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!loading) setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragActive(false);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!loading) setDragActive(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            if (!loading) void selectFile(event.dataTransfer.files[0] ?? null);
          }}
          onFileChange={(event) => {
            void selectFile(event.currentTarget.files?.[0] ?? null);
            event.currentTarget.value = "";
          }}
        />

        {loading && file ? <BulkProcessingPanel fileName={file.name} /> : null}

        {!loading && !response ? <BulkResultsPreview /> : null}

        {response ? (
          <BulkResultsPanel
            response={response}
            onDownload={handleDownloadResults}
          />
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  );
}
