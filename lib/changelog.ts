/**
 * Public product changelog, rendered at /changelog.
 *
 * Newest first. Only list changes that shipped to users — no roadmap items, no internal
 * refactors. `changelog.test.ts` enforces ordering and shape.
 */

export type ChangelogTag = "New" | "Improved" | "Fixed" | "Security";

export interface ChangelogEntry {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  title: string;
  tag: ChangelogTag;
  summary: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-09-26",
    title: "Launch readiness",
    tag: "Improved",
    summary: "A round of polish across the public site ahead of launch.",
    items: [
      "Cookie consent banner. Google Analytics only loads after you accept, and rejecting clears its cookies.",
      "A proper 404 page for unknown URLs, and a confirmation page after you contact us.",
      "Clearer contact form validation with per-field errors and better network error messages.",
      "Page titles and descriptions across the app, plus a complete sitemap for search engines.",
      "A sticky call-to-action on mobile for the landing and pricing pages.",
      "Contact form submissions are now fully escaped before they reach our inbox.",
    ],
  },
  {
    date: "2026-09-16",
    title: "A redesigned VesperWise",
    tag: "New",
    summary: "The whole app now runs on one consistent, restrained design system.",
    items: [
      "New sidebar layout shared by every dashboard page.",
      "Command palette for jumping between sections from the keyboard.",
      "Consistent light and dark themes across the app shell.",
      "Pages rebuilt on shared components, so every screen looks and behaves the same way.",
    ],
  },
  {
    date: "2026-09-10",
    title: "Settings",
    tag: "New",
    summary: "A real Settings section for your business profile and workspace.",
    items: [
      "Business profile: edit every ICP field, including geography, tech stack and seed domains, which onboarding collected but you couldn't change afterwards.",
      "Account & workspace: set your workspace name and role.",
      "Your workspace name is now shown throughout the app.",
      "Partial saves are validated against your full profile, so a single edit can never leave it in a broken state.",
    ],
  },
  {
    date: "2026-09-09",
    title: "Smoother signup and Score chat",
    tag: "Improved",
    summary: "Fewer rough edges between creating an account and scoring your first company.",
    items: [
      "Accept the Terms and Privacy Policy directly in the signup form.",
      "Email verification finishes signup reliably and signs you straight in.",
      "Score chat rebuilt on a new conversation UI with streaming responses.",
      "Fixed typed submissions in Score and onboarding finishing when the account record was missing.",
    ],
  },
  {
    date: "2026-09-02",
    title: "New onboarding",
    tag: "New",
    summary: "Onboarding now ends with scored accounts instead of a blank form.",
    items: [
      "Six screens: workspace, ideal customer profile, signal sources, a live scoring run, results, and next steps.",
      "Add up to five seed companies and watch them get scored by the real signal pipeline.",
      "Signal weights are shown up front so you know how scores are built.",
    ],
  },
  {
    date: "2026-08-23",
    title: "Pricing and subprocessors pages",
    tag: "New",
    summary: "More transparency about what VesperWise costs and who processes your data.",
    items: [
      "Public pricing page, readable without signing in.",
      "Subprocessors page listing every third-party service that handles customer data.",
      "Removed marketing claims we couldn't back up, and corrected the starting price to $29/mo everywhere.",
    ],
  },
  {
    date: "2026-08-21",
    title: "Security hardening",
    tag: "Security",
    summary: "Tighter access controls and an honest security disclosure.",
    items: [
      "Bulk scoring jobs and chat sessions are strictly scoped to their owner. Requests for anyone else's return not found.",
      "Credit balances can only be changed by our servers, never directly from a client.",
      "Rewrote the Security page to describe exactly what we do today, as an early-stage, solo-founder product.",
    ],
  },
  {
    date: "2026-08-19",
    title: "Score becomes a conversation",
    tag: "New",
    summary: "Ask about any company and get an interactive workspace back, not just a number.",
    items: [
      "Chat with the scoring engine: ask follow-ups, compare accounts, and refine your approach.",
      "Signal explorer to dig into the funding, hiring, news and technology evidence behind a score.",
      "Outreach studio with editable drafts based on the account's signals.",
      "Action rail and suggestion chips for the next step.",
    ],
  },
  {
    date: "2026-08-01",
    title: "Bulk scoring workspace",
    tag: "New",
    summary: "A redesigned workspace for scoring many companies at once.",
    items: [
      "Upload a CSV (or start from the template), track progress, and review results in one place.",
      "Export scored results back to CSV.",
      "Groundwork for richer evidence: fresh public-web enrichment is running in testing and doesn't affect scores yet.",
    ],
  },
  {
    date: "2026-07-16",
    title: "Scoring v2",
    tag: "New",
    summary: "A more honest, evidence-backed intent score.",
    items: [
      "Every score shows the contribution of each trigger (funding, hiring, news, technology) with its source, freshness and evidence links.",
      "Explicit data coverage: when sources are missing, the score is marked partial instead of silently counting as zero intent.",
      "Failed or unscorable runs refund their credit, and cached results are free.",
      "ICP fit is reported separately and never mixed into the intent score.",
      "Record outcomes on the Intent Hub, so you can track which scored accounts converted.",
    ],
  },
  {
    date: "2026-06-13",
    title: "IntentIQ is now VesperWise",
    tag: "Improved",
    summary: "New name, same product, and a better experience on every screen.",
    items: [
      "Rebranded across the product, emails and search listings.",
      "Full light mode across the dashboard.",
      "Responsive layouts for phones and tablets.",
    ],
  },
  {
    date: "2026-05-16",
    title: "The product, rebuilt",
    tag: "New",
    summary: "The dashboard rebuilt around real data, with the core workspaces VesperWise has today.",
    items: [
      "Intent Hub: your pipeline ranked by live intent signals.",
      "People scoring, History, Lists, Watchlist and Inbox.",
      "Billing with your real credit balance and usage.",
      "Autopilot preview for signal-driven workflows.",
      "API documentation, About, Contact, and full legal pages: Terms, Privacy, DPA and Security.",
    ],
  },
  {
    date: "2026-04-11",
    title: "Where it started",
    tag: "New",
    summary: "The earliest version on record, when VesperWise was still called IntentIQ.",
    items: [
      "Score any company's purchase intent from 0 to 100, with AI reasoning attached.",
      "Public /v1 API for single scores, bulk scoring, watchlists and prioritization.",
      "Conversation intent analyzer for spotting buying signals in sales conversations.",
      "Secure sign-in, plus a mobile-friendly marketing site with full search metadata.",
    ],
  },
];

/** Group entries by month ("September 2026"), preserving order. */
export function groupChangelogByMonth(entries: ChangelogEntry[]): { month: string; entries: ChangelogEntry[] }[] {
  const groups: { month: string; entries: ChangelogEntry[] }[] = [];
  for (const entry of entries) {
    const month = new Date(`${entry.date}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.entries.push(entry);
    else groups.push({ month, entries: [entry] });
  }
  return groups;
}

export function formatChangelogDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
