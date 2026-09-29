"use client";

import { openCookieSettings } from "@/lib/cookie-consent";

export function CookieSettingsButton() {
  return (
    <button type="button" className="footer-link-button" onClick={openCookieSettings}>
      Cookie settings
    </button>
  );
}
