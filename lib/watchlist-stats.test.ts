import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ createSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/lists-data", () => ({ fetchLists: vi.fn(), fetchListMembers: vi.fn() }));

import type { DbList } from "@/lib/lists-types";
import type { SignalSet } from "@/lib/types";
import { buildSmartListTab, formatRelativeTime, smartListDomains } from "./watchlist-stats";

function entry(domain: string, score: number | null, band: "HOT" | "WARM" | "COLD" | null, signals: SignalSet | null = null) {
  return { domain, company_name: domain, score, score_band: band, signals };
}

const ENTRIES = [
  entry("Hot.com", 88, "HOT"),
  entry("warm.com", 60, "WARM"),
  entry("cold.com", 20, "COLD"),
  entry("unscored.com", null, null),
];

function smartList(rules: DbList["rules"]): DbList {
  return {
    id: "smart-1",
    user_id: "u1",
    name: "Hot only",
    description: null,
    list_type: "smart",
    color: "#DFFF00",
    icon_initials: null,
    rules,
    auto_refresh: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("smart list membership on the watchlist", () => {
  it("matches a band rule and lowercases domains", () => {
    expect(smartListDomains([{ field: "score_band", op: "is", value: "HOT" }], ENTRIES)).toEqual(["hot.com"]);
  });

  it("matches score thresholds and skips unscored rows", () => {
    expect(smartListDomains([{ field: "score", op: ">=", value: 50 }], ENTRIES)).toEqual(["hot.com", "warm.com"]);
  });

  it("requires every rule to pass", () => {
    const rules = [
      { field: "score", op: ">=", value: 50 },
      { field: "score_band", op: "is", value: "WARM" },
    ] as const;
    expect(smartListDomains([...rules], ENTRIES)).toEqual(["warm.com"]);
  });

  it("treats every watchlist row as in the watchlist", () => {
    expect(smartListDomains([{ field: "in_watchlist", op: "is", value: true }], ENTRIES)).toHaveLength(4);
    expect(smartListDomains([{ field: "in_watchlist", op: "is", value: false }], ENTRIES)).toEqual([]);
  });

  it("builds a non-empty smart tab with a matching count", () => {
    const tab = buildSmartListTab(smartList([{ field: "score_band", op: "is", value: "HOT" }]), ENTRIES);
    expect(tab).toMatchObject({ id: "smart-1", isSmart: true, count: 1, domains: ["hot.com"] });
  });

  it("returns every row for a rule-less smart list", () => {
    expect(buildSmartListTab(smartList(null), ENTRIES).count).toBe(4);
  });
});

describe("watchlist relative time", () => {
  it("uses the shared compact style", () => {
    expect(formatRelativeTime(null)).toBe("—");
    expect(formatRelativeTime(new Date(Date.now() - 3 * 60 * 60 * 1000))).toBe("3h ago");
  });
});
