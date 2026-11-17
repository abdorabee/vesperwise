import { describe, expect, it } from "vitest";
import {
  ENFORCED_CSP,
  REPORT_ONLY_CSP,
  SECURITY_HEADERS,
  buildReportOnlyCsp,
} from "./security-headers";

function headerValue(key: string): string | undefined {
  return SECURITY_HEADERS.find((header) => header.key === key)?.value;
}

function directive(policy: string, name: string): string[] {
  const entry = policy.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name} `));
  return entry ? entry.split(/\s+/).slice(1) : [];
}

describe("SECURITY_HEADERS", () => {
  it.each([
    "X-Frame-Options",
    "Content-Security-Policy",
    "Content-Security-Policy-Report-Only",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Cross-Origin-Opener-Policy",
  ])("includes %s", (key) => {
    expect(headerValue(key)).toBeTruthy();
  });

  it("sets COOP to same-origin-allow-popups", () => {
    expect(headerValue("Cross-Origin-Opener-Policy")).toBe("same-origin-allow-popups");
  });

  it("enforces only frame-ancestors, object-src and base-uri", () => {
    expect(ENFORCED_CSP).toBe("frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
    expect(ENFORCED_CSP).not.toContain("script-src");
    expect(ENFORCED_CSP).not.toContain("default-src");
    expect(headerValue("Content-Security-Policy")).toBe(ENFORCED_CSP);
  });
});

describe("report-only policy", () => {
  it("contains the core directives", () => {
    expect(REPORT_ONLY_CSP).toContain("default-src 'self'");
    expect(REPORT_ONLY_CSP).toContain("object-src 'none'");
    expect(REPORT_ONLY_CSP).toContain("form-action");
    expect(REPORT_ONLY_CSP).toContain("frame-ancestors 'none'");
    expect(headerValue("Content-Security-Policy-Report-Only")).toBe(REPORT_ONLY_CSP);
  });

  it("never allows a bare wildcard script source", () => {
    expect(directive(REPORT_ONLY_CSP, "script-src")).not.toContain("*");
  });

  it("omits unsafe-eval and ws: in production", () => {
    const prod = buildReportOnlyCsp(false);
    expect(prod).not.toContain("'unsafe-eval'");
    expect(directive(prod, "connect-src")).not.toContain("ws:");
  });

  it("adds unsafe-eval and ws: in development", () => {
    const dev = buildReportOnlyCsp(true);
    expect(directive(dev, "script-src")).toContain("'unsafe-eval'");
    expect(directive(dev, "connect-src")).toContain("ws:");
  });
});
