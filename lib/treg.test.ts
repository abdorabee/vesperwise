import { afterEach, describe, expect, it, vi } from "vitest";

import {
  callTreg,
  TREG_BASE_URL,
  TREG_DEFAULT_MAX_COST_USD,
} from "./treg";

interface MockTregResponse {
  ok: boolean;
  status: number;
  headers: Headers;
  json: () => Promise<unknown>;
}

type FetchMock = (input: RequestInfo | URL, init?: RequestInit) => Promise<MockTregResponse>;

function jsonResponse(
  status: number,
  data: unknown,
  headers: Record<string, string> = {},
): MockTregResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => data,
  };
}

function invalidJsonResponse(
  status: number,
  headers: Record<string, string> = {},
): MockTregResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => {
      throw new SyntaxError("Invalid JSON");
    },
  };
}

function getFetchUrl(fetchMock: ReturnType<typeof vi.fn<FetchMock>>): URL {
  const input = fetchMock.mock.calls[0]?.[0];
  return new URL(String(input));
}

function getFetchInit(fetchMock: ReturnType<typeof vi.fn<FetchMock>>): RequestInit {
  return fetchMock.mock.calls[0]?.[1] ?? {};
}

function getFetchHeaders(fetchMock: ReturnType<typeof vi.fn<FetchMock>>): Headers {
  return new Headers(getFetchInit(fetchMock).headers);
}

