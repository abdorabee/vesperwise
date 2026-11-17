"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveInitialDomainIntent } from "@/components/score/score-intent";

interface ParamReader { get(name: string): string | null }

export interface ScorePrefill { domain: string; nonce: number }

const URL_PREFILL_NONCE = 0;

/**
 * Turns `/score?domain=…` into a composer pre-fill (never a paid request) and owns the
 * "confirm before spending" state shared by deep links and per-row Rescore buttons.
 */
export function useScoreIntent(params: ParamReader, openLast: (domain: string) => void) {
  const handledRef = useRef<string | null>(null);
  const openLastRef = useRef(openLast);
  const [manual, setManual] = useState<ScorePrefill | null>(null);
  const [settledKey, setSettledKey] = useState<string | null>(null);

  const key = `${params.get("domain") ?? ""}|${params.get("view") ?? ""}`;
  const intent = resolveInitialDomainIntent(params);
  const urlPending = settledKey !== key;

  useEffect(() => { openLastRef.current = openLast; });
  useEffect(() => {
    if (handledRef.current === key) return;
    handledRef.current = key;
    if (intent.kind === "last") openLastRef.current(intent.domain);
    // `intent` is derived from the same params that produce `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const prefill: ScorePrefill | null = manual ?? (urlPending && intent.kind === "prefill" ? { domain: intent.domain, nonce: URL_PREFILL_NONCE } : null);
  const notice = urlPending && intent.kind === "invalid" ? intent.message : null;

  /** Pre-fills the composer so the user confirms the 1-credit spend. */
  const requestScore = useCallback((domain: string) => {
    setSettledKey(key);
    setManual((current) => ({ domain, nonce: (current?.nonce ?? URL_PREFILL_NONCE) + 1 }));
  }, [key]);

  /** Drops the pre-fill and notice once the user has acted on them. */
  const settle = useCallback(() => {
    setSettledKey(key);
    setManual(null);
  }, [key]);

  /** Lets the same URL be handled again after the workspace is reset. */
  const forgetUrl = useCallback(() => { handledRef.current = null; }, []);

  return { prefill, notice, requestScore, settle, forgetUrl };
}
