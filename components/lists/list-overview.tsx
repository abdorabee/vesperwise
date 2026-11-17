"use client";

import { useMemo, useState } from "react";
import type { ListCardSummary, ListsHeroStats } from "@/lib/lists-types";
import { pluralize } from "@/lib/lists-display";
import { EmptyState } from "@/components/app-ui/page-primitives";
import { Button } from "@/components/ui/button";
import { ListCard } from "./list-card";
import { useListsTopbar } from "@/components/dashboard/lists-topbar-context";

interface ListOverviewProps {
  summaries: ListCardSummary[];
  hero: ListsHeroStats;
}

type TabFilter = "all" | "smart" | "manual";

function hotCardDetail(hero: ListsHeroStats): string {
  if (hero.hotCount === 0) return "No HOT accounts in your lists yet. Score companies to populate them.";
  const names = hero.firingAccounts.map((a) => a.company_name).join(", ");
  const more = hero.hotCount > hero.firingAccounts.length ? " and more" : "";
  return `Across your lists · ${names}${more}`;
}

function HeroStats({ hero }: { hero: ListsHeroStats }) {
  const mix = hero.bandMix;
  const hottest = hero.hottestList;
  return (
    <div className="stat-strip">
      <div className="stat-card">
        <div className="label">Accounts</div>
        <div className="num">{hero.totalAccounts}</div>
        <div className="lists-stat-sub">
          {pluralize(hero.listCount, "list")} · {hero.overlapCount} overlapping
        </div>
        <div className="chart-legend">
          <span className="lg hot"><span className="swatch" />HOT {mix.hot}</span>
          <span className="lg warm"><span className="swatch" />WARM {mix.warm}</span>
          <span className="lg cold"><span className="swatch" />COLD {mix.cold}</span>
          {hero.unscoredCount > 0 && <span className="lg">{hero.unscoredCount} not scored</span>}
        </div>
      </div>
      <div className="stat-card">
        <div className="label">Hottest list</div>
        <div className="num lists-stat-name">{hottest?.name ?? "—"}</div>
        <div className="lists-stat-sub">
          {hottest
            ? `${hottest.hotNow} of ${pluralize(hottest.total, "account")} HOT now · avg ${hottest.avgScore}`
            : "No HOT accounts yet"}
        </div>
      </div>
      <div className="stat-card">
        <div className="label">HOT accounts</div>
        <div className="num hot">{hero.hotCount}</div>
        <div className="lists-stat-sub">{hotCardDetail(hero)}</div>
      </div>
    </div>
  );
}

export function ListOverview({ summaries, hero }: ListOverviewProps) {
  const { openCreateModal } = useListsTopbar();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("all");

  const smartCount = summaries.filter((s) => s.list_type === "smart").length;
  const manualCount = summaries.filter((s) => s.list_type === "manual").length;

  const filtered = useMemo(() => {
    return summaries.filter((s) => {
      if (tab === "smart" && s.list_type !== "smart") return false;
      if (tab === "manual" && s.list_type !== "manual") return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [summaries, search, tab]);

  const hasFilters = Boolean(search) || tab !== "all";

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Lists</h1>
          <div className="page-sub">
            Group accounts by intent, segment or playbook ·{" "}
            <span className="mono" style={{ color: "var(--text-secondary)" }}>{pluralize(hero.listCount, "list")}</span>
            {" · "}
            <span className="mono" style={{ color: "var(--text-secondary)" }}>{pluralize(hero.totalAccounts, "account")}</span>
          </div>
        </div>
      </div>

      <HeroStats hero={hero} />

      <div className="tools-row">
        <div className="search-input">
          <svg className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12" aria-hidden>
            <circle cx="5" cy="5" r="3" /><path d="M7 7l3 3" />
          </svg>
          <input
            type="text"
            placeholder="Search lists…"
            aria-label="Search lists"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="range-tabs">
          <button type="button" className={`range-tab${tab === "all" ? " active" : ""}`} onClick={() => setTab("all")}>
            All <span className="mono">{summaries.length}</span>
          </button>
          <button type="button" className={`range-tab${tab === "smart" ? " active" : ""}`} onClick={() => setTab("smart")}>
            Smart <span className="mono">{smartCount}</span>
          </button>
          <button type="button" className={`range-tab${tab === "manual" ? " active" : ""}`} onClick={() => setTab("manual")}>
            Manual <span className="mono">{manualCount}</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No lists match" : "No lists yet"}
          description={hasFilters ? "Try a different search or filter." : "Group accounts by signal, segment, or by hand."}
          action={!hasFilters ? <Button type="button" onClick={() => openCreateModal?.()}>New list</Button> : undefined}
        />
      ) : (
        <div className="list-grid">
          {filtered.map((s) => (
            <ListCard key={s.id} summary={s} />
          ))}
        </div>
      )}
    </>
  );
}
