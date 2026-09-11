"use client";

import { GenUiWorkspace } from "@/components/score/gen-ui/workspace";
import { workspaceFromScore } from "@/lib/gen-ui";
import type { SignalSet } from "@/lib/types";
import { getMockSignals } from "@/lib/signals/mock";

function build(domain: string, company: string, intent: number, band: "HOT" | "WARM" | "COLD") {
  const signals: SignalSet = getMockSignals(domain);
  return workspaceFromScore({
    company,
    domain,
    intent_score: intent,
    score_band: band,
    ai_summary:
      band === "COLD"
        ? `${company} shows limited dated purchase-intent evidence. No strong funding or hiring surge in the active window — treat this as a nurture finding, not a miss.`
        : `${company} is showing concentrated intent across funding and hiring. The window is open for a point-of-view outreach tied to the newest trigger.`,
    recommended_action:
      band === "COLD"
        ? "Park in nurture and set a watch on hiring + funding."
        : "Book a discovery call this week with RevOps.",
    why_now:
      band === "COLD"
        ? "No time-sensitive trigger — stay light-touch until a dated signal appears."
        : "Fresh signal cluster within the decay window elevates urgency.",
    urgency: band === "COLD" ? "nurture" : "high",
    buying_stage: band === "COLD" ? "early" : "evaluation",
    data_coverage: 0.82,
    score_status: "ok",
    email_subject: `Quick thought for ${company}`,
    talk_track: `Hi — noticed recent motion at ${company}. Worth a 15-minute compare notes?`,
    signals,
  });
}

/**
 * Non-auth visual QA for Agent 3 result surfaces (dev / non-production only).
 * Route is public via proxy preview matcher when VERCEL_ENV !== production.
 */
export default function ScoreSurfacesPreviewPage() {
  const hot = build("stripe.com", "Stripe", 82, "HOT");
  const cold = build("example.com", "Example", 28, "COLD");

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto flex max-w-[1040px] flex-col gap-12">
        <header className="space-y-1 border-b border-border pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Score surfaces preview
          </p>
          <h1 className="text-xl font-semibold tracking-tight">Agent 3 — HOT / COLD parity</h1>
        </header>

        <section aria-label="HOT result" className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
            Score document · pinned · HOT
          </p>
          <div className="rounded-xl border border-border bg-background/90 p-4 sm:p-6">
            <GenUiWorkspace blocks={hot} handlers={{}} />
          </div>
        </section>

        <section aria-label="COLD result" className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
            Score document · pinned · COLD finding
          </p>
          <div className="rounded-xl border border-border bg-background/90 p-4 sm:p-6">
            <GenUiWorkspace blocks={cold} handlers={{}} />
          </div>
        </section>

        <section aria-label="Pinned document after follow-ups" className="space-y-3 pb-16">
          <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
            Architecture · 4 follow-ups deep (document stays pinned)
          </p>
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="max-h-[280px] overflow-y-auto border-b border-border bg-background/90 p-4">
              <p className="mb-3 text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                Score document · pinned
              </p>
              <GenUiWorkspace
                blocks={hot.filter((b) =>
                  b.type === "intent_hero" || b.type === "signal_explorer" || b.type === "thesis",
                )}
                handlers={{}}
              />
            </div>
            <div className="space-y-2 bg-card/40 px-4 py-3 text-sm text-muted-foreground">
              <p className="rounded-full border border-border bg-white/[0.06] px-3 py-1 text-xs text-foreground/80 w-fit">
                Score stripe.com
              </p>
              <p className="text-xs">Intent score ready — document stays pinned above while you chat.</p>
              <p className="rounded-full border border-border bg-white/[0.06] px-3 py-1 text-xs w-fit">Why HOT?</p>
              <p className="text-xs text-foreground/80">Funding + hiring cluster in the decay window…</p>
              <p className="rounded-full border border-border bg-white/[0.06] px-3 py-1 text-xs w-fit">Who to call?</p>
              <p className="text-xs text-foreground/80">Start with RevOps lead; angle on Series timing…</p>
              <p className="rounded-full border border-border bg-white/[0.06] px-3 py-1 text-xs w-fit">Draft outreach</p>
              <p className="text-xs text-foreground/80">Subject refined — ready to copy from Outreach studio.</p>
              <p className="rounded-full border border-border bg-white/[0.06] px-3 py-1 text-xs w-fit">Compare to Notion</p>
              <p className="pt-1 text-[11px] text-muted-foreground">
                Chat scrolls here · pin above does not leave the viewport after 4 turns
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
