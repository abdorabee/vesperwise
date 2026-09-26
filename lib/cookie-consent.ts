export type CookieConsent = "granted" | "denied";

const STORAGE_KEY = "vw-cookie-consent";
const CHANGE_EVENT = "vw:cookie-consent-change";
const OPEN_EVENT = "vw:cookie-settings-open";

export function readCookieConsent(): CookieConsent | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function writeCookieConsent(consent: CookieConsent) {
  try {
    window.localStorage.setItem(STORAGE_KEY, consent);
  } catch {
    // Storage blocked (private mode) — the choice still applies for this page view.
  }
  if (consent === "denied") clearAnalyticsCookies();
  window.dispatchEvent(new CustomEvent<CookieConsent>(CHANGE_EVENT, { detail: consent }));
}

export function subscribeCookieConsent(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function subscribeCookieSettingsOpen(onOpen: () => void) {
  window.addEventListener(OPEN_EVENT, onOpen);
  return () => window.removeEventListener(OPEN_EVENT, onOpen);
}

/** Remove Google Analytics cookies (`_ga`, `_ga_<id>`) on the current and parent domains. */
function clearAnalyticsCookies() {
  const host = window.location.hostname;
  const domains = ["", host, `.${host.replace(/^www\./, "")}`];
  for (const entry of document.cookie.split(";")) {
    const name = entry.split("=")[0]?.trim();
    if (!name || !(name === "_ga" || name.startsWith("_ga_") || name === "_gid")) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`;
    }
  }
}
