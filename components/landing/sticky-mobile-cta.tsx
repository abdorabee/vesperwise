"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/** Bottom CTA bar for phones; slides in once the visitor scrolls past the hero. Hidden above 768px via CSS. */
export default function StickyMobileCta({ showAfter = 480 }: { showAfter?: number }) {
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
        <strong>20 free credits</strong>
        <br />
        No credit card needed
      </div>
      <Link href="/signup" className="btn btn-accent btn-lg" tabIndex={visible ? 0 : -1}>
        Start free →
      </Link>
    </div>
  );
}
