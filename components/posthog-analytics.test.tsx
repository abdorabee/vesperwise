// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { auth, posthog, calls, state } = vi.hoisted(() => {
  const state = { loaded: false, optedOut: false };
  const auth = { isLoaded: true, userId: null as string | null };
  const calls: string[] = [];
  const posthog = {
    get __loaded() {
      return state.loaded;
    },
    init: vi.fn(() => {
      state.loaded = true;
      calls.push("init");
    }),
    opt_out_capturing: vi.fn(() => {
      state.optedOut = true;
      calls.push("opt_out");
    }),
    opt_in_capturing: vi.fn(() => {
      state.optedOut = false;
      calls.push("opt_in");
    }),
    reset: vi.fn(() => {
      state.optedOut = false;
      calls.push("reset");
    }),
    set_config: vi.fn(() => {
      calls.push("set_config");
    }),
    identify: vi.fn((id: string) => {
      calls.push(`identify:${id}`);
    }),
    capture: vi.fn((event: string) => {
      calls.push(`capture:${event}`);
    }),
    has_opted_out_capturing: () => state.optedOut,
  };
  return { auth, posthog, calls, state };
});

vi.mock("posthog-js", () => ({ default: posthog }));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isLoaded: auth.isLoaded, userId: auth.userId }),
}));

async function load() {
  const consent = await import("@/lib/cookie-consent");
  const analytics = await import("./posthog-analytics");
  const events = await import("@/lib/product-analytics");
  return { consent, analytics, events };
}

describe("PostHog consent gate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "");
    state.loaded = false;
    state.optedOut = false;
    localStorage.clear();
    auth.isLoaded = true;
    auth.userId = null;
    calls.length = 0;
    posthog.init.mockClear();
    posthog.opt_out_capturing.mockClear();
    posthog.opt_in_capturing.mockClear();
    posthog.reset.mockClear();
    posthog.identify.mockClear();
    posthog.capture.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("does not init until Accept", async () => {
    const { analytics, consent } = await load();
    render(<analytics.PostHogAnalytics />);
    expect(posthog.init).not.toHaveBeenCalled();

    await act(async () => {
      consent.writeCookieConsent("denied");
    });
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.opt_out_capturing).not.toHaveBeenCalled();

    await act(async () => {
      consent.writeCookieConsent("granted");
    });
    expect(posthog.init).toHaveBeenCalledTimes(1);
    expect(posthog.init).toHaveBeenCalledWith("phc_test", {
      api_host: "https://eu.i.posthog.com",
      person_profiles: "identified_only",
    });
  });

  it("opts out and resets after Accept, then stays opted out", async () => {
    const { analytics, consent } = await load();
    render(<analytics.PostHogAnalytics />);
    await act(async () => {
      consent.writeCookieConsent("granted");
    });
    await act(async () => {
      consent.writeCookieConsent("denied");
    });

    expect(calls.filter((call) => call === "opt_out" || call === "set_config" || call === "reset")).toEqual([
      "opt_out",
      "set_config",
      "reset",
      "opt_out",
    ]);
    expect(posthog.has_opted_out_capturing()).toBe(true);

    await act(async () => {
      consent.writeCookieConsent("granted");
    });
    expect(posthog.init).toHaveBeenCalledTimes(1);
    expect(posthog.opt_in_capturing).toHaveBeenCalledTimes(1);
    expect(posthog.has_opted_out_capturing()).toBe(false);
  });

  it("identifies with the Clerk user id only after consent", async () => {
    auth.userId = "user_abc";
    const { analytics, consent, events } = await load();
    render(<analytics.PostHogAnalytics />);
    expect(posthog.identify).not.toHaveBeenCalled();

    await act(async () => {
      consent.writeCookieConsent("granted");
    });
    expect(posthog.identify).toHaveBeenCalledTimes(1);
    expect(posthog.identify.mock.calls[0]).toEqual(["user_abc"]);

    events.captureProductEvent("signup_completed");
    expect(posthog.capture).toHaveBeenCalledWith("signup_completed");
  });

  it("does not capture when consent is missing or PostHog was never loaded", async () => {
    const { events } = await load();
    events.captureProductEvent("score_started");
    expect(posthog.capture).not.toHaveBeenCalled();
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it("renders nothing and never inits without a project key", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    const { analytics, consent } = await load();
    const view = render(<analytics.PostHogAnalytics />);
    expect(view.container.innerHTML).toBe("");
    await act(async () => {
      consent.writeCookieConsent("granted");
    });
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it("uses NEXT_PUBLIC_POSTHOG_HOST when set", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://ph.example.test");
    const { analytics, consent } = await load();
    render(<analytics.PostHogAnalytics />);
    await act(async () => {
      consent.writeCookieConsent("granted");
    });
    expect(posthog.init).toHaveBeenCalledWith("phc_test", {
      api_host: "https://ph.example.test",
      person_profiles: "identified_only",
    });
  });
});

describe("analytics copy", () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

  it("states the consent rules on the banner, terms, privacy, and subprocessors", () => {
    const banner = read("./cookie-banner.tsx");
    const terms = read("../app/terms/terms-view.tsx");
    const privacy = read("../app/privacy/privacy-view.tsx");
    const subprocessors = read("../app/legal/subprocessors/subprocessors-view.tsx");
    const readme = read("../README.md");

    expect(banner).toContain("Google Analytics and PostHog");
    expect(banner).toContain("measure which pages you leave");
    expect(banner).toContain("Reject keeps essential cookies only");

    expect(terms).toContain('title="Analytics"');
    expect(terms).toContain("where people drop off");
    expect(terms).toContain("Accept in the cookie banner is consent");
    expect(terms).toContain("Reject means we do not load it");
    expect(terms).toContain('href="/privacy"');

    expect(privacy).not.toContain("self-hosted");
    expect(privacy).toContain("PostHog, hosted in the EU, only after cookie consent");

    expect(subprocessors).toContain("PostHog");
    expect(subprocessors).toContain("Product analytics — only after cookie consent");
    expect(subprocessors).toContain("Google Analytics");
    expect(subprocessors).toContain(">Clerk<");
    expect(subprocessors).toContain(">Polar.sh<");
    expect(subprocessors).toContain(">Supabase<");
    expect(subprocessors).toContain(">Vercel<");
    expect(subprocessors).toContain(">Resend<");
    expect(subprocessors).toContain("Stripe");

    expect(readme).toContain("NEXT_PUBLIC_POSTHOG_KEY=");
  });

  it("fires funnel events at the existing success points", () => {
    const signup = read("./auth/signup-form.tsx");
    const score = read("../app/(dashboard)/score/score-view.tsx");
    const billing = read("./billing/billing-plans-grid.tsx");

    expect(signup).toContain('captureProductEvent("signup_completed")');
    expect(score).toContain('captureProductEvent("score_started")');
    expect(score).toContain('captureProductEvent("score_completed")');
    expect(billing).toContain('captureProductEvent("checkout_started")');
  });
});
