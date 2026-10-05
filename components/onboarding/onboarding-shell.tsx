"use client";

import type { ReactNode } from "react";

const PHASES = [
  { n: "01", label: "Workspace" },
  { n: "02", label: "ICP" },
  { n: "03", label: "Signals" },
  { n: "04", label: "Results" },
] as const;

function StepLedger({ phase }: { phase: number }) {
  return (
    <div className="flex items-center gap-1">
      {PHASES.map((p, i) => {
        const done = i < phase;
        const current = i === phase;
        return (
          <div
            key={p.n}
            className={`flex h-8 items-center gap-2 border-b px-3 ${
              current ? "border-[color:var(--brand)]" : "border-transparent"
            }`}
          >
            <span
              className={`font-mono text-[11px] tabular-nums ${
                current ? "text-[var(--brand)]" : done ? "text-[#666]" : "text-[#4a4a4a]"
              }`}
            >
              {p.n}
            </span>
            <span
              className={`text-[12px] font-medium tracking-[-0.01em] ${
                current ? "text-white" : done ? "text-[#a0a0a0]" : "text-[#4a4a4a]"
              }`}
            >
              {p.label}
            </span>
            {done && <span className="font-mono text-[10px] text-[#666]">✓</span>}
          </div>
        );
      })}
    </div>
  );
}

export function OnboardingHeader({
  phase,
  showLedger,
  credits,
  email,
}: {
  phase: number;
  showLedger: boolean;
  credits: number;
  email: string;
}) {
  return (
    <div className="flex h-[56px] flex-none items-center justify-between border-b border-white/[0.08] px-6">
      <div className="flex items-center gap-8">
        <div className="text-[15px] font-semibold tracking-[-0.03em]">
          VESPERWISE<span className="text-[var(--brand)]">.</span>
        </div>
        {showLedger && <StepLedger phase={phase} />}
      </div>
      <div className="flex items-center gap-4 text-xs">
        <span className="text-[#666]">{credits} credits</span>
        <span className="h-4 w-px bg-white/[0.08]" />
        <span className="text-[#a0a0a0]">{email}</span>
      </div>
    </div>
  );
}

export function OnboardingRail({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col overflow-y-auto border-l border-white/[0.08] bg-[#050505] p-6">
      <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-[#666]">{title}</div>
      <div className="mt-6 flex flex-1 flex-col">{children}</div>
    </div>
  );
}

export function RailRow({ label, value, valueColor = "#f7f8f8" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-white/[0.04] py-3 last:border-0">
      <div className="font-mono text-[11px] uppercase tracking-[0.06em] text-[#666]">{label}</div>
      <div className="text-[13px] leading-[1.45]" style={{ color: valueColor }}>
        {value}
      </div>
    </div>
  );
}

export function OnboardingFooter({
  caption,
  back,
  secondary,
  primary,
}: {
  caption: string;
  back?: { label: string; onClick: () => void; disabled?: boolean };
  secondary?: ReactNode;
  primary: ReactNode;
}) {
  return (
    <div className="flex h-[72px] flex-none items-center justify-between border-t border-white/[0.08] px-6">
      <div className="text-xs text-[#666]">{caption}</div>
      <div className="flex items-center gap-3">
        {back && (
          <button
            type="button"
            onClick={back.onClick}
            disabled={back.disabled}
            className="flex h-10 items-center justify-center rounded-lg border border-white/[0.08] bg-transparent px-4 text-[13px] font-medium text-[#a0a0a0] hover:border-white/[0.15] hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          >
            {back.label}
          </button>
        )}
        {secondary}
        {primary}
      </div>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 items-center justify-center rounded-lg bg-[var(--brand)] px-5 text-[13px] font-semibold text-[var(--on-brand)] hover:bg-[var(--brand)] hover:shadow-[0_0_0_3px_var(--brand-soft)] active:bg-[var(--brand-active)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  inert,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** Visually present but intentionally non-functional (no backend to call yet). */
  inert?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={inert ? undefined : onClick}
      disabled={disabled}
      title={inert ? "Coming soon" : undefined}
      className="flex h-10 items-center justify-center rounded-lg border border-white/[0.08] bg-transparent px-4 text-[13px] font-medium text-[#a0a0a0] hover:border-white/[0.15] hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
    >
      {children}
    </button>
  );
}

/**
 * Header + [content | 320px rail] grid + footer. `children` must be exactly
 * two elements: the screen's own left content (its own 48px padding) and an
 * <OnboardingRail>. The grid lives here, at zero gap, matching the design's
 * `flex:1;display:grid;grid-template-columns:1fr 320px` — the border-left on
 * OnboardingRail is the only visual separator, not a gap.
 */
export function OnboardingShell({
  phase,
  showLedger,
  credits,
  email,
  banner,
  footer,
  children,
}: {
  phase: number;
  showLedger: boolean;
  credits: number;
  email: string;
  /** Full-width notice between header and body. Kept out of the grid below so
   *  the grid always has exactly two children (content + rail). */
  banner?: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="onboarding-shell min-h-[100dvh] bg-black text-[#f7f8f8]">
      <div className="mx-auto flex min-h-[100dvh] max-w-[1280px] flex-col border-x border-white/[0.13]">
        <OnboardingHeader phase={phase} showLedger={showLedger} credits={credits} email={email} />
        {banner}
        <div className="grid flex-1 grid-cols-[1fr_320px] overflow-hidden">{children}</div>
        {footer}
      </div>
    </main>
  );
}
