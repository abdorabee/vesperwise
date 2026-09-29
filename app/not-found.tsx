import type { Metadata } from "next";
import Link from "next/link";
import LandingNav from "@/components/landing/LandingNav";
import SiteFooter from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for doesn't exist or has moved.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <LandingNav />
      <main className="status-page">
        <p className="status-page-code" aria-hidden="true">404</p>
        <h1>This page scored a 0.</h1>
        <p className="lead">
          The page you were looking for doesn&apos;t exist, has moved, or never showed any intent to begin with.
        </p>
        <div className="status-page-actions">
          <Link href="/" className="btn btn-accent btn-lg">Back to home</Link>
          <Link href="/contact" className="btn btn-secondary btn-lg">Contact support</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
