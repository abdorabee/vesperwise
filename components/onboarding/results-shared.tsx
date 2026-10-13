import { BAND_COLOR, bandFromScore } from "@/components/onboarding/band-color";
import { timeAgo } from "@/lib/time-ago";
import type { IntentScore } from "@/lib/types";
import type { ScoringRunEntry } from "@/lib/onboarding-run";

export interface ScoredAccount {
  domain: string;
  result: IntentScore;
}

/** Domains that finished scoring (successfully) from a run, sorted by intent_score descending. */
export function scoredAccountsFromEntries(entries: ScoringRunEntry[]): ScoredAccount[] {
  return entries
    .filter((entry): entry is ScoringRunEntry & { result: IntentScore } => entry.status === "done" && Boolean(entry.result))
    .map((entry) => ({ domain: entry.domain, result: entry.result }))
    .sort((a, b) => (b.result.intent_score ?? -1) - (a.result.intent_score ?? -1));
}

export function topDriver(result: IntentScore): string {
  if (result.key_triggers && result.key_triggers.length > 0) return result.key_triggers[0];
  if (result.why_now) return result.why_now;
  return "No dominant driver yet";
}

export function SignalDots({ result }: { result: IntentScore }) {
  const keys = ["funding", "hiring", "news", "technology", "web", "github"] as const;
  return (
    <div className="flex gap-[3px]">
      {keys.map((key) => {
        const signal = result.signals[key];
        const on = Boolean(signal && signal.max > 0 && signal.score / signal.max >= 0.4);
        return (
          <i
            key={key}
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: on ? "var(--hot)" : "rgba(255,255,255,.13)" }}
          />
        );
      })}
    </div>
  );
}

export function ScoreCell({ score }: { score: number | null }) {
  const band = score !== null ? bandFromScore(score) : null;
  return (
    <span
      className="font-mono text-[17px] font-medium tabular-nums"
      style={{ color: band ? BAND_COLOR[band] : "var(--cold)", letterSpacing: "-0.03em" }}
    >
      {score ?? "—"}
    </span>
  );
}

export function BandBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const band = bandFromScore(score);
  const color = BAND_COLOR[band];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.04em]"
      style={{ color, background: `${color}1a`, border: `1px solid ${color}40` }}
    >
      <span className="h-[5px] w-[5px] rounded-full" style={{ background: color }} />
      {band}
    </span>
  );
}

export { timeAgo };
