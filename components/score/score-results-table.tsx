"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/spectrumui/data-table";
import type { ScoreRecordData } from "@/lib/score-record";

type Filter = "all" | "HOT" | "WARM" | "COLD" | "person" | "domain";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "HOT", label: "HOT" },
  { id: "WARM", label: "WARM" },
  { id: "COLD", label: "COLD" },
  { id: "person", label: "People" },
  { id: "domain", label: "Domains" },
];

export function ScoreResultsTable({
  rows,
  loading = false,
  onOpen,
}: {
  rows: ScoreRecordData[];
  loading?: boolean;
  onOpen?: (row: ScoreRecordData) => void;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const counts = useMemo(() => {
    const next: Record<Filter, number> = { all: rows.length, HOT: 0, WARM: 0, COLD: 0, person: 0, domain: 0 };
    for (const row of rows) {
      next[row.band] += 1;
      next[row.kind] += 1;
    }
    return next;
  }, [rows]);
  const visible = rows.filter((row) => filter === "all" || row.band === filter || row.kind === filter);

  return (
    <div className="score-table-wrap">
      <div className="score-table-pills" role="tablist" aria-label="Filter scores">
        {FILTERS.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} className={filter === item.id ? "is-on" : ""} onClick={() => setFilter(item.id)}>
            {item.label} <span>{counts[item.id]}</span>
          </button>
        ))}
      </div>
      <DataTable
        data={visible}
        rowId={(row) => row.id}
        variant="minimal"
        density="compact"
        stickyHeader
        searchable
        keyboardNavigation
        animate
        loading={loading}
        defaultSort={{ columnId: "score", direction: "desc" }}
        searchPlaceholder="Search scores"
        emptyState={<p>Score your first domain.</p>}
        maxHeight="60vh"
        onRowClick={(row) => (onOpen ? onOpen(row) : router.push(row.kind === "person" ? "/people" : `/watchlist?q=${encodeURIComponent(row.domain ?? row.target)}`))}
        columns={[
          { id: "kind", header: "Type", value: (row) => (row.kind === "person" ? "Person" : "Domain") },
          { id: "target", header: "Target", value: (row) => row.target },
          { id: "company", header: "Company", value: (row) => row.company, hideBelow: "md" },
          { id: "score", header: "Score", numeric: true, sortable: true, value: (row) => row.score },
          {
            id: "band",
            header: "Band",
            value: (row) => row.band,
            cell: (row) => <span className={`score-record-band band-${row.band.toLowerCase()}`}>{row.band}</span>,
          },
          { id: "why", header: "Why now", value: (row) => row.whyNow, cell: (row) => <span className="score-why-clip">{row.whyNow}</span>, hideBelow: "lg" },
          { id: "owner", header: "Owner", value: (row) => row.owner, hideBelow: "lg" },
          { id: "updated", header: "Updated", value: (row) => row.updatedAt, cell: (row) => new Date(row.updatedAt).toLocaleDateString(), hideBelow: "sm" },
        ]}
      />
    </div>
  );
}
