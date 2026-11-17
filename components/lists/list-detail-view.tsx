"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ListDetailData } from "@/lib/lists-types";
import { ruleToDisplayParts } from "@/lib/lists-evaluator";
import { deltaLabel, formatRelativeTime, pluralize } from "@/lib/lists-display";
import { csvFilename, downloadAuthorizedCsv } from "@/lib/csv";
import { BandPill } from "@/components/score/band";
import { DeleteListDialog } from "./delete-list-dialog";
import { ListDetailRow } from "./list-detail-row";

interface ListDetailViewProps {
  detail: ListDetailData;
  /** Opens a row in the shared account panel. */
  onOpenAccount?: (domain: string) => void;
  /** Domain open in the account panel, highlighted in the table. */
  openDomain?: string | null;
}

function StatDelta({ label }: { label: string | null }) {
  return label ? <div className="delta">{label}</div> : null;
}

function typeLabel(detail: ListDetailData): string {
  if (detail.list.is_system) return "Watchlist · synced";
  return detail.list.list_type === "smart" ? "Smart list" : "Manual list";
}

export function ListDetailView({ detail, onOpenAccount, openDomain = null }: ListDetailViewProps) {
  const router = useRouter();
  const { list, stats, bandMix, accounts } = detail;
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [reloading, startReload] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removingDomain, setRemovingDomain] = useState<string | null>(null);

  const isSystem = Boolean(list.is_system);
  const canEditMembers = list.list_type === "manual" && !isSystem;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const rows = accounts.filter((a) => !q || a.company_name.toLowerCase().includes(q) || a.domain.includes(q));
    return [...rows].sort((a, b) => (sortDesc ? (b.score ?? 0) - (a.score ?? 0) : (a.score ?? 0) - (b.score ?? 0)));
  }, [accounts, search, sortDesc]);

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
    void downloadAuthorizedCsv(
      csvFilename(`list-${list.name.replace(/\s+/g, "-").toLowerCase()}`),
      columns,
      rows,
    ).catch((error: Error) => {
      toast.error(error.message);
    });
  }

  async function handleRemove(domain: string, name: string) {
    setRemovingDomain(domain);
    try {
      const res = await fetch(`/api/dashboard/lists/${list.id}/members?domain=${encodeURIComponent(domain)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove the account");
      toast.success(`Removed ${name} from ${list.name}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove the account");
    } finally {
      setRemovingDomain(null);
    }
  }

  const rel = formatRelativeTime(list.updated_at);
  const rules = list.rules ?? [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{list.name}</h1>
          <div className="page-sub">
            <span className={`lc-tag ${isSystem ? "manual" : list.list_type}`}>{typeLabel(detail)}</span>
            {" · "}
            <span className="mono" style={{ color: "var(--text-secondary)" }}>{pluralize(stats.accountCount, "account")}</span>
            {" · avg score "}
            <span className="mono" style={{ color: "var(--text-secondary)" }}>{stats.avgScore || "—"}</span>
            {" · edited "}
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
          {isSystem && (
            <div className="page-sub">
              Members follow your watchlist automatically. Add or remove accounts on the{" "}
              <Link href="/watchlist" className="underline">Watchlist page</Link>.
            </div>
          )}
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="tb-btn outlined"
            onClick={() => startReload(() => router.refresh())}
            disabled={reloading}
          >
            {reloading ? "Reloading…" : "Reload"}
          </button>
          <button type="button" className="tb-btn outlined" onClick={handleExport}>Export</button>
          {!isSystem && (
            <button type="button" className="tb-btn outlined" onClick={() => setConfirmOpen(true)}>Delete</button>
          )}
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
          <StatDelta label={deltaLabel(stats.addedThisWeek, " added this week")} />
        </div>
        <div className="stat-card">
          <div className="label">HOT</div>
          <div className="num hot">{bandMix.hot}</div>
          <StatDelta label={deltaLabel(stats.hotDelta)} />
        </div>
        <div className="stat-card">
          <div className="label">Avg score</div>
          <div className="num">{stats.avgScore || "—"}</div>
          <StatDelta label={deltaLabel(stats.avgScoreDelta, " pts this week")} />
        </div>
        <div className="stat-card">
          <div className="label">WARM</div>
          <div className="num">{bandMix.warm}</div>
          <StatDelta label={deltaLabel(stats.warmDelta)} />
        </div>
      </div>

      <div className="tools-row">
        <div className="search-input">
          <svg className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12" aria-hidden>
            <circle cx="5" cy="5" r="3" /><path d="M7 7l3 3" />
          </svg>
          <input
            type="text"
            placeholder={`Filter within ${list.name}…`}
            aria-label={`Filter accounts in ${list.name}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(["HOT", "WARM", "COLD"] as const).map((band) => (
          <span key={band} className="inline-flex items-center gap-1.5">
            <BandPill band={band} size="sm" />
            <span className="mono">{bandMix[band.toLowerCase() as "hot" | "warm" | "cold"]}</span>
          </span>
        ))}
        <span className="spacer" />
        <button type="button" className="tb-btn outlined" onClick={() => setSortDesc((v) => !v)}>
          Sort: Score {sortDesc ? "↓" : "↑"}
        </button>
      </div>

      <div className="ld-table">
        <div className="ld-thead">
          <div>Account</div>
          <div>Score</div>
          <div>Score trend</div>
          <div>Why it qualifies</div>
          <div>People</div>
          <div />
        </div>
        {filtered.length === 0 ? (
          <div className="ld-empty">No accounts match this list yet.</div>
        ) : (
          filtered.map((row) => (
            <ListDetailRow
              key={row.domain}
              row={row}
              selected={row.domain.toLowerCase() === openDomain}
              onOpen={onOpenAccount}
              onRemove={canEditMembers ? handleRemove : undefined}
              removing={removingDomain === row.domain}
            />
          ))
        )}
      </div>

      <DeleteListDialog listId={list.id} listName={list.name} open={confirmOpen} onOpenChange={setConfirmOpen} />
    </>
  );
}
