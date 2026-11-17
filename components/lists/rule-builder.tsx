"use client";

import type { ListRule } from "@/lib/lists-types";

type Signal = "funding" | "hiring" | "news" | "technology" | "web";

interface RuleBuilderProps {
  rules: ListRule[];
  onChange: (rules: ListRule[]) => void;
}

function ruleForField(field: string): ListRule {
  if (field === "score") return { field: "score", op: ">=", value: 75 };
  if (field === "score_band") return { field: "score_band", op: "is", value: "HOT" };
  if (field === "in_watchlist") return { field: "in_watchlist", op: "is", value: true };
  return { field: "signal", signal: "hiring", op: "active", minStrength: 1 };
}

function RuleValue({ rule, onChange }: { rule: ListRule; onChange: (rule: ListRule) => void }) {
  if (rule.field === "score") {
    return (
      <>
        <select
          className="rb-sel op"
          aria-label="Comparison"
          value={rule.op}
          onChange={(e) => onChange({ ...rule, op: e.target.value as ">=" | "<=" | "=" })}
        >
          <option value=">=">≥</option>
          <option value="<=">≤</option>
          <option value="=">=</option>
        </select>
        <input
          className="rb-sel"
          type="number"
          min={0}
          max={100}
          aria-label="Score"
          value={rule.value}
          onChange={(e) => onChange({ ...rule, value: Number(e.target.value) })}
        />
      </>
    );
  }
  if (rule.field === "score_band") {
    return (
      <>
        <select className="rb-sel op" aria-label="Operator" value="is" disabled><option>IS</option></select>
        <select
          className="rb-sel"
          aria-label="Band"
          value={rule.value}
          onChange={(e) => onChange({ ...rule, value: e.target.value as "HOT" | "WARM" | "COLD" })}
        >
          <option value="HOT">HOT</option>
          <option value="WARM">WARM</option>
          <option value="COLD">COLD</option>
        </select>
      </>
    );
  }
  if (rule.field === "in_watchlist") {
    return (
      <>
        <select className="rb-sel op" aria-label="Operator" value="is" disabled><option>IS</option></select>
        <select
          className="rb-sel"
          aria-label="In watchlist"
          value={rule.value ? "yes" : "no"}
          onChange={(e) => onChange({ ...rule, value: e.target.value === "yes" })}
        >
          <option value="yes">yes</option>
          <option value="no">no</option>
        </select>
      </>
    );
  }
  return (
    <>
      <select className="rb-sel op" aria-label="Operator" value="active" disabled><option>ACTIVE</option></select>
      <select
        className="rb-sel"
        aria-label="Signal"
        value={rule.signal}
        onChange={(e) => onChange({ ...rule, signal: e.target.value as Signal, minStrength: 1 })}
      >
        <option value="funding">Funding</option>
        <option value="hiring">Hiring</option>
        <option value="news">News</option>
        <option value="technology">Technology</option>
        <option value="web">Web</option>
      </select>
    </>
  );
}

export function RuleBuilder({ rules, onChange }: RuleBuilderProps) {
  const update = (index: number, next: ListRule) => onChange(rules.map((r, i) => (i === index ? next : r)));
  const remove = (index: number) => onChange(rules.filter((_, i) => i !== index));
  const add = () => onChange([...rules, { field: "score_band", op: "is", value: "HOT" }]);

  return (
    <div className="rule-builder">
      {rules.map((rule, i) => (
        <div key={i}>
          {i > 0 && <div className="rb-conj">AND</div>}
          <div className="rb-row">
            <select
              className="rb-sel field"
              aria-label="Rule field"
              value={rule.field}
              onChange={(e) => update(i, ruleForField(e.target.value))}
            >
              <option value="score">Score</option>
              <option value="score_band">Score band</option>
              <option value="in_watchlist">In watchlist</option>
              <option value="signal">Signal</option>
            </select>
            <RuleValue rule={rule} onChange={(next) => update(i, next)} />
            <button type="button" className="rm" onClick={() => remove(i)} aria-label="Remove rule">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10" aria-hidden>
                <path d="M3 3l6 6M9 3l-6 6" />
              </svg>
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="rb-add" onClick={add}>
        <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" width="9" height="9" aria-hidden>
          <path d="M5 2v6M2 5h6" />
        </svg>
        Add rule
      </button>
    </div>
  );
}
