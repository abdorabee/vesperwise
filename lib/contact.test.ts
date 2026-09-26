import { describe, expect, it } from "vitest";
import { CONTACT_REASON_IDS, escapeHtml, toHeaderSafe } from "./contact";

describe("escapeHtml", () => {
  it("escapes all five HTML-significant characters", () => {
    expect(escapeHtml(`& < > " '`)).toBe("&amp; &lt; &gt; &quot; &#39;");
  });

  it("neutralizes injected markup and attribute breakouts", () => {
    const payload = `<a href="https://evil.example" style='color:red'>Click</a>`;
    const escaped = escapeHtml(payload);
    expect(escaped).not.toMatch(/[<>"']/);
    expect(escaped).toBe(
      "&lt;a href=&quot;https://evil.example&quot; style=&#39;color:red&#39;&gt;Click&lt;/a&gt;",
    );
  });

  it("escapes ampersands first so existing entities are not double-decoded", () => {
    expect(escapeHtml("&lt;script&gt;")).toBe("&amp;lt;script&amp;gt;");
  });

  it("leaves plain text unchanged", () => {
    expect(escapeHtml("Jane Doe — Acme Inc.")).toBe("Jane Doe — Acme Inc.");
    expect(escapeHtml("")).toBe("");
  });
});

describe("toHeaderSafe", () => {
  it("replaces CR/LF so values cannot inject extra header lines", () => {
    expect(toHeaderSafe("Hi\r\nBcc: x@evil.example")).toBe("Hi Bcc: x@evil.example");
  });
});

describe("CONTACT_REASON_IDS", () => {
  it("lists the reasons offered on the contact page", () => {
    expect(CONTACT_REASON_IDS).toEqual(["demo", "pricing", "trial", "enterprise", "other"]);
  });
});
