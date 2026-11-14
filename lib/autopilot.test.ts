import https from "node:https";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AutopilotAction, IntentScore } from "@/lib/types";

const dnsLookup = vi.fn();

vi.mock("node:dns/promises", () => ({ lookup: (...args: unknown[]) => dnsLookup(...args) }));
vi.mock("@/lib/supabase", () => ({ createSupabaseAdmin: () => ({}) }));
vi.mock("@/lib/score-service", () => ({
  domainToCompanyName: (d: string) => d,
  InsufficientCreditsError: class extends Error {},
  scoreCompany: vi.fn(),
}));
vi.mock("@/lib/score-transition", () => ({ evaluateV2ScoreTransition: vi.fn() }));

const { executeAction } = await import("./autopilot");

const ctx = {
  domain: "acme.com",
  companyName: "Acme",
  scoreResult: { intent_score: 80, score_band: "HOT", ai_summary: "s", recommended_action: "call" } as unknown as IntentScore,
  triggerReasons: ["Score 80 is above 75"],
  userId: "user_1",
  workflowName: "Hot",
};

interface Captured {
  options: https.RequestOptions[];
}

function mockHttps(statusCode: number): Captured {
  const captured: Captured = { options: [] };
  vi.spyOn(https, "request").mockImplementation(((...args: unknown[]) => {
    captured.options.push(args[0] as https.RequestOptions);
    const callback = args[1] as (res: unknown) => void;
    const res = {
      statusCode,
      destroy() {},
      on(event: string, fn: () => void) {
        if (event === "end") queueMicrotask(fn);
        return res;
      },
    };
    queueMicrotask(() => callback(res));
    return { end() {}, destroy() { return this; }, on() { return this; } };
  }) as unknown as typeof https.request);
  return captured;
}

const webhook = (url: string): AutopilotAction => ({ type: "webhook", params: { url } });

describe("autopilot action execution", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    dnsLookup.mockReset();
    dnsLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([
    "https://127.0.0.1/x",
    "https://169.254.169.254/latest/meta-data",
    "https://localhost/x",
    "https://[::1]/x",
    "http://example.com/x",
  ])("never contacts %s and reports blocked_url", async (url) => {
    const request = mockHttps(200);
    const out = await executeAction(webhook(url), ctx);
    expect(request.options).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(out.status).toBe("failed");
    expect(out.result).toEqual({ error: expect.stringMatching(/^(blocked_url|invalid_action)$/) });
  });

  it("blocks hostnames that resolve to private addresses", async () => {
    dnsLookup.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);
    const request = vi.spyOn(https, "request");
    const out = await executeAction(webhook("https://internal.example.com/x"), ctx);
    expect(request).not.toHaveBeenCalled();
    expect(out).toMatchObject({ status: "failed", result: { error: "blocked_url" } });
  });

  it("delivers to a public host with only a content-type header, pinned to the resolved IP", async () => {
    const captured = mockHttps(200);
    const out = await executeAction(webhook("https://example.com/hook"), ctx);
    expect(out).toMatchObject({ status: "success", result: "delivered" });
    expect(fetchSpy).not.toHaveBeenCalled();
    const { headers, host } = captured.options[0];
    expect(host).toBe("93.184.216.34");
    expect(Object.keys(headers ?? {}).sort()).toEqual(["content-length", "content-type", "host"]);
  });

  it("does not follow redirects and hides the remote status", async () => {
    const captured = mockHttps(302);
    const out = await executeAction(webhook("https://example.com/hook"), ctx);
    expect(captured.options).toHaveLength(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(out).toMatchObject({ status: "failed", result: { error: "request_failed" } });
    expect(JSON.stringify(out)).not.toContain("302");
  });

  it("fails a stored action that carries user headers or a bad host", async () => {
    const request = mockHttps(200);
    const withHeaders = { type: "webhook", params: { url: "https://example.com/h", headers: { Authorization: "x" } } };
    const out = await executeAction(withHeaders as AutopilotAction, ctx);
    const slack = await executeAction({ type: "slack", params: { webhook_url: "https://example.com/h" } }, ctx);
    expect(request.options).toHaveLength(0);
    expect(out).toMatchObject({ status: "failed", result: { error: "invalid_action" } });
    expect(slack).toMatchObject({ status: "failed", result: { error: "invalid_action" } });
  });

  it("delivers Slack messages to hooks.slack.com", async () => {
    mockHttps(200);
    const out = await executeAction({ type: "slack", params: { webhook_url: "https://hooks.slack.com/services/T/B/x" } }, ctx);
    expect(out).toMatchObject({ status: "success", result: "delivered" });
  });

  it("returns a fixed code for non-network actions with bad input", async () => {
    const out = await executeAction({ type: "nope", params: {} } as unknown as AutopilotAction, ctx);
    expect(out).toMatchObject({ status: "failed", result: { error: "invalid_action" } });
  });
});
