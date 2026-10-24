import https from "node:https";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isInternalAddress, postBulkWebhook, webhookUrlError, type DnsLookup } from "./webhook-url";

const publicLookup: DnsLookup = async () => ["1.1.1.1"];

function headerHost(headers: https.RequestOptions["headers"]): string {
  if (!headers || Array.isArray(headers)) return "";
  const value = (headers as { host?: unknown }).host;
  return typeof value === "string" ? value : "";
}

describe("webhook URL guard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects non-https, loopback, metadata, and private DNS answers", async () => {
    expect(await webhookUrlError("http://example.com/hook", publicLookup)).toMatch(/https/);
    expect(await webhookUrlError("https://user:pass@example.com/hook", publicLookup)).toMatch(/credentials/);
    expect(await webhookUrlError("https://127.0.0.1/hook", async () => ["127.0.0.1"])).toMatch(/not public/);
    expect(await webhookUrlError("https://169.254.169.254/latest", async () => ["169.254.169.254"])).toMatch(/not public/);
    expect(await webhookUrlError("https://localhost/hook", publicLookup)).toMatch(/not allowed/);
    expect(await webhookUrlError("https://metadata.google.internal/computeMetadata", publicLookup)).toMatch(/not allowed/);
    expect(await webhookUrlError("https://example.com/hook", async () => ["10.1.2.3"])).toMatch(/not public/);
    expect(await webhookUrlError("https://example.com/hook", async () => ["192.168.1.9"])).toMatch(/not public/);
    expect(await webhookUrlError("https://example.com/hook", async () => ["::1"])).toMatch(/not public/);
    expect(await webhookUrlError("https://example.com/hook", async () => ["0:0:0:0:0:ffff:169.254.169.254"])).toMatch(/not public/);
    expect(await webhookUrlError("https://example.com/hook", async () => ["64:ff9b::10.0.0.1"])).toMatch(/not public/);
    expect(await webhookUrlError("https://example.com/hook", publicLookup)).toBeNull();
  });

  it("classifies internal address ranges", () => {
    expect(isInternalAddress("127.0.0.1")).toBe(true);
    expect(isInternalAddress("169.254.169.254")).toBe(true);
    expect(isInternalAddress("10.0.0.1")).toBe(true);
    expect(isInternalAddress("172.16.0.1")).toBe(true);
    expect(isInternalAddress("192.168.0.1")).toBe(true);
    expect(isInternalAddress("fe80::1")).toBe(true);
    expect(isInternalAddress("fd00::1")).toBe(true);
    expect(isInternalAddress("::ffff:169.254.169.254")).toBe(true);
    expect(isInternalAddress("0:0:0:0:0:ffff:169.254.169.254")).toBe(true);
    expect(isInternalAddress("::ffff:a9fe:a9fe")).toBe(true);
    expect(isInternalAddress("::ffff:7f00:1")).toBe(true);
    expect(isInternalAddress("::10.1.2.3")).toBe(true);
    expect(isInternalAddress("0:0:0:0:0:0:10.1.2.3")).toBe(true);
    expect(isInternalAddress("64:ff9b::169.254.169.254")).toBe(true);
    expect(isInternalAddress("64:ff9b:1::127.0.0.1")).toBe(true);
    expect(isInternalAddress("::ffff:8.8.8.8")).toBe(false);
    expect(isInternalAddress("64:ff9b::1.1.1.1")).toBe(false);
    expect(isInternalAddress("1.1.1.1")).toBe(false);
    expect(isInternalAddress("8.8.8.8")).toBe(false);
  });

  it("pins the validated address and re-checks DNS on every call", async () => {
    const requests: https.RequestOptions[] = [];
    vi.spyOn(https, "request").mockImplementation(((...args: unknown[]) => {
      const options = args[0] as https.RequestOptions;
      const callback = args[1] as (res: { statusCode?: number; resume: () => void; on: (event: string, fn: () => void) => void }) => void;
      requests.push(options);
      const res = {
        statusCode: 204,
        resume() {},
        on(event: string, fn: () => void) {
          if (event === "end") queueMicrotask(fn);
          return res;
        },
      };
      queueMicrotask(() => callback(res));
      return {
        end() {},
        destroy() { return this; },
        on() { return this; },
        setTimeout() { return this; },
      };
    }) as unknown as typeof https.request);

    let lookups = 0;
    const resolve: DnsLookup = async () => {
      lookups += 1;
      return lookups === 1 ? ["1.1.1.1"] : ["10.0.0.1"];
    };

    await postBulkWebhook("https://example.com/hook", { ok: true }, resolve);
    await postBulkWebhook("https://example.com/hook", { ok: true }, resolve);

    expect(lookups).toBe(2);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.host).toBe("1.1.1.1");
    expect(requests[0]?.servername).toBe("example.com");
    expect(headerHost(requests[0]?.headers)).toBe("example.com");
  });

  it("does not call a rejected host and does not follow redirects", async () => {
    const requests: https.RequestOptions[] = [];
    vi.spyOn(https, "request").mockImplementation(((...args: unknown[]) => {
      const options = args[0] as https.RequestOptions;
      const callback = args[1] as (res: { statusCode?: number; resume: () => void; on: (event: string, fn: () => void) => void }) => void;
      requests.push(options);
      const res = {
        statusCode: 302,
        resume() {},
        on(event: string, fn: () => void) {
          if (event === "end") queueMicrotask(fn);
          return res;
        },
      };
      queueMicrotask(() => callback(res));
      return {
        end() {},
        destroy() { return this; },
        on() { return this; },
        setTimeout() { return this; },
      };
    }) as unknown as typeof https.request);

    await postBulkWebhook("https://169.254.169.254/hook", { ok: true }, async () => ["169.254.169.254"]);
    await postBulkWebhook("https://example.com/hook", { ok: true }, async () => ["0:0:0:0:0:ffff:169.254.169.254"]);
    expect(requests).toHaveLength(0);

    await postBulkWebhook("https://example.com/hook", { ok: true }, publicLookup);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.host).toBe("1.1.1.1");
    expect(headerHost(requests[0]?.headers)).not.toMatch(/127\.0\.0\.1/);
  });
});
