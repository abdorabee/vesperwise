import type { Metadata } from "next";
import DocsView from "./docs-view";

const CANONICAL = "https://www.vesperwise.com/docs";

export const metadata: Metadata = {
  title: "API Reference",
  description:
    "VesperWise REST API: authentication, scoring, watchlist and bulk endpoints, errors and response reference.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    siteName: "VesperWise",
    url: CANONICAL,
    title: "API Reference — VesperWise",
    description:
      "Score any company from 0 to 100 with one API call. Reference with curl and Node examples.",
  },
};

export default function DocsPage() {
  return <DocsView />;
}
