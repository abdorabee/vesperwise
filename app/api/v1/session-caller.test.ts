import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ createSupabaseAdmin: () => ({}) }));

import { PLAN_RATE_LIMIT } from "@/lib/types";
import { isSessionCaller, SESSION_RATE_LIMIT_PER_MINUTE } from "./rate-limit";

describe("isSessionCaller", () => {
  it("treats a request without a Bearer key as a browser session", () => {
    expect(isSessionCaller(null)).toBe(true);
    expect(isSessionCaller(undefined)).toBe(true);
    expect(isSessionCaller("Basic abc")).toBe(true);
  });

  it("treats a Bearer key as an API caller", () => {
    expect(isSessionCaller("Bearer vesperwise_abc")).toBe(false);
  });

  it("gives dashboard sessions more headroom than the free API plan", () => {
    expect(SESSION_RATE_LIMIT_PER_MINUTE).toBeGreaterThan(PLAN_RATE_LIMIT.free);
  });
});
