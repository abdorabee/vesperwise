"use client";

import { useEffect, useId, useState } from "react";
import { Building2, MoreHorizontal, UserRound } from "lucide-react";
import { parseScoreTarget } from "@/lib/score-target";

const PLACEHOLDERS = ["acme.com", "alex@acme.com", "stripe.com"];

export function ScoreComposer({
  onSubmit,
  busy = false,
  compact = false,
  autoFocus = false,
  creditLabel = "1 credit",
  creditsRemaining,
  value,
  onValueChange,
  watchAfter = false,
  onWatchAfterChange,
  scoreCompanyToo = false,
  onScoreCompanyTooChange,
  inputRef,
}: {
  onSubmit: (value: string) => void;
  busy?: boolean;
  compact?: boolean;
  autoFocus?: boolean;
  creditLabel?: string;
  creditsRemaining?: number;
  value?: string;
  onValueChange?: (value: string) => void;
  watchAfter?: boolean;
  onWatchAfterChange?: (value: boolean) => void;
  scoreCompanyToo?: boolean;
  onScoreCompanyTooChange?: (value: boolean) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [internal, setInternal] = useState("");
  const text = value ?? internal;
  const setText = onValueChange ?? setInternal;
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const target = parseScoreTarget(text);
  const outOfCredits = typeof creditsRemaining === "number" && creditsRemaining <= 0;
  const disabled = busy || outOfCredits || target.mode === "unknown";

  useEffect(() => {
    const timer = window.setInterval(() => setPlaceholderIndex((index) => (index + 1) % PLACEHOLDERS.length), 4000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <form
      className={`score-bar${compact ? " is-compact" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled) onSubmit(text.trim());
      }}
    >
      <span className="score-bar-glyph" aria-hidden="true">
        {target.mode === "person" ? <UserRound /> : <Building2 />}
      </span>
      <input
        ref={inputRef}
        value={text}
        autoFocus={autoFocus}
        disabled={busy}
        placeholder={PLACEHOLDERS[placeholderIndex]}
        aria-label="Domain or email"
        onChange={(event) => setText(event.target.value)}
      />
      {target.mode === "unknown" && text.trim() ? <span className="score-bar-hint">Enter a domain or email</span> : null}
      <span className="score-bar-credit">{outOfCredits ? "0 credits left" : creditLabel}</span>
      <button type="button" className="score-bar-more" aria-expanded={menuOpen} aria-controls={menuId} onClick={() => setMenuOpen((open) => !open)}>
        <MoreHorizontal />
      </button>
      {menuOpen ? (
        <div id={menuId} className="score-bar-menu" role="menu">
          <label><input type="checkbox" checked={watchAfter} onChange={(event) => onWatchAfterChange?.(event.target.checked)} /> Add to watchlist after score</label>
          {target.mode === "person" ? (
            <label><input type="checkbox" checked={scoreCompanyToo} onChange={(event) => onScoreCompanyTooChange?.(event.target.checked)} /> Also score company</label>
          ) : null}
        </div>
      ) : null}
      <button type="submit" className="score-bar-submit" disabled={disabled}>Score</button>
    </form>
  );
}
