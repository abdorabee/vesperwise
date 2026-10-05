import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PipelineCompany } from "@/app/api/dashboard/pipeline/route";
import { pipelineAccountGroups } from "@/components/pipeline/pipeline-accounts-column";
import { watchlistAccountGroups } from "@/components/watchlist/watchlist-accounts-column";
import { AccountListContent, sortAccountsByScore } from "./account-list-column";

describe("sortAccountsByScore", () => {
  it("orders by score, unscored last, ties by name", () => {
    const sorted = sortAccountsByScore([
      { domain: "b.com", name: "Beta", score: 40, band: "COLD" },
      { domain: "n.com", name: "None", score: null, band: null },
      { domain: "a.com", name: "Alpha", score: 40, band: "COLD" },
      { domain: "h.com", name: "Hot", score: 88, band: "HOT" },
    ]);
    expect(sorted.map((item) => item.domain)).toEqual(["h.com", "a.com", "b.com", "n.com"]);
  });
});

describe("AccountListContent", () => {
  const groups = [{ label: "Hot", items: [{ domain: "stripe.com", name: "Stripe", score: 81, band: "HOT" as const }] }, { label: "Warm", items: [] }];

  it("marks the open account and hides empty groups", () => {
    const html = renderToStaticMarkup(<AccountListContent groups={groups} selectedDomain="stripe.com" onSelect={() => {}} emptyText="Nothing" />);
    expect(html).toContain('aria-current="true"');
    expect(html).toContain("Hot");
    expect(html).not.toContain("Warm");
    expect(html).toContain("HOT");
  });

  it("shows the empty text when no group has accounts", () => {
    const html = renderToStaticMarkup(<AccountListContent groups={[{ items: [] }]} selectedDomain={null} onSelect={() => {}} emptyText="No accounts yet." />);
    expect(html).toContain("No accounts yet.");
  });
});

describe("pipelineAccountGroups", () => {
  it("lists HOT then WARM accounts and leaves COLD out", () => {
    const company = (domain: string, score: number) => ({ domain, company_name: domain, score, score_band: null }) as unknown as PipelineCompany;
    const groups = pipelineAccountGroups([company("cold.com", 20), company("warm.com", 60), company("hot.com", 90)]);
    expect(groups.map((group) => group.items.map((item) => item.domain))).toEqual([["hot.com"], ["warm.com"]]);
  });
});

describe("watchlistAccountGroups", () => {
  it("returns watchlist accounts highest score first", () => {
    const groups = watchlistAccountGroups([
      { domain: "a.com", company_name: "A", score: 30, score_band: "COLD" },
      { domain: "b.com", company_name: "B", score: 70, score_band: "WARM" },
    ]);
    expect(groups[0].items.map((item) => item.domain)).toEqual(["b.com", "a.com"]);
  });
});
