"use client";

import { useState, type KeyboardEvent } from "react";

import { ChipMultiSelect, RemovableChipInput, SegmentedControl } from "@/components/onboarding/chips";
import { PdfFilledTag } from "@/components/onboarding/pdf-filled-tag";
import { OnboardingRail, RailRow } from "@/components/onboarding/onboarding-shell";
import type { PdfFilledMap } from "@/lib/onboarding-pdf-guards";
import {
  BUYER_ROLE_OPTIONS,
  COMPANY_SIZE_LABELS,
  COMPANY_SIZE_OPTIONS,
  DEAL_SIZE_OPTIONS,
  GEOGRAPHY_OPTIONS,
  INDUSTRY_OPTIONS,
  MAX_SEED_DOMAINS,
  SALES_CYCLE_OPTIONS,
  SALES_MOTION_OPTIONS,
} from "@/lib/onboarding-profile";
import { estimateIcpMatches } from "@/lib/icp-match-estimate";
import type { OnboardingFieldErrors } from "@/lib/onboarding-profile";
import type { BusinessProfile } from "@/lib/types";

type CommercialField = "buyer_role" | "sales_motion" | "deal_size" | "sales_cycle";

const COMMERCIAL_FIELDS: { field: CommercialField; label: string; options: readonly string[] }[] = [
  { field: "buyer_role", label: "Primary buyer", options: BUYER_ROLE_OPTIONS },
  { field: "sales_motion", label: "Sales motion", options: SALES_MOTION_OPTIONS },
  { field: "deal_size", label: "Deal size", options: DEAL_SIZE_OPTIONS },
  { field: "sales_cycle", label: "Sales cycle", options: SALES_CYCLE_OPTIONS },
];

function FieldLabel({ label, filled }: { label: string; filled?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <div className="font-mono text-[11px] uppercase tracking-[0.07em] text-[#666]">{label}</div>
      {filled && <PdfFilledTag />}
    </div>
  );
}

