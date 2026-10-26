"use client";

import Link from "next/link";
import { useMarketingSignedIn } from "@/components/landing/use-marketing-session";

export function PricingBottomCta({ signedIn }: { signedIn: boolean }) {
  const authed = useMarketingSignedIn(signedIn);

  return (
    <section className="pp-cta">
      <h2>{authed ? "Back to the dashboard." : "Score your first 20 accounts free."}</h2>
      <p>
        {authed
          ? "Your plan and credits are already on this workspace."
          : "No card required. Upgrade when the scores start booking meetings."}
      </p>
      <div className="row">
        <Link href={authed ? "/dashboard" : "/signup"} className="pp-btn primary">
          {authed ? "Go to dashboard" : "Start scoring free"}
        </Link>
        <Link href="/contact#contact-form" className="pp-btn">Contact us</Link>
      </div>
    </section>
  );
}
