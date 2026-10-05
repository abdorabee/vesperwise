"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import ConditionRow from "./condition-row";
import ActionRow from "./action-row";
import {
  conditionToTokens,
  actionToDisplay,
  patchWorkflow,
} from "@/lib/autopilot-display";
import type {
  DbAutopilotWorkflow,
  AutopilotCondition,
  AutopilotAction,
  AutopilotConditionLogic,
  AutopilotSchedule,
  AutopilotSourceType,
} from "@/lib/types";

interface FlowCanvasProps {
  workflow: DbAutopilotWorkflow;
  onUpdate: (wf: DbAutopilotWorkflow) => void;
}

function Edge() {
  return (
    <div className="ap-edge">
      <div className="arrow">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10"><path d="M6 2v8M3 7l3 3 3-3" /></svg>
      </div>
    </div>
  );
}

function NodeHead({
  kind,
  typeLabel,
  title,
  editing,
  onEdit,
}: {
  kind: "trigger" | "condition" | "action";
  typeLabel: string;
  title: string;
  editing: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="ap-node-head">
      <div className="ic">
        {kind === "trigger" && <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="10" height="10"><path d="M6 1v5l3 2" /></svg>}
        {kind === "condition" && <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="10" height="10"><path d="M2 4h8M2 7h8M2 10h4" /></svg>}
        {kind === "action" && <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="10" height="10"><path d="M2 6l3 3 5-7" /></svg>}
      </div>
      <div style={{ minWidth: 0 }}>
        <span className="type-label">{typeLabel}</span>
        <span className="title">{title}</span>
      </div>
      <div className="actions">
        <button type="button" className={`icon-btn${editing ? " active" : ""}`} onClick={onEdit} title="Edit" aria-label="Edit node">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10"><path d="M3 8l1-3 5-5 2 2-5 5z M2 10h8" /></svg>
        </button>
      </div>
    </div>
  );
}

function TokenRow({ tokens }: { tokens: ReturnType<typeof conditionToTokens> }) {
  return (
    <div className="ap-cond-row">
      {tokens.map((t, i) => (
        <span key={i} style={{ display: "contents" }}>
          {t.key && <span className="ap-token key">{t.key}</span>}
          {t.op && <span className="ap-token op">{t.op}</span>}
          {t.val && <span className={`ap-token${t.valHot ? " val-hot" : " val"}`}>{t.val}</span>}
        </span>
      ))}
    </div>
  );
}

function actionIconStyle(type: AutopilotAction["type"]) {
  switch (type) {
    case "pipeline_stage":
      return { background: "rgba(223,255,0,0.15)", color: "#dfff00" };
    case "email_draft":
      return { background: "var(--band-hot-bg)", color: "var(--band-hot)" };
    case "slack":
      return { background: "rgba(245,181,68,0.15)", color: "var(--warm)" };
    default:
      return { background: "rgba(255,255,255,0.06)", color: "var(--text-tertiary)" };
  }
}

