import type { Metadata } from "next";
import AboutView from "./about-view";

const CANONICAL = "https://www.vesperwise.com/about";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why VesperWise exists, how a score comes together, and who builds it.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    siteName: "VesperWise",
    url: CANONICAL,
    title: "About — VesperWise",
    description:
      "Buying-intent scores for B2B sales teams, with the evidence behind every number. Built in Cairo.",
  },
};

export default function AboutPage() {
  return <AboutView />;
}
