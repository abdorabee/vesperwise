"use client";

import { useState, useEffect, useRef } from "react";
import FlowCanvas from "./flow-canvas";
import FireHistoryChart from "./fire-history-chart";
import RunHistory from "./run-history";
import {
  workflowStatus,
  patchWorkflow,
  computeMatchRate,
  computeMonthlyFires,
  computeAvgLatency,
  bucketFiresByDay,
  peakFireDay,
  relTime,
} from "@/lib/autopilot-display";
import type {
  DbAutopilotWorkflow,
  DbAutopilotRun,
  DbAutopilotAction,
  AutopilotSchedule,
  AutopilotSourceType,
} from "@/lib/types";

type Tab = "builder" | "runs" | "logs" | "versions" | "settings";

interface WorkflowDetailPaneProps {
  workflow: DbAutopilotWorkflow | null;
  runs: DbAutopilotRun[];
  onUpdate: (wf: DbAutopilotWorkflow) => void;
  onDelete: (id: string) => void;
}

function statusBand(status: ReturnType<typeof workflowStatus>) {
  if (status === "active") return { cls: "band-hot", label: "Active", dot: "var(--hot)" };
  if (status === "paused") return { cls: "band-cold", label: "Paused", dot: "var(--text-quaternary)" };
  return { cls: "band-warm", label: "Draft", dot: "var(--warm)" };
}

