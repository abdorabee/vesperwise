"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { toCSV, downloadCSV, csvFilename } from "@/lib/csv";
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
  const [alertItems] = useState(initial.alertItems);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const [activeListId, setActiveListId] = useState("all");
  const [range, setRange] = useState<WatchlistRange>("7D");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  // Removals wait out the undo window before the DELETE is sent.
  const pendingRemovals = useRef(new Map<string, number>());

  useEffect(() => {
    setEntries(initial.entries);
    setLists(initial.lists);
    setStats(initial.stats);
  }, [initial]);

  useEffect(() => {
    const q = searchParams.get("q")?.trim();
    if (q) setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    const pending = pendingRemovals.current;
    return () => {
      // Leaving the page commits any removal still inside its undo window.
      for (const [domain, timer] of pending) {
        window.clearTimeout(timer);
        void fetch(`/api/dashboard/watchlist?domain=${encodeURIComponent(domain)}`, { method: "DELETE", keepalive: true });
      }
      pending.clear();
    };
  }, []);

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
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/dashboard/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add");
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
    if (!entry || pendingRemovals.current.has(domain)) return;

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

    const timer = window.setTimeout(async () => {
      pendingRemovals.current.delete(domain);
      try {
        const res = await fetch(`/api/dashboard/watchlist?domain=${encodeURIComponent(domain)}`, { method: "DELETE" });
        if (!res.ok) throw new Error("remove failed");
      } catch {
        restore();
        toast.error(`Couldn't remove ${entry.company_name}. It's back on your watchlist.`);
      }
    }, 5000);
    pendingRemovals.current.set(domain, timer);

    toast(`Removed ${entry.company_name}`, {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          const pending = pendingRemovals.current.get(domain);
          if (pending === undefined) return;
          window.clearTimeout(pending);
          pendingRemovals.current.delete(domain);
          restore();
        },
      },
    });
  }

  function handleExport() {
    const csv = toCSV(
      [
        { key: "company", label: "Company" },
        { key: "domain", label: "Domain" },
        { key: "score", label: "Score" },
        { key: "band", label: "Band" },
        { key: "last_scored", label: "Last Scored" },
        { key: "delta", label: "Delta" },
      ],
      filtered.map((r) => ({
        company: r.company_name,
        domain: r.domain,
        score: r.score ?? "",
        band: r.score_band ?? "",
        last_scored: r.last_scored ?? "",
        delta: r.delta ?? "",
      })),
    );
    downloadCSV(csv, csvFilename("watchlist"));
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

      {!alertDismissed && (
        <WatchlistAlertStrip
          items={alertItems}
          onDismiss={() => setAlertDismissed(true)}
          onReview={() => {
            const first = alertItems[0];
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
          <button type="button" className="tb-btn outlined" onClick={() => { for (const domain of [...selected]) handleRemove(domain); }}>
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
