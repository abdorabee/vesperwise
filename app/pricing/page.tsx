import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { STARTING_PRICE } from "@/lib/plan-features";
import { createSupabaseAdmin } from "@/lib/supabase";
import { isGrantedPlan } from "@/lib/billing-plans";
import PricingView from "./pricing-view";

const CANONICAL = "https://www.vesperwise.com/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    `Start free with 20 account scores. Paid plans from $${STARTING_PRICE}/mo. ` +
    "No annual contracts, no setup calls. Cancel anytime.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    siteName: "VesperWise",
    url: CANONICAL,
    title: "Pricing — VesperWise",
    description:
      "Affordable B2B intent data. Free tier available. Paid plans from $10/mo. " +
      "No annual lock-in.",
  },
};

export default async function PricingPage() {
  const { userId } = await auth();
  let currentPlan: string | null = null;
  let granted = false;

  if (userId) {
    const supabase = createSupabaseAdmin();
    const { data } = await supabase
      .from("users")
      .select("plan, polar_subscription_id")
      .eq("id", userId)
      .maybeSingle();
    if (data) {
      currentPlan = data.plan;
      granted = isGrantedPlan(data.plan, data.polar_subscription_id);
    }
  }

  return <PricingView signedIn={!!userId} currentPlan={currentPlan} granted={granted} />;
}
