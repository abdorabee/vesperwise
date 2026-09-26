import type { Metadata } from "next";
import Link from "next/link";
import LandingNav from "@/components/landing/LandingNav";
import SiteFooter from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Thanks for reaching out",
  description: "We received your message and will reply within one business day.",
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <>
      <LandingNav />
      <main className="status-page">
        <p className="status-page-code status-page-check" aria-hidden="true">✓</p>
        <h1>Thanks — we got your message.</h1>
        <p className="lead">
          A real person will reply within one business day. In the meantime, you can score your first company for free.
        </p>
        <div className="status-page-actions">
          <Link href="/signup" className="btn btn-accent btn-lg">Start scoring free</Link>
          <Link href="/docs" className="btn btn-secondary btn-lg">Read the API docs</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