function SingleOptions({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div role="radiogroup" className="mt-3 flex flex-wrap gap-2">
      {options.map((option) => {
        const on = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on ? "" : option)}
            className={`flex h-8 items-center rounded-lg border px-3 font-sans text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${
              on
                ? "border-white/[0.13] bg-white/[0.06] text-white"
                : "border-white/[0.08] bg-transparent text-[#a0a0a0] hover:border-white/[0.15]"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function IcpDefinitionScreen({
  profile,
  errors,
  onToggleIndustry,
  onSetIndustries,
  onSetCompanySize,
  onToggleGeography,
  onSetTechInclude,
  onSetTechExclude,
  onSetSeedDomains,
  onUpdateCommercial,
  pdfFilled = {},
}: {
  profile: BusinessProfile;
  errors: OnboardingFieldErrors;
  onToggleIndustry: (industry: string) => void;
  onSetIndustries: (industries: string[]) => void;
  onSetCompanySize: (size: string) => void;
  onToggleGeography: (geo: string) => void;
  onSetTechInclude: (tools: string[]) => void;
  onSetTechExclude: (tools: string[]) => void;
  onSetSeedDomains: (domains: string[]) => void;
  onUpdateCommercial?: (field: CommercialField, value: string) => void;
  pdfFilled?: PdfFilledMap;
}) {
  const [customIndustry, setCustomIndustry] = useState("");
  const [addingIndustry, setAddingIndustry] = useState(false);
  const [showExclude, setShowExclude] = useState((profile.tech_stack_exclude ?? []).length > 0);
  const customIndustries = profile.target_industries.filter(
    (industry) => !INDUSTRY_OPTIONS.includes(industry as (typeof INDUSTRY_OPTIONS)[number])
  );

  function addCustomIndustry() {
    const value = customIndustry.trim();
    if (!value) return;
    if (!profile.target_industries.some((i) => i.toLocaleLowerCase() === value.toLocaleLowerCase())) {
      onSetIndustries([...profile.target_industries, value]);
    }
    setCustomIndustry("");
  }

  function onCustomIndustryKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomIndustry();
      setAddingIndustry(false);
    }
    if (event.key === "Escape") {
      setCustomIndustry("");
      setAddingIndustry(false);
    }
  }

  const estimate = estimateIcpMatches(profile);
  const showCommercial = COMMERCIAL_FIELDS.some(
    (field) => pdfFilled[field.field] || Boolean(profile[field.field]?.trim())
  );

  return (
    <>
      <div className="min-w-0 overflow-y-auto p-6 pb-0 sm:p-12 sm:pb-0">
        <div className="flex items-end justify-between gap-8">
            <div>
              <h1 className="m-0 font-sans text-[28px] font-semibold leading-[1.2] tracking-[-0.03em]">
                Who counts as a <span className="text-[var(--brand)]">fit</span>.
              </h1>
              <p className="mt-3 max-w-[520px] text-[13px] leading-[1.6] text-[#a0a0a0]">
                These rules set the universe we watch. Tighter is better — you can widen it after the first run.
              </p>
            </div>
            <div className="flex-none text-right">
              <div className="font-mono text-[44px] font-medium leading-none tracking-[-0.03em] text-[var(--brand)] tabular-nums">
                {estimate.toLocaleString()}
              </div>
              <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.07em] text-[#666]">accounts match</div>
              <div className="mt-1.5 text-[12px] text-[#666]">estimate, not a live count</div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-8">
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <FieldLabel label="Industry" filled={pdfFilled.target_industries} />
                <div className="text-[12px] text-[#4a4a4a]">Sets the universe</div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ChipMultiSelect
                  options={INDUSTRY_OPTIONS}
                  selected={profile.target_industries}
                  onToggle={onToggleIndustry}
                  extras={customIndustries}
                  onRemoveExtra={(industry) => onToggleIndustry(industry)}
                />
                {addingIndustry ? (
                  <input
                    autoFocus
                    value={customIndustry}
                    onChange={(event) => setCustomIndustry(event.target.value)}
                    onKeyDown={onCustomIndustryKeyDown}
                    onBlur={() => {
                      addCustomIndustry();
                      setAddingIndustry(false);
                    }}
                    placeholder="Industry name…"
                    className="h-8 w-[150px] rounded-lg border border-[color:var(--brand-border)] bg-[#111] px-3 font-sans text-[13px] text-white placeholder:text-[#4a4a4a] focus:outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingIndustry(true)}
                    className="flex h-8 items-center rounded-lg border border-dashed border-white/[0.13] px-3 font-sans text-[13px] font-medium text-[#666] hover:border-white/[0.25] hover:text-[#a0a0a0]"
                  >
                    + Add
                  </button>
                )}
              </div>
              {errors.target_industries && <p className="mt-2 text-[13px] text-red-300">{errors.target_industries}</p>}
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <FieldLabel label="Company size" filled={pdfFilled.company_size} />
                  <div className="text-[12px] text-[#4a4a4a]">Weights hiring signals</div>
                </div>
                <div className="mt-3">
                  <SegmentedControl
                    options={COMPANY_SIZE_OPTIONS}
                    value={profile.company_size}
                    onChange={onSetCompanySize}
                    labels={COMPANY_SIZE_LABELS}
                  />
                </div>
                {errors.company_size && <p className="mt-2 text-[13px] text-red-300">{errors.company_size}</p>}
              </div>
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <FieldLabel label="Geography" filled={pdfFilled.geography} />
                  <div className="text-[12px] text-[#4a4a4a]">Filters news sources</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ChipMultiSelect options={GEOGRAPHY_OPTIONS} selected={profile.geography ?? []} onToggle={onToggleGeography} />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-3">
                <FieldLabel label="Tech stack" filled={pdfFilled.tech_stack_include} />
                <div className="text-[12px] text-[#4a4a4a]">
                  Strongest single predictor — a stack change is a buying window
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1">
                  <RemovableChipInput values={profile.tech_stack_include ?? []} onChange={onSetTechInclude} placeholder="Add a tool…" />
                </div>
                {!showExclude && (
                  <button
                    type="button"
                    onClick={() => setShowExclude(true)}
                    className="flex h-10 flex-none items-center justify-center rounded-lg border border-white/[0.08] bg-transparent px-4 font-sans text-[13px] font-medium text-[#a0a0a0] hover:border-white/[0.15]"
                  >
                    Exclude a tool
                  </button>
                )}
              </div>
              {showExclude && (
                <div className="mt-2">
                  <div className="mb-1.5 flex items-baseline gap-2 text-[12px] text-[#4a4a4a]">
                    Disqualifies a candidate
                    {pdfFilled.tech_stack_exclude && <PdfFilledTag />}
                  </div>
                  <RemovableChipInput values={profile.tech_stack_exclude ?? []} onChange={onSetTechExclude} placeholder="Exclude a tool…" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <div className="font-mono text-[11px] uppercase tracking-[0.07em] text-[#666]">
                    Preview accounts <span className="normal-case text-[#4a4a4a]">— required, at least one</span>
                  </div>
                  {pdfFilled.seed_domains && <PdfFilledTag />}
                </div>
                <div className="text-[12px] text-[#4a4a4a]">Up to {MAX_SEED_DOMAINS}, scored for real</div>
              </div>
              <p className="mt-2 text-[12px] leading-[1.5] text-[#666]">
                Add a domain you actually care about — this is what gets scored live in the next two steps.
              </p>
              <div className="mt-3">
                <RemovableChipInput
                  values={profile.seed_domains ?? []}
                  onChange={onSetSeedDomains}
                  placeholder="yourprospect.com"
                  maxItems={MAX_SEED_DOMAINS}
                />
              </div>
              {errors.seed_domains && <p className="mt-2 text-[13px] text-red-300">{errors.seed_domains}</p>}
            </div>

            {showCommercial && onUpdateCommercial && (
              <div className="flex flex-col gap-6 border-t border-white/[0.08] pt-8">
                {COMMERCIAL_FIELDS.map((field) => (
                  <div key={field.field}>
                    <FieldLabel label={field.label} filled={pdfFilled[field.field]} />
                    <SingleOptions
                      options={field.options}
                      value={profile[field.field] ?? ""}
                      onChange={(value) => onUpdateCommercial(field.field, value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>

      <OnboardingRail title="Your calibration">
        <div className="flex flex-col">
          <RailRow label="Sells" value={profile.product_category || "Not set"} />
          <RailRow label="Industry" value={profile.target_industries.join(" + ") || "Not set"} />
          <RailRow
            label="Size"
            value={profile.company_size ? COMPANY_SIZE_LABELS[profile.company_size] ?? profile.company_size : "Not set"}
          />
          <RailRow label="Geography" value={(profile.geography ?? []).join(" + ") || "Anywhere"} />
          <RailRow label="Stack" value={(profile.tech_stack_include ?? []).join(", ") || "Any"} />
        </div>
        <div className="mt-auto pt-6 text-[12px] leading-[1.6] text-[#666]">
          Carried into every screen after this one. Change it any time from the header.
        </div>
      </OnboardingRail>
    </>
  );
}
