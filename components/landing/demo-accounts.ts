/**
 * Illustrative accounts for the marketing page. Every landing mockup reads
 * from this one array so a company always shows the same score and band.
 * Companies are fictional (they match the hero demo video).
 */

export type DemoBand = "HOT" | "WARM" | "COLD";
export type DemoSignalKind = "funding" | "hiring" | "news" | "tech" | "web" | "none";

export interface DemoAccount {
  name: string;
  domain: string;
  score: number;
  /** Change vs. last week */
  delta: number;
  signal: { kind: DemoSignalKind; label: string };
  /** Per-signal strength 0–100, for the mini signal-mix bars */
  mix: { funding: number; hiring: number; news: number; tech: number; web: number };
  summary: string;
  owner: { initials: string; name: string } | null;
  updated: string;
  /** Weekly score history, oldest first; last value equals `score` */
  trend: number[];
}

/** Same thresholds as lib/scorer.ts: HOT ≥ 75, WARM ≥ 50, COLD < 50. */
export function bandFor(score: number): DemoBand {
  if (score >= 75) return "HOT";
  if (score >= 50) return "WARM";
  return "COLD";
}

const ACCOUNTS: DemoAccount[] = [
  {
    name: "Northwind",
    domain: "northwind.io",
    score: 94,
    delta: 12,
    signal: { kind: "funding", label: "Series B · 4 days ago" },
    mix: { funding: 96, hiring: 88, news: 90, tech: 76, web: 82 },
    summary: "Fresh Series B plus RevOps hiring. Tooling budgets usually move within a quarter.",
    owner: { initials: "DM", name: "D. Marwan" },
    updated: "3m",
    trend: [62, 65, 71, 73, 78, 82, 90, 94],
  },
  {
    name: "Tailspin",
    domain: "tailspin.io",
    score: 82,
    delta: 4,
    signal: { kind: "hiring", label: "+18 engineering hires" },
    mix: { funding: 60, hiring: 91, news: 72, tech: 86, web: 78 },
    summary: "Engineering team up 18 this quarter. Crossed into HOT yesterday.",
    owner: { initials: "JS", name: "J. Sato" },
    updated: "9m",
    trend: [70, 74, 69, 72, 76, 78, 81, 82],
  },
  {
    name: "Fabrikam",
    domain: "fabrikam.com",
    score: 71,
    delta: 5,
    signal: { kind: "news", label: "Press coverage" },
    mix: { funding: 38, hiring: 62, news: 88, tech: 69, web: 74 },
    summary: "Product launch in the trade press. News cycle still building.",
    owner: { initials: "AC", name: "A. Chen" },
    updated: "1h",
    trend: [52, 55, 58, 60, 63, 66, 69, 71],
  },
  {
    name: "Wingtip",
    domain: "wingtip.app",
    score: 66,
    delta: 2,
    signal: { kind: "web", label: "Pricing page redesign" },
    mix: { funding: 42, hiring: 58, news: 55, tech: 64, web: 90 },
    summary: "Rebuilt pricing page and a new enterprise tier. Worth a check-in.",
    owner: { initials: "RB", name: "R. Becker" },
    updated: "2h",
    trend: [48, 52, 55, 59, 62, 65, 67, 66],
  },
  {
    name: "Litware",
    domain: "litware.co",
    score: 57,
    delta: 3,
    signal: { kind: "tech", label: "New analytics stack" },
    mix: { funding: 30, hiring: 48, news: 40, tech: 84, web: 60 },
    summary: "Adopted a new warehouse and CDP last month. Early, but moving.",
    owner: { initials: "JS", name: "J. Sato" },
    updated: "3h",
    trend: [44, 46, 49, 50, 52, 54, 56, 57],
  },
  {
    name: "Adatum",
    domain: "adatum.com",
    score: 44,
    delta: 0,
    signal: { kind: "hiring", label: "Hiring flat" },
    mix: { funding: 22, hiring: 35, news: 40, tech: 52, web: 46 },
    summary: "Stable headcount, no funding news. Tech stack unchanged for 90 days.",
    owner: { initials: "AC", name: "A. Chen" },
    updated: "1d",
    trend: [46, 45, 44, 45, 44, 44, 44, 44],
  },
  {
    name: "Contoso",
    domain: "contoso.com",
    score: 38,
    delta: -3,
    signal: { kind: "none", label: "No new signals" },
    mix: { funding: 21, hiring: 32, news: 28, tech: 54, web: 42 },
    summary: "No new signals this month. Re-check next quarter.",
    owner: null,
    updated: "1d",
    trend: [45, 44, 43, 42, 41, 41, 40, 38],
  },
];

/** Sorted by score, highest first. */
export const DEMO_ACCOUNTS: DemoAccount[] = [...ACCOUNTS].sort((a, b) => b.score - a.score);

export function demoAccount(domain: string): DemoAccount {
  const account = DEMO_ACCOUNTS.find((a) => a.domain === domain);
  if (!account) throw new Error(`Unknown demo account: ${domain}`);
  return account;
}

export interface DemoPerson {
  initials: string;
  name: string;
  role: string;
  domain: string;
  score: number;
}

/** Fictional people at the fictional demo companies. */
export const DEMO_PEOPLE: DemoPerson[] = [
  { initials: "EM", name: "Elif Marwa", role: "VP Revenue Ops", domain: "northwind.io", score: 88 },
  { initials: "JN", name: "Jamal Norris", role: "Head of GTM Systems", domain: "tailspin.io", score: 81 },
  { initials: "PT", name: "Priya Tan", role: "Director, RevOps", domain: "fabrikam.com", score: 72 },
  { initials: "DK", name: "Daniel Kovács", role: "Sales Ops Manager", domain: "wingtip.app", score: 64 },
  { initials: "AB", name: "Aisha Bello", role: "RevOps Analyst", domain: "contoso.com", score: 41 },
].sort((a, b) => b.score - a.score);
