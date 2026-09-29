import type { Metadata } from "next";
import SecurityView from "./security-view";

const CANONICAL = "https://www.vesperwise.com/legal/security";

export const metadata: Metadata = {
  title: "Security",
  description:
    "VesperWise security controls: authentication, encryption, data handling, and what is on the roadmap.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    siteName: "VesperWise",
    url: CANONICAL,
    title: "Security at VesperWise",
    description:
      "Current security controls at VesperWise and what we are working on next.",
  },
};

export default function SecurityPage() {
  return <SecurityView />;
}
