"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  bandColor,
  getAvatarClass,
  getAvatarInitial,
  SIGNAL_MIX_LEGEND,
  sparklineForRange,
  type WatchlistEnrichedEntry,
  type WatchlistRange,
} from "@/lib/watchlist-stats";

interface WatchlistTableProps {
  rows: WatchlistEnrichedEntry[];
  range: WatchlistRange;
  selected: Set<string>;
  onToggleSelect: (domain: string) => void;
  onRemove: (domain: string) => void;
  onAdd?: (domain: string) => void;
  onFocusAdd?: () => void;
  showAll: boolean;
  onShowAll: () => void;
  /** True when a list or search filter hides accounts that do exist. */
  filtered?: boolean;
  /** Opens a row in the shared account panel; without it rows link to the last score. */
  onOpen?: (domain: string) => void;
  /** Domain open in the account panel, highlighted in the table. */
  openDomain?: string | null;
}

const PAGE_SIZE = 12;
const SUGGESTED_DOMAINS = ["stripe.com", "linear.app", "vercel.com"];

export function lastScoreHref(domain: string) {
  return `/score?domain=${encodeURIComponent(domain)}&view=last`;
}

function WatchlistEmpty({ onAdd, onFocusAdd }: { onAdd?: (domain: string) => void; onFocusAdd?: () => void }) {
  return (
    <div className="wl-table">
      <div style={{ padding: "36px 20px", textAlign: "center" }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", letterSpacing: "-0.011em" }}>
          Get alerted the day an account crosses HOT
        </p>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 6 }}>
          Add the accounts you care about; each rescore shows its trend, signal mix and distance to the 75 threshold.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 16 }}>
          {onFocusAdd ? (
            <button type="button" className="tb-btn outlined" onClick={onFocusAdd}>
              <Plus className="ic" aria-hidden="true" />Add by domain
            </button>
          ) : null}
          {onAdd
            ? SUGGESTED_DOMAINS.map((domain) => (
                <button key={domain} type="button" className="tb-btn" onClick={() => onAdd(domain)}>
                  {domain}
                </button>
              ))
            : null}
        </div>
      </div>
    </div>
  );
}

