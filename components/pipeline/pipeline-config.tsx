import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { PipelineCompany } from "@/app/api/dashboard/pipeline/route";
import { bandForScore } from "@/components/score/band";
import type { ScoreBand } from "@/lib/types";

export type StageKey = "cold" | "warming" | "hot" | "engaged" | "converted";
export type OutcomeKey = "closed_won" | "closed_lost" | "no_decision" | "disqualified";

export const OUTCOME_LABELS: Record<OutcomeKey, string> = {
  closed_won: "Closed won",
  closed_lost: "Closed lost",
  no_decision: "No decision",
  disqualified: "Disqualified",
};

export const STAGE_ORDER: StageKey[] = ["cold", "warming", "hot", "engaged", "converted"];

export const STAGE_CONFIG: Record<StageKey, {
  label: string;
  desc: string;
  action: string;
  color: string;
  badgeClass: string;
}> = {
  cold: {
    label: "Cold",
    desc: "Nurture",
    action: "Send awareness content",
    color: "var(--text-tertiary)",
    badgeClass: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
  },
  warming: {
    label: "Warming",
    desc: "Follow Up",
    action: "Reference their recent signal",
    color: "#f5b544",
    badgeClass: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  },
  hot: {
    label: "Hot",
    desc: "Act Now",
    action: "Book a call — use trigger in pitch",
    color: "#4ade80",
    badgeClass: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  },
  engaged: {
    label: "Engaged",
    desc: "In Outreach",
    action: "Send proposal or follow up",
    color: "var(--foreground)",
    badgeClass: "border border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand-ink)]",
  },
  converted: {
    label: "Converted",
    desc: "Won",
    action: "Request a referral",
    color: "#a78bfa",
    badgeClass: "bg-violet-500/20 text-violet-400 border border-violet-500/30",
  },
};

export function TrendBadge({ trend }: { trend: number | null }) {
  if (trend === null) return null;
  if (trend > 0) return (
    <span className="flex items-center gap-0.5 text-xs text-emerald-400 font-medium">
      <TrendingUp className="h-3 w-3" />+{trend}
    </span>
  );
  if (trend < 0) return (
    <span className="flex items-center gap-0.5 text-xs text-red-400 font-medium">
      <TrendingDown className="h-3 w-3" />{trend}
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-xs text-slate-500 font-medium">
      <Minus className="h-3 w-3" />0
    </span>
  );
}

/** Colour comes from the score, never from the kanban column the card sits in. */
export function bandOf(company: Pick<PipelineCompany, "score" | "score_band">): ScoreBand | null {
  if (company.score_band) return company.score_band;
  return company.score == null ? null : bandForScore(company.score);
}

export function urgencyConfig(urgency: string | null): string {
  if (urgency === "act-now") return "bg-red-500/15 text-red-400 border-red-500/30";
  if (urgency === "this-week") return "bg-orange-500/15 text-orange-400 border-orange-500/30";
  if (urgency === "this-month") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  return "bg-slate-500/15 text-slate-400 border-slate-500/30";
}
