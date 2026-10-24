import type { Metadata } from "next";
import { STARTING_PRICE } from "@/lib/plan-features";
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

export default function PricingPage() {
  return <PricingView />;
}
