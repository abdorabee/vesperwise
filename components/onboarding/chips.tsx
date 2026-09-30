"use client";

import { useState, type KeyboardEvent } from "react";

/** Wrapping chip multi-select — industries, geography. h=32px, matches the design's chip spec exactly. */
export function ChipMultiSelect({
  options,
  selected,
  onToggle,
  extras,
  onRemoveExtra,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  /** User-added values not in `options`; rendered as always-on removable chips. */
  extras?: string[];
  onRemoveExtra?: (value: string) => void;
}) {
  return (
    <>
      {options.map((option) => {
        const on = selected.some((v) => v.toLocaleLowerCase() === option.toLocaleLowerCase());
        return (
          <button
            key={option}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => onToggle(option)}
            className={`flex h-8 items-center rounded-lg border px-3 font-sans text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${
              on
                ? "border-white/[0.13] bg-white/[0.06] text-white"
                : "border-white/[0.08] bg-transparent text-[#a0a0a0] hover:border-white/[0.15] hover:bg-white/[0.04]"
            }`}
          >
            {option}
          </button>
        );
      })}
      {extras?.map((extra) => (
        <span
          key={extra}
          className="flex h-8 items-center gap-2 rounded-lg border border-white/[0.13] bg-white/[0.06] px-3 font-sans text-[13px] font-medium text-white"
        >
          {extra}
          {onRemoveExtra && (
            <button
              type="button"
              onClick={() => onRemoveExtra(extra)}
              aria-label={`Remove ${extra}`}
              className="text-[#666] hover:text-white"
            >
              ×
            </button>
          )}
        </span>
      ))}
    </>
  );
}

/** Single-select segmented control — company size. h=36px, border-right between segments. */
export function SegmentedControl({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  /** Optional display text per stored value; falls back to the value itself. */
  labels?: Record<string, string>;
}) {
  return (
    <div role="radiogroup" className="flex overflow-hidden rounded-lg border border-white/[0.08]">
      {options.map((option) => {
        const on = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option)}
            className={`flex min-h-9 min-w-0 flex-1 items-center justify-center border-r border-white/[0.08] px-2 py-1 text-center font-sans text-[11.5px] leading-[1.25] font-medium last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${
              on ? "bg-white/[0.06] text-white" : "text-[#a0a0a0] hover:bg-white/[0.03]"
            }`}
          >
            {labels?.[option] ?? option}
          </button>
        );
      })}
    </div>
  );
}

/** Type + Enter to add a removable chip — tech stack, seed domains. Matches the "tech stack" field spec: h=40px, bg #111. */
export function RemovableChipInput({
  values,
  onChange,
  placeholder,
  maxItems,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  maxItems?: number;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const value = draft.trim();
    if (!value) return;
    if (maxItems && values.length >= maxItems) return;
    if (values.some((v) => v.toLocaleLowerCase() === value.toLocaleLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...values, value]);
    setDraft("");
  }

  function remove(value: string) {
    onChange(values.filter((v) => v !== value));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }
  }

  const atLimit = Boolean(maxItems && values.length >= maxItems);

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-lg border border-white/[0.08] bg-[#111] px-3 py-1.5">
      {values.map((value) => (
        <span
          key={value}
          className="flex h-6 items-center gap-1.5 rounded-md bg-white/[0.06] px-2 font-mono text-[12px] font-medium text-white"
        >
          {value}
          <button
            type="button"
            onClick={() => remove(value)}
            aria-label={`Remove ${value}`}
            className="text-[#666] hover:text-white"
          >
            ×
          </button>
        </span>
      ))}
      {!atLimit && (
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          placeholder={placeholder}
          className="h-6 min-w-[120px] flex-1 bg-transparent font-sans text-[13px] text-white placeholder:text-[#4a4a4a] focus:outline-none"
        />
      )}
    </div>
  );
}
