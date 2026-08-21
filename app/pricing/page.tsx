import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import PricingView from "./pricing-view";

const CANONICAL = "https://www.vesperwise.com/pricing";

export const metadata: Metadata = {
  title: "Pricing — VesperWise",
  description:
    "Start free with 20 account scores. Paid plans from $29/mo for 500 credits. " +
    "No annual contracts, no setup calls. Cancel anytime.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    siteName: "VesperWise",
    url: CANONICAL,
    title: "Pricing — VesperWise",
    description:
      "Affordable B2B intent data. Free tier available. Scale to 25,000 scores/mo. " +
      "No annual lock-in.",
  },
};

export default async function PricingPage() {
  const { userId } = await auth();
  if (userId) redirect("/billing");

  return <PricingView />;
}
