"use client";

import { useEffect, useRef, useState } from "react";
import type { ScoreBand } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Band thresholds from lib/scorer.ts: HOT >= 75, WARM >= 50, COLD < 50. */
export const BAND_THRESHOLDS = { warm: 50, hot: 75 } as const;

export function bandForScore(score: number): ScoreBand {
  if (score >= BAND_THRESHOLDS.hot) return "HOT";
  if (score >= BAND_THRESHOLDS.warm) return "WARM";
  return "COLD";
}

const PILL_CLASS: Record<ScoreBand, string> = {
  HOT: "bg-[var(--band-hot-fill)] text-[var(--band-hot-ink)] border-transparent",
  WARM: "bg-[var(--band-warm-fill)] text-[var(--band-warm-ink)] border-transparent",
  COLD: "bg-[var(--band-cold-fill)] text-[var(--band-cold-ink)] border-transparent",
};

const FILL_CLASS: Record<ScoreBand, string> = {
  HOT: "bg-[var(--band-hot-fill)]",
  WARM: "bg-[var(--band-warm-fill)]",
  COLD: "bg-[var(--band-cold-fill)]",
};

const DOT_CLASS: Record<ScoreBand, string> = {
  HOT: "bg-[var(--band-hot-ink)]",
  WARM: "bg-[var(--band-warm-ink)]",
  COLD: "bg-[var(--band-cold-ink)]",
};

export function BandPill({ band, size = "md", className }: { band: ScoreBand; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      data-band={band}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-[0.06em] tabular-nums",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        PILL_CLASS[band],
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", DOT_CLASS[band])} />
      {band}
    </span>
  );
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Large tabular score. Counts up once when `animate` is set (fresh scores only, never on restore). */
export function ScoreNumber({ value, animate = false, className }: { value: number; animate?: boolean; className?: string }) {
  const target = Math.round(value);
  const [frameValue, setFrameValue] = useState<number | null>(() => (animate && !prefersReducedMotion() ? 0 : null));
  const started = useRef(false);

  useEffect(() => {
    if (!animate || started.current || prefersReducedMotion()) return;
    started.current = true;
    const start = performance.now();
    const duration = 600;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setFrameValue(t < 1 ? Math.round(target * (1 - Math.pow(1 - t, 3))) : null);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      // An interrupted run (StrictMode remount, new target) must not freeze a partial value.
      cancelAnimationFrame(frame);
      started.current = false;
      setFrameValue(null);
    };
  }, [animate, target]);

  const shown = frameValue ?? target;

  return (
    <span className={cn("inline-flex items-baseline gap-1 tabular-nums", className)}>
      <span className="text-5xl font-semibold leading-none tracking-[-0.05em] text-foreground sm:text-6xl">{shown}</span>
      <span className="text-base font-medium text-muted-foreground">/100</span>
    </span>
  );
}

/** 0–100 meter with ticks at the WARM (50) and HOT (75) thresholds. */
export function ScoreMeter({ value, band, className }: { value: number; band?: ScoreBand; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const b = band ?? bandForScore(clamped);
  return (
    <div className={cn("w-full", className)}>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        aria-label={`Intent score ${Math.round(clamped)} of 100, ${b}`}
        className="relative h-1.5 w-full rounded-full bg-muted"
      >
        <div className={cn("score-meter-fill absolute inset-y-0 left-0 rounded-full", FILL_CLASS[b])} style={{ width: `${clamped}%` }} />
        {[BAND_THRESHOLDS.warm, BAND_THRESHOLDS.hot].map((t) => (
          <span key={t} aria-hidden className="absolute -top-1 -bottom-1 w-px bg-border" style={{ left: `${t}%` }} />
        ))}
      </div>
      <div aria-hidden className="relative mt-1.5 h-3 text-[10px] tabular-nums text-muted-foreground">
        <span className="absolute left-0">0</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${BAND_THRESHOLDS.warm}%` }}>50 WARM</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${BAND_THRESHOLDS.hot}%` }}>75 HOT</span>
        <span className="absolute right-0">100</span>
      </div>
    </div>
  );
}

const FAVICON_PX = 64;

/** Small favicon with an initial fallback, for company rows. */
export function CompanyMark({ domain, name, size = 20, className }: { domain: string; name?: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initial = (name || domain).trim().charAt(0).toUpperCase() || "?";
  if (failed || !domain) {
    return (
      <span
        aria-hidden
        className={cn("inline-grid shrink-0 place-items-center rounded-md bg-muted font-semibold text-muted-foreground", className)}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
      >
        {initial}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${FAVICON_PX}`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      // Unknown domains get a 16px generic globe instead of an error; show the initial instead.
      onLoad={(e) => e.currentTarget.naturalWidth < FAVICON_PX / 2 && setFailed(true)}
      className={cn("shrink-0 rounded-md bg-muted object-contain", className)}
    />
  );
}
