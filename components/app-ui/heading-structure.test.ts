import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("dashboard heading structure", () => {
  it("uses semantic page headings across primary workspaces", () => {
    const routes = [
      "../dashboard/home/dashboard-home.tsx",
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
});
