import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRIVATE_PAGE_SECTIONS_FOR_TEST, isApiPath, requiresAuth } from "./route-access";

const prod = { production: true };
const preview = { production: false };

describe("requiresAuth", () => {
  it("lets public and unknown pages through so they can render or 404", () => {
    for (const path of ["/", "/pricing", "/docs/api", "/legal/dpa", "/thank-you", "/does-not-exist", "/foo/bar"]) {
      expect(requiresAuth(path, prod), path).toBe(false);
    }
  });

  it("protects private sections and their subpaths", () => {
    // People, Inbox and Autopilot are hidden from the nav but must stay protected by URL.
    for (const path of ["/dashboard", "/lists/123", "/settings/profile", "/api-keys", "/people", "/inbox", "/autopilot"]) {
      expect(requiresAuth(path, prod), path).toBe(true);
    }
    expect(requiresAuth("/dashboardx", prod)).toBe(false);
    expect(requiresAuth("/%64ashboard", prod)).toBe(true);
    expect(requiresAuth("/Dashboard", prod)).toBe(true);
    expect(requiresAuth("//settings", prod)).toBe(true);
    expect(requiresAuth("/%E0%A4%A", prod)).toBe(false);
  });

  it("protects onboarding and dev only in production", () => {
    expect(requiresAuth("/onboarding", prod)).toBe(true);
    expect(requiresAuth("/dev/shell", prod)).toBe(true);
    expect(requiresAuth("/onboarding", preview)).toBe(false);
  });

  it("keeps API routes deny-by-default", () => {
    expect(requiresAuth("/api/user/profile", prod)).toBe(true);
    expect(requiresAuth("/api/unknown", prod)).toBe(true);
    expect(requiresAuth("/api/v1/score", prod)).toBe(false);
    expect(requiresAuth("/api/contact", prod)).toBe(false);
    expect(requiresAuth("/api/billing/webhook", prod)).toBe(false);
    expect(requiresAuth("/api/billing/checkout", prod)).toBe(true);
  });

  it("covers every section in app/(dashboard)", () => {
    const dir = join(__dirname, "..", "app", "(dashboard)");
    const sections = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    expect(sections.length).toBeGreaterThan(0);
    for (const s of sections) {
      expect(PRIVATE_PAGE_SECTIONS_FOR_TEST, `app/(dashboard)/${s} missing from route-access`).toContain(s);
    }
  });

  it("lets Vercel Cron routes through to their own CRON_SECRET check", () => {
    expect(requiresAuth("/api/cron/reset-free-credits", prod)).toBe(false);
    expect(requiresAuth("/api/cronx", prod)).toBe(true);
  });
});

describe("isApiPath", () => {
  it("matches API paths regardless of case or encoding", () => {
    for (const path of ["/api", "/api/user/profile", "/API/user", "/%61pi/user", "/trpc/x"]) {
      expect(isApiPath(path), path).toBe(true);
    }
    for (const path of ["/apis", "/dashboard", "/docs/api"]) {
      expect(isApiPath(path), path).toBe(false);
    }
  });
});
