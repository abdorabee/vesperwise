import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const LINKS = [
  {
    href: "/dev/score-entry",
    title: "Empty score composer",
    body: "Stacked empty state — domain prompt, recent rows, no marketing HOT PICKS / feature footer.",
  },
  {
    href: "/dev/score-result-preview",
    title: "Result surfaces",
    body: "HOT / COLD score documents with Signal explorer, verdict, and pinned chat shell.",
  },
  {
    href: "/score-surfaces-preview",
    title: "Score surfaces (alias)",
    body: "Same result surfaces QA route from earlier PRs.",
  },
  {
    href: "/score",
    title: "Live /score (needs Clerk)",
    body: "Auth-gated. Prefer the /dev routes above if sign-in still bounces to vesperwise.com.",
  },
] as const;

/** Non-prod index for Abdo / QA — no auth. */
export default function RedesignPreviewIndexPage() {
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[var(--bg,#0a0a0a)] px-6 py-12 text-[var(--text-primary,#f5f5f5)]">
      <div className="mx-auto flex max-w-xl flex-col gap-8">
        <header className="space-y-2 border-b border-white/10 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
            Preview · score redesign stack
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Visual QA — no sign-in</h1>
          <p className="text-sm leading-relaxed text-white/60">
            Public mock pages for the stacked redesign. Stay on this preview host — these routes do
            not require Clerk.
          </p>
        </header>

        <ul className="flex flex-col gap-3">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-[var(--accent,#DFFF00)]/40 hover:bg-white/[0.05]"
              >
                <span className="block text-sm font-medium tracking-tight">{link.title}</span>
                <span className="mt-1 block font-mono text-[11px] text-[var(--accent,#DFFF00)]">
                  {link.href}
                </span>
                <span className="mt-2 block text-xs leading-relaxed text-white/50">{link.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
