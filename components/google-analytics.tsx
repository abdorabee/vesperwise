"use client";

import { useEffect, useSyncExternalStore } from "react";
import Script from "next/script";
import { readCookieConsent, subscribeCookieConsent } from "@/lib/cookie-consent";

const GA_MEASUREMENT_ID = "G-TQKL17V4G9";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Loads GA4 only after the visitor accepts analytics cookies in the cookie banner. */
export function GoogleAnalytics() {
  const consent = useSyncExternalStore(subscribeCookieConsent, readCookieConsent, () => null);

  useEffect(() => {
    // GA may already be loaded from an earlier "Accept" in this session; stop it collecting.
    if (consent === "denied") window.gtag?.("consent", "update", { analytics_storage: "denied" });
    if (consent === "granted") window.gtag?.("consent", "update", { analytics_storage: "granted" });
  }, [consent]);

  if (consent !== "granted") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            analytics_storage: 'granted',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
          });
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
