import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("auth form themes", () => {
  it("uses semantic surfaces and text colors in login and signup forms", () => {
    const forms = [read("./login-form.tsx"), read("./signup-form.tsx")];

    for (const form of forms) {
      expect(form).not.toMatch(/border-white\/10|bg-white\/\[0\.055\]|text-\[#f7f8f8\]/);
      expect(form).toContain("border-input bg-background text-foreground");
      expect(form).toContain("border-border bg-background text-foreground hover:bg-muted");
    }
  });
});