describe("callTreg", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns missing_api_key without calling fetch when the token is blank", async () => {
    // Arrange
    vi.stubEnv("TREG_TOKEN", " ");
    const fetchMock = vi.fn<FetchMock>();
    vi.stubGlobal("fetch", fetchMock);

    // Act
    const result = await callTreg({ endpointId: "people.search" });

    // Assert
    expect(result).toEqual({
      ok: false,
      status: null,
      reason: "missing_api_key",
      costMicro: null,
      callId: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("builds the call URL with encoded query values and skips undefined values", async () => {
    // Arrange
    vi.stubEnv("TREG_TOKEN", "test-token");
    const fetchMock = vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    // Act
    await callTreg({
      endpointId: "people.search",
      query: {
        q: "sales director",
        limit: 10,
        active: true,
        skipped: undefined,
      },
    });

    // Assert
    const url = getFetchUrl(fetchMock);
    expect(`${url.origin}${url.pathname}`).toBe(`${TREG_BASE_URL}/call/people.search`);
    expect(url.search).toContain("q=sales+director");
    expect(url.searchParams.get("q")).toBe("sales director");
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.get("active")).toBe("true");
    expect(url.searchParams.has("skipped")).toBe(false);
  });

  it("sends token, default max-cost, no-store cache, and omits empty meta headers", async () => {
    // Arrange
    vi.stubEnv("TREG_TOKEN", "test-token");
    const fetchMock = vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    // Act
    await callTreg({ endpointId: "people.search", meta: {} });

    // Assert
    const init = getFetchInit(fetchMock);
    const headers = getFetchHeaders(fetchMock);
    expect(init.method).toBe("GET");
    expect(init.cache).toBe("no-store");
    expect(headers.get("X-Treg-Token")).toBe("test-token");
    expect(headers.get("X-Treg-Route-Max-Cost")).toBe(String(TREG_DEFAULT_MAX_COST_USD));
    expect(headers.has("X-Treg-Meta")).toBe(false);
  });

  it("sends a custom max-cost and formats up to five meta pairs", async () => {
    // Arrange
    vi.stubEnv("TREG_TOKEN", "test-token");
    const fetchMock = vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    // Act
    await callTreg({
      endpointId: "people.search",
      maxCostUsd: 0.12,
      meta: {
        account: "acme",
        mode: "shadow",
      },
    });

    // Assert
    const headers = getFetchHeaders(fetchMock);
    expect(headers.get("X-Treg-Route-Max-Cost")).toBe("0.12");
    expect(headers.get("X-Treg-Meta")).toBe("account=acme, mode=shadow");
  });

  it("defaults to POST and JSON-encodes the request body when a body is supplied", async () => {
    // Arrange
    vi.stubEnv("TREG_TOKEN", "test-token");
    const fetchMock = vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const body = { domain: "acme.com", limit: 3 };

    // Act
    await callTreg({ endpointId: "company.lookup", body });

    // Assert
    const init = getFetchInit(fetchMock);
    const headers = getFetchHeaders(fetchMock);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(body));
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("returns upstream JSON data with parsed charge metadata on success", async () => {
    // Arrange
    vi.stubEnv("TREG_TOKEN", "test-token");
    const upstreamData = { results: [{ id: "person_1" }] };
    const fetchMock = vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, upstreamData, {
      "X-Treg-Cost-Micro": "1234",
      "X-Treg-Call-Id": " call_123 ",
    }));
    vi.stubGlobal("fetch", fetchMock);

    // Act
    const result = await callTreg({ endpointId: "people.search" });

    // Assert
    expect(result).toEqual({
      ok: true,
      status: 200,
      data: upstreamData,
      costMicro: 1234,
      callId: "call_123",
    });
  });

  it("returns null cost metadata when the cost header is not a non-negative integer", async () => {
    // Arrange
    vi.stubEnv("TREG_TOKEN", "test-token");
    const fetchMock = vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, { ok: true }, {
      "X-Treg-Cost-Micro": "12.5",
    }));
    vi.stubGlobal("fetch", fetchMock);

    // Act
    const result = await callTreg({ endpointId: "people.search" });

    // Assert
    expect(result.ok).toBe(true);
    expect(result.costMicro).toBeNull();
  });

  it.each([
    ["top-level error", { error: "route_max_cost" }],
    ["detail error", { detail: { error: "route_max_cost" } }],
  ])("maps 402 route_max_cost from %s to treg_max_cost_exceeded", async (_name, responseBody) => {
    // Arrange
    vi.stubEnv("TREG_TOKEN", "test-token");
    const fetchMock = vi.fn<FetchMock>().mockResolvedValue(jsonResponse(402, responseBody));
    vi.stubGlobal("fetch", fetchMock);

    // Act
    const result = await callTreg({ endpointId: "people.search" });

    // Assert
    expect(result).toMatchObject({
      ok: false,
      status: 402,
      reason: "treg_max_cost_exceeded",
    });
  });

  it("maps 402 without route_max_cost to balance exhaustion and logs the call id", async () => {
    // Arrange
    vi.stubEnv("TREG_TOKEN", "test-token");
    const fetchMock = vi.fn<FetchMock>().mockResolvedValue(jsonResponse(402, { error: "payment_required" }, {
      "X-Treg-Call-Id": "call_balance",
    }));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", fetchMock);

    // Act
    const result = await callTreg({ endpointId: "people.search" });

    // Assert
    expect(result).toMatchObject({
      ok: false,
      status: 402,
      reason: "treg_insufficient_balance",
      callId: "call_balance",
    });
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith("[treg] balance exhausted", {
      endpointId: "people.search",
      callId: "call_balance",
    });
  });

  it("maps 503 responses to provider_capacity_unavailable", async () => {
    // Arrange
    vi.stubEnv("TREG_TOKEN", "test-token");
    const fetchMock = vi.fn<FetchMock>().mockResolvedValue(jsonResponse(503, {
      detail: { error: "provider_capacity_unavailable" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    // Act
    const result = await callTreg({ endpointId: "people.search" });

    // Assert
    expect(result).toMatchObject({
      ok: false,
      status: 503,
      reason: "provider_capacity_unavailable",
    });
  });

  it("maps other non-2xx responses to their HTTP status reason", async () => {
    // Arrange
    vi.stubEnv("TREG_TOKEN", "test-token");
    const fetchMock = vi.fn<FetchMock>().mockResolvedValue(jsonResponse(500, { error: "upstream" }));
    vi.stubGlobal("fetch", fetchMock);

    // Act
    const result = await callTreg({ endpointId: "people.search" });

    // Assert
    expect(result).toMatchObject({
      ok: false,
      status: 500,
      reason: "http_500",
    });
  });

  it("maps fetch rejections to network_error", async () => {
    // Arrange
    vi.stubEnv("TREG_TOKEN", "test-token");
    const fetchMock = vi.fn<FetchMock>().mockRejectedValue(new TypeError("failed"));
    vi.stubGlobal("fetch", fetchMock);

    // Act
    const result = await callTreg({ endpointId: "people.search" });

    // Assert
    expect(result).toEqual({
      ok: false,
      status: null,
      reason: "network_error",
      costMicro: null,
      callId: null,
    });
  });

  it("maps AbortError rejections to aborted", async () => {
    // Arrange
    vi.stubEnv("TREG_TOKEN", "test-token");
    const fetchMock = vi.fn<FetchMock>().mockRejectedValue(new DOMException("Aborted", "AbortError"));
    vi.stubGlobal("fetch", fetchMock);

    // Act
    const result = await callTreg({ endpointId: "people.search" });

    // Assert
    expect(result).toEqual({
      ok: false,
      status: null,
      reason: "aborted",
      costMicro: null,
      callId: null,
    });
  });

  it("keeps status and charge metadata when a 2xx JSON response is invalid", async () => {
    // Arrange
    vi.stubEnv("TREG_TOKEN", "test-token");
    const fetchMock = vi.fn<FetchMock>().mockResolvedValue(invalidJsonResponse(200, {
      "X-Treg-Cost-Micro": "1234",
      "X-Treg-Call-Id": "call_bad_json",
    }));
    vi.stubGlobal("fetch", fetchMock);

    // Act
    const result = await callTreg({ endpointId: "people.search" });

    // Assert
    expect(result).toEqual({
      ok: false,
      status: 200,
      reason: "invalid_response",
      costMicro: 1234,
      callId: "call_bad_json",
    });
  });

  it("throws a TypeError when endpointId is not a constant-safe identifier", async () => {
    // Arrange
    vi.stubEnv("TREG_TOKEN", "test-token");

    // Act & Assert
    await expect(callTreg({ endpointId: "../people.search" })).rejects.toThrow(TypeError);
  });

  it("throws a TypeError when meta contains more than five pairs", async () => {
    // Arrange
    vi.stubEnv("TREG_TOKEN", "test-token");

    // Act & Assert
    await expect(callTreg({
      endpointId: "people.search",
      meta: {
        one: "1",
        two: "2",
        three: "3",
        four: "4",
        five: "5",
        six: "6",
      },
    })).rejects.toThrow(TypeError);
  });
});
