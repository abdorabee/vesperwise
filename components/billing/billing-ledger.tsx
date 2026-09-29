"use client";

import type { BillingStats, CreditBucket, LedgerRow } from "@/lib/billing-stats";
import { bucketDisplayLabel } from "@/lib/billing-stats";

interface BillingLedgerProps {
  stats: BillingStats;
}

function LedgerIcon({ bucket, type }: { bucket: CreditBucket; type: "debit" | "credit" }) {
  if (bucket === "Top-up") {
    return (
      <div className="icon topup">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11">
          <path d="M6 2v8M2 6h8" />
        </svg>
      </div>
    );
  }

  if (type === "credit") {
    return (
      <div className="icon credit-add">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11">
          <path d="M6 2v8M2 6h8" />
        </svg>
      </div>
    );
  }

  if (bucket === "Autopilot") {
    return (
      <div className="icon debit">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="11" height="11">
          <path d="M2 7l5 5 5-5M2 3l5 5 5-5" />
        </svg>
      </div>
    );
  }

  if (bucket === "People") {
    return (
      <div className="icon debit">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="11" height="11">
          <circle cx="5" cy="5" r="2.5" />
          <path d="M2 12c0-2 2-3.5 3-3.5s3 1.5 3 3.5" />
        </svg>
      </div>
    );
  }

  return (
    <div className="icon debit">
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="11" height="11">
        <circle cx="6" cy="6" r="4.5" />
        <path d="M6 3.5v3l2 1.4" />
      </svg>
    </div>
  );
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportLedgerCsv(rows: LedgerRow[]) {
  const csv = [
    ["date", "time", "type", "activity", "detail", "source", "amount", "balance"].join(","),
    ...rows.map((r) =>
      [r.date, r.time, r.type, r.title, r.subtitle, bucketDisplayLabel(r.bucket), r.type === "credit" ? r.amount : -r.amount, r.balance]
        .map(csvCell)
        .join(","),
    ),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "credit-activity.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function BillingLedger({ stats }: BillingLedgerProps) {
  return (
    <div className="ledger">
      <div className="ledger-head">
        <div>
          <div className="t">Credit activity</div>
          <div className="s">Every debit and credit, in order — last 14 days</div>
        </div>
        <div className="right">
          <button
            type="button"
            className="tb-btn outlined"
            disabled={stats.ledger.length === 0}
            onClick={() => exportLedgerCsv(stats.ledger)}
          >
            <svg aria-hidden="true" className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 7l3 3 3-3M6 1v9" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      <div className="ledger-thead">
        <span>Date</span>
        <span />
        <span>Activity</span>
        <span>Source</span>
        <span style={{ textAlign: "right" }}>Amount</span>
        <span style={{ textAlign: "right" }}>Balance</span>
      </div>

      {stats.ledger.length === 0 ? (
        <div style={{ padding: "24px 18px", color: "var(--text-tertiary)", fontSize: 13 }}>
          No credit activity yet.
        </div>
      ) : (
        stats.ledger.map((row) => (
          <div key={row.id} className="ledger-row">
            <div className="date">
              {row.date}
              <span className="t">{row.time}</span>
            </div>
            <LedgerIcon bucket={row.bucket} type={row.type} />
            <div className="desc">
              <div className="top">{row.title}</div>
              <div className="bot">{row.subtitle}</div>
            </div>
            <div className="src">
              <span className="sw" style={{ background: row.color }} />
              {bucketDisplayLabel(row.bucket)}
            </div>
            <div className={`amt ${row.type === "credit" ? "credit" : "debit"}`}>
              {row.type === "credit" ? "+" : "−"}
              {row.amount.toLocaleString()}
              <span className="unit">cr</span>
            </div>
            <div className="bal">{row.balance.toLocaleString()}</div>
          </div>
        ))
      )}

      <div className="ledger-foot">
        <span>
          Showing {stats.ledger.length} of {stats.ledgerTotal.toLocaleString()} entries · debits in last 14d{" "}
          <strong style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            {stats.debitsLast14d.toLocaleString()}
          </strong>
        </span>
      </div>
    </div>
  );
}
