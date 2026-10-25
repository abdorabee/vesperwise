"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMarketingSignedIn } from "@/components/landing/use-marketing-session";

/** Bottom CTA bar for phones; slides in once the visitor scrolls past the hero. Hidden above 768px via CSS. */
export default function StickyMobileCta({ showAfter = 480, signedIn = false }: { showAfter?: number; signedIn?: boolean }) {
  const authed = useMarketingSignedIn(signedIn);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > showAfter);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [showAfter]);

  return (
    <div className="sticky-mobile-cta" data-visible={visible} aria-hidden={!visible}>
      <div className="sticky-mobile-cta-text">
        {authed ? (
          <strong>Signed in</strong>
        ) : (
          <>
            <strong>20 free credits</strong>
            <br />
            No credit card needed
          </>
        )}
      </div>
      <Link href={authed ? "/dashboard" : "/signup"} className="btn btn-accent btn-lg" tabIndex={visible ? 0 : -1}>
        {authed ? "Dashboard" : "Start free →"}
      </Link>
    </div>
  );
}
