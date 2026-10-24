import { afterEach, describe, expect, it, vi } from "vitest";
import { isInternalAddress, postBulkWebhook, webhookUrlError, type DnsLookup } from "./webhook-url";

const publicLookup: DnsLookup = async () => ["1.1.1.1"];

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
    expect(isInternalAddress("1.1.1.1")).toBe(false);
    expect(isInternalAddress("8.8.8.8")).toBe(false);
  });

  it("does not call a rejected host and does not follow redirects", async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
    fetchMock.mockImplementation(async () => new Response(null, {
      status: 302,
      headers: { location: "http://127.0.0.1/" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await postBulkWebhook("https://169.254.169.254/hook", { ok: true }, async () => ["169.254.169.254"]);
    expect(fetchMock).not.toHaveBeenCalled();

    await postBulkWebhook("https://example.com/hook", { ok: true }, publicLookup);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ redirect: "manual" });
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(["https://example.com/hook"]);
  });
});
