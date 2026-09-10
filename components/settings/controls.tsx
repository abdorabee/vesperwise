"use client";

import { useState, type KeyboardEvent } from "react";
import { Check, X } from "lucide-react";

/**
 * The same three controls onboarding uses, rebuilt against the design tokens.
 * components/onboarding/chips.tsx hardcodes dark-only hex (#111, #a0a0a0,
 * border-white/…), which is fine inside the dark onboarding shell but illegible
 * in the dashboard's light theme.
 */

export function ChipMultiSelect({
  options,
  selected,
  onToggle,
  extras,
  onRemoveExtra,
  name,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  /** User-added values not in `options`; always on, and removable. */
  extras?: string[];
  onRemoveExtra?: (value: string) => void;
  name?: string;
}) {
  return (
    <div className="chip-row" role="group" aria-label={name}>
      {options.map((option) => {
        const on = selected.some((v) => v.toLocaleLowerCase() === option.toLocaleLowerCase());
        return (
          <button
            key={option}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => onToggle(option)}
            className={`chip${on ? " on" : ""}`}
          >
            {on && <Check className="chip-ic" aria-hidden="true" />}
            {option}
          </button>
        );
      })}
      {extras?.map((extra) => (
        <span key={extra} className="chip on custom">
          {extra}
          {onRemoveExtra && (
            <button
              type="button"
              onClick={() => onRemoveExtra(extra)}
              aria-label={`Remove ${extra}`}
              className="chip-x"
            >
              <X className="chip-ic" aria-hidden="true" />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

export function SingleSelect({
  options,
  value,
  onChange,
  name,
}: {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  name?: string;
}) {
  return (
    <div className="chip-row" role="radiogroup" aria-label={name}>
      {options.map((option) => {
        const on = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={on}
            // Re-clicking the selected option clears it, so an optional field
            // can be unset without a separate "none" chip.
            onClick={() => onChange(on ? "" : option)}
            className={`chip${on ? " on" : ""}`}
          >
            {on && <Check className="chip-ic" aria-hidden="true" />}
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
  labels,
  name,
}: {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  /** Optional display text per stored value; falls back to the value itself. */
  labels?: Record<string, string>;
  name?: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={name}>
      {options.map((option) => {
        const on = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option)}
            className={`seg${on ? " on" : ""}`}
          >
            {labels?.[option] ?? option}
          </button>
        );
      })}
    </div>
  );
}

export function RemovableChipInput({
  values,
  onChange,
  placeholder,
  maxItems,
  normalize,
  name,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  maxItems?: number;
  /** Applied on commit — used to reduce a pasted URL to a bare domain. */
  normalize?: (value: string) => string;
  name?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const raw = draft.trim();
    if (!raw) return;
    const value = normalize ? normalize(raw) : raw;
    if (!value) {
      setDraft("");
      return;
    }
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
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
    }
    if (event.key === "Backspace" && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  const atLimit = Boolean(maxItems && values.length >= maxItems);

  return (
    <div className="chip-input">
      {values.map((value) => (
        <span key={value} className="chip-token">
          {value}
          <button
            type="button"
            onClick={() => remove(value)}
            aria-label={`Remove ${value}`}
            className="chip-x"
          >
            <X className="chip-ic" aria-hidden="true" />
          </button>
        </span>
      ))}
      {atLimit ? (
        <span className="chip-limit">Limit reached</span>
      ) : (
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          placeholder={placeholder}
          aria-label={name ?? placeholder}
        />
      )}
    </div>
  );
}
