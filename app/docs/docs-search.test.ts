import { describe, expect, it } from "vitest";
import { filterNavGroups, type NavGroup } from "./docs-search";

const GROUPS: NavGroup[] = [
  { heading: "Scoring", items: [
    { id: "score-account", method: "POST", label: "Score a company" },
    { id: "score-history", method: "GET", label: "Score history" },
  ] },
  { heading: "Watchlist", items: [
    { id: "watchlist-list", method: "GET", label: "List accounts" },
    { id: "watchlist-add", method: "POST", label: "Add an account" },
    { id: "watchlist-remove", method: "DELETE", label: "Remove an account" },
  ] },
];

describe("filterNavGroups", () => {
  it("keeps a whole group when its heading matches", () => {
    const result = filterNavGroups(GROUPS, "watchlist");

    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(3);
  });

  it("matches labels, methods and ids case-insensitively", () => {
    expect(filterNavGroups(GROUPS, "HISTORY")[0].items.map((i) => i.id)).toEqual(["score-history"]);
    expect(filterNavGroups(GROUPS, "delete")[0].items.map((i) => i.id)).toEqual(["watchlist-remove"]);
  });

  it("returns every group for a blank query and none for no match", () => {
    expect(filterNavGroups(GROUPS, "  ")).toHaveLength(2);
    expect(filterNavGroups(GROUPS, "zzzqqq")).toEqual([]);
  });
});
