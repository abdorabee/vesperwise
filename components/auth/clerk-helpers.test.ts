import { afterEach, describe, expect, it, vi } from "vitest";

import { isNonProductionBrowserHost, resolvePostAuthPath } from "./clerk-helpers";

describe("resolvePostAuthPath", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stays relative on vercel preview when decorateUrl points at production", () => {
    vi.stubGlobal("window", {
      location: { hostname: "intentiq-git-preview-score-redesign-stack-abdorabees-projects.vercel.app", origin: "https://intentiq-git-preview-score-redesign-stack-abdorabees-projects.vercel.app" },
    });

    const result = resolvePostAuthPath(
      () => "https://www.vesperwise.com/dashboard",
      "/dashboard"
    );

    expect(result).toEqual({ mode: "relative", url: "/dashboard" });
  });

  it("keeps same-origin absolute decorateUrl as a path on preview", () => {
    vi.stubGlobal("window", {
      location: {
        hostname: "intentiq-git-preview-score-redesign-stack-abdorabees-projects.vercel.app",
        origin: "https://intentiq-git-preview-score-redesign-stack-abdorabees-projects.vercel.app",
      },
    });

    const result = resolvePostAuthPath(
      () =>
        "https://intentiq-git-preview-score-redesign-stack-abdorabees-projects.vercel.app/score",
      "/dashboard"
    );

    expect(result).toEqual({ mode: "relative", url: "/score" });
  });

  it("allows absolute navigation on production hosts", () => {
    vi.stubGlobal("window", {
      location: { hostname: "www.vesperwise.com", origin: "https://www.vesperwise.com" },
    });

    const result = resolvePostAuthPath(() => "https://www.vesperwise.com/dashboard", "/dashboard");
    expect(result).toEqual({ mode: "absolute", url: "https://www.vesperwise.com/dashboard" });
  });
});

describe("isNonProductionBrowserHost", () => {
  it("treats vercel.app as non-production", () => {
    expect(isNonProductionBrowserHost("foo.vercel.app")).toBe(true);
  });

  it("treats vesperwise.com as production", () => {
    expect(isNonProductionBrowserHost("www.vesperwise.com")).toBe(false);
    expect(isNonProductionBrowserHost("vesperwise.com")).toBe(false);
  });
});
