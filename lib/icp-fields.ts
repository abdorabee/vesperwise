import { MAX_SEED_DOMAINS } from "./business-profile";
import {
  BUYER_ROLE_OPTIONS,
  COMPANY_SIZE_LABELS,
  COMPANY_SIZE_OPTIONS,
  DEAL_SIZE_OPTIONS,
  GEOGRAPHY_OPTIONS,
  INDUSTRY_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
  SALES_CYCLE_OPTIONS,
  SALES_MOTION_OPTIONS,
} from "./onboarding-profile";
import type { BusinessProfile } from "./types";

/**
 * The single source of truth for the Settings ICP form.
 *
 * Every option array below is IMPORTED, never typed here. The page this replaced
 * re-typed all seven lists inline, which is how they were free to drift from the
 * ones onboarding actually writes.
 */

/** BusinessProfile keys holding a single string. */
export type IcpTextField =
  | "product_category"
  | "company_size"
  | "buyer_role"
  | "sales_motion"
  | "deal_size"
  | "sales_cycle";

/** BusinessProfile keys holding a string[]. */
export type IcpListField =
  | "target_industries"
  | "geography"
  | "tech_stack_include"
  | "tech_stack_exclude"
  | "seed_domains";

export type IcpFieldKey = IcpTextField | IcpListField;

export const ICP_GROUPS = [
  { id: "what-you-sell", label: "What you sell" },
  { id: "who-you-target", label: "Who you target" },
  { id: "how-you-sell", label: "How you sell" },
  { id: "signals", label: "Signals" },
] as const;

export type IcpGroupId = (typeof ICP_GROUPS)[number]["id"];

interface IcpFieldBase {
  label: string;
  question: string;
  /** One-line explanation of what changing this actually does. */
  hint?: string;
  /**
   * True when the value feeds getProfileHash (lib/score-service.ts) and the
   * reasoning prompt — i.e. editing it can change a score. Pinned by
   * icp-fields.test.ts against the real hash function.
   */
  affectsScoring: boolean;
  /** True when businessProfileSchema rejects the field being absent or empty. */
  required: boolean;
  group: IcpGroupId;
}

/**
 * Discriminated on `control`, with each variant narrowing `key` to the matching
 * value shape — so a chip-input can only ever name a list field and a segmented
 * control only ever a text field, and the renderer can switch exhaustively.
 */
export type IcpFieldSpec =
  | (IcpFieldBase & {
      key: IcpTextField;
      control: "single-select";
      options: readonly string[];
    })
  | (IcpFieldBase & {
      key: IcpTextField;
      control: "segmented";
      options: readonly string[];
      labels?: Record<string, string>;
    })
  | (IcpFieldBase & {
      key: IcpListField;
      control: "multi-select";
      options: readonly string[];
      allowCustom: boolean;
    })
  | (IcpFieldBase & {
      key: IcpListField;
      control: "chip-input";
      placeholder: string;
      maxItems?: number;
      normalize?: "domain";
    });

