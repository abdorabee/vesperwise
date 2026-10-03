import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ListCardSummary } from "@/lib/lists-types";
import { ListsColumnContent } from "./lists-shell-list";

function summary(id: string, name: string, accountCount: number): ListCardSummary {
  return {
    id,
    name,
    description: null,
    list_type: "manual",
    color: "var(--iq-accent)",
    icon_initials: name.slice(0, 2).toUpperCase(),
    accountCount,
    weeklyDelta: 0,
    avgScore: 0,
    bandMix: { hot: 0, warm: 0, cold: 0 },
    sparkline: [],
    avatarInitials: [],
    avatarClasses: [],
    lastUpdated: "2026-10-03T12:00:00.000Z",
    lastUpdatedLabel: "today",
    isRecentlyActive: false,
  };
}

describe("ListsColumnContent", () => {
  it("renders list links with row counts and active highlight", () => {
    const html = renderToStaticMarkup(
      <ListsColumnContent
        activeId="target"
        summaries={[summary("first", "Seed accounts", 1), summary("target", "Priority accounts", 12)]}
      />,
    );

    expect(html).toContain('href="/lists/target"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('data-active="true"');
    expect(html).toContain("Seed accounts");
    expect(html).toContain("1 row");
    expect(html).toContain("12 rows");
  });
});
