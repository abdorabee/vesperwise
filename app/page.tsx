import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import LandingPage from "@/components/landing/LandingPage";

const CANONICAL = "https://www.vesperwise.com";

export const metadata: Metadata = {
  title: "VesperWise — B2B Buyer Intent Signals for SMB Sales Teams",
  description:
    "VesperWise tracks hiring spikes, funding rounds, tech stack changes, news mentions, " +
    "with web authority and GitHub activity as supporting context, and scores every company 0–100 " +
    "with the evidence and a next step. Free to start; paid plans from $29/mo.",
  alternates: {
    canonical: CANONICAL,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "VesperWise",
    url: CANONICAL,
    title: "VesperWise — B2B Buyer Intent Signals for SMB Sales Teams",
    description:
      "Know which companies are ready to buy before your competitors do. " +
      "Intent data for SMB sales teams at a fraction of enterprise pricing.",
  },
};

// JSON-LD structured data
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": `${CANONICAL}/#software`,
      name: "VesperWise",
      url: CANONICAL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "B2B buyer intent signal platform tracking hiring spikes, funding rounds, " +
        "tech stack changes and news triggers, with web and GitHub context for SMB sales teams.",
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        description: "Free tier available. Paid plans from $29/mo.",
      },
    },
    {
      "@type": "Organization",
      "@id": `${CANONICAL}/#organization`,
      name: "VesperWise",
      url: CANONICAL,
      description:
        "Buying-intent scores for B2B sales teams, with the evidence behind every number. Built in Cairo.",
      logo: {
        "@type": "ImageObject",
        url: `${CANONICAL}/vesperwise-logo.png`,
      },
      sameAs: ["https://www.linkedin.com/company/vesperwise"],
    },
    {
      "@type": "WebSite",
      "@id": `${CANONICAL}/#website`,
      url: CANONICAL,
      name: "VesperWise",
      publisher: { "@id": `${CANONICAL}/#organization` },
    },
  ],
};

// Root "/" — dashboard if logged in, marketing landing page if not
export default async function RootPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Gateway animation — the full visual experience for real visitors */}
      <LandingPage />
    </>
  );
}