export default function WorkflowDetailPane({
  workflow,
  runs,
  onUpdate,
  onDelete,
}: WorkflowDetailPaneProps) {
  const [tab, setTab] = useState<Tab>("builder");
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(workflow?.name ?? "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [logResult, setLogResult] = useState<{ workflowId: string; actions: DbAutopilotAction[] } | null>(null);
  const [lastFireResult, setLastFireResult] = useState<{
    runId: string;
    value: { company: string; ago: string };
  } | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!workflow || tab !== "logs") return;
    (async () => {
      const recent = runs.slice(0, 5);
      const all: DbAutopilotAction[] = [];
      for (const r of recent) {
        const res = await fetch(`/api/autopilot/runs/${r.id}`);
        if (res.ok) {
          const data = await res.json();
          all.push(...(data.actions ?? []));
        }
      }
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setLogResult({ workflowId: workflow.id, actions: all.slice(0, 20) });
    })();
  }, [workflow, tab, runs]);

  useEffect(() => {
    if (!workflow || runs.length === 0) return;
    (async () => {
      const res = await fetch(`/api/autopilot/runs/${runs[0].id}`);
      if (res.ok) {
        const data = await res.json();
        const actions: DbAutopilotAction[] = data.actions ?? [];
        if (actions.length > 0) {
          setLastFireResult({
            runId: runs[0].id,
            value: { company: actions[0].company_name, ago: relTime(actions[0].created_at) },
          });
        } else {
          setLastFireResult({
            runId: runs[0].id,
            value: { company: "—", ago: relTime(runs[0].started_at) },
          });
        }
      }
    })();
  }, [workflow, runs]);

  if (!workflow) {
    return (
      <div className="ap-detail ap-empty-detail">
        <p>Select a workflow or create one from the list.</p>
        <p style={{ fontSize: 12, color: "var(--text-quaternary)" }}>Use templates to get started quickly.</p>
      </div>
    );
  }

  const wf = workflow;
  const logActions = logResult?.workflowId === wf.id ? logResult.actions : [];
  const lastFire = runs[0] && lastFireResult?.runId === runs[0].id ? lastFireResult.value : null;
  const status = workflowStatus(wf);
  const band = statusBand(status);
  const match = computeMatchRate(runs);
  const monthlyFires = computeMonthlyFires(runs);
  const avgLatency = computeAvgLatency(runs);
  const buckets = bucketFiresByDay(runs);
  const peak = peakFireDay(buckets);

  async function saveName() {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === wf.name) {
      setRenaming(false);
      return;
    }
    const updated = await patchWorkflow(wf.id, { name: trimmed });
    onUpdate(updated);
    setRenaming(false);
  }

  async function togglePause() {
    const updated = await patchWorkflow(wf.id, { is_enabled: !wf.is_enabled });
    onUpdate(updated);
  }

  async function handleTestRun() {
    const domain = window.prompt("Enter a domain to test (e.g. stripe.com):");
    if (!domain?.trim()) return;
    const res = await fetch("/api/autopilot/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow_id: wf.id, domain: domain.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Test failed");
      return;
    }
    const t = data.test_result;
    alert(
      `${t.company}: ${t.old_score ?? "?"} → ${t.new_score} (${t.new_band})\n` +
      `Triggered: ${t.triggered ? "Yes" : "No"}\n` +
      (t.trigger_reasons?.length ? `Reasons: ${t.trigger_reasons.join(", ")}` : "")
    );
  }

  async function handleDelete() {
    if (!window.confirm(`Delete workflow "${wf.name}"?`)) return;
    onDelete(wf.id);
    setMenuOpen(false);
  }

  function updateSettings(patch: Partial<DbAutopilotWorkflow>) {
    patchWorkflow(wf.id, patch).then(onUpdate).catch(() => {});
  }

  return (
    <div className="ap-detail">
      <div className="ap-detail-head">
        <div className="ap-detail-top">
          <span className={`band ${band.cls}`}>
            <span className="dot" />
            {band.label}
          </span>

          {renaming ? (
            <input
              ref={nameRef}
              className="ap-detail-name-input"
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setRenaming(false); }}
              autoFocus
            />
          ) : (
            <div className="ap-detail-name" onClick={() => setRenaming(true)} title="Click to rename">
              {wf.name}
              <span className="editable-hint">Click to rename</span>
            </div>
          )}

          <div className="ap-detail-actions">
            <button type="button" className="tb-btn outlined" onClick={handleTestRun}>
              <svg className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6a4 4 0 018-1M10 6a4 4 0 01-8 1M9 2v3h-3M3 10V7h3" /></svg>
              Test run
            </button>
            <button type="button" className="tb-btn outlined" onClick={togglePause}>
              {wf.is_enabled ? "Pause" : "Resume"}
            </button>
            <button type="button" className="tb-btn outlined" onClick={() => setMenuOpen(v => !v)} aria-label="More actions">
              <svg className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="3" cy="6" r="1" /><circle cx="6" cy="6" r="1" /><circle cx="9" cy="6" r="1" /></svg>
            </button>
            {menuOpen && (
              <div className="ap-detail-menu">
                <button type="button" onClick={handleDelete}>Delete workflow</button>
              </div>
            )}
          </div>
        </div>

        <div className="ap-stats-row">
          {[
            { label: "Fires · month", val: String(monthlyFires), delta: "", deltaMuted: false },
            { label: "Match rate", val: match !== null ? `${match}%` : "—", delta: "", deltaMuted: false },
            { label: "Avg latency", val: avgLatency === "stable" ? "—" : avgLatency, delta: avgLatency === "stable" ? "stable" : "", deltaMuted: true },
            {
              label: "Last fire",
              val: lastFire?.company ?? "—",
              delta: lastFire?.ago ?? "never",
              deltaMuted: true,
              valSmall: true,
            },
          ].map(s => (
            <div key={s.label} className="ap-stat">
              <div className="label">{s.label}</div>
              <div className="val" style={s.valSmall ? { fontSize: 14 } : undefined}>{s.val}</div>
              {s.delta ? (
                <div className={`delta${s.deltaMuted ? " muted" : ""}`}>{s.delta}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="ap-tabs">
        {([
          ["builder", "Builder"],
          ["runs", `Runs`, runs.length],
          ["logs", "Logs"],
          ["versions", "Versions"],
          ["settings", "Settings"],
        ] as const).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            className={`ap-tab${tab === id ? " active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
            {typeof count === "number" && count > 0 && (
              <span className="kbd" style={{ marginLeft: 4 }}>{count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="ap-canvas">
        {tab === "builder" && (
          <div className="ap-canvas-inner">
            <FlowCanvas workflow={wf} onUpdate={onUpdate} />
            <FireHistoryChart buckets={buckets} peak={peak} />
          </div>
        )}

        {tab === "runs" && (
          <div style={{ padding: "20px" }}>
            <RunHistory runs={runs} />
          </div>
        )}

        {tab === "logs" && (
          <div style={{ padding: "20px" }}>
            {logActions.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-tertiary)", textAlign: "center", padding: 32 }}>No action logs yet.</p>
            ) : (
              <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
                {logActions.map(a => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--border-subtle)", fontSize: 12 }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)", minWidth: 120 }}>{a.company_name}</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>{a.action_type.replace("_", " ")}</span>
                    <span style={{ color: "var(--text-quaternary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.trigger_reason}</span>
                    <span style={{ color: "var(--text-quaternary)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{relTime(a.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "versions" && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
            Version history coming soon.
          </div>
        )}

        {tab === "settings" && (
          <div style={{ padding: "24px 20px", maxWidth: 480 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Source</label>
                <select
                  value={wf.source_type}
                  onChange={e => updateSettings({ source_type: e.target.value as AutopilotSourceType })}
                  style={{ width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "8px 10px", fontSize: 13, color: "var(--text-primary)" }}
                >
                  <option value="watchlist">Watchlist</option>
                  <option value="specific_domains">Specific domains</option>
                </select>
              </div>
              {wf.source_type === "specific_domains" && (
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Domains (comma-separated)</label>
                  <input
                    defaultValue={(wf.source_domains ?? []).join(", ")}
                    onBlur={e => updateSettings({ source_domains: e.target.value.split(",").map(d => d.trim()).filter(Boolean) })}
                    style={{ width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "8px 10px", fontSize: 13, color: "var(--text-primary)" }}
                  />
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Schedule</label>
                <select
                  value={wf.schedule}
                  onChange={e => updateSettings({ schedule: e.target.value as AutopilotSchedule })}
                  style={{ width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "8px 10px", fontSize: 13, color: "var(--text-primary)" }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
