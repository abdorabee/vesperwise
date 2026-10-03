export const TREG_BASE_URL = "https://treg.to";
export const TREG_DEFAULT_MAX_COST_USD = 0.05;

export type TregFailureReason =
  | "missing_api_key"
  | "treg_insufficient_balance"
  | "treg_max_cost_exceeded"
  | "provider_capacity_unavailable"
  | "aborted"
  | "invalid_response"
  | `http_${number}`
  | "network_error";

export interface TregCallOptions {
  endpointId: string;
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  maxCostUsd?: number;
  meta?: Record<string, string>;
  signal?: AbortSignal;
}

export type TregCallResult =
  | { ok: true; status: number; data: unknown; costMicro: number | null; callId: string | null }
  | { ok: false; status: number | null; reason: TregFailureReason; costMicro: number | null; callId: string | null };

const ENDPOINT_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateEndpointId(endpointId: string): void {
  if (!ENDPOINT_ID_PATTERN.test(endpointId)) {
    throw new TypeError("Invalid Treg endpointId");
  }
}

function buildUrl(endpointId: string, query: TregCallOptions["query"]): string {
  const url = new URL(`/call/${endpointId}`, TREG_BASE_URL);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    }
  }

  return url.toString();
}

function formatMetaHeader(meta: Record<string, string> | undefined): string | null {
  if (!meta) {
    return null;
  }

  const entries = Object.entries(meta);
  if (entries.length === 0) {
    return null;
  }

  if (entries.length > 5) {
    throw new TypeError("Treg meta supports at most five key-value pairs");
  }

  for (const [key, value] of entries) {
    if (key.includes(",") || key.includes("=") || value.includes(",") || value.includes("=")) {
      throw new TypeError("Treg meta keys and values cannot contain comma or equals characters");
    }
  }

  return entries.map(([key, value]) => `${key}=${value}`).join(", ");
}

function parseCostMicro(headers: Headers): number | null {
  const rawCost = headers.get("X-Treg-Cost-Micro")?.trim();
  if (!rawCost || !/^\d+$/.test(rawCost)) {
    return null;
  }

  const cost = Number(rawCost);
  return Number.isFinite(cost) && Number.isInteger(cost) && cost >= 0 ? cost : null;
}

function parseCallId(headers: Headers): string | null {
  const callId = headers.get("X-Treg-Call-Id")?.trim() ?? "";
  return callId.length > 0 ? callId : null;
}

function readTregErrorCode(data: unknown): string | null {
  if (!isRecord(data)) {
    return null;
  }

  if (typeof data.error === "string") {
    return data.error;
  }

  const { detail } = data;
  if (isRecord(detail) && typeof detail.error === "string") {
    return detail.error;
  }

  return null;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isAbortFailure(error: unknown, signal: AbortSignal | undefined): boolean {
  if (signal?.aborted) {
    return true;
  }

  return isRecord(error) && error.name === "AbortError";
}

export async function callTreg(options: TregCallOptions): Promise<TregCallResult> {
  const token = process.env.TREG_TOKEN?.trim();
  if (!token) {
    return {
      ok: false,
      status: null,
      reason: "missing_api_key",
      costMicro: null,
      callId: null,
    };
  }

  validateEndpointId(options.endpointId);

  const metaHeader = formatMetaHeader(options.meta);
  const headers = new Headers({
    "X-Treg-Token": token,
    "X-Treg-Route-Max-Cost": String(options.maxCostUsd ?? TREG_DEFAULT_MAX_COST_USD),
  });

  if (metaHeader) {
    headers.set("X-Treg-Meta", metaHeader);
  }

  const method = options.method ?? (options.body === undefined ? "GET" : "POST");
  const requestInit: RequestInit = {
    method,
    headers,
    signal: options.signal,
    cache: "no-store",
  };

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    requestInit.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(buildUrl(options.endpointId, options.query), requestInit);
    const costMicro = parseCostMicro(response.headers);
    const callId = parseCallId(response.headers);

    if (response.status >= 200 && response.status < 300) {
      try {
        return {
          ok: true,
          status: response.status,
          data: await response.json(),
          costMicro,
          callId,
        };
      } catch {
        return {
          ok: false,
          status: response.status,
          reason: "invalid_response",
          costMicro,
          callId,
        };
      }
    }

    if (response.status === 402) {
      const responseBody = await parseJsonSafely(response);
      if (readTregErrorCode(responseBody) === "route_max_cost") {
        return {
          ok: false,
          status: response.status,
          reason: "treg_max_cost_exceeded",
          costMicro,
          callId,
        };
      }

      console.error("[treg] balance exhausted", { endpointId: options.endpointId, callId });
      return {
        ok: false,
        status: response.status,
        reason: "treg_insufficient_balance",
        costMicro,
        callId,
      };
    }

    if (response.status === 503) {
      return {
        ok: false,
        status: response.status,
        reason: "provider_capacity_unavailable",
        costMicro,
        callId,
      };
    }

    return {
      ok: false,
      status: response.status,
      reason: `http_${response.status}`,
      costMicro,
      callId,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      reason: isAbortFailure(error, options.signal) ? "aborted" : "network_error",
      costMicro: null,
      callId: null,
    };
  }
}
