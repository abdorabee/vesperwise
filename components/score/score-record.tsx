"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { TRIGGER_WEIGHTS } from "@/lib/scorer";
import type { ScoreRecordData } from "@/lib/score-record";

const WEIGHTS = [
  { key: "funding", label: "Funding", weight: TRIGGER_WEIGHTS.funding },
  { key: "hiring", label: "Hiring", weight: TRIGGER_WEIGHTS.hiring },
  { key: "news", label: "News", weight: TRIGGER_WEIGHTS.news },
  { key: "technology", label: "Stack", weight: TRIGGER_WEIGHTS.technology },
] as const;

const TOTAL = WEIGHTS.reduce((sum, item) => sum + item.weight, 0);

export function ScoreRecord({
  record,
  onOpen,
  onWatch,
  onRoute,
  onCopy,
  onNew,
  onScoreCompany,
}: {
  record: ScoreRecordData;
  onOpen?: () => void;
  onWatch?: () => void;
  onRoute?: () => void;
  onCopy?: () => void;
  onNew?: () => void;
  onScoreCompany?: () => void;
}) {
  return (
    <article className="score-record" aria-label={`${record.target} score`}>
      <header className="score-record-head">
        <div>
          <p className="score-record-kicker">{record.kind === "person" ? "Person" : "Domain"}</p>
          <h2 className="score-record-title">{record.target}</h2>
          <p className="score-record-id">{record.kind === "person" ? record.email || record.company : record.domain}</p>
        </div>
        <div className="score-record-figure">
          <ScoreTicker value={record.score} />
          <span className={`score-record-band band-${record.band.toLowerCase()}`}>{record.band}</span>
        </div>
      </header>
      <div className="score-mix" aria-label="Signal weights">
        {WEIGHTS.map((item) => (
          <span key={item.key} style={{ flexGrow: item.weight }} title={`${item.label} ${item.weight}`} />
        ))}
      </div>
      <p className="score-mix-legend">
        {WEIGHTS.map((item) => `${item.label} ${item.weight}`).join(" · ")} · weights, not the 0–100
      </p>
      {record.whyNow ? <p className="score-record-why">{record.whyNow}</p> : null}
      {record.action ? <p className="score-record-action">{record.action}</p> : null}
      {record.thinCoverage ? <p className="score-record-note">Thin coverage · treat as directional</p> : null}
      {record.kind === "person" ? (
        <div className="score-record-company">
          {record.companyScore ? (
            <span>Company · {record.companyScore.company} · {record.companyScore.score} {record.companyScore.band}</span>
          ) : (
            <span>Company · {record.company || "Unknown"}</span>
          )}
          {!record.companyScore && record.domain && onScoreCompany ? (
            <button type="button" className="score-record-textbtn" onClick={onScoreCompany}>Score company</button>
          ) : null}
        </div>
      ) : null}
      <div className="score-record-actions">
        <button type="button" onClick={onOpen}>Open</button>
        <button type="button" onClick={onWatch}>Watch</button>
        <button type="button" onClick={onRoute}>Route</button>
        <button type="button" onClick={onCopy}>Copy score</button>
        <button type="button" onClick={onNew}>New score</button>
      </div>
      <span className="sr-only">Signal weights total {TOTAL}</span>
    </article>
  );
}

function ScoreTicker({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 500);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [reduce, value]);

  return (
    <motion.span className="score-record-num" initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      {reduce ? value : shown}
    </motion.span>
  );
}
