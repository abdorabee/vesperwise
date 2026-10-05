"use client";

import type { PipelineCompany } from "@/app/api/dashboard/pipeline/route";
import { AccountListColumn, sortAccountsByScore, type AccountListGroup, type AccountListItem } from "@/components/account-panel/account-list-column";
import { bandOf } from "@/components/pipeline/pipeline-config";

function toItem(company: PipelineCompany): AccountListItem {
  return { domain: company.domain, name: company.company_name, score: company.score, band: bandOf(company) };
}

/** HOT then WARM accounts from the pipeline the page already loaded. Exported for tests. */
export function pipelineAccountGroups(companies: PipelineCompany[]): AccountListGroup[] {
  const items = companies.map(toItem);
  return [
    { label: "Hot", items: sortAccountsByScore(items.filter((item) => item.band === "HOT")) },
    { label: "Warm", items: sortAccountsByScore(items.filter((item) => item.band === "WARM")) },
  ];
}

export function PipelineAccountsColumn({ companies, selectedDomain, onSelect }: { companies: PipelineCompany[]; selectedDomain: string | null; onSelect: (domain: string) => void }) {
  return (
    <AccountListColumn
      label="Intent Hub accounts"
      title="In-market"
      groups={pipelineAccountGroups(companies)}
      selectedDomain={selectedDomain}
      onSelect={onSelect}
      emptyText="No HOT or WARM accounts yet."
    />
  );
}
