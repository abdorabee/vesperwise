/**
 * Polar.sh Product Setup Script
 *
 * Creates all 7 VesperWise products in your Polar account:
 *   - 4 subscription plans  (monthly recurring)
 *   - 3 credit top-up packs (one-time purchase)
 *
 * Usage:
 *   POLAR_ACCESS_TOKEN=your_token npx tsx scripts/setup-polar-products.ts
 *   POLAR_ACCESS_TOKEN=sandbox_token POLAR_SERVER=sandbox npx tsx scripts/setup-polar-products.ts
 *
 * After running, copy the printed env block into your .env.local file.
 */

import { createPolar } from "@polar-sh/sdk/2026-04";

const token = process.env.POLAR_ACCESS_TOKEN;
if (!token) {
  console.error("❌  POLAR_ACCESS_TOKEN is not set.");
  console.error("    Run:  POLAR_ACCESS_TOKEN=your_token npx tsx scripts/setup-polar-products.ts");
  process.exit(1);
}

const environment = (process.env.POLAR_SERVER ?? "sandbox") as "sandbox" | "production";
const polar = createPolar({ accessToken: token, environment });

// ─── Product definitions ──────────────────────────────────────────────────────

const SUBSCRIPTION_PLANS = [
  {
    envKey: "POLAR_PRODUCT_STARTER",
    name: "VesperWise Starter",
    description:
      "Perfect for individual SDRs and small sales teams getting started with intent data. " +
      "Includes 500 intent scores per month, 50 watchlist companies, full CSV export, " +
      "and API access to integrate with your existing workflow.",
    priceAmount: 2900, // $29.00
  },
  {
    envKey: "POLAR_PRODUCT_GROWTH",
    name: "VesperWise Growth",
    description:
      "Built for growing sales teams that need more scale and automation. " +
      "Includes 2,500 intent scores per month, 250 watchlist companies, " +
      "bulk scorer for CSV uploads, and 5 Autopilot workflows to automate " +
      "outreach triggers based on buying signals.",
    priceAmount: 7900, // $79.00
  },
  {
    envKey: "POLAR_PRODUCT_PRO",
    name: "VesperWise Pro",
    description:
      "For high-velocity sales teams and revenue operations. " +
      "Includes 8,000 intent scores per month, 1,000 watchlist companies, " +
      "People scorer for contact-level intent signals, and 50 Autopilot " +
      "workflows. Ideal for teams running multi-channel outreach at scale.",
    priceAmount: 19900, // $199.00
  },
  {
    envKey: "POLAR_PRODUCT_AGENCY",
    name: "VesperWise Agency",
    description:
      "Designed for agencies and enterprise teams managing multiple clients or segments. " +
      "Includes 25,000 intent scores per month, unlimited watchlist companies, " +
      "unlimited Autopilot workflows, and priority support. " +
      "Full access to every feature in the platform.",
    priceAmount: 49900, // $499.00
  },
] as const;

const TOPUP_PACKS = [
  {
    envKey: "POLAR_PRODUCT_TOPUP_100",
    name: "VesperWise Credits — 100 Pack",
    description:
      "One-time purchase of 100 intent scoring credits. " +
      "Credits are added immediately to your account balance and never expire. " +
      "Stack on top of your monthly subscription allowance.",
    priceAmount: 900,  // $9.00
    credits: 100,
  },
  {
    envKey: "POLAR_PRODUCT_TOPUP_500",
    name: "VesperWise Credits — 500 Pack",
    description:
      "One-time purchase of 500 intent scoring credits at a discounted rate ($0.078/credit). " +
      "Credits are added immediately to your account balance and never expire. " +
      "Best value for occasional high-volume scoring needs.",
    priceAmount: 3900, // $39.00
    credits: 500,
  },
  {
    envKey: "POLAR_PRODUCT_TOPUP_1000",
    name: "VesperWise Credits — 1,000 Pack",
    description:
      "One-time purchase of 1,000 intent scoring credits at the lowest per-credit rate ($0.069/credit). " +
      "Credits are added immediately to your account balance and never expire. " +
      "Ideal for bulk campaigns and end-of-quarter pushes.",
    priceAmount: 6900, // $69.00
    credits: 1000,
  },
] as const;

// ─── Create products ──────────────────────────────────────────────────────────

async function main() {
  console.log("🚀  Creating VesperWise products in Polar...\n");

  const results: Record<string, string> = {};

  // Subscription plans (monthly recurring)
  console.log("── Subscription Plans ───────────────────────────────────");
  for (const plan of SUBSCRIPTION_PLANS) {
    try {
      const product = await polar.products.create({
        name: plan.name,
        description: plan.description,
        recurring_interval: "month",
        prices: [
          {
            amount_type: "fixed",
            price_amount: plan.priceAmount,
            price_currency: "usd",
          },
        ],
      });
      console.log(`✅  ${plan.name}`);
      console.log(`    ID: ${product.id}`);
      console.log(`    Price: $${(plan.priceAmount / 100).toFixed(2)}/mo\n`);
      results[plan.envKey] = product.id;
    } catch (err) {
      console.error(`❌  Failed to create ${plan.name}:`, err);
      process.exit(1);
    }
  }

  // Top-up packs (one-time purchase)
  console.log("── Credit Top-Up Packs ──────────────────────────────────");
  for (const pack of TOPUP_PACKS) {
    try {
      const product = await polar.products.create({
        name: pack.name,
        description: pack.description,
        recurring_interval: null,
        prices: [
          {
            amount_type: "fixed",
            price_amount: pack.priceAmount,
            price_currency: "usd",
          },
        ],
      });
      console.log(`✅  ${pack.name}`);
      console.log(`    ID: ${product.id}`);
      console.log(`    Price: $${(pack.priceAmount / 100).toFixed(2)} one-time (${pack.credits} credits)\n`);
      results[pack.envKey] = product.id;
    } catch (err) {
      console.error(`❌  Failed to create ${pack.name}:`, err);
      process.exit(1);
    }
  }

  // Print env block
  console.log("─────────────────────────────────────────────────────────");
  console.log("✅  All products created. Copy this into your .env.local:\n");
  console.log("# Polar.sh product IDs (subscriptions)");
  for (const plan of SUBSCRIPTION_PLANS) {
    console.log(`${plan.envKey}=${results[plan.envKey]}`);
  }
  console.log("");
  console.log("# Polar.sh product IDs (one-time top-ups)");
  for (const pack of TOPUP_PACKS) {
    console.log(`${pack.envKey}=${results[pack.envKey]}`);
  }
  console.log("");
}

main();
