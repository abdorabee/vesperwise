"use client";

import { useState, useEffect, useCallback } from "react";
import WorkflowListPane from "@/components/autopilot/workflow-list-pane";
import WorkflowDetailPane from "@/components/autopilot/workflow-detail-pane";
import type { DbAutopilotWorkflow, DbAutopilotRun } from "@/lib/types";
import { createWorkflow } from "@/lib/autopilot-display";
import type { WorkflowFilter } from "@/lib/autopilot-display";

interface AutopilotViewProps {
  workflowLimit: number | null;
}

export function AutopilotView({ workflowLimit }: AutopilotViewProps) {
  const [workflows, setWorkflows] = useState<DbAutopilotWorkflow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [runsByWorkflow, setRunsByWorkflow] = useState<Record<string, DbAutopilotRun[]>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<WorkflowFilter>("all");
  const [loading, setLoading] = useState(true);

  const fetchWorkflows = useCallback(async () => {
    const res = await fetch("/api/autopilot/workflows");
    if (res.ok) {
      const data = await res.json();
      const list: DbAutopilotWorkflow[] = data.workflows ?? [];
      setWorkflows(list);
      setSelectedId(prev => prev ?? list[0]?.id ?? null);

      const byWf: Record<string, DbAutopilotRun[]> = {};
      await Promise.all(
        list.map(async wf => {
          const rRes = await fetch(`/api/autopilot/runs?workflow_id=${wf.id}`);
          if (rRes.ok) {
            const rData = await rRes.json();
            byWf[wf.id] = rData.runs ?? [];
          }
        })
      );
      setRunsByWorkflow(byWf);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchWorkflows(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchWorkflows]);

  useEffect(() => {
    const handler = () => {
      createWorkflow({
        name: `workflow_${Date.now().toString(36).slice(-6)}`,
        conditions: [{ type: "score_above", params: { threshold: 75 } }],
        condition_logic: "any",
        actions: [{ type: "notification", params: {} }],
      }).then(wf => {
        setWorkflows(prev => [wf, ...prev]);
        setSelectedId(wf.id);
        setRunsByWorkflow(prev => ({ ...prev, [wf.id]: [] }));
      }).catch(() => {});
    };
    window.addEventListener("autopilot:new-workflow", handler);
    return () => window.removeEventListener("autopilot:new-workflow", handler);
  }, []);

  const selected = workflows.find(w => w.id === selectedId) ?? null;
  const runs = selectedId ? runsByWorkflow[selectedId] ?? [] : [];

  function handleUpdate(wf: DbAutopilotWorkflow) {
    setWorkflows(prev => prev.map(w => w.id === wf.id ? wf : w));
  }

  async function handleDelete(id: string) {
    await fetch(`/api/autopilot/workflows/${id}`, { method: "DELETE" });
    setWorkflows(prev => {
      const remaining = prev.filter(w => w.id !== id);
      setSelectedId(cur => (cur === id ? remaining[0]?.id ?? null : cur));
      return remaining;
    });
  }

  function handleCreated(wf: DbAutopilotWorkflow) {
    setWorkflows(prev => [wf, ...prev]);
    setSelectedId(wf.id);
    setRunsByWorkflow(prev => ({ ...prev, [wf.id]: [] }));
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>Loading workflows…</div>
    );
  }

  return (
    <div className="ap-shell">
      <WorkflowListPane
        workflows={workflows}
        runsByWorkflow={runsByWorkflow}
        selectedId={selectedId}
        limit={workflowLimit}
        search={search}
        filter={filter}
        onSearchChange={setSearch}
        onFilterChange={setFilter}
        onSelect={setSelectedId}
        onCreated={handleCreated}
      />
      <WorkflowDetailPane
        key={selected?.id ?? "empty"}
        workflow={selected}
        runs={runs}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
