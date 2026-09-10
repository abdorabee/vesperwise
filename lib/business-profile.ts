import { z } from "zod";

import type { BusinessProfile } from "@/lib/types";

const requiredText = z.string().trim().min(1);
const optionalText = z.string().trim().optional();

/** Onboarding screen 2 requires at least one seed domain, and allows up to this many. */
export const MAX_SEED_DOMAINS = 5;

/** Longest workspace name the `users.workspace_name` column and this schema accept. */
export const WORKSPACE_NAME_MAX = 120;

/**
 * Approximates the acceptance rules of lib/score-service.ts's canonicalizeDomain
 * without importing it (that module pulls in server-only Supabase/env code that
 * must not enter the client bundle this schema also validates in).
 *
 * Exported so onboarding can check a domain at entry time rather than letting
 * a bad one pass every step and only fail on the final save.
 */
export const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

const domainShape = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(253)
  .regex(DOMAIN_PATTERN, "Enter a valid domain, like example.com");

export function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Trims, drops blanks, and case-insensitively dedupes a free-form chip list. */
export function cleanStringList(list: unknown): string[] {
  if (!Array.isArray(list)) return [];

  const seen = new Set<string>();
  return list.flatMap((item) => {
    if (typeof item !== "string") return [];
    const value = item.trim();
    const key = value.toLocaleLowerCase();
    if (!value || seen.has(key)) return [];
    seen.add(key);
    return [value];
  });
}

/**
 * Reduces what someone realistically pastes — "https://Stripe.com/pricing",
 * "www.stripe.com", "stripe.com:443" — down to the bare host the scoring
 * pipeline expects, so a copied URL isn't rejected as a malformed domain.
 */
export function normalizeDomainInput(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z\d+.-]*:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

/** Normalizes and dedupes candidate seed domains; shape is checked by DOMAIN_PATTERN. */
export function cleanDomainList(list: unknown): string[] {
  const seen = new Set<string>();
  return cleanStringList(list)
    .map(normalizeDomainInput)
    .filter((domain) => {
      if (!domain || seen.has(domain)) return false;
      seen.add(domain);
      return true;
    })
    .slice(0, MAX_SEED_DOMAINS);
}

/**
 * The 11 ICP fields, kept as a plain shape so the stored contract and the
 * partial Settings contract below are provably the same set of rules rather
 * than two hand-maintained copies.
 *
 * workspace_name is deliberately not here: it is an account attribute owned by
 * /api/user/account, and an ICP save must never be able to move it.
 */
const icpShape = {
  product_category: requiredText,
  target_industries: z.array(requiredText).min(1),
  company_size: requiredText,
  buyer_role: optionalText,
  sales_motion: optionalText,
  deal_size: optionalText,
  sales_cycle: optionalText,
  geography: z.array(requiredText).optional(),
  tech_stack_include: z.array(requiredText).optional(),
  tech_stack_exclude: z.array(requiredText).optional(),
  seed_domains: z.array(domainShape).min(1).max(MAX_SEED_DOMAINS).optional(),
};

/** The stored contract for `users.business_profile`. */
const businessProfileShape = {
  ...icpShape,
  workspace_name: z.string().trim().min(1).max(WORKSPACE_NAME_MAX).optional(),
};

/** Validation contract used by profile writes. Unknown fields are retained. */
export const businessProfileSchema = z.object(businessProfileShape).passthrough();

export const profileUpdateSchema = z.object({
  business_profile: businessProfileSchema,
}).passthrough();

/**
 * Settings ICP saves. Every field is optional and unknown keys are dropped (a
 * plain object, not passthrough) — required-ness is enforced against the MERGED
 * profile in mergeBusinessProfile, so a partial save need not resend every
 * required field but still cannot leave the stored profile invalid.
 */
export const businessProfilePatchSchema = z
  .object(icpShape)
  .partial()
  .extend({
    // Clearing the list is `[]`, which the stored schema (absent, or 1..MAX)
    // cannot express. mergeBusinessProfile drops the key instead, so the row
    // keeps the shape buildBusinessProfile would have written.
    seed_domains: z.array(domainShape).max(MAX_SEED_DOMAINS).optional(),
  });

export const profilePatchSchema = z.object({
  business_profile: businessProfilePatchSchema,
});

export type BusinessProfilePatch = z.infer<typeof businessProfilePatchSchema>;

export interface ProfileIssue {
  path: string;
  message: string;
}

export type ProfileMergeResult =
  | { ok: true; profile: BusinessProfile }
  | { ok: false; issues: ProfileIssue[] };

/**
 * Optional lists that buildBusinessProfile omits when empty rather than storing
 * as `[]`. A patch sending one of them empty means "clear it", which we express
 * by removing the key so Settings rows keep the shape onboarding writes.
 */
const CLEARABLE_LISTS = [
  "geography",
  "tech_stack_include",
  "tech_stack_exclude",
  "seed_domains",
] as const;

/**
 * Applies a partial Settings edit on top of the stored profile and validates the
 * result. Stored-but-unpatched keys survive — including `workspace_name` and any
 * legacy passthrough fields — because the patch schema cannot name them.
 */
export function mergeBusinessProfile(
  stored: unknown,
  patch: BusinessProfilePatch
): ProfileMergeResult {
  const base =
    stored && typeof stored === "object" && !Array.isArray(stored)
      ? { ...(stored as Record<string, unknown>) }
      : {};

  const merged: Record<string, unknown> = { ...base, ...patch };

  if (patch.target_industries) {
    merged.target_industries = cleanStringList(patch.target_industries);
  }
  for (const key of ["geography", "tech_stack_include", "tech_stack_exclude"] as const) {
    if (patch[key]) merged[key] = cleanStringList(patch[key]);
  }
  if (patch.seed_domains) merged.seed_domains = cleanDomainList(patch.seed_domains);

  for (const key of CLEARABLE_LISTS) {
    const value = merged[key];
    if (Array.isArray(value) && value.length === 0) delete merged[key];
  }

  const parsed = businessProfileSchema.safeParse(merged);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  return { ok: true, profile: parsed.data as BusinessProfile };
}

/**
 * Sanitize persisted legacy profiles before they influence profile hashes or
 * ICP fit. Blank industry entries are dropped for compatibility, but a profile
 * with no remaining industry is incomplete and normalizes to null.
 */
export function normalizeBusinessProfile(
  profile: BusinessProfile | null | undefined
): BusinessProfile | null {
  if (!profile || !Array.isArray(profile.target_industries)) return null;

  const seenIndustries = new Set<string>();
  const targetIndustries = profile.target_industries.flatMap((industry) => {
    if (typeof industry !== "string") return [];
    const trimmed = industry.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seenIndustries.has(key)) return [];
    seenIndustries.add(key);
    return [trimmed];
  });

  const parsed = businessProfileSchema.safeParse({
    ...profile,
    target_industries: targetIndustries,
  });

  return parsed.success ? parsed.data as BusinessProfile : null;
}
