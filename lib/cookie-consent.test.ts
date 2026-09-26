import { afterEach, describe, expect, it, vi } from "vitest";

function stubWindow(storage: Partial<Storage>) {
  vi.stubGlobal("window", {
    localStorage: storage,
    location: { hostname: "www.vesperwise.com" },
    dispatchEvent: vi.fn(),
  });
  vi.stubGlobal("document", { cookie: "" });
}

describe("cookie consent", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("persists and reads the choice from localStorage", async () => {
    const store = new Map<string, string>();
    stubWindow({ getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v) });
    const { readCookieConsent, writeCookieConsent } = await import("./cookie-consent");
    expect(readCookieConsent()).toBeNull();
    writeCookieConsent("granted");
    expect(readCookieConsent()).toBe("granted");
    expect(store.get("vw-cookie-consent")).toBe("granted");
  });

  it("keeps the choice for the page view when storage is blocked", async () => {
    const blocked = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    stubWindow({ getItem: blocked, setItem: blocked });
    const { readCookieConsent, writeCookieConsent } = await import("./cookie-consent");
    expect(readCookieConsent()).toBeNull();
    writeCookieConsent("denied");
    expect(readCookieConsent()).toBe("denied");
  });
});
