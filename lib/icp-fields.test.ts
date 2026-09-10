import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { businessProfileSchema, MAX_SEED_DOMAINS } from "./business-profile";
import {
  buildIcpSummary,
  ICP_FIELDS,
  ICP_FIELDS_BY_KEY,
  ICP_GROUPS,
  icpCompletionCount,
  icpCustomValues,
  icpFieldsInGroup,
  type IcpFieldKey,
} from "./icp-fields";
import {
  BUYER_ROLE_OPTIONS,
  COMPANY_SIZE_OPTIONS,
  DEAL_SIZE_OPTIONS,
  EMPTY_BUSINESS_PROFILE,
  GEOGRAPHY_OPTIONS,
  INDUSTRY_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
  SALES_CYCLE_OPTIONS,
  SALES_MOTION_OPTIONS,
} from "./onboarding-profile";
import type { BusinessProfile } from "./types";

const COMPLETE_PROFILE: BusinessProfile = {
  product_category: "SaaS / Software",
  target_industries: ["Technology"],
  company_size: "Startups (1-50)",
  buyer_role: "VP / Director",
  sales_motion: "Outbound (cold outreach)",
  deal_size: "$5K - $25K",
  sales_cycle: "1-3 months",
  geography: ["United States"],
  tech_stack_include: ["Salesforce"],
  tech_stack_exclude: ["HubSpot"],
  seed_domains: ["stripe.com"],
};

describe("ICP_FIELDS coverage", () => {
  it("covers every editable BusinessProfile key exactly once", () => {
    const registryKeys = ICP_FIELDS.map((field) => field.key).sort();
    expect(new Set(registryKeys).size).toBe(ICP_FIELDS.length);

    // workspace_name is an account attribute, owned by /api/user/account.
    const profileKeys = Object.keys(EMPTY_BUSINESS_PROFILE)
      .filter((key) => key !== "workspace_name")
      .sort();

    expect(registryKeys).toEqual(profileKeys);
  });

  it("assigns every field to a declared group", () => {
    const groupIds = new Set(ICP_GROUPS.map((group) => group.id));
    for (const field of ICP_FIELDS) {
      expect(groupIds.has(field.group)).toBe(true);
    }
    expect(ICP_GROUPS.flatMap((group) => icpFieldsInGroup(group.id))).toHaveLength(
      ICP_FIELDS.length
    );
  });
});

describe("option arrays are shared, never re-typed", () => {
  // Reference identity, not deep equality — an inlined copy of the same strings
  // (which is what the deleted Memory page did) must fail this.
  it.each([
    ["product_category", PRODUCT_CATEGORY_OPTIONS],
    ["target_industries", INDUSTRY_OPTIONS],
    ["company_size", COMPANY_SIZE_OPTIONS],
    ["geography", GEOGRAPHY_OPTIONS],
    ["buyer_role", BUYER_ROLE_OPTIONS],
    ["sales_motion", SALES_MOTION_OPTIONS],
    ["deal_size", DEAL_SIZE_OPTIONS],
    ["sales_cycle", SALES_CYCLE_OPTIONS],
  ])("%s reuses the canonical option array", (key, options) => {
    const spec = ICP_FIELDS_BY_KEY[key as IcpFieldKey];
    expect(spec.control === "chip-input").toBe(false);
    if (spec.control === "chip-input") return;
    expect(spec.options).toBe(options);
  });

  it("keeps the seed-domain limit in step with the schema", () => {
    const spec = ICP_FIELDS_BY_KEY.seed_domains;
    expect(spec.control).toBe("chip-input");
    if (spec.control !== "chip-input") return;
    expect(spec.maxItems).toBe(MAX_SEED_DOMAINS);
  });
});

describe("required flags match the stored schema", () => {
  it.each(ICP_FIELDS.map((field) => [field.key, field.required] as const))(
    "%s",
    (key, required) => {
      const withoutField = { ...COMPLETE_PROFILE };
      delete withoutField[key];
      expect(businessProfileSchema.safeParse(withoutField).success).toBe(!required);
    }
  );
});

describe("affectsScoring matches what getProfileHash actually hashes", () => {
  // The hash is what invalidates the score cache. If a field starts feeding a
  // score without entering the hash, edits to it would silently serve stale
  // results — this pins the two together.
  const source = readFileSync(new URL("./score-service.ts", import.meta.url), "utf8");
  const start = source.indexOf("function getProfileHash(");
  const body = source.slice(start, source.indexOf("\nfunction ", start + 1));

  it("finds the hash function", () => {
    expect(start).toBeGreaterThan(-1);
    expect(body).toContain("sha256(");
  });

  it.each(ICP_FIELDS.map((field) => [field.key, field.affectsScoring] as const))(
    "%s",
    (key, affectsScoring) => {
      expect(body.includes(key)).toBe(affectsScoring);
    }
  );

  it("excludes the four context-only lists", () => {
    for (const key of [
      "geography",
      "tech_stack_include",
      "tech_stack_exclude",
      "seed_domains",
    ]) {
      expect(body).not.toContain(key);
      expect(ICP_FIELDS_BY_KEY[key as IcpFieldKey].affectsScoring).toBe(false);
    }
  });
});

describe("helpers", () => {
  it("counts only fields that carry a value", () => {
    expect(icpCompletionCount(COMPLETE_PROFILE)).toEqual({ set: 11, total: 11 });
    expect(icpCompletionCount(EMPTY_BUSINESS_PROFILE)).toEqual({ set: 0, total: 11 });
    expect(
      icpCompletionCount({ ...COMPLETE_PROFILE, geography: [], sales_cycle: "" })
    ).toEqual({ set: 9, total: 11 });
  });

  it("surfaces user-added industries as custom values", () => {
    const spec = ICP_FIELDS_BY_KEY.target_industries;
    expect(
      icpCustomValues(
        { ...COMPLETE_PROFILE, target_industries: ["Technology", "Maritime Logistics"] },
        spec
      )
    ).toEqual(["Maritime Logistics"]);
    expect(icpCustomValues(COMPLETE_PROFILE, spec)).toEqual([]);
  });

  it("restates the profile in plain English, and stays empty when unset", () => {
    const summary = buildIcpSummary(COMPLETE_PROFILE);
    expect(summary).toContain("You sell SaaS / Software");
    expect(summary).toContain("Technology");
    expect(summary.endsWith(".")).toBe(true);
    expect(buildIcpSummary(EMPTY_BUSINESS_PROFILE)).toBe("");
  });
});
