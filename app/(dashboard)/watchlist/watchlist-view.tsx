"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { runBounded } from "@/lib/run-bounded";
import { alertId, readDismissedAlerts, writeDismissedAlerts } from "@/lib/watchlist-dismissals";
import { csvFilename, downloadAuthorizedCsv } from "@/lib/csv";
import type { WatchlistRange, WatchlistStats } from "@/lib/watchlist-stats";
import { WatchlistPageHead } from "@/components/watchlist/watchlist-page-head";
import { WatchlistAlertStrip } from "@/components/watchlist/watchlist-alert-strip";
import { WatchlistListTabs } from "@/components/watchlist/watchlist-list-tabs";
import { lastScoreHref, WatchlistTable } from "@/components/watchlist/watchlist-table";
import { AccountPanel } from "@/components/account-panel/account-panel";
import { useAccountParam } from "@/components/account-panel/use-account-param";
import { WatchlistAccountsColumn } from "@/components/watchlist/watchlist-accounts-column";
import {
  WatchlistQuickAdd,
  type WatchlistQuickAddHandle,
} from "@/components/watchlist/watchlist-quick-add";

import { WATCHLIST_FOCUS_ADD_EVENT } from "@/lib/watchlist-events";
import { deleteWatchlistEntry, restoreWatchlistEntry } from "@/lib/watchlist-remove";

interface WatchlistViewProps {
  initial: WatchlistStats;
}

