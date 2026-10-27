import { lookup } from "node:dns/promises";
import https from "node:https";
import { isIP } from "node:net";

const MAX_WEBHOOK_BODY_BYTES = 64 * 1024;
export const WEBHOOK_DEADLINE_MS = 5_000;
export const WEBHOOK_CONNECT_TIMEOUT_MS = 2_000;

export class WebhookDeliveryError extends Error {
  readonly permanent: boolean;
  /** True once the server returned an HTTP status. Do not try another address. */
  readonly responded: boolean;

  constructor(message: string, permanent: boolean, responded = false) {
    super(message);
    this.name = "WebhookDeliveryError";
    this.permanent = permanent;
    this.responded = responded;
  }
}

export interface WebhookSendOptions {
  deadlineMs?: number;
  connectTimeoutMs?: number;
}

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
]);

export type DnsLookup = (hostname: string) => Promise<string[]>;

export async function publicDnsLookup(hostname: string): Promise<string[]> {
  if (isIP(hostname)) return [hostname];
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

/** True for loopback, private, link-local, multicast, metadata, and other non-public ranges. */
export function isInternalAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isInternalV4(address);
  if (version === 6) return isInternalV6(address);
  return true;
}

function isInternalV4(address: string): boolean {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0 && parts[2] === 2) return true;
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return true;
  if (a === 203 && b === 0 && parts[2] === 113) return true;
  if (a >= 224) return true;
  return false;
}

function ipv4FromHextets(hi: number, lo: number): string {
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
}

/** Expand an IPv6 address, including dotted IPv4 tails, into eight hextets. */
function parseIpv6Hextets(address: string): number[] | null {
  let input = address.toLowerCase().split("%")[0];
  if (input.startsWith("[") && input.endsWith("]")) input = input.slice(1, -1);
  let ipv4Tail: [number, number] | null = null;
  if (input.includes(".")) {
    const lastColon = input.lastIndexOf(":");
    const parts = input.slice(lastColon + 1).split(".").map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
      return null;
    }
    const packed = ((parts[0] << 8) | parts[1]) * 65536 + ((parts[2] << 8) | parts[3]);
    ipv4Tail = [(packed >>> 16) & 0xffff, packed & 0xffff];
    input = input.slice(0, lastColon + 1);
  }
  const halves = input.split("::");
  if (halves.length > 2) return null;
  const parseSide = (side: string): number[] => {
    if (!side) return [];
    return side.split(":").filter((part) => part.length > 0).map((part) => {
      if (!/^[0-9a-f]{1,4}$/.test(part)) throw new Error("bad hextet");
      return parseInt(part, 16);
    });
  };
  try {
    const left = parseSide(halves[0] ?? "");
    const right = halves.length === 2 ? parseSide(halves[1] ?? "") : [];
    const tail = ipv4Tail ? [...ipv4Tail] : [];
    const pieces = [...left, ...right, ...tail];
    if (halves.length === 1) return pieces.length === 8 ? pieces : null;
    const missing = 8 - pieces.length;
    if (missing < 0) return null;
    return [...left, ...Array(missing).fill(0), ...right, ...tail];
  } catch {
    return null;
  }
}

function embeddedIpv4(hextets: number[]): string | null {
  const zeros = (start: number, end: number) => hextets.slice(start, end).every((part) => part === 0);
  // IPv4-mapped ::ffff:0:0/96, including the uncompressed 0:0:0:0:0:ffff:a.b.c.d form.
  if (zeros(0, 5) && hextets[5] === 0xffff) return ipv4FromHextets(hextets[6], hextets[7]);
  // Deprecated IPv4-compatible ::/96. :: and ::1 are handled as IPv6 themselves.
  if (zeros(0, 6) && !(hextets[6] === 0 && hextets[7] <= 1)) {
    return ipv4FromHextets(hextets[6], hextets[7]);
  }
  // NAT64 well-known prefix 64:ff9b::/96 and local prefix 64:ff9b:1::/48.
  if (hextets[0] === 0x64 && hextets[1] === 0xff9b && zeros(2, 6)) {
    return ipv4FromHextets(hextets[6], hextets[7]);
  }
  if (hextets[0] === 0x64 && hextets[1] === 0xff9b && hextets[2] === 1) {
    return ipv4FromHextets(hextets[6], hextets[7]);
  }
  return null;
}

function isInternalV6(address: string): boolean {
  const hextets = parseIpv6Hextets(address);
  if (!hextets) return true;
  if (hextets.every((part) => part === 0)) return true;
  if (hextets.slice(0, 7).every((part) => part === 0) && hextets[7] === 1) return true;
  const embedded = embeddedIpv4(hextets);
  if (embedded) return isInternalV4(embedded);
  const first = hextets[0];
  if (first >= 0xfc00 && first <= 0xfdff) return true;
  if (first >= 0xfe80 && first <= 0xfebf) return true;
  if (first >= 0xff00) return true;
  return false;
}

function blockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  return false;
}

export interface ResolvedWebhook {
  url: URL;
  addresses: string[];
}

/** Resolve and classify a webhook URL. Callers must connect to `address`, not look the name up again. */
export async function resolvePublicWebhook(
  raw: string,
  resolve: DnsLookup = publicDnsLookup,
): Promise<ResolvedWebhook | { error: string; permanent: boolean }> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { error: "webhook_url is not a valid URL", permanent: true };
  }
  if (url.username || url.password) return { error: "webhook_url must not include credentials", permanent: true };
  if (url.protocol !== "https:") return { error: "webhook_url must use https", permanent: true };
  if (!url.hostname || blockedHostname(url.hostname)) return { error: "webhook_url host is not allowed", permanent: true };
  let addresses: string[];
  try {
    addresses = await resolve(url.hostname);
  } catch (error) {
    if (error instanceof WebhookDeliveryError) throw error;
    return { error: "webhook_url host could not be resolved", permanent: false };
  }
  if (addresses.length === 0 || addresses.some((address) => isInternalAddress(address))) {
    return { error: "webhook_url host is not public", permanent: true };
  }
  return { url, addresses };
}