export const ICP_FIELDS: readonly IcpFieldSpec[] = [
  {
    key: "product_category",
    control: "single-select",
    options: PRODUCT_CATEGORY_OPTIONS,
    label: "What you sell",
    question: "What best describes what you sell?",
    hint: "Frames every AI summary and recommended action.",
    affectsScoring: true,
    required: true,
    group: "what-you-sell",
  },
  {
    key: "target_industries",
    control: "multi-select",
    options: INDUSTRY_OPTIONS,
    allowCustom: true,
    label: "Target industries",
    question: "Which industries do you primarily sell into?",
    hint: "Sets the universe, and contributes 60% of ICP Fit.",
    affectsScoring: true,
    required: true,
    group: "who-you-target",
  },
  {
    key: "company_size",
    control: "segmented",
    options: COMPANY_SIZE_OPTIONS,
    labels: COMPANY_SIZE_LABELS,
    label: "Ideal company size",
    question: "What size companies are your ideal customers?",
    hint: "Contributes the other 40% of ICP Fit.",
    affectsScoring: true,
    required: true,
    group: "who-you-target",
  },
  {
    key: "geography",
    control: "multi-select",
    options: GEOGRAPHY_OPTIONS,
    allowCustom: false,
    label: "Geography",
    question: "Where are your buyers?",
    hint: "Narrows your match estimate. Does not change a score.",
    affectsScoring: false,
    required: false,
    group: "who-you-target",
  },
  {
    key: "buyer_role",
    control: "single-select",
    options: BUYER_ROLE_OPTIONS,
    label: "Primary buyer",
    question: "Who is your primary buyer?",
    hint: "Steers who the recommended action targets.",
    affectsScoring: true,
    required: false,
    group: "how-you-sell",
  },
  {
    key: "sales_motion",
    control: "single-select",
    options: SALES_MOTION_OPTIONS,
    label: "Sales motion",
    question: "How does your team primarily sell?",
    affectsScoring: true,
    required: false,
    group: "how-you-sell",
  },
  {
    key: "deal_size",
    control: "segmented",
    options: DEAL_SIZE_OPTIONS,
    label: "Deal size",
    question: "What's your typical deal size?",
    affectsScoring: true,
    required: false,
    group: "how-you-sell",
  },
  {
    key: "sales_cycle",
    control: "segmented",
    options: SALES_CYCLE_OPTIONS,
    label: "Sales cycle",
    question: "How long is your typical sales cycle?",
    hint: "Sets how much weight recent signals carry.",
    affectsScoring: true,
    required: false,
    group: "how-you-sell",
  },
  {
    key: "tech_stack_include",
    control: "chip-input",
    placeholder: "Add a tool…",
    label: "Tech stack",
    question: "What does your ICP already run?",
    hint: "A change in this stack is a buying window.",
    affectsScoring: false,
    required: false,
    group: "signals",
  },
  {
    key: "tech_stack_exclude",
    control: "chip-input",
    placeholder: "Exclude a tool…",
    label: "Disqualifying stack",
    question: "What rules an account out?",
    affectsScoring: false,
    required: false,
    group: "signals",
  },
  {
    key: "seed_domains",
    control: "chip-input",
    placeholder: "yourprospect.com",
    maxItems: MAX_SEED_DOMAINS,
    normalize: "domain",
    label: "Preview accounts",
    question: "Which domains should we score as examples?",
    hint: `Up to ${MAX_SEED_DOMAINS}. Used to preview your ICP, not to score automatically.`,
    affectsScoring: false,
    required: false,
    group: "signals",
  },
];

export const ICP_FIELDS_BY_KEY = Object.fromEntries(
  ICP_FIELDS.map((field) => [field.key, field])
) as Record<IcpFieldKey, IcpFieldSpec>;

export function icpFieldsInGroup(group: IcpGroupId): IcpFieldSpec[] {
  return ICP_FIELDS.filter((field) => field.group === group);
}

/** Value accessors split by shape, so neither returns a union the caller must narrow. */
export function icpTextValue(profile: BusinessProfile, key: IcpTextField): string {
  return profile[key] ?? "";
}

export function icpListValue(profile: BusinessProfile, key: IcpListField): string[] {
  return profile[key] ?? [];
}

export function isIcpFieldSet(profile: BusinessProfile, spec: IcpFieldSpec): boolean {
  return spec.control === "multi-select" || spec.control === "chip-input"
    ? icpListValue(profile, spec.key).length > 0
    : icpTextValue(profile, spec.key).trim().length > 0;
}

/** Drives the "8 of 11 set" meter without the form having to own the field list. */
export function icpCompletionCount(profile: BusinessProfile): {
  set: number;
  total: number;
} {
  return {
    set: ICP_FIELDS.filter((field) => isIcpFieldSet(profile, field)).length,
    total: ICP_FIELDS.length,
  };
}

/** Options a multi-select is holding that aren't in its canonical list (user-added industries). */
export function icpCustomValues(profile: BusinessProfile, spec: IcpFieldSpec): string[] {
  if (spec.control !== "multi-select") return [];
  const known = new Set(spec.options.map((option) => option.toLocaleLowerCase()));
  return icpListValue(profile, spec.key).filter(
    (value) => !known.has(value.toLocaleLowerCase())
  );
}

/** The plain-English restatement shown above the form. */
export function buildIcpSummary(profile: BusinessProfile): string {
  const parts: string[] = [];

  if (profile.product_category) parts.push(`You sell ${profile.product_category}`);

  if (profile.target_industries?.length) {
    const shown = profile.target_industries.slice(0, 2).join(" and ");
    const more =
      profile.target_industries.length > 2
        ? ` (+${profile.target_industries.length - 2} more)`
        : "";
    parts.push(`to ${shown}${more} companies`);
  }

  if (profile.company_size) parts.push(`of ${profile.company_size} size`);
  if (profile.geography?.length) parts.push(`in ${profile.geography.join(", ")}`);
  if (profile.buyer_role) parts.push(`with ${profile.buyer_role} buyers`);
  if (profile.deal_size) parts.push(`at ${profile.deal_size} deals`);
  if (profile.sales_cycle) parts.push(`and ${profile.sales_cycle} sales cycles`);

  return parts.length > 0 ? `${parts.join(", ")}.` : "";
}
