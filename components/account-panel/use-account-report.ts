"use client";

import { useEffect, useState } from "react";
import { workspaceFromScore, type UiBlock } from "@/lib/gen-ui";
import type { StoredWorkspaceScore } from "@/lib/stored-score";

export type AccountReportState =
  | { status: "loading" }
  | { status: "ready"; blocks: UiBlock[]; stored: { domain: string; createdAt: string } }
  | { status: "missing" }
  | { status: "error"; message: string };

interface LatestScorePayload { score?: StoredWorkspaceScore; error?: string }

/** Maps the latest-score response to a panel state. Exported for tests. */
export function accountReportFromResponse(status: number, payload: LatestScorePayload | null): AccountReportState {
  if (status === 404) return { status: "missing" };
  if (status < 200 || status >= 300 || !payload?.score) {
    return { status: "error", message: payload?.error ?? "Couldn't load this account's score." };
  }
  const score = payload.score;
  return {
    status: "ready",
    blocks: workspaceFromScore(score),
    stored: { domain: score.domain, createdAt: score.created_at },
  };
}

/** Loads the latest stored score for `domain` without rescoring or charging credits. */
export function useAccountReport(domain: string, reloadKey: number) {
  const [state, setState] = useState<{ key: string; value: AccountReportState } | null>(null);
  const key = `${domain}|${reloadKey}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/dashboard/scores/latest?domain=${encodeURIComponent(domain)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as LatestScorePayload | null;
        setState({ key, value: accountReportFromResponse(response.status, payload) });
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const message = reason instanceof Error ? reason.message : "Couldn't load this account's score.";
        setState({ key, value: { status: "error", message } });
      });
    return () => controller.abort();
  }, [domain, key]);

  // A state left over from a previous domain reads as loading until the new one lands.
  return state?.key === key ? state.value : { status: "loading" } as const;
}
