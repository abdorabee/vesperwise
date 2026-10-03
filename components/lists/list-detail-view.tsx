"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ListDetailData } from "@/lib/lists-types";
import { ruleToDisplayParts } from "@/lib/lists-evaluator";
import { isInnerInteractiveClick } from "@/lib/row-click";
import { deltaLabel, formatRelativeTime } from "@/lib/lists-display";
import { toCSV, downloadCSV, csvFilename } from "@/lib/csv";

interface ListDetailViewProps {
  detail: ListDetailData;
  /** Opens a row in the shared account panel. */
  onOpenAccount?: (domain: string) => void;
  /** Domain open in the account panel, highlighted in the table. */
  openDomain?: string | null;
}

export function ListDetailView({ detail, onOpenAccount, openDomain = null }: ListDetailViewProps) {
  const router = useRouter();
  const { list, stats, bandMix, accounts } = detail;
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let rows = accounts.filter(
      (a) => !q || a.company_name.toLowerCase().includes(q) || a.domain.includes(q),
    );
    rows = [...rows].sort((a, b) => {
      const sa = a.score ?? 0;
      const sb = b.score ?? 0;
      return sortDesc ? sb - sa : sa - sb;
    });
    return rows;
  }, [accounts, search, sortDesc]);

  async function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 600);
  }

  function handleExport() {
    const columns = [
      { key: "company", label: "Company" },
      { key: "domain", label: "Domain" },
      { key: "score", label: "Score" },
      { key: "band", label: "Band" },
      { key: "qualify", label: "Why it qualifies" },
    ];
    const rows = filtered.map((a) => ({
      company: a.company_name,
      domain: a.domain,
      score: a.score ?? "",
      band: a.score_band ?? "",
      qualify: a.qualifyReason,
    }));
    downloadCSV(toCSV(columns, rows), csvFilename(`list-${list.name.replace(/\s+/g, "-").toLowerCase()}`));
  }

  async function handleDelete() {
    if (!confirm(`Delete "${list.name}"? This cannot be undone.`)) return;
    await fetch(`/api/dashboard/lists/${list.id}`, { method: "DELETE" });
    router.push("/lists");
    router.refresh();
  }

  const rel = formatRelativeTime(list.updated_at);
  const rules = list.rules ?? [];
  const typeLabel = list.list_type === "smart" ? "Smart list" : "Manual list";

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">{list.name}</div>
          <div className="page-sub">
            <span className={`lc-tag ${list.list_type}`}>{typeLabel}</span>
            {" · "}
            <span className="mono" style={{ color: "var(--text-secondary)" }}>{stats.accountCount} accounts</span>
            {" · avg score "}
            <span className="mono" style={{ color: "var(--text-secondary)" }}>{stats.avgScore || "—"}</span>
            {" · updated "}
            <span className="mono" style={{ color: "var(--text-secondary)" }}>{rel.label}</span>
            {list.list_type === "smart" && (
              <>
                {" · auto-refresh "}
                <span className="mono" style={{ color: list.auto_refresh ? "var(--hot)" : "var(--text-tertiary)" }}>
                  {list.auto_refresh ? "on" : "off"}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="page-actions">
          <button type="button" className="tb-btn outlined" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh now"}
          </button>
          <button type="button" className="tb-btn outlined" onClick={handleExport}>Export</button>
          <button type="button" className="tb-btn outlined" onClick={handleDelete}>Delete</button>
          <Link href="/autopilot" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
            Run autopilot
          </Link>
        </div>
      </div>

      {list.list_type === "smart" && rules.length > 0 && (
        <div className="card lists-rules-card">
          <div className="card-head">
            <div className="card-title">Rules</div>
            <div className="card-sub">Accounts that match all of</div>
          </div>
          <div className="card-body">
            <div className="rules-row">
              {rules.map((rule, i) => {
                const parts = ruleToDisplayParts(rule);
                return (
                  <span key={i} className="rules-group">
                    {i > 0 && <span className="conj">AND</span>}
                    <span className="chip field">{parts.field}</span>
                    <span className="chip op">{parts.op}</span>
                    <span className="chip val">{parts.val}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="stat-strip">
        <div className="stat-card">
          <div className="label">Accounts</div>
          <div className="num">{stats.accountCount}</div>
          <div className={`delta${stats.weeklyDelta === 0 ? " flat" : ""}`}>{deltaLabel(stats.weeklyDelta)}</div>
        </div>
        <div className="stat-card">
          <div className="label">HOT</div>
          <div className="num hot">{bandMix.hot}</div>
          <div className={`delta${stats.hotWeeklyDelta === 0 ? " flat" : ""}`}>{deltaLabel(stats.hotWeeklyDelta)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Avg score</div>
          <div className="num">{stats.avgScore || "—"}</div>
          <div className={`delta${stats.avgScoreDelta === 0 ? " flat" : ""}`}>
            {stats.avgScoreDelta > 0
              ? `▲ ${stats.avgScoreDelta} pts`
              : stats.avgScoreDelta < 0
                ? `▼ ${Math.abs(stats.avgScoreDelta)} pts`
                : "stable"}
          </div>
        </div>
        <div className="stat-card">
          <div className="label">WARM</div>
          <div className="num">{bandMix.warm}</div>
          <div className="delta flat">stable</div>
        </div>
      </div>

      <div className="tools-row">
        <div className="search-input">
          <svg className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
            <circle cx="5" cy="5" r="3" /><path d="M7 7l3 3" />
          </svg>
          <input
            type="text"
            placeholder={`Filter within ${list.name}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="band band-hot"><span className="dot" />HOT {bandMix.hot}</span>
        <span className="band band-warm"><span className="dot" />WARM {bandMix.warm}</span>
        <span className="band band-cold"><span className="dot" />COLD {bandMix.cold}</span>
        <span className="spacer" />
        <button type="button" className="tb-btn outlined" onClick={() => setSortDesc((v) => !v)}>
          Sort: Score {sortDesc ? "↓" : "↑"}
        </button>
      </div>

      <div className="ld-table">
        <div className="ld-thead">
          <div>Account</div>
          <div>Score</div>
          <div>7d trend</div>
          <div>Why it qualifies</div>
          <div>People</div>
          <div />
        </div>
        {filtered.length === 0 ? (
          <div className="ld-empty">No accounts match this list yet.</div>
        ) : (
          filtered.map((row) => (
            <div
              key={row.domain}
              className="ld-trow"
              data-selected={row.domain.toLowerCase() === openDomain ? "true" : undefined}
              role={onOpenAccount ? "button" : undefined}
              tabIndex={onOpenAccount ? 0 : undefined}
              aria-label={onOpenAccount ? `Show details for ${row.company_name}` : undefined}
              aria-pressed={onOpenAccount ? row.domain.toLowerCase() === openDomain : undefined}
              onClick={onOpenAccount ? (event) => {
                if (isInnerInteractiveClick(event.target, event.currentTarget)) return;
                onOpenAccount(row.domain);
              } : undefined}
              onKeyDown={onOpenAccount ? (event) => {
                if (event.target !== event.currentTarget || event.key !== "Enter") return;
                onOpenAccount(row.domain);
              } : undefined}
            >
              <div className="ld-co">
                <div className={`av ${row.avatarClass}`}>{row.initial}</div>
                <div className="ld-co-text">
                  <div className="name">{row.company_name}</div>
                  <div className="domain">{row.domain}</div>
                </div>
              </div>
              <div className={`ld-score${row.score_band === "HOT" ? " hot" : row.score_band === "WARM" ? " warm" : ""}`}>
                {row.score ?? "—"}
              </div>
              <div className="ld-spark">
                {row.sparkline.map((h, i) => (
                  <div
                    key={i}
                    className={`b${i === row.sparkline.length - 1 ? " cur" : ""}`}
                    style={{ height: `${Math.max(h, 8)}%` }}
                  />
                ))}
              </div>
              <div className="ld-trig">
                <div className="top">{row.qualifyReason}</div>
                <div className="bot">{row.qualifySub}</div>
              </div>
              <div className="ld-people">
                {row.peopleCount > 0 ? (
                  <>
                    <div className="stack">
                      <div className={`ax ${row.avatarClass}`}>{row.initial}</div>
                    </div>
                    <span className="n">+{row.peopleCount}</span>
                  </>
                ) : (
                  <span className="n">—</span>
                )}
              </div>
              <div className="ld-row-actions">
                <Link href={`/score?domain=${encodeURIComponent(row.domain)}`} className="ld-icon-btn" title="Score">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11">
                    <path d="M2 4l5 4 5-4M2 3h10v6H2z" />
                  </svg>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
