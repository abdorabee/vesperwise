import { notFound } from "next/navigation";

import { ScoreView } from "@/app/(dashboard)/score/score-view";

export const dynamic = "force-dynamic";

/** Non-prod visual QA for empty/composer. Public via proxy preview matcher. */
export default function ScoreEntryPreviewPage() {
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--text-primary)]">
      <div className="border-b border-[var(--border-subtle)] px-4 py-2 text-xs text-[var(--text-quaternary)]">
        Dev preview · empty score entry
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <ScoreView
          creditsRemaining={47}
          recentScores={[
            {
              domain: "stripe.com",
              company_name: "Stripe",
              score: 82,
              score_band: "HOT",
              created_at: "2026-09-08T14:22:00.000Z",
            },
            {
              domain: "notion.so",
              company_name: "Notion",
              score: 61,
              score_band: "WARM",
              created_at: "2026-09-04T09:10:00.000Z",
            },
            {
              domain: "acme.co",
              company_name: "Acme",
              score: 28,
              score_band: "COLD",
              created_at: "2026-08-19T18:40:00.000Z",
            },
          ]}
        />
      </div>
    </div>
  );
}