export function WatchlistView({ initial }: WatchlistViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quickAddRef = useRef<WatchlistQuickAddHandle>(null);
  const { account, openAccount, closeAccount } = useAccountParam();

  const [entries, setEntries] = useState(initial.entries);
  const [lists, setLists] = useState(initial.lists);
  const [stats, setStats] = useState(initial.stats);
  const [alertItems, setAlertItems] = useState(initial.alertItems);
  const [dismissedAlerts, setDismissedAlerts] = useState<ReadonlySet<string>>(new Set());

  const [activeListId, setActiveListId] = useState("all");
  const [range, setRange] = useState<WatchlistRange>("7D");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    setEntries(initial.entries);
    setLists(initial.lists);
    setStats(initial.stats);
    setAlertItems(initial.alertItems);
  }, [initial]);

  useEffect(() => {
    setDismissedAlerts(readDismissedAlerts());
  }, []);

  const visibleAlerts = useMemo(
    () => alertItems.filter((item) => !dismissedAlerts.has(alertId(item))),
    [alertItems, dismissedAlerts],
  );

  function dismissAlerts() {
    const next = new Set(dismissedAlerts);
    for (const item of alertItems) next.add(alertId(item));
    setDismissedAlerts(next);
    writeDismissedAlerts(next);
  }

  useEffect(() => {
    const q = searchParams.get("q")?.trim();
    if (q) setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    function onFocusAdd() {
      quickAddRef.current?.focus();
    }
    window.addEventListener(WATCHLIST_FOCUS_ADD_EVENT, onFocusAdd);
    return () => window.removeEventListener(WATCHLIST_FOCUS_ADD_EVENT, onFocusAdd);
  }, []);

  const filtered = useMemo(() => {
    let rows = [...entries];
    if (activeListId !== "all") {
      const tab = lists.find((l) => l.id === activeListId);
      if (tab) {
        const domainSet = new Set(tab.domains);
        rows = rows.filter((r) => domainSet.has(r.domain.toLowerCase()));
      }
    }
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (r) => r.company_name.toLowerCase().includes(q) || r.domain.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [entries, activeListId, lists, query]);

  async function handleAdd(domain: string) {
    const normalized = domain.trim().toLowerCase();
    if (entries.some((entry) => entry.domain.toLowerCase() === normalized)) {
      setAddError(null);
      toast(`${normalized} is already on your watchlist`);
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/dashboard/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: normalized }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 403) {
        const message = data.error ?? "Your plan's watchlist limit is reached";
        setAddError(message);
        toast.error(message, { action: { label: "Upgrade", onClick: () => router.push("/billing") } });
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to add");
      toast.success(`Added ${normalized} to watchlist`, {
        action: {
          label: "Score now \u00b7 1 credit",
          onClick: () => router.push(`/score?domain=${encodeURIComponent(normalized)}`),
        },
      });
      router.refresh();
    } catch (e) {
      setAddError((e as Error).message);
    } finally {
      setAdding(false);
    }
  }

  function adjustCounts(domain: string, by: 1 | -1) {
    const lower = domain.toLowerCase();
    setStats((current) => ({ ...current, total: Math.max(0, current.total + by) }));
    setLists((prev) =>
      prev.map((tab) =>
        tab.id === "all" || tab.domains.includes(lower) ? { ...tab, count: Math.max(0, tab.count + by) } : tab,
      ),
    );
  }

  function handleRemove(domain: string) {
    const index = entries.findIndex((entry) => entry.domain === domain);
    const entry = entries[index];
    if (!entry) return;

    setEntries((prev) => prev.filter((item) => item.domain !== domain));
    setSelected((prev) => {
      if (!prev.has(domain)) return prev;
      const next = new Set(prev);
      next.delete(domain);
      return next;
    });
    adjustCounts(domain, -1);

    const restore = () => {
      setEntries((prev) => {
        if (prev.some((item) => item.domain === domain)) return prev;
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, entry);
        return next;
      });
      adjustCounts(domain, 1);
    };

    const removal = deleteWatchlistEntry(domain);
    void removal.then((res) => {
      if (res.ok) return;
      restore();
      toast.error(`Couldn't remove ${entry.company_name}. It's back on your watchlist.`);
    }).catch(() => {
      restore();
      toast.error(`Couldn't remove ${entry.company_name}. It's back on your watchlist.`);
    });

    toast(`Removed ${entry.company_name}`, {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          restore();
          void removal
            .catch(() => undefined)
            .then(() => restoreWatchlistEntry(domain, entry.company_name))
            .then((res) => {
              if (!res.ok) toast.error("Failed to undo removal");
              else router.refresh();
            })
            .catch(() => toast.error("Failed to undo removal"));
        },
      },
    });
  }

  async function handleRemoveMany(domains: string[]) {
    const targets = entries.filter((entry) => domains.includes(entry.domain));
    if (targets.length === 0) return;
    const removedDomains = new Set(targets.map((t) => t.domain));
    setEntries((prev) => prev.filter((item) => !removedDomains.has(item.domain)));
    setSelected(new Set());
    for (const t of targets) adjustCounts(t.domain, -1);

    const results = await runBounded(targets, (t) => deleteWatchlistEntry(t.domain));
    const removed = targets.filter((_, i) => {
      const r = results[i];
      return r.status === "fulfilled" && r.value.ok;
    });
    const failed = targets.filter((t) => !removed.includes(t));
    if (failed.length > 0) {
      setEntries((prev) => [...prev, ...failed.filter((f) => !prev.some((p) => p.domain === f.domain))]);
      for (const f of failed) adjustCounts(f.domain, 1);
    }
    if (removed.length === 0) {
      toast.error("Couldn't remove the selected accounts. They're back on your watchlist.");
      return;
    }
    const summary =
      failed.length > 0
        ? `Removed ${removed.length} of ${targets.length} \u2014 ${failed.length} failed`
        : `Removed ${removed.length} account${removed.length === 1 ? "" : "s"}`;
    toast(summary, {
      duration: 6000,
      action: { label: "Undo", onClick: () => undoRemoveMany(removed) },
    });
  }

  function undoRemoveMany(removed: typeof entries) {
    setEntries((prev) => [...prev, ...removed.filter((r) => !prev.some((p) => p.domain === r.domain))]);
    for (const r of removed) adjustCounts(r.domain, 1);
    void runBounded(removed, (r) => restoreWatchlistEntry(r.domain, r.company_name)).then((undone) => {
      const bad = undone.filter((u) => u.status === "rejected" || !u.value.ok).length;
      if (bad > 0) toast.error(`Failed to restore ${bad} account${bad === 1 ? "" : "s"}`);
      router.refresh();
    });
  }

  function handleExport() {
    const columns = [
      { key: "company", label: "Company" },
      { key: "domain", label: "Domain" },
      { key: "score", label: "Score" },
      { key: "band", label: "Band" },
      { key: "last_scored", label: "Last Scored" },
      { key: "delta", label: "Delta" },
    ];
    const rows = filtered.map((r) => ({
      company: r.company_name,
      domain: r.domain,
      score: r.score ?? "",
      band: r.score_band ?? "",
      last_scored: r.last_scored ?? "",
      delta: r.delta ?? "",
    }));
    void downloadAuthorizedCsv(csvFilename("watchlist"), columns, rows).catch((error: Error) => {
      toast.error(error.message);
    });
  }

  function toggleSelect(domain: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  }

  return (
    <div className="watchlist-page">
      <WatchlistPageHead
        stats={stats}
        range={range}
        onRangeChange={setRange}
        onExport={handleExport}
      />

      {visibleAlerts.length > 0 && (
        <WatchlistAlertStrip
          items={visibleAlerts}
          onDismiss={dismissAlerts}
          onReview={() => {
            const first = visibleAlerts[0];
            if (first) router.push(lastScoreHref(first.domain));
          }}
        />
      )}

      <WatchlistListTabs tabs={lists} activeId={activeListId} onChange={setActiveListId} />

      {selected.size > 0 && (
        <div
          role="toolbar"
          aria-label="Selected accounts"
          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--r-md)", background: "var(--bg-elevated)", fontSize: 13 }}
        >
          <span style={{ color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>{selected.size} selected</span>
          <span style={{ flex: 1 }} />
          <button type="button" className="tb-btn outlined" onClick={() => void handleRemoveMany([...selected])}>
            Remove
          </button>
          <button type="button" className="tb-btn" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      <WatchlistTable
        rows={filtered}
        range={range}
        selected={selected}
        onToggleSelect={toggleSelect}
        onRemove={handleRemove}
        onAdd={(domain) => void handleAdd(domain)}
        onFocusAdd={() => quickAddRef.current?.focus()}
        filtered={entries.length > 0}
        showAll={showAll}
        onShowAll={() => setShowAll(true)}
        onOpen={openAccount}
        openDomain={account}
      />

      <WatchlistQuickAdd ref={quickAddRef} onAdd={handleAdd} adding={adding} error={addError} />

      <WatchlistAccountsColumn
        entries={entries}
        selectedDomain={account}
        onSelect={openAccount}
        onFocusAdd={() => quickAddRef.current?.focus()}
      />
      {account ? <AccountPanel domain={account} onClose={closeAccount} /> : null}
    </div>
  );
}
