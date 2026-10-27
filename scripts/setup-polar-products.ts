/**
 * Polar.sh Product Setup Script
 *
 * Creates VesperWise products in your Polar account:
 *   - 4 subscription plans  (monthly recurring)
 *   - 3 credit top-up packs (one-time purchase)
 * Agency is not sold. Do not create an agency product.
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
      "For one person scoring a named-account list. " +
      "100 account scores per month, watchlist of 25, 20 API requests per minute. " +
      "No bulk, CSV or autopilot. Monthly credits do not roll over.",
    priceAmount: 1000, // $10.00
  },
  {
    envKey: "POLAR_PRODUCT_PLUS",
    name: "VesperWise Plus",
    description:
      "For a rep who scores lists. " +
      "400 account scores per month, watchlist of 75, 60 API requests per minute, " +
      "bulk scoring and CSV upload and export. Autopilot is coming soon.",
    priceAmount: 2900, // $29.00
  },
  {
    envKey: "POLAR_PRODUCT_GROWTH",
    name: "VesperWise Growth",
    description:
      "For a sales team scoring its pipeline. " +
      "1,200 account scores per month, watchlist of 250, 100 API requests per minute, " +
      "bulk scoring and CSV upload and export. Autopilot is coming soon.",
    priceAmount: 7900, // $79.00
  },
  {
    envKey: "POLAR_PRODUCT_PRO",
    name: "VesperWise Pro",
    description:
      "For teams scoring large books of accounts. " +
      "3,000 account scores per month, watchlist of 1,000, 100 API requests per minute, " +
      "bulk scoring and CSV upload and export. Autopilot is coming soon.",
    priceAmount: 19900, // $199.00
  },
] as const;

const TOPUP_PACKS = [
  {
    envKey: "POLAR_PRODUCT_TOPUP_25",
    name: "VesperWise Credits — 25 Pack",
    description:
      "One-time purchase of 25 account scores. " +
      "Credits are added to the current balance and do not change the plan.",
    priceAmount: 300, // $3.00
    credits: 25,
  },
  {
    envKey: "POLAR_PRODUCT_TOPUP_70",
    name: "VesperWise Credits — 70 Pack",
    description:
      "One-time purchase of 70 account scores. " +
      "Credits are added to the current balance and do not change the plan.",
    priceAmount: 800, // $8.00
    credits: 70,
  },
  {
    envKey: "POLAR_PRODUCT_TOPUP_140",
    name: "VesperWise Credits — 140 Pack",
    description:
      "One-time purchase of 140 account scores. " +
      "Credits are added to the current balance and do not change the plan.",
    priceAmount: 1500, // $15.00
    credits: 140,
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
