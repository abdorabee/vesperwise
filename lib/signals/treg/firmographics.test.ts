import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import firmographicsFixture from "./__fixtures__/hunter-company-enrich.json";
import {
  fetchTregFirmographics,
  normalizeEmployeeRange,
} from "./firmographics";

interface MockTregResponse {
  ok: boolean;
  status: number;
  headers: Headers;
  json: () => Promise<unknown>;
}

type FetchMock = (input: RequestInfo | URL, init?: RequestInit) => Promise<MockTregResponse>;

function jsonResponse(status: number, data: unknown): MockTregResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({
      "X-Treg-Call-Id": "call_firmographics",
      "X-Treg-Cost-Micro": "6789",
    }),
    json: async () => data,
  };
}

describe("normalizeEmployeeRange", () => {
  it.each([
    ["10K-50K", undefined, "10000-50000"],
    ["1K-5K", undefined, "1000-5000"],
    ["51-200", undefined, "51-200"],
    ["10K+", undefined, "10000+"],
    ["1.5K-2K", undefined, "1500-2000"],
    [undefined, 16784, "16784"],
    ["unknown", 42.4, "42"],
    ["unknown", 0, null],
  ])("normalizes %s with count %s to %s", (range, count, expected) => {
    expect(normalizeEmployeeRange(range, count)).toBe(expected);
  });
});

describe("fetchTregFirmographics", () => {
  beforeEach(() => {
    vi.stubEnv("TREG_TOKEN", "test-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("maps Hunter company enrichment into industry and normalized employee range", async () => {
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, firmographicsFixture)));

    const result = await fetchTregFirmographics("stripe.com");

    expect(result).toEqual({
      status: "ok",
      industry: "Internet Software & Services",
      employeeRange: "10000-50000",
      callId: "call_firmographics",
      costMicro: 6789,
    });
  });

  it("returns no_signal when required firmographics are missing", async () => {
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, {
      data: {
        category: {
          industry: "Software",
        },
      },
    })));

    const result = await fetchTregFirmographics("acme.com");

    expect(result).toEqual({
      status: "no_signal",
      industry: "Software",
      employeeRange: null,
      callId: "call_firmographics",
      costMicro: 6789,
      reason: "missing_required_firmographics",
    });
  });

  it("maps Treg 404 firmographics failures to not_found", async () => {
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(404, {
      error: "missing",
    })));

    const result = await fetchTregFirmographics("missing.example");

    expect(result).toEqual({
      status: "not_found",
      industry: null,
      employeeRange: null,
      callId: "call_firmographics",
      costMicro: 6789,
      reason: "http_404",
    });
  });

  it("returns unavailable without fetching when the Treg token is missing", async () => {
    vi.stubEnv("TREG_TOKEN", "");
    const fetchMock = vi.fn<FetchMock>();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchTregFirmographics("stripe.com");

    expect(result).toEqual({
      status: "unavailable",
      industry: null,
      employeeRange: null,
      callId: null,
      costMicro: null,
      reason: "missing_api_key",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