/** Returns an error string when the URL must not be called. */
export async function webhookUrlError(raw: string, resolve: DnsLookup = publicDnsLookup): Promise<string | null> {
  const resolved = await resolvePublicWebhook(raw, resolve);
  return "error" in resolved ? resolved.error : null;
}

function deadlineError(): WebhookDeliveryError {
  return new WebhookDeliveryError("webhook deadline exceeded", false);
}

/** 2xx is delivered. 5xx, 408, and 429 can be retried. Other 3xx and 4xx are permanent. */
function httpStatusError(status: number): WebhookDeliveryError | null {
  if (status >= 200 && status < 300) return null;
  const retryable = status >= 500 || status === 408 || status === 429;
  return new WebhookDeliveryError(`webhook responded ${status}`, !retryable, true);
}

function lookupWithinDeadline(resolve: DnsLookup, hostname: string, signal: AbortSignal): Promise<string[]> {
  return new Promise((resolveAddresses, rejectAddresses) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      fn();
    };
    const onAbort = () => finish(() => rejectAddresses(deadlineError()));
    if (signal.aborted) {
      rejectAddresses(deadlineError());
      return;
    }
    signal.addEventListener("abort", onAbort);
    Promise.resolve()
      .then(() => resolve(hostname))
      .then(
        (addresses) => finish(() => resolveAddresses(addresses)),
        (error: unknown) => finish(() => {
          rejectAddresses(error instanceof Error ? error : new Error(String(error)));
        }),
      );
  });
}

function pinnedPost(
  url: URL,
  address: string,
  body: string,
  signal: AbortSignal,
  connectTimeoutMs: number,
  deadlineMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const port = url.port ? Number(url.port) : 443;
    const hostHeader = url.port ? `${url.hostname}:${url.port}` : url.hostname;
    const family = isIP(address);

    const detach = () => {
      clearTimeout(connectTimer);
      signal.removeEventListener("abort", onAbort);
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      detach();
      req.destroy();
      reject(error);
    };
    const succeed = () => {
      if (settled) return;
      settled = true;
      detach();
      resolve();
    };
    const onAbort = () => fail(deadlineError());
    const connectTimer = setTimeout(() => {
      fail(new WebhookDeliveryError("webhook connect timeout", false));
    }, connectTimeoutMs);
    connectTimer.unref?.();

    const req = https.request({
      host: address,
      port,
      family: family === 4 || family === 6 ? family : undefined,
      servername: url.hostname,
      method: "POST",
      path: `${url.pathname}${url.search}`,
      headers: {
        host: hostHeader,
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body),
      },
      timeout: deadlineMs,
      signal,
      lookup: (_hostname, options, callback) => {
        const done = typeof options === "function" ? options : callback;
        if (!done) return;
        done(null, address, family || 4);
      },
    }, (res) => {
      clearTimeout(connectTimer);
      const status = res.statusCode ?? 0;
      const failure = httpStatusError(status);
      const settle = () => {
        if (failure) fail(failure);
        else succeed();
      };
      // A redirect is a completed response. Do not follow it.
      if (status >= 300 && status < 400) {
        settle();
        res.destroy();
        return;
      }
      let received = 0;
      res.on("data", (chunk: Buffer | string) => {
        if (settled) return;
        received += typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.length;
        if (received > MAX_WEBHOOK_BODY_BYTES) {
          settle();
          res.destroy();
          req.destroy();
        }
      });
      res.on("end", () => settle());
      res.on("error", () => settle());
    });

    if (signal.aborted) {
      fail(deadlineError());
      return;
    }
    signal.addEventListener("abort", onAbort);

    req.on("socket", (socket) => {
      socket.on("secureConnect", () => clearTimeout(connectTimer));
      socket.on("connect", () => clearTimeout(connectTimer));
    });
    req.on("timeout", () => fail(new WebhookDeliveryError("webhook socket timeout", false)));
    req.on("error", (error) => {
      if (settled) return;
      if (signal.aborted) {
        fail(deadlineError());
        return;
      }
      fail(error instanceof WebhookDeliveryError ? error : new WebhookDeliveryError(error.message, false));
    });
    req.end(body);
  });
}

export async function postBulkWebhook(
  url: string,
  payload: unknown,
  resolve: DnsLookup = publicDnsLookup,
  options: WebhookSendOptions = {},
): Promise<void> {
  const deadlineMs = options.deadlineMs ?? WEBHOOK_DEADLINE_MS;
  const connectTimeoutMs = options.connectTimeoutMs ?? WEBHOOK_CONNECT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deadlineMs);
  timer.unref?.();
  try {
    const resolved = await resolvePublicWebhook(url, (hostname) =>
      lookupWithinDeadline(resolve, hostname, controller.signal),
    );
    if ("error" in resolved) {
      throw new WebhookDeliveryError(resolved.error, resolved.permanent);
    }
    const body = JSON.stringify(payload);
    let lastError: Error | undefined;
    for (const address of resolved.addresses) {
      if (controller.signal.aborted) break;
      try {
        await pinnedPost(resolved.url, address, body, controller.signal, connectTimeoutMs, deadlineMs);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (controller.signal.aborted || (error instanceof WebhookDeliveryError && error.responded)) break;
      }
    }
    throw lastError ?? deadlineError();
  } finally {
    clearTimeout(timer);
  }
}
