import {
  businessProfileSchema,
  cleanDomainList,
  cleanStringList,
  cleanText,
  DOMAIN_PATTERN,
  MAX_SEED_DOMAINS,
  normalizeDomainInput,
} from "./business-profile";
import type { BusinessProfile } from "./types";

// Re-exported so the onboarding screens keep importing them from here.
export { MAX_SEED_DOMAINS, normalizeDomainInput };

export const PRODUCT_CATEGORY_OPTIONS = [
  "SaaS / Software",
  "Consulting / Services",
  "Hardware / Physical",
  "Marketplace / Platform",
] as const;

export const INDUSTRY_OPTIONS = [
  "Technology",
  "Financial Services",
  "Healthcare",
  "E-commerce / Retail",
  "Manufacturing",
  "Education",
] as const;

export const COMPANY_SIZE_OPTIONS = [
  "Startups (1-50)",
  "SMB (51-200)",
  "Mid-Market (201-1000)",
  "Enterprise (1000+)",
] as const;

/**
 * Display-only labels for the onboarding segmented control. The stored values
 * above are unchanged so existing `business_profile.company_size` rows keep
 * matching an option; only the rendered text differs.
 */
export const COMPANY_SIZE_LABELS: Record<string, string> = {
  "Startups (1-50)": "Startups 1–50",
  "SMB (51-200)": "SMB 51–200",
  "Mid-Market (201-1000)": "Mid-Market 201–1,000",
  "Enterprise (1000+)": "Enterprise 1,000+",
};

export const GEOGRAPHY_OPTIONS = [
  "United States",
  "United Kingdom",
  "Canada",
  "DACH",
  "Nordics",
  "ANZ",
] as const;

export const BUYER_ROLE_OPTIONS = [
  "C-Suite / Founders",
  "VP / Director",
  "Manager / Team Lead",
  "Individual Contributor",
] as const;

export const SALES_MOTION_OPTIONS = [
  "Outbound (cold outreach)",
  "Inbound (content/SEO/ads)",
  "Product-Led Growth",
  "Channel / Partners",
] as const;

export const DEAL_SIZE_OPTIONS = [
  "< $5K",
  "$5K - $25K",
  "$25K - $100K",
  "$100K+",
] as const;

export const SALES_CYCLE_OPTIONS = [
  "< 2 weeks",
  "2-4 weeks",
  "1-3 months",
  "3+ months",
] as const;

/** 0=Workspace, 1=ICP, 2=Signals, 3=Run, 4=Outcome (results or empty-state, chosen by data). */
export const MAX_STEP = 4;

export const EMPTY_BUSINESS_PROFILE: BusinessProfile = {
  product_category: "",
  target_industries: [],
  company_size: "",
  buyer_role: "",
  sales_motion: "",
  deal_size: "",
  sales_cycle: "",
  geography: [],
  tech_stack_include: [],
  tech_stack_exclude: [],
  seed_domains: [],
  workspace_name: "",
};

type TextProfileField = Exclude<
  keyof BusinessProfile,
  "target_industries" | "geography" | "tech_stack_include" | "tech_stack_exclude" | "seed_domains"
>;

export type OnboardingFieldErrors = Partial<Record<keyof BusinessProfile, string>>;

export interface OnboardingState {
  step: number;
  profile: BusinessProfile;
  saveStatus: "idle" | "saving" | "error";
  saveError: string | null;
}

export type OnboardingAction =
  | { type: "update_field"; field: TextProfileField; value: string }
  | { type: "set_industries"; industries: string[] }
  | { type: "toggle_industry"; industry: string }
  | { type: "set_geography"; geography: string[] }
  | { type: "toggle_geography"; geo: string }
  | { type: "set_tech_stack_include"; tools: string[] }
  | { type: "set_tech_stack_exclude"; tools: string[] }
  | { type: "set_seed_domains"; domains: string[] }
  | { type: "next_step" }
  | { type: "previous_step" }
  | { type: "go_to_step"; step: number }
  | { type: "save_started" }
  | { type: "save_failed"; message: string };

/**
 * Case-insensitively adds or removes one value. Computed from reducer state
 * (not from a render-time closure) so two rapid toggles can't clobber each
 * other when React batches the dispatches.
 */
function toggleInList(list: string[], value: string): string[] {
  const key = value.toLocaleLowerCase();
  return list.some((item) => item.toLocaleLowerCase() === key)
    ? list.filter((item) => item.toLocaleLowerCase() !== key)
    : [...list, value];
}

export function createOnboardingState(
  profile: Partial<BusinessProfile> | null = null
): OnboardingState {
  return {
    step: 0,
    profile: {
      product_category: cleanText(profile?.product_category),
      target_industries: cleanStringList(profile?.target_industries),
      company_size: cleanText(profile?.company_size),
      buyer_role: cleanText(profile?.buyer_role),
      sales_motion: cleanText(profile?.sales_motion),
      deal_size: cleanText(profile?.deal_size),
      sales_cycle: cleanText(profile?.sales_cycle),
      geography: cleanStringList(profile?.geography),
      tech_stack_include: cleanStringList(profile?.tech_stack_include),
      tech_stack_exclude: cleanStringList(profile?.tech_stack_exclude),
      seed_domains: cleanDomainList(profile?.seed_domains),
      workspace_name: cleanText(profile?.workspace_name),
    },
    saveStatus: "idle",
    saveError: null,
  };
}

