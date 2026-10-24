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
    vi.restoreAllMocks();
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
    await expect(postBulkWebhook("https://example.com/hook", { ok: true }, resolve)).rejects.toThrow(/not public/);

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
        destroy() {},
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

    await expect(postBulkWebhook("https://169.254.169.254/hook", { ok: true }, async () => ["169.254.169.254"])).rejects.toThrow(/not public/);
    await expect(postBulkWebhook("https://example.com/hook", { ok: true }, async () => ["0:0:0:0:0:ffff:169.254.169.254"])).rejects.toThrow(/not public/);
    expect(requests).toHaveLength(0);

    await postBulkWebhook("https://example.com/hook", { ok: true }, publicLookup);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.host).toBe("1.1.1.1");
    expect(headerHost(requests[0]?.headers)).not.toMatch(/127\.0\.0\.1/);
  });

  function fastTiming(overrides: { deadlineMs?: number; connectTimeoutMs?: number } = {}) {
    return { deadlineMs: 2_000, connectTimeoutMs: 2_000, ...overrides };
  }

  it("rejects when DNS never resolves", async () => {
    const requests: https.RequestOptions[] = [];
    vi.spyOn(https, "request").mockImplementation(((options: https.RequestOptions) => {
      requests.push(options);
      return { end() {}, destroy() { return this; }, on() { return this; }, setTimeout() { return this; } };
    }) as unknown as typeof https.request);

    const started = Date.now();
    await expect(postBulkWebhook(
      "https://example.com/hook",
      { ok: true },
      () => new Promise(() => {}),
      fastTiming({ deadlineMs: 40 }),
    )).rejects.toThrow(/deadline/);
    expect(Date.now() - started).toBeLessThan(400);
    expect(requests).toHaveLength(0);
  });

  it("rejects when the connection never completes", async () => {
    let destroyed = false;
    vi.spyOn(https, "request").mockImplementation((() => ({
      end() {},
      destroy() { destroyed = true; return this; },
      on() { return this; },
      setTimeout() { return this; },
    })) as unknown as typeof https.request);

    const started = Date.now();
    await expect(postBulkWebhook(
      "https://example.com/hook",
      { ok: true },
      publicLookup,
      fastTiming({ connectTimeoutMs: 40 }),
    )).rejects.toThrow(/connect timeout/);
    expect(Date.now() - started).toBeLessThan(500);
    expect(destroyed).toBe(true);
  });

  it("rejects when the server accepts the connection and never responds", async () => {
    let destroyed = false;
    vi.spyOn(https, "request").mockImplementation(((...args: unknown[]) => {
      const callback = args[1] as (res: { statusCode?: number; resume: () => void; destroy: () => void; on: () => unknown }) => void;
      queueMicrotask(() => callback({
        statusCode: 200,
        resume() {},
        destroy() {},
        on() { return this; },
      }));
      return {
        end() {},
        destroy() { destroyed = true; return this; },
        on() { return this; },
        setTimeout() { return this; },
      };
    }) as unknown as typeof https.request);

    const started = Date.now();
    await expect(postBulkWebhook(
      "https://example.com/hook",
      { ok: true },
      publicLookup,
      fastTiming({ deadlineMs: 50 }),
    )).rejects.toThrow(/deadline/);
    expect(Date.now() - started).toBeLessThan(400);
    expect(destroyed).toBe(true);
  });

  it("rejects a slow-drip body at the overall deadline", async () => {
    let destroyed = false;
    const intervals: ReturnType<typeof setInterval>[] = [];
    vi.spyOn(https, "request").mockImplementation(((...args: unknown[]) => {
      const callback = args[1] as (res: {
        statusCode?: number;
        resume: () => void;
        destroy: () => void;
        on: (event: string, fn: (chunk: Buffer) => void) => unknown;
      }) => void;
      const res = {
        statusCode: 200,
        resume() {},
        destroy() {},
        on(event: string, fn: (chunk: Buffer) => void) {
          if (event === "data") intervals.push(setInterval(() => fn(Buffer.from("x")), 10));
          return res;
        },
      };
      queueMicrotask(() => callback(res));
      return {
        end() {},
        destroy() {
          destroyed = true;
          for (const interval of intervals) clearInterval(interval);
          return this;
        },
        on() { return this; },
        setTimeout() { return this; },
      };
    }) as unknown as typeof https.request);

    const started = Date.now();
    await expect(postBulkWebhook(
      "https://example.com/hook",
      { ok: true },
      publicLookup,
      fastTiming({ deadlineMs: 60 }),
    )).rejects.toThrow(/deadline/);
    expect(Date.now() - started).toBeLessThan(400);
    expect(destroyed).toBe(true);
    for (const interval of intervals) clearInterval(interval);
  });

  it("stops reading and destroys the request once the body exceeds 64KB", async () => {
    let destroyed = false;
    vi.spyOn(https, "request").mockImplementation(((...args: unknown[]) => {
      const callback = args[1] as (res: {
        statusCode?: number;
        resume: () => void;
        destroy: () => void;
        on: (event: string, fn: (chunk: Buffer) => void) => unknown;
      }) => void;
      const res = {
        statusCode: 200,
        resume() {},
        destroy() {},
        on(event: string, fn: (chunk: Buffer) => void) {
          if (event === "data") {
            queueMicrotask(() => {
              fn(Buffer.alloc(64 * 1024 + 1));
              fn(Buffer.from("more"));
            });
          }
          return res;
        },
      };
      queueMicrotask(() => callback(res));
      return {
        end() {},
        destroy() { destroyed = true; return this; },
        on() { return this; },
        setTimeout() { return this; },
      };
    }) as unknown as typeof https.request);

    const started = Date.now();
    await postBulkWebhook("https://example.com/hook", { ok: true }, publicLookup, fastTiming());
    expect(destroyed).toBe(true);
    expect(Date.now() - started).toBeLessThan(400);
  });

  it("tries the next public address from the same lookup", async () => {
    const requests: https.RequestOptions[] = [];
    let calls = 0;
    vi.spyOn(https, "request").mockImplementation(((...args: unknown[]) => {
      const options = args[0] as https.RequestOptions;
      const callback = args[1] as (res: { statusCode?: number; resume: () => void; destroy: () => void; on: (event: string, fn: () => void) => unknown }) => void;
      requests.push(options);
      calls += 1;
      if (calls === 1) {
        return {
          end() {},
          destroy() { return this; },
          on(event: string, fn: (error: Error) => void) {
            if (event === "error") queueMicrotask(() => fn(new Error("connect ECONNREFUSED")));
            return this;
          },
          setTimeout() { return this; },
        };
      }
      const res = {
        statusCode: 204,
        resume() {},
        destroy() {},
        on(event: string, fn: () => void) {
          if (event === "end") queueMicrotask(fn);
          return res;
        },
      };
      queueMicrotask(() => callback(res));
      return { end() {}, destroy() { return this; }, on() { return this; }, setTimeout() { return this; } };
    }) as unknown as typeof https.request);

    let lookups = 0;
    await postBulkWebhook("https://example.com/hook", { ok: true }, async () => {
      lookups += 1;
      return ["1.1.1.1", "8.8.8.8"];
    });

    expect(lookups).toBe(1);
    expect(requests.map((request) => request.host)).toEqual(["1.1.1.1", "8.8.8.8"]);
    expect(requests.every((request) => request.servername === "example.com")).toBe(true);
    expect(requests.every((request) => headerHost(request.headers) === "example.com")).toBe(true);
  });

  it("does not dial when any resolved address is private", async () => {
    const requests: https.RequestOptions[] = [];
    vi.spyOn(https, "request").mockImplementation(((options: https.RequestOptions) => {
      requests.push(options);
      return { end() {}, destroy() { return this; }, on() { return this; }, setTimeout() { return this; } };
    }) as unknown as typeof https.request);

    await expect(postBulkWebhook(
      "https://example.com/hook",
      { ok: true },
      async () => ["1.1.1.1", "10.0.0.1"],
    )).rejects.toThrow(/not public/);
    expect(requests).toHaveLength(0);
  });
});