export function WatchlistTable({
  rows,
  range,
  selected,
  onToggleSelect,
  onRemove,
  onAdd,
  onFocusAdd,
  showAll,
  onShowAll,
  filtered = false,
  onOpen,
  openDomain = null,
}: WatchlistTableProps) {
  const router = useRouter();
  const visible = showAll ? rows : rows.slice(0, PAGE_SIZE);

  if (rows.length === 0) {
    if (filtered) {
      return (
        <div className="wl-table">
          <div className="wl-foot"><span className="left">No accounts match this view</span></div>
        </div>
      );
    }
    return <WatchlistEmpty onAdd={onAdd} onFocusAdd={onFocusAdd} />;
  }

  return (
    <div className="wl-table">
      <div className="wl-head">
        <div />
        <div>Account</div>
        <div style={{ textAlign: "left" }}>Score</div>
        <div>{range} trend</div>
        <div>Signal mix</div>
        <div>Threshold</div>
        <div>Last move</div>
        <div />
      </div>

      {visible.map((row) => {
        const scoreColor = bandColor(row.score_band);
        const sparkline = sparklineForRange(row.scoreHistory, range);
        const maxSpark = Math.max(...sparkline, 1);
        const isChecked = selected.has(row.domain);
        const open = () => (onOpen ? onOpen(row.domain) : router.push(lastScoreHref(row.domain)));
        const isOpen = row.domain.toLowerCase() === openDomain;

        return (
          <div
            key={row.id}
            className="wl-row"
            onClick={open}
            role={onOpen ? "button" : "link"}
            tabIndex={0}
            aria-pressed={onOpen ? isOpen : undefined}
            data-selected={isOpen ? "true" : undefined}
            aria-label={onOpen ? `Show details for ${row.company_name}` : `Open last score for ${row.company_name}`}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === "Enter") open();
            }}
          >
            <div
              className={`checkbox${isChecked ? " checked" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(row.domain);
              }}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleSelect(row.domain);
                }
              }}
              role="checkbox"
              tabIndex={0}
              aria-checked={isChecked}
              aria-label={`Select ${row.company_name}`}
            >
              {isChecked && (
                <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" width="8" height="8" aria-hidden>
                  <path d="M2 5l2 2 4-4" />
                </svg>
              )}
            </div>

            <div className="wl-co">
              <div className={getAvatarClass(row.company_name)}>{getAvatarInitial(row.company_name)}</div>
              <div style={{ minWidth: 0 }}>
                <div className="name">{row.company_name}</div>
                <div className="domain">{row.domain}</div>
              </div>
            </div>

            <div className="wl-score-cell" style={{ color: scoreColor }}>
              {row.score ?? "—"}
            </div>

            <div className="wl-spark" aria-label={`${range} score trend`}>
              {sparkline.map((val, i) => {
                const isCur = i === sparkline.length - 1;
                const h = Math.max(8, Math.round((val / maxSpark) * 100));
                return (
                  <div
                    key={i}
                    className={`b${isCur ? " cur" : ""}`}
                    style={{
                      height: `${h}%`,
                      ...(isCur ? { background: scoreColor } : {}),
                    }}
                  />
                );
              })}
            </div>

            <div className="wl-mix" role="img" aria-label={row.signalMix.map((seg) => `${seg.label} ${seg.score == null ? "no data" : `${seg.score}/${seg.max}`}`).join(", ")}>
              {row.signalMix.map((seg) => (
                <div
                  key={seg.key}
                  className="seg"
                  title={`${seg.label} ${seg.score == null ? "· no data" : `${seg.score}/${seg.max}`}`}
                  style={{ background: seg.color, height: `${seg.heightPct}%`, opacity: seg.score == null ? 0.35 : 1 }}
                />
              ))}
            </div>

            <div>
              <div className="wl-threshold">
                {row.thresholdHit ? (
                  <span className="hit">{row.thresholdLabel}</span>
                ) : (
                  row.thresholdLabel
                )}
              </div>
              <div className="threshold-bar" style={{ marginTop: 6 }}>
                <div
                  className="fill"
                  style={{
                    width: `${Math.min(100, row.score ?? 0)}%`,
                    background: scoreColor,
                  }}
                />
                <div className="marker" style={{ left: "75%" }} />
              </div>
            </div>

            <div className="mono" style={{ color: row.lastMoveColor, fontSize: 12 }}>
              {row.lastMoveLabel}
            </div>

            <div className="wl-actions" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="wl-icon-btn" aria-label={`Actions for ${row.company_name}`}>
                    <MoreHorizontal className="size-3.5" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44">
                  <DropdownMenuItem onSelect={open}>Open last score</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => router.push(`/score?domain=${encodeURIComponent(row.domain)}`)}>
                    Rescore · 1 credit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => onRemove(row.domain)}>
                    Remove from watchlist
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}

      <div className="wl-foot">
        <span className="left" style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <span>{visible.length} of {rows.length} visible · sorted by score ↓</span>
          <span aria-label="Signal mix legend" style={{ display: "inline-flex", flexWrap: "wrap", gap: 10 }}>
            {SIGNAL_MIX_LEGEND.map((item) => (
              <span key={item.key} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: item.color, display: "inline-block" }} />
                {item.label}
              </span>
            ))}
          </span>
        </span>
        {!showAll && rows.length > PAGE_SIZE && (
          <button
            type="button"
            onClick={onShowAll}
            style={{
              color: "var(--text-secondary)",
              fontWeight: 500,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 12,
            }}
          >
            Show all {rows.length} →
          </button>
        )}
      </div>
    </div>
  );
}
