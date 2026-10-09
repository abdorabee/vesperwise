import { interpolate, type BriefContext, type BriefContribution, type TriggerKey } from "@/lib/brief";

export const SIGNAL_LABELS: Record<TriggerKey, string> = {
  funding: "Funding",
  hiring: "Hiring",
  news: "News",
  technology: "Technology",
};

export function renderSpecText(text: string, ctx: BriefContext): string {
  return interpolate(text, ctx).text;
}

export function signalLabel(signal: TriggerKey): string {
  return SIGNAL_LABELS[signal] ?? signal;
}

export function formatOffset(days: number): string {
  if (days <= 0) return "today";
  if (days >= 14) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }
  return days === 1 ? "1 day" : `${days} days`;
}

export function formatSignalAge(days: number | null | undefined): string {
  if (days == null) return "undated";
  const rounded = Math.max(0, Math.round(days));
  return rounded === 1 ? "1 day old" : `${rounded} days old`;
}

/** Whole days since the score was computed; signal ages are relative to that moment. */
export function daysSinceScored(lastUpdated: string | undefined, now = Date.now()): number {
  if (!lastUpdated) return 0;
  const scoredAt = Date.parse(lastUpdated);
  if (!Number.isFinite(scoredAt)) return 0;
  return Math.max(0, Math.floor((now - scoredAt) / 86_400_000));
}

export function freshestSignalAge(contributions: BriefContribution[]): number | null {
  const ages = contributions
    .map((item) => item.daysAgo)
    .filter((days): days is number => typeof days === "number");
  return ages.length ? Math.min(...ages) : null;
}

export function contributionFor(contributions: BriefContribution[], signal: TriggerKey): BriefContribution | undefined {
  return contributions.find((item) => item.type === signal);
}