export default function FlowCanvas({ workflow, onUpdate }: FlowCanvasProps) {
  const [editTrigger, setEditTrigger] = useState(false);
  const [editConditions, setEditConditions] = useState(false);
  const [editActions, setEditActions] = useState(false);
  const [local, setLocal] = useState(workflow);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocal(workflow); }, [workflow]);

  const debouncedSave = useCallback((patch: Partial<DbAutopilotWorkflow>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const updated = await patchWorkflow(workflow.id, patch);
        onUpdate(updated);
      } catch { /* ignore */ }
    }, 500);
  }, [workflow.id, onUpdate]);

  function updateLocal(patch: Partial<DbAutopilotWorkflow>) {
    const next = { ...local, ...patch };
    setLocal(next);
    debouncedSave(patch);
  }

  function updateCondition(i: number, c: AutopilotCondition) {
    const conditions = [...local.conditions];
    conditions[i] = c;
    updateLocal({ conditions });
  }

  function removeCondition(i: number) {
    updateLocal({ conditions: local.conditions.filter((_, idx) => idx !== i) });
  }

  function addCondition() {
    updateLocal({
      conditions: [...local.conditions, { type: "score_above", params: { threshold: 75 } }],
    });
  }

  function updateAction(i: number, a: AutopilotAction) {
    const actions = [...local.actions];
    actions[i] = a;
    updateLocal({ actions });
  }

  function removeAction(i: number) {
    updateLocal({ actions: local.actions.filter((_, idx) => idx !== i) });
  }

  function addAction() {
    updateLocal({ actions: [...local.actions, { type: "notification", params: {} }] });
  }

  return (
    <div className="ap-flow">
      <div className="ap-node trigger">
        <NodeHead
          kind="trigger"
          typeLabel="Trigger"
          title="Score on schedule"
          editing={editTrigger}
          onEdit={() => setEditTrigger(v => !v)}
        />
        <div className="ap-node-body">
          {editTrigger ? (
            <div className="ap-edit-fields">
              <label className="ap-field-label">Schedule</label>
              <select
                className="ap-field-input"
                value={local.schedule}
                onChange={e => updateLocal({ schedule: e.target.value as AutopilotSchedule })}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
              <label className="ap-field-label">Source</label>
              <select
                className="ap-field-input"
                value={local.source_type}
                onChange={e => updateLocal({ source_type: e.target.value as AutopilotSourceType })}
              >
                <option value="watchlist">Watchlist</option>
                <option value="specific_domains">Specific domains</option>
              </select>
              {local.source_type === "specific_domains" && (
                <input
                  className="ap-field-input"
                  placeholder="domain1.com, domain2.com"
                  value={(local.source_domains ?? []).join(", ")}
                  onChange={e => updateLocal({ source_domains: e.target.value.split(",").map(d => d.trim()).filter(Boolean) })}
                />
              )}
            </div>
          ) : (
            <div className="ap-cond-row">
              <span className="ap-token key">schedule</span>
              <span className="ap-token op">=</span>
              <span className="ap-token val">{local.schedule}</span>
              <span className="ap-token op">·</span>
              <span className="ap-token key">source</span>
              <span className="ap-token op">=</span>
              <span className="ap-token val">{local.source_type === "watchlist" ? "watchlist" : `${local.source_domains?.length ?? 0} domains`}</span>
            </div>
          )}
        </div>
      </div>

      <Edge />

      <div className="ap-node condition">
        <NodeHead
          kind="condition"
          typeLabel={`Condition · ${local.condition_logic.toUpperCase()} of`}
          title="Intent signal match"
          editing={editConditions}
          onEdit={() => setEditConditions(v => !v)}
        />
        <div className="ap-node-body">
          {editConditions ? (
            <div className="ap-edit-fields">
              <select
                className="ap-field-input ap-field-input--sm"
                value={local.condition_logic}
                onChange={e => updateLocal({ condition_logic: e.target.value as AutopilotConditionLogic })}
              >
                <option value="any">ANY of</option>
                <option value="all">ALL of</option>
              </select>
              {local.conditions.map((c, i) => (
                <ConditionRow key={i} condition={c} onChange={u => updateCondition(i, u)} onRemove={() => removeCondition(i)} />
              ))}
              <button type="button" className="ap-add ap-add--inline" onClick={addCondition}>+ Add condition</button>
            </div>
          ) : (
            <>
              {local.conditions.map((c, i) => (
                <TokenRow key={i} tokens={conditionToTokens(c)} />
              ))}
              {local.conditions.length === 0 && (
                <div className="ap-cond-row ap-cond-row--empty">No conditions — click edit to add</div>
              )}
            </>
          )}
        </div>
      </div>

      <Edge />

      <div className="ap-node action">
        <NodeHead
          kind="action"
          typeLabel={`Action · ${local.actions.length} step${local.actions.length !== 1 ? "s" : ""}`}
          title="Automated response"
          editing={editActions}
          onEdit={() => setEditActions(v => !v)}
        />
        <div className="ap-node-body">
          {editActions ? (
            <div className="ap-edit-fields">
              {local.actions.map((a, i) => (
                <ActionRow key={i} action={a} onChange={u => updateAction(i, u)} onRemove={() => removeAction(i)} />
              ))}
              <button type="button" className="ap-add ap-add--inline" onClick={addAction}>+ Add action</button>
            </div>
          ) : (
            <>
              {local.actions.map((a, i) => {
                const d = actionToDisplay(a);
                const icStyle = actionIconStyle(a.type);
                return (
                  <div key={i} className="ap-action-pill">
                    <div className="ic" style={icStyle}>
                      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="9" height="9"><path d="M2 6l3 3 5-7" /></svg>
                    </div>
                    <span className="label">{d.label}</span>
                    <span className="target">{d.target}</span>
                    {d.badge && <span className="badge">{d.badge}</span>}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      <button type="button" className="ap-add" onClick={addAction}>
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10"><path d="M6 2v8M2 6h8" /></svg>
        Add step
      </button>
    </div>
  );
}
