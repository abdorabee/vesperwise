"use client";

import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";

import { EmptyStateScreen } from "@/components/onboarding/screens/empty-state-screen";
import { IcpDefinitionScreen } from "@/components/onboarding/screens/icp-definition-screen";
import { ResultsScreen } from "@/components/onboarding/screens/results-screen";
import { ScoringRunScreen } from "@/components/onboarding/screens/scoring-run-screen";
import { SignalSourcesScreen } from "@/components/onboarding/screens/signal-sources-screen";
import { WorkspaceSetupScreen } from "@/components/onboarding/screens/workspace-setup-screen";
import { OnboardingFooter, OnboardingShell, PrimaryButton, SecondaryButton } from "@/components/onboarding/onboarding-shell";
import { scoredAccountsFromEntries, topDriver, type ScoredAccount } from "@/components/onboarding/results-shared";
import { useScoringRun } from "@/lib/onboarding-run";
import {
  buildBusinessProfile,
  createOnboardingState,
  findIncompleteStep,
  onboardingReducer,
  STEP_LABELS,
  validateOnboardingStep,
  type OnboardingFieldErrors,
} from "@/lib/onboarding-profile";
import type { BusinessProfile } from "@/lib/types";

/**
 * `fetch` rejects with a bare `TypeError: Failed to fetch` when the request
 * never reaches the server (offline, dev server down, CORS). Surfacing that
 * string tells the user nothing, so translate it; everything else is already
 * a message we wrote ourselves.
 */
function describeRequestError(error: unknown): string {
  if (error instanceof TypeError) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(accounts: ScoredAccount[]) {
  const header = "domain,company,score,band,top_driver";
  const rows = accounts.map((a) =>
    [a.domain, a.result.company, a.result.intent_score ?? "", a.result.score_band ?? "", topDriver(a.result)]
      .map(csvEscape)
      .join(",")
  );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "vesperwise-icp-preview.csv";
  link.click();
  URL.revokeObjectURL(url);
}

async function addToWatchlist(
  accounts: ScoredAccount[]
): Promise<{ added: number; total: number; hitLimit: boolean }> {
  const outcomes = await Promise.allSettled(
    accounts.map((a) =>
      fetch("/api/dashboard/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: a.domain, company_name: a.result.company }),
      })
    )
  );
  const added = outcomes.filter((o) => o.status === "fulfilled" && o.value.ok).length;
  // /api/dashboard/watchlist answers 403 specifically when PLAN_WATCHLIST_LIMIT
  // is reached, so only that status justifies blaming the plan limit.
  const hitLimit = outcomes.some((o) => o.status === "fulfilled" && o.value.status === 403);
  return { added, total: accounts.length, hitLimit };
}

