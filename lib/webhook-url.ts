import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_WEBHOOK_BODY_BYTES = 64 * 1024;
const WEBHOOK_TIMEOUT_MS = 3_000;

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

function isInternalV6(address: string): boolean {
  const lower = address.toLowerCase().split("%")[0];
  if (lower === "::" || lower === "::1") return true;
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isInternalV4(mapped[1]);
  const first = parseInt(lower.split(":")[0] || "0", 16);
  if (!Number.isFinite(first)) return true;
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

/** Returns an error string when the URL must not be called. */
export async function webhookUrlError(raw: string, resolve: DnsLookup = publicDnsLookup): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "webhook_url is not a valid URL";
  }
  if (url.username || url.password) return "webhook_url must not include credentials";
  if (url.protocol !== "https:") return "webhook_url must use https";
  if (!url.hostname || blockedHostname(url.hostname)) return "webhook_url host is not allowed";
  let addresses: string[];
  try {
    addresses = await resolve(url.hostname);
  } catch {
    return "webhook_url host could not be resolved";
  }
  if (addresses.length === 0 || addresses.some((address) => isInternalAddress(address))) {
    return "webhook_url host is not public";
  }
  return null;
}

export async function postBulkWebhook(
  url: string,
  payload: unknown,
  resolve: DnsLookup = publicDnsLookup,
): Promise<void> {
  const reason = await webhookUrlError(url, resolve);
  if (reason) {
    console.warn(`[bulk] webhook skipped: ${reason}`);
    return;
  }
  const response = await fetch(url, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
  });
  if (!response.body) return;
  const reader = response.body.getReader();
  let received = 0;
  try {
    while (received <= MAX_WEBHOOK_BODY_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value?.byteLength ?? 0;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
