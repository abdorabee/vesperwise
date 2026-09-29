import type { Metadata } from "next";
import ContactView from "./contact-view";

const CANONICAL = "https://www.vesperwise.com/contact";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact VesperWise about demos, pricing, support, security or partnerships.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    siteName: "VesperWise",
    url: CANONICAL,
    title: "Contact — VesperWise",
    description:
      "Book a demo or ask the VesperWise team a question.",
  },
};

export default function ContactPage() {
  return <ContactView />;
}
