"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Orb } from "@/components/score/activity-orb";
import { ScoreComposer } from "@/components/score/score-composer";
import { ScoreRecord } from "@/components/score/score-record";
import { ScoreResultsTable } from "@/components/score/score-results-table";
import { recordFromCompany, recordFromPerson, type ScoreRecordData } from "@/lib/score-record";
import { parseScoreTarget } from "@/lib/score-target";
import type { IntentScore, PersonIntentScore, ScoreBand } from "@/lib/types";
import "@/components/score/score-surfaces.css";

export interface RecentScore {
  domain: string;
  company_name: string;
  score: number | null;
  score_band: ScoreBand | null;
  created_at: string;
  why_now?: string | null;
}

export interface RecentPerson {
  id: string;
  person_name: string;
  person_email: string | null;
  person_company: string | null;
  person_domain: string | null;
  score: number | null;
  score_band: ScoreBand | null;
  why_now: string | null;
  recommended_action: string | null;
  created_at: string;
}

export function ScoreView({
  creditsRemaining,
  recentScores,
  recentPeople,
}: {
  creditsRemaining: number;
  recentScores: RecentScore[];
  recentPeople: RecentPerson[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seeded = useRef(false);
  const latestRef = useRef<ScoreRecordData | null>(null);
  const submitRef = useRef<(raw: string) => Promise<void>>(async () => {});
  const [credits, setCredits] = useState(creditsRemaining);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [creditLabel, setCreditLabel] = useState("1 credit");
  const [watchAfter, setWatchAfter] = useState(false);
  const [scoreCompanyToo, setScoreCompanyToo] = useState(false);
  const [latest, setLatest] = useState<ScoreRecordData | null>(null);
  const [rows, setRows] = useState<ScoreRecordData[]>(() => [
    ...recentScores.flatMap((row) => row.score == null || !row.score_band ? [] : [{
      id: `domain:${row.domain}:${row.created_at}`,
      kind: "domain" as const,
      target: row.domain,
      company: row.company_name || row.domain,
      domain: row.domain,
      email: null,
      score: row.score,
      band: row.score_band,
      whyNow: row.why_now || "",
      action: "",
      updatedAt: row.created_at,
      cached: false,
      thinCoverage: false,
      companyScore: null,
      owner: "You",
    }]),
    ...recentPeople.flatMap((row) => row.score == null || !row.score_band ? [] : [{
      id: `person:${row.id}`,
      kind: "person" as const,
      target: row.person_name,
      company: row.person_company || "",
      domain: row.person_domain,
      email: row.person_email,
      score: row.score,
      band: row.score_band,
      whyNow: row.why_now || "",
      action: row.recommended_action || "",
      updatedAt: row.created_at,
      cached: false,
      thinCoverage: false,
      companyScore: null,
      owner: "You",
    }]),
  ]);

  latestRef.current = latest;
  submitRef.current = submit;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "l") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape") abortRef.current?.abort();
      const current = latestRef.current;
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && current) {
        event.preventDefault();
        if (current.kind === "person") router.push("/people");
        else router.push(`/watchlist?q=${encodeURIComponent(current.domain ?? current.target)}`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  useEffect(() => {
    const domain = params.get("domain");
    const email = params.get("email");
    if (seeded.current || (!domain && !email)) return;
    seeded.current = true;
    const next = email || domain || "";
    setDraft(next);
    void submitRef.current(next);
  }, [params]);

  function openRecord(record: ScoreRecordData) {
    if (record.kind === "person") router.push("/people");
    else router.push(`/watchlist?q=${encodeURIComponent(record.domain ?? record.target)}`);
  }

  async function submit(raw: string) {
    const target = parseScoreTarget(raw);
    if (target.mode === "unknown" || busy) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError("");
    setStatus(target.mode === "person" ? "Scoring person…" : "Scoring domain…");
    try {
      const record = target.mode === "person"
        ? await scorePerson(target.email, controller.signal)
        : await scoreDomain(target.domain, controller.signal);
      let next = record;
      if (target.mode === "person" && scoreCompanyToo && record.domain) {
        const company = await scoreDomain(record.domain, controller.signal);
        next = { ...record, companyScore: { company: company.company, domain: company.domain || record.domain, score: company.score, band: company.band } };
      }
      if (watchAfter && next.domain) await watchDomain(next.domain, next.company);
      setLatest(next);
      setRows((current) => [next, ...current.filter((row) => row.id !== next.id)]);
      setCreditLabel(next.cached ? "cache · free" : "1 credit");
      if (!next.cached) setCredits((count) => Math.max(0, count - 1));
      setDraft("");
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError((err as Error).message);
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const showEmpty = rows.length === 0 && !latest && !busy;

  return (
    <div className="score-stage">
      {showEmpty ? (
        <div className="score-empty">
          <p className="score-kicker">Score an account or a person</p>
          <h1>Paste a domain or email</h1>
          <p>acme.com or alex@acme.com — one credit per score. Cache hits free.</p>
          <ScoreComposer inputRef={inputRef} autoFocus value={draft} onValueChange={setDraft} busy={busy} creditsRemaining={credits} creditLabel={creditLabel} watchAfter={watchAfter} onWatchAfterChange={setWatchAfter} scoreCompanyToo={scoreCompanyToo} onScoreCompanyTooChange={setScoreCompanyToo} onSubmit={(value) => void submit(value)} />
          <p>{credits} credits left · cache hits free</p>
        </div>
      ) : (
        <>
          <div className="score-sticky">
            {busy ? (
              <div className="score-activity"><Orb variant="S4" size={18} pill label={status} /></div>
            ) : (
              <ScoreComposer compact inputRef={inputRef} value={draft} onValueChange={setDraft} busy={busy} creditsRemaining={credits} creditLabel={creditLabel} watchAfter={watchAfter} onWatchAfterChange={setWatchAfter} scoreCompanyToo={scoreCompanyToo} onScoreCompanyTooChange={setScoreCompanyToo} onSubmit={(value) => void submit(value)} />
            )}
          </div>
          {latest ? (
            <ScoreRecord
              record={latest}
              onOpen={() => openRecord(latest)}
              onWatch={() => latest.domain && void watchDomain(latest.domain, latest.company)}
              onRoute={() => latest.domain && void routeDomain(latest.domain, latest.company, latest.band)}
              onCopy={() => void navigator.clipboard.writeText(`${latest.target} ${latest.score} ${latest.band}`)}
              onNew={() => { setLatest(null); inputRef.current?.focus(); }}
              onScoreCompany={latest.domain ? () => void submit(latest.domain || "") : undefined}
            />
          ) : null}
          {error ? <p className="score-record-note">{error}</p> : null}
          <ScoreResultsTable rows={rows} onOpen={openRecord} />
        </>
      )}
    </div>
  );
}

async function scoreDomain(domain: string, signal: AbortSignal): Promise<ScoreRecordData> {
  const response = await fetch("/api/v1/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain }),
    signal,
  });
  const payload = await response.json() as IntentScore & { error?: string };
  if (!response.ok || payload.intent_score == null || payload.score_band == null) {
    throw new Error(payload.error || "Couldn’t reach coverage for that domain. Try the company domain.");
  }
  return recordFromCompany({ ...payload, intent_score: payload.intent_score, score_band: payload.score_band });
}

async function scorePerson(email: string, signal: AbortSignal): Promise<ScoreRecordData> {
  const response = await fetch(`/api/v1/score/person?email=${encodeURIComponent(email)}`, { signal });
  const payload = await response.json() as PersonIntentScore & { error?: string };
  if (!response.ok || typeof payload.intent_score !== "number") {
    throw new Error(payload.error || "Couldn’t reach coverage for that email. Try the company domain.");
  }
  return recordFromPerson(payload);
}

async function watchDomain(domain: string, company: string) {
  await fetch("/api/v1/watchlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain, company_name: company || domain }),
  });
}

async function routeDomain(domain: string, company: string, band: ScoreBand) {
  await watchDomain(domain, company);
  await fetch("/api/dashboard/pipeline/stages", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain, stage: band === "HOT" ? "hot" : "warming" }),
  });
}
