"use client";

import { OnboardingRail } from "@/components/onboarding/onboarding-shell";
import type { BusinessProfile } from "@/lib/types";
import type { OnboardingFieldErrors } from "@/lib/onboarding-profile";

const PLAN = [
  { n: "01", title: "Name the workspace", sub: "A few seconds. You're here." },
  { n: "02", title: "Define who counts as a fit", sub: "Four rules, plus the accounts you already care about." },
  { n: "03", title: "Keep or drop signal sources", sub: "Six are already on. Nothing to connect." },
  { n: "04", title: "See scored accounts", sub: "Before you enter the app. That's the deal." },
] as const;

export function WorkspaceSetupScreen({
  profile,
  emailDomain,
  errors,
  onUpdateField,
}: {
  profile: BusinessProfile;
  emailDomain: string | null;
  errors: OnboardingFieldErrors;
  onUpdateField: (field: "workspace_name" | "product_category", value: string) => void;
}) {
  return (
    <>
      <div className="overflow-y-auto p-12 pb-0">
        <div className="max-w-[520px]">
          <h1 className="m-0 font-sans text-[28px] font-semibold leading-[1.2] tracking-[-0.03em]">
            A few details, then you see <span className="text-[var(--brand)]">accounts</span>.
          </h1>
          <p className="mt-3 max-w-[520px] text-[13px] leading-[1.6] text-[#a0a0a0]">
            Name your workspace and tell us what you sell. Nothing you enter is lost between steps.
          </p>

          <div className="mt-12 flex max-w-[520px] flex-col gap-6">
            <div>
              <label htmlFor="workspace-name" className="block font-mono text-[11px] uppercase tracking-[0.07em] text-[#666]">
                Workspace
              </label>
              <input
                id="workspace-name"
                value={profile.workspace_name ?? ""}
                onChange={(event) => onUpdateField("workspace_name", event.target.value)}
                placeholder="Your company or team name"
                aria-describedby={errors.workspace_name ? "workspace-name-error" : undefined}
                className="mt-2 h-10 w-full rounded-lg border border-white/[0.08] bg-[#111] px-3 font-sans text-[15px] font-medium text-white placeholder:text-[#555b63] focus:border-[color:var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
              />
              {errors.workspace_name && (
                <p id="workspace-name-error" className="mt-2 text-[13px] text-red-300">
                  {errors.workspace_name}
                </p>
              )}
            </div>

            {emailDomain && (
              <div>
                <span className="block font-mono text-[11px] uppercase tracking-[0.07em] text-[#666]">Your domain</span>
                <div className="mt-2 flex h-10 items-center justify-between rounded-lg border border-[color:var(--brand-border)] bg-[#111] px-3">
                  <span className="font-mono text-[15px] font-medium text-white">{emailDomain}</span>
                  <span className="font-mono text-[11px] tracking-[0.05em] text-[#666]">FROM YOUR EMAIL</span>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="product-category" className="block font-mono text-[11px] uppercase tracking-[0.07em] text-[#666]">
                What you sell
              </label>
              <input
                id="product-category"
                value={profile.product_category}
                onChange={(event) => onUpdateField("product_category", event.target.value)}
                placeholder="e.g. B2B analytics for finance teams"
                aria-describedby={errors.product_category ? "product-category-error" : undefined}
                className="mt-2 h-10 w-full rounded-lg border border-white/[0.08] bg-[#111] px-3 font-sans text-[15px] font-medium text-white placeholder:text-[#555b63] focus:border-[color:var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
              />
              {errors.product_category && (
                <p id="product-category-error" className="mt-2 text-[13px] text-red-300">
                  {errors.product_category}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="teammates" className="block font-mono text-[11px] uppercase tracking-[0.07em] text-[#666]">
                Teammates <span className="text-[#4a4a4a]">— optional, invite later</span>
              </label>
              <input
                id="teammates"
                disabled
                placeholder="name@yourcompany.com, …"
                title="Coming soon"
                className="mt-2 h-10 w-full cursor-not-allowed rounded-lg border border-white/[0.08] bg-[#111] px-3 font-sans text-[15px] text-[#4a4a4a] placeholder:text-[#4a4a4a]"
              />
            </div>
          </div>
        </div>
      </div>

      <OnboardingRail title="What happens next">
        <div className="flex flex-col gap-4">
          {PLAN.map((p, i) => (
            <div key={p.n} className="grid grid-cols-[20px_1fr] items-start gap-3">
              <span className="font-mono text-[11px] leading-[1.5] tabular-nums" style={{ color: i === 0 ? "var(--brand)" : "#666" }}>
                {p.n}
              </span>
              <div>
                <div className="text-[13px] font-medium leading-[1.4] text-white">{p.title}</div>
                <div className="mt-1 text-[12px] leading-[1.5] text-[#666]">{p.sub}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto border-t border-white/[0.08] pt-6 text-[12px] leading-[1.6] text-[#666]">
          Every answer is saved the moment you make it. Leaving and coming back resumes on the same step.
        </div>
      </OnboardingRail>
    </>
  );
}
