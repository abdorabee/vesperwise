import { describe, expect, it } from "vitest";
import { escapeHtml } from "./html-escape";

describe("escapeHtml", () => {
  it("escapes markup and quotes", () => {
    expect(escapeHtml(`<a href="https://evil.test" onclick='x()'>Tom & Jerry</a>`)).toBe(
      "&lt;a href=&quot;https://evil.test&quot; onclick=&#39;x()&#39;&gt;Tom &amp; Jerry&lt;/a&gt;"
    );
  });

  it("leaves plain text unchanged", () => {
    expect(escapeHtml("Jane Doe · Acme Corp")).toBe("Jane Doe · Acme Corp");
  });
});