export function buildBusinessProfile(
  profile: BusinessProfile
): BusinessProfile | null {
  const geography = cleanStringList(profile.geography);
  const techInclude = cleanStringList(profile.tech_stack_include);
  const techExclude = cleanStringList(profile.tech_stack_exclude);
  const seedDomains = cleanDomainList(profile.seed_domains);
  const workspaceName = cleanText(profile.workspace_name);

  const parsed = businessProfileSchema.safeParse({
    product_category: cleanText(profile.product_category),
    target_industries: cleanStringList(profile.target_industries),
    company_size: cleanText(profile.company_size),
    buyer_role: cleanText(profile.buyer_role),
    sales_motion: cleanText(profile.sales_motion),
    deal_size: cleanText(profile.deal_size),
    sales_cycle: cleanText(profile.sales_cycle),
    // Only include the new optional fields when they carry a real value, so a
    // profile built without them round-trips to exactly its original shape.
    ...(geography.length > 0 ? { geography } : {}),
    ...(techInclude.length > 0 ? { tech_stack_include: techInclude } : {}),
    ...(techExclude.length > 0 ? { tech_stack_exclude: techExclude } : {}),
    ...(seedDomains.length > 0 ? { seed_domains: seedDomains } : {}),
    ...(workspaceName ? { workspace_name: workspaceName } : {}),
  });

  return parsed.success ? (parsed.data as BusinessProfile) : null;
}

export function validateOnboardingStep(
  step: number,
  profile: BusinessProfile
): OnboardingFieldErrors {
  const errors: OnboardingFieldErrors = {};

  if (step === 0) {
    if (!cleanText(profile.workspace_name)) {
      errors.workspace_name = "Name your workspace to continue.";
    }
    // businessProfileSchema requires this, so it must be caught here rather
    // than at the final save — otherwise the whole flow completes and only
    // the last click fails.
    if (!cleanText(profile.product_category)) {
      errors.product_category = "Tell us what you sell to continue.";
    }
  }

  if (step === 1) {
    if (cleanStringList(profile.target_industries).length === 0) {
      errors.target_industries = "Choose at least one target industry.";
    }
    if (!cleanText(profile.company_size)) {
      errors.company_size = "Choose an ideal company size.";
    }
    const domains = cleanDomainList(profile.seed_domains);
    if (domains.length === 0) {
      errors.seed_domains = "Add at least one domain you want to see scored.";
    } else {
      const invalid = domains.filter((domain) => !DOMAIN_PATTERN.test(domain));
      if (invalid.length > 0) {
        errors.seed_domains = `Not a valid domain: ${invalid.join(", ")}. Use a form like example.com.`;
      }
    }
  }

  return errors;
}

/**
 * The first step that still has a validation error, or null when the profile
 * is complete. Lets the finish action send someone back to the screen that
 * actually needs attention instead of stranding them on the results page.
 */
export function findIncompleteStep(profile: BusinessProfile): number | null {
  for (const step of [0, 1]) {
    if (Object.keys(validateOnboardingStep(step, profile)).length > 0) return step;
  }
  return null;
}

export const STEP_LABELS = ["Workspace", "ICP", "Signals"] as const;

export function getOnboardingRedirect(
  onboardingCompleted: boolean,
  destination: "dashboard" | "onboarding"
): "/dashboard" | "/onboarding" | null {
  if (destination === "dashboard" && !onboardingCompleted) {
    return "/onboarding";
  }
  if (destination === "onboarding" && onboardingCompleted) {
    return "/dashboard";
  }
  return null;
}

export function onboardingReducer(
  state: OnboardingState,
  action: OnboardingAction
): OnboardingState {
  switch (action.type) {
    case "update_field":
      return {
        ...state,
        profile: { ...state.profile, [action.field]: action.value },
        saveStatus: "idle",
        saveError: null,
      };
    case "set_industries":
      return {
        ...state,
        profile: { ...state.profile, target_industries: action.industries },
        saveStatus: "idle",
        saveError: null,
      };
    case "toggle_industry":
      return {
        ...state,
        profile: {
          ...state.profile,
          target_industries: toggleInList(state.profile.target_industries, action.industry),
        },
        saveStatus: "idle",
        saveError: null,
      };
    case "toggle_geography":
      return {
        ...state,
        profile: {
          ...state.profile,
          geography: toggleInList(state.profile.geography ?? [], action.geo),
        },
        saveStatus: "idle",
        saveError: null,
      };
    case "set_geography":
      return {
        ...state,
        profile: { ...state.profile, geography: action.geography },
        saveStatus: "idle",
        saveError: null,
      };
    case "set_tech_stack_include":
      return {
        ...state,
        profile: { ...state.profile, tech_stack_include: action.tools },
        saveStatus: "idle",
        saveError: null,
      };
    case "set_tech_stack_exclude":
      return {
        ...state,
        profile: { ...state.profile, tech_stack_exclude: action.tools },
        saveStatus: "idle",
        saveError: null,
      };
    case "set_seed_domains":
      return {
        ...state,
        profile: { ...state.profile, seed_domains: action.domains.slice(0, MAX_SEED_DOMAINS) },
        saveStatus: "idle",
        saveError: null,
      };
    case "next_step":
      return { ...state, step: Math.min(MAX_STEP, state.step + 1) };
    case "previous_step":
      return { ...state, step: Math.max(0, state.step - 1) };
    case "go_to_step":
      return { ...state, step: Math.min(MAX_STEP, Math.max(0, action.step)) };
    case "save_started":
      return { ...state, saveStatus: "saving", saveError: null };
    case "save_failed":
      return { ...state, saveStatus: "error", saveError: action.message };
  }
}
