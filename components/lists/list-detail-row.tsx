"use client";

import type { KeyboardEvent } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import type { ListAccountRow } from "@/lib/lists-types";
import { isInnerInteractiveClick } from "@/lib/row-click";

interface ListDetailRowProps {
  row: ListAccountRow;
  selected: boolean;
  /** Opens the shared account panel; the row is a plain row when absent. */
  onOpen?: (domain: string) => void;
  /** Present only for lists whose members are edited by hand. */
  onRemove?: (domain: string, name: string) => void;
  removing: boolean;
}

const RESCORE_LABEL = "Rescore · 1 credit";

function bandClass(row: ListAccountRow): string {
  if (row.score_band === "HOT") return " hot";
  return row.score_band === "WARM" ? " warm" : "";
}

export function ListDetailRow({ row, selected, onOpen, onRemove, removing }: ListDetailRowProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onOpen || event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpen(row.domain);
  }

  return (
    <div
      className="ld-trow"
      data-selected={selected ? "true" : undefined}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={onOpen ? `Show details for ${row.company_name}` : undefined}
      aria-pressed={onOpen ? selected : undefined}
      onClick={
        onOpen
          ? (event) => {
              if (isInnerInteractiveClick(event.target, event.currentTarget)) return;
              onOpen(row.domain);
            }
          : undefined
      }
      onKeyDown={handleKeyDown}
    >
      <div className="ld-co">
        <div className={`av ${row.avatarClass}`} aria-hidden="true">{row.initial}</div>
        <div className="ld-co-text">
          <div className="name">{row.company_name}</div>
          <div className="domain">{row.domain}</div>
        </div>
      </div>
      <div className={`ld-score${bandClass(row)}`}>{row.score ?? "—"}</div>
      <div className="ld-spark" aria-hidden="true">
        {row.sparkline.length >= 2
          ? row.sparkline.map((h, i) => (
              <div
                key={i}
                className={`b${i === row.sparkline.length - 1 ? " cur" : ""}`}
                style={{ height: `${Math.max(h, 4)}%` }}
              />
            ))
          : null}
      </div>
      <div className="ld-trig">
        <div className="top">{row.qualifyReason}</div>
        <div className="bot">{row.qualifySub}</div>
      </div>
      <div className="ld-people">
        {row.peopleCount > 0 ? <span className="n">{row.peopleCount}</span> : <span className="n">—</span>}
      </div>
      <div className="ld-row-actions">
        <Link
          href={`/score?domain=${encodeURIComponent(row.domain)}`}
          className="ld-icon-btn"
          title={RESCORE_LABEL}
          aria-label={`${RESCORE_LABEL}: ${row.company_name}`}
        >
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11" aria-hidden>
            <path d="M10 6a4 4 0 1 1-1.2-2.8M10 1.5V4H7.5" />
          </svg>
        </Link>
        {onRemove && (
          <button
            type="button"
            className="ld-icon-btn"
            title="Remove from list"
            aria-label={`Remove ${row.company_name} from list`}
            disabled={removing}
            onClick={() => onRemove(row.domain, row.company_name)}
          >
            <X className="size-3" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
