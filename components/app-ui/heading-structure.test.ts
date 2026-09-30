import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("dashboard heading structure", () => {
  it("uses semantic page headings across primary workspaces", () => {
    const routes = [
      "../../app/(dashboard)/history/history-view.tsx",
      "../../app/(dashboard)/people/people-view.tsx",
      "../watchlist/watchlist-page-head.tsx",
      "../settings/profile-form.tsx",
      "../settings/account-form.tsx",
    ];

    for (const path of routes) {
      expect(read(path), path).toMatch(/<h1[^>]*className="page-title"/);
    }
  });

  it("renders the dashboard home title through the shared PageHeader h1", () => {
    expect(read("./page-primitives.tsx")).toMatch(/<h1[^>]*>\s*\{title\}/);
    expect(read("../dashboard/home/dashboard-home.tsx")).toMatch(/<PageHeader\s+title="Home"/);
  });
});
