"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  readCookieConsent,
  subscribeCookieConsent,
  subscribeCookieSettingsOpen,
  writeCookieConsent,
  type CookieConsent,
} from "@/lib/cookie-consent";

// `undefined` on the server so the banner never flashes into prerendered HTML.
const getServerSnapshot = () => undefined;

export function CookieBanner() {
  const consent = useSyncExternalStore(subscribeCookieConsent, readCookieConsent, getServerSnapshot);
  const [reopened, setReopened] = useState(false);

  useEffect(() => subscribeCookieSettingsOpen(() => setReopened(true)), []);

  if (consent === undefined) return null;
  if (consent !== null && !reopened) return null;

  function choose(value: CookieConsent) {
    writeCookieConsent(value);
    setReopened(false);
  }

  return (
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-labelledby="cookie-banner-title">
      <div id="cookie-banner-title" className="cookie-banner-title">Cookies</div>
      <p>
        <span className="cookie-long">
          We use essential cookies to keep you signed in. With your OK, we also use Google Analytics to
          understand how the site is used. See our <Link href="/privacy#cookies">privacy policy</Link>.
        </span>
        <span className="cookie-short">
          Analytics cookies are optional. <Link href="/privacy#cookies">Privacy</Link>
        </span>
      </p>
      <div className="cookie-banner-actions">
        <button type="button" className="btn btn-secondary" onClick={() => choose("denied")}>
          Reject
        </button>
        <button type="button" className="btn btn-accent" onClick={() => choose("granted")}>
          Accept
        </button>
      </div>
    </div>
  );
}