export default function OnboardingWizard({
  initialProfile,
  emailDomain,
  email,
  creditsRemaining,
  readOnlyPreview = false,
}: {
  initialProfile: Partial<BusinessProfile> | null;
  emailDomain: string | null;
  email: string;
  creditsRemaining: number;
  /** Signed-out preview deploy: layout is browsable but nothing can be saved
   *  or scored, so say so up front instead of failing on a 401 later. */
  readOnlyPreview?: boolean;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(onboardingReducer, initialProfile, (profile) => createOnboardingState(profile));
  const [errors, setErrors] = useState<OnboardingFieldErrors>({});
  const [threshold, setThreshold] = useState(75);
  const [notice, setNotice] = useState<string | null>(null);
  // Set when a finish attempt partially succeeded, so we can offer an escape
  // hatch rather than trapping the user on the last screen.
  const [finishAttempted, setFinishAttempted] = useState(false);
  const run = useScoringRun();

  const { profile, step, saveStatus, saveError } = state;

  function clearError(field: keyof BusinessProfile) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function updateField(field: "workspace_name" | "product_category", value: string) {
    dispatch({ type: "update_field", field, value });
    clearError(field);
  }

  function toggleIndustry(industry: string) {
    dispatch({ type: "toggle_industry", industry });
    clearError("target_industries");
  }

  function toggleGeography(geo: string) {
    dispatch({ type: "toggle_geography", geo });
  }

  function goNext(validateStep: number) {
    const stepErrors = validateOnboardingStep(validateStep, profile);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length === 0) dispatch({ type: "next_step" });
  }

  async function persistProfile(): Promise<boolean> {
    const payload = buildBusinessProfile(profile);
    if (!payload) {
      // Send the user to the screen that actually needs attention and surface
      // the field-level errors there, rather than leaving them on the results
      // screen with a message they can't act on.
      const incompleteStep = findIncompleteStep(profile);
      if (incompleteStep !== null) {
        setErrors(validateOnboardingStep(incompleteStep, profile));
        dispatch({ type: "go_to_step", step: incompleteStep });
        dispatch({
          type: "save_failed",
          message: `Something's missing on the ${STEP_LABELS[incompleteStep]} step — we've taken you back to it.`,
        });
      } else {
        dispatch({
          type: "save_failed",
          message: "We couldn't save your profile. Please check your answers and try again.",
        });
      }
      return false;
    }
    dispatch({ type: "save_started" });
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_profile: payload }),
      });
      if (response.status === 401) {
        throw new Error("Your session expired. Sign in again to save your workspace.");
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "We could not save your profile. Please try again.");
      }
      return true;
    } catch (error) {
      dispatch({ type: "save_failed", message: describeRequestError(error) });
      return false;
    }
  }

  async function finishWithWatchlist(accounts: ScoredAccount[]) {
    const saved = await persistProfile();
    if (!saved) return;
    if (accounts.length > 0) {
      const { added, total, hitLimit } = await addToWatchlist(accounts);
      if (added < total) {
        // Stay put so the message is actually readable — navigating here would
        // unmount it instantly. The watchlist POST upserts on (user_id, domain),
        // so pressing the button again is safe and won't duplicate rows.
        setNotice(
          hitLimit
            ? `Added ${added} of ${total} — your plan's watchlist limit is full. Upgrade to track the rest, or continue.`
            : `Added ${added} of ${total} — the others couldn't be saved. Try again, or continue and add them later.`
        );
        setFinishAttempted(true);
        return;
      }
    }
    router.replace("/score");
    router.refresh();
  }

  const scoredAccounts = scoredAccountsFromEntries(run.entries);
  const visibleAccounts = scoredAccounts.filter((a) => (a.result.intent_score ?? -1) >= threshold);
  const hasCleared = visibleAccounts.length > 0;
  // Ledger phases: 0 Workspace, 1 ICP, 2 Signals, 3 Results. The run (step 3)
  // and outcome (step 4) screens both sit under the "Results" phase.
  const phase = Math.min(step, 3);

  let content: React.ReactNode;
  let footer: React.ReactNode;

  if (step === 0) {
    content = (
      <WorkspaceSetupScreen profile={profile} emailDomain={emailDomain} errors={errors} onUpdateField={updateField} />
    );
    footer = (
      <OnboardingFooter
        caption="Step 1 of 3 · about 40 seconds"
        primary={<PrimaryButton onClick={() => goNext(0)}>Define your ICP</PrimaryButton>}
      />
    );
  } else if (step === 1) {
    content = (
      <IcpDefinitionScreen
        profile={profile}
        errors={errors}
        onToggleIndustry={toggleIndustry}
        onSetIndustries={(industries) => dispatch({ type: "set_industries", industries })}
        onSetCompanySize={(size) => {
          dispatch({ type: "update_field", field: "company_size", value: size });
          clearError("company_size");
        }}
        onToggleGeography={toggleGeography}
        onSetTechInclude={(tools) => dispatch({ type: "set_tech_stack_include", tools })}
        onSetTechExclude={(tools) => dispatch({ type: "set_tech_stack_exclude", tools })}
        onSetSeedDomains={(domains) => {
          dispatch({ type: "set_seed_domains", domains });
          clearError("seed_domains");
        }}
      />
    );
    footer = (
      <OnboardingFooter
        caption="Step 2 of 3"
        back={{ label: "Back", onClick: () => dispatch({ type: "previous_step" }) }}
        primary={<PrimaryButton onClick={() => goNext(1)}>Choose signals</PrimaryButton>}
      />
    );
  } else if (step === 2) {
    const seedCount = (profile.seed_domains ?? []).length;
    content = <SignalSourcesScreen seedCount={seedCount} />;
    footer = (
      <OnboardingFooter
        caption={`Step 3 of 3 · first run included in your ${creditsRemaining} credits`}
        back={{ label: "Back", onClick: () => dispatch({ type: "previous_step" }) }}
        primary={
          <PrimaryButton
            disabled={seedCount === 0}
            onClick={() => {
              dispatch({ type: "next_step" });
              void run.start(profile.seed_domains ?? []);
            }}
          >
            Score {seedCount} {seedCount === 1 ? "account" : "accounts"}
          </PrimaryButton>
        }
      />
    );
  } else if (step === 3) {
    const anyDone = run.entries.some((e) => e.status === "done" || e.status === "error");
    content = <ScoringRunScreen entries={run.entries} />;
    footer = (
      <OnboardingFooter
        caption="Scoring your ICP preview"
        back={{ label: "Back", onClick: () => dispatch({ type: "previous_step" }), disabled: run.running }}
        secondary={<SecondaryButton inert>Email me instead</SecondaryButton>}
        primary={
          <PrimaryButton disabled={!anyDone} onClick={() => dispatch({ type: "next_step" })}>
            See the {run.entries.filter((e) => e.status === "done").length} ready now
          </PrimaryButton>
        }
      />
    );
  } else {
    content = hasCleared ? (
      <ResultsScreen accounts={scoredAccounts} visible={visibleAccounts} threshold={threshold} onThresholdChange={setThreshold} />
    ) : (
      <EmptyStateScreen
        accounts={scoredAccounts}
        threshold={threshold}
        onLowerThreshold={setThreshold}
        onWidenIcp={() => dispatch({ type: "go_to_step", step: 1 })}
      />
    );
    footer = (
      <OnboardingFooter
        caption={`Run complete · ${scoredAccounts.length} scored`}
        secondary={
          finishAttempted ? (
            <SecondaryButton
              onClick={() => {
                router.replace("/score");
                router.refresh();
              }}
            >
              Continue anyway
            </SecondaryButton>
          ) : scoredAccounts.length > 0 ? (
            <SecondaryButton onClick={() => downloadCsv(hasCleared ? visibleAccounts : scoredAccounts)}>
              Export CSV
            </SecondaryButton>
          ) : undefined
        }
        primary={
          <PrimaryButton disabled={saveStatus === "saving"} onClick={() => void finishWithWatchlist(hasCleared ? visibleAccounts : [])}>
            {saveStatus === "saving"
              ? "Saving..."
              : hasCleared
                ? `Take these ${visibleAccounts.length} into my workspace`
                : "Continue to dashboard"}
          </PrimaryButton>
        }
      />
    );
  }

  const banner = readOnlyPreview ? (
    <div
      role="status"
      className="flex flex-none items-center gap-2 border-b border-white/[0.08] bg-white/[0.03] px-12 py-3 text-[13px] text-[#a0a0a0]"
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.07em] text-[#666]">Preview</span>
      <span>Layout preview only — sign in to score accounts or save a workspace.</span>
    </div>
  ) : (saveError ?? notice) ? (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex flex-none items-center justify-between gap-3 border-b px-12 py-3 text-[13px] ${
        saveError
          ? "border-[#f87171]/25 bg-[#f87171]/[0.08] text-[#fca5a5]"
          : "border-[#f5b544]/25 bg-[#f5b544]/[0.08] text-[#f5b544]"
      }`}
    >
      <p>{saveError ?? notice}</p>
      {saveError ? (
        <button
          type="button"
          onClick={() => void finishWithWatchlist(hasCleared ? visibleAccounts : [])}
          className="shrink-0 rounded-lg border border-[#f87171]/30 px-3 py-1.5 font-medium hover:bg-[#f87171]/10"
        >
          Try again
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setNotice(null)}
          aria-label="Dismiss"
          className="shrink-0 px-2 text-[#f5b544]/70 hover:text-[#f5b544]"
        >
          ×
        </button>
      )}
    </div>
  ) : null;

  return (
    <OnboardingShell
      phase={phase}
      showLedger
      credits={creditsRemaining}
      email={email}
      banner={banner}
      footer={footer}
    >
      {content}
    </OnboardingShell>
  );
}
