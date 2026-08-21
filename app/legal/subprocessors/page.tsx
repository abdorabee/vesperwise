import type { Metadata } from "next";
import SubprocessorsView from "./subprocessors-view";

const CANONICAL = "https://www.vesperwise.com/legal/subprocessors";

export const metadata: Metadata = {
  title: "Subprocessors",
  description:
    "Third-party service providers VesperWise uses to operate the Service.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    siteName: "VesperWise",
    url: CANONICAL,
    title: "Subprocessors — VesperWise",
    description:
      "Third-party providers for auth, hosting, billing, and AI routing.",
  },
};

export default function SubprocessorsPage() {
  return <SubprocessorsView />;
}
