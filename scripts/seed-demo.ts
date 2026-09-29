/**
 * Demo seed: scores a curated list of real, recognisable B2B companies for one
 * user so the dashboard home, Intent Hub and History have something to show.
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts --user <clerk_user_id> [--count 30] [--delay 750] [--dry-run]
 *
 *   --user     Clerk user id (`user_…`). The `users` row must already exist
 *              (sign in once, or finish onboarding) — this script never creates it.
 *   --count    How many domains from the list to score (default 30, max 40).
 *   --delay    Pause between companies in ms (default 750) to stay polite to
 *              signal providers and the reasoning model.
 *   --dry-run  Print the domains that would be scored and exit.
 *
 * Environment: reads `.env.local` then `.env` (Supabase service role, plus the
 * signal/OpenRouter keys when MOCK_SIGNALS is not "true"). With
 * MOCK_SIGNALS=true every score uses deterministic mock signals and makes no
 * external API calls; without it, each company hits the real providers.
 *
 * Scores go through `scoreCompany` from lib/score-service.ts with
 * `skipCredits: true`, so no credits are deducted. Rows are written to the
 * database the env points at — check NEXT_PUBLIC_SUPABASE_URL before running.
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const DEMO_DOMAINS = [
  "stripe.com",
  "ramp.com",
  "linear.app",
  "vercel.com",
  "notion.so",
  "figma.com",
  "datadoghq.com",
  "snowflake.com",
  "hubspot.com",
  "atlassian.com",
  "gusto.com",
  "rippling.com",
  "brex.com",
  "mercury.com",
  "plaid.com",
  "segment.com",
  "twilio.com",
  "cloudflare.com",
  "hashicorp.com",
  "mongodb.com",
  "supabase.com",
  "retool.com",
  "airtable.com",
  "asana.com",
  "miro.com",
  "canva.com",
  "intercom.com",
  "zendesk.com",
  "gong.io",
  "outreach.io",
  "apollo.io",
  "clay.com",
  "attio.com",
  "posthog.com",
  "sentry.io",
  "grafana.com",
  "confluent.io",
  "databricks.com",
  "deel.com",
  "pagerduty.com",
] as const;

interface Args {
  user: string;
  count: number;
  delay: number;
  dryRun: boolean;
}

function usage(message?: string): never {
  if (message) console.error(`Error: ${message}\n`);
  console.error("Usage: npx tsx scripts/seed-demo.ts --user <clerk_user_id> [--count 30] [--delay 750] [--dry-run]");
  process.exit(1);
}

function parseArgs(argv: string[]): Args {
  const args: Args = { user: "", count: 30, delay: 750, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === "--user") {
      args.user = value ?? "";
      i += 1;
    } else if (flag === "--count") {
      args.count = Number(value);
      i += 1;
    } else if (flag === "--delay") {
      args.delay = Number(value);
      i += 1;
    } else if (flag === "--dry-run") {
      args.dryRun = true;
    } else if (flag === "--help" || flag === "-h") {
      usage();
    } else {
      usage(`unknown argument ${flag}`);
    }
  }
  if (!/^user_[A-Za-z0-9]+$/.test(args.user)) usage("--user must be a Clerk user id like user_2abc…");
  if (!Number.isInteger(args.count) || args.count < 1) usage("--count must be a positive integer");
  if (!Number.isFinite(args.delay) || args.delay < 0) usage("--delay must be a non-negative number of ms");
  args.count = Math.min(args.count, DEMO_DOMAINS.length);
  return args;
}

/** tsx runs this file as CommonJS, where a dynamic import may arrive wrapped in `default`. */
function interop<T extends object>(mod: T): T {
  const wrapped = (mod as { default?: unknown }).default;
  return wrapped && typeof wrapped === "object" ? (wrapped as T) : mod;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const domains = DEMO_DOMAINS.slice(0, args.count);
  const mock = process.env.MOCK_SIGNALS === "true";

  console.log(`Seeding ${domains.length} companies for ${args.user} (${mock ? "MOCK_SIGNALS=true, no external calls" : "live signals"})`);
  if (args.dryRun) {
    domains.forEach((d, i) => console.log(`  ${String(i + 1).padStart(2)}. ${d}`));
    return;
  }

  // Imported after dotenv so module-level env reads (MOCK_SIGNALS, Supabase keys) see .env.local.
  const { createSupabaseAdmin } = interop(await import("../lib/supabase"));
  const { scoreCompany } = interop(await import("../lib/score-service"));

  const { data: user, error } = await createSupabaseAdmin()
    .from("users")
    .select("id, product_category, business_profile")
    .eq("id", args.user)
    .maybeSingle();
  if (error) throw new Error(`Could not read users row: ${error.message}`);
  if (!user) usage(`no users row for ${args.user}; sign in once so the workspace exists`);

  const results: Array<{ domain: string; score: number | null; band: string | null; error?: string }> = [];
  for (const [i, domain] of domains.entries()) {
    const label = `[${String(i + 1).padStart(2)}/${domains.length}] ${domain}`;
    try {
      const result = await scoreCompany({
        domain,
        userId: args.user,
        productCategory: user.product_category ?? undefined,
        businessProfile: user.business_profile ?? null,
        skipCredits: true,
      });
      results.push({ domain, score: result.intent_score, band: result.score_band });
      console.log(`${label.padEnd(34)} ${String(result.intent_score ?? "—").padStart(3)} ${result.score_band ?? "unscorable"}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ domain, score: null, band: null, error: message });
      console.log(`${label.padEnd(34)} failed: ${message}`);
    }
    if (i < domains.length - 1 && args.delay > 0) await sleep(args.delay);
  }

  const scored = results.filter((r) => r.score != null);
  const bandCount = (band: string) => scored.filter((r) => r.band === band).length;
  const failed = results.filter((r) => r.error);
  console.log("\nSummary");
  console.log(`  scored    ${scored.length}/${results.length}`);
  console.log(`  HOT       ${bandCount("HOT")}`);
  console.log(`  WARM      ${bandCount("WARM")}`);
  console.log(`  COLD      ${bandCount("COLD")}`);
  if (failed.length > 0) console.log(`  failed    ${failed.map((f) => f.domain).join(", ")}`);
  process.exitCode = failed.length === results.length ? 1 : 0;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
