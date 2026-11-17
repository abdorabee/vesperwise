/**
 * Security headers applied to every response (consumed by next.config.ts).
 *
 * Only a minimal CSP is enforced. The full policy ships as Report-Only so
 * violations can be observed without risking Clerk, checkout or analytics.
 * Promoting it to enforcement is a follow-up.
 */

export interface HeaderEntry {
  key: string;
  value: string;
}

export const ENFORCED_CSP = "frame-ancestors 'none'; object-src 'none'; base-uri 'self'";

// Origins below were taken from what the app actually loads/calls:
// - Clerk: @clerk/nextjs in app/layout.tsx (hosted *.clerk.accounts.dev, custom clerk.vesperwise.com, telemetry)
// - Turnstile: Clerk bot protection (components/auth/signup-form.tsx)
// - Google Analytics: components/google-analytics.tsx (GTM gtag.js + GA collect endpoints)
// - Supabase: NEXT_PUBLIC_SUPABASE_URL (*.supabase.co)
// - Polar: lib/polar.ts / app/api/billing/checkout (server redirect to polar.sh / sandbox.polar.sh)
// - Company favicons: components/score/band.tsx (www.google.com/s2/favicons; covered by img-src https:)
// - next/font/google in app/layout.tsx self-hosts fonts, so no Google Fonts origins are needed.
const CLERK_SCRIPT_SRC = ["https://*.clerk.accounts.dev", "https://clerk.vesperwise.com"];
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";
const GTM_ORIGIN = "https://www.googletagmanager.com";
const GA_CONNECT_SRC = [
  "https://www.google-analytics.com",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  GTM_ORIGIN,
];
const CLERK_CONNECT_SRC = [
  "https://*.clerk.accounts.dev",
  "https://clerk.vesperwise.com",
  "https://clerk-telemetry.com",
];
const SUPABASE_ORIGIN = "https://*.supabase.co";
const POLAR_ORIGINS = ["https://polar.sh", "https://*.polar.sh"];

function join(sources: readonly string[]): string {
  return sources.join(" ");
}

export function buildReportOnlyCsp(isDev: boolean): string {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    ...CLERK_SCRIPT_SRC,
    TURNSTILE_ORIGIN,
    GTM_ORIGIN,
  ];
  const connectSrc = [
    "'self'",
    ...CLERK_CONNECT_SRC,
    SUPABASE_ORIGIN,
    ...GA_CONNECT_SRC,
    ...(isDev ? ["ws:"] : []),
  ];
  const directives = [
    "default-src 'self'",
    `script-src ${join(scriptSrc)}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${join(connectSrc)}`,
    `frame-src ${join(["'self'", ...CLERK_SCRIPT_SRC, TURNSTILE_ORIGIN, ...POLAR_ORIGINS])}`,
    "worker-src 'self' blob:",
    `form-action ${join(["'self'", ...POLAR_ORIGINS])}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ];
  return directives.join("; ");
}

export const REPORT_ONLY_CSP = buildReportOnlyCsp(process.env.NODE_ENV !== "production");

export const SECURITY_HEADERS: HeaderEntry[] = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: ENFORCED_CSP },
  { key: "Content-Security-Policy-Report-Only", value: REPORT_ONLY_CSP },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];
