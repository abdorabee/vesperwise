import { describe, expect, it } from "vitest";

import {
  businessProfilePatchSchema,
  mergeBusinessProfile,
  normalizeBusinessProfile,
  profileUpdateSchema,
} from "./business-profile";
import { buildBusinessProfile } from "./onboarding-profile";
import type { BusinessProfile } from "./types";

const VALID_PROFILE: BusinessProfile = {
  product_category: "Sales Intelligence",
  target_industries: ["Technology"],
  company_size: "Mid-Market (201-1000)",
  buyer_role: "VP / Director",
  sales_motion: "Sales-led",
  deal_size: "$25k-$100k",
  sales_cycle: "1-3 months",
};

describe("normalizeBusinessProfile", () => {
  it("treats an all-blank industry list as an incomplete ICP", () => {
    expect(normalizeBusinessProfile({
      ...VALID_PROFILE,
      target_industries: ["", "   "],
    })).toBeNull();
  });

  it("cleans blank and duplicate legacy industries when a valid one remains", () => {
    expect(normalizeBusinessProfile({
      ...VALID_PROFILE,
      product_category: "  Sales Intelligence  ",
      target_industries: [" Technology ", "", "technology"],
    })).toMatchObject({
      product_category: "Sales Intelligence",
      target_industries: ["Technology"],
    });
  });
});

describe("profileUpdateSchema", () => {
  it("rejects profile PUT payloads containing blank industries", () => {
    const result = profileUpdateSchema.safeParse({
      business_profile: {
        ...VALID_PROFILE,
        target_industries: ["   "],
      },
    });

    expect(result.success).toBe(false);
  });

  it("accepts and trims a complete profile PUT payload", () => {
    const result = profileUpdateSchema.safeParse({
      business_profile: {
        ...VALID_PROFILE,
        product_category: "  Sales Intelligence ",
        target_industries: [" Technology "],
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.business_profile).toMatchObject({
        product_category: "Sales Intelligence",
        target_industries: ["Technology"],
      });
    }
  });

  it("accepts profiles with optional commercial fields omitted (Skip behavior)", () => {
    const minimalProfile = {
      product_category: "Sales Intelligence",
      target_industries: ["Technology"],
      company_size: "Enterprise (1000+)",
    };

    const result = profileUpdateSchema.safeParse({
      business_profile: minimalProfile,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.business_profile).toMatchObject(minimalProfile);
    }
  });

  it("accepts geography and tech stack chip lists", () => {
    const result = profileUpdateSchema.safeParse({
      business_profile: {
        ...VALID_PROFILE,
        geography: ["United States", "United Kingdom"],
        tech_stack_include: ["Salesforce", "Snowflake"],
        tech_stack_exclude: ["HubSpot"],
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.business_profile.geography).toEqual(["United States", "United Kingdom"]);
      expect(result.data.business_profile.tech_stack_include).toEqual(["Salesforce", "Snowflake"]);
      expect(result.data.business_profile.tech_stack_exclude).toEqual(["HubSpot"]);
    }
  });

  it("accepts 1-5 seed domains, lowercased, and rejects malformed ones", () => {
    const ok = profileUpdateSchema.safeParse({
      business_profile: { ...VALID_PROFILE, seed_domains: ["Example.com", "sub.example.co.uk"] },
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.business_profile.seed_domains).toEqual(["example.com", "sub.example.co.uk"]);
    }

    const emptyList = profileUpdateSchema.safeParse({
      business_profile: { ...VALID_PROFILE, seed_domains: [] },
    });
    expect(emptyList.success).toBe(false);

    const tooMany = profileUpdateSchema.safeParse({
      business_profile: { ...VALID_PROFILE, seed_domains: ["a.com", "b.com", "c.com", "d.com", "e.com", "f.com"] },
    });
    expect(tooMany.success).toBe(false);

    const malformed = profileUpdateSchema.safeParse({
      business_profile: { ...VALID_PROFILE, seed_domains: ["not a domain"] },
    });
    expect(malformed.success).toBe(false);
  });

  it("trims workspace_name and enforces its length bound", () => {
    const ok = profileUpdateSchema.safeParse({
      business_profile: { ...VALID_PROFILE, workspace_name: "  Northwind Analytics  " },
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.business_profile.workspace_name).toBe("Northwind Analytics");
    }

    const tooLong = profileUpdateSchema.safeParse({
      business_profile: { ...VALID_PROFILE, workspace_name: "x".repeat(121) },
    });
    expect(tooLong.success).toBe(false);
  });
});

describe("PUT contract stays frozen for onboarding", () => {
  it("round-trips a real buildBusinessProfile payload unchanged", () => {
    // businessProfileSchema was refactored to derive from a shared shape so the
    // Settings patch schema could reuse it. This proves nothing observable
    // changed for onboarding's PUT.
    const built = buildBusinessProfile({
      ...VALID_PROFILE,
      geography: ["United States"],
      tech_stack_include: ["Salesforce"],
      seed_domains: ["https://www.Stripe.com/pricing"],
      workspace_name: "Northwind Analytics",
    });
    expect(built).not.toBeNull();

    const parsed = profileUpdateSchema.safeParse({ business_profile: built });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.business_profile).toEqual(built);
    }
  });
});

describe("businessProfilePatchSchema", () => {
  it("accepts a single field on its own", () => {
    const parsed = businessProfilePatchSchema.safeParse({ geography: ["ANZ"] });
    expect(parsed.success).toBe(true);
  });

  it("drops workspace_name so an ICP save cannot move an account attribute", () => {
    const parsed = businessProfilePatchSchema.safeParse({
      company_size: "SMB (51-200)",
      workspace_name: "Hijacked",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty("workspace_name");
    }
  });

  it("accepts an empty seed_domains list as a clear instruction", () => {
    expect(businessProfilePatchSchema.safeParse({ seed_domains: [] }).success).toBe(true);
  });

  it("still rejects an empty industry list and bad domains", () => {
    expect(businessProfilePatchSchema.safeParse({ target_industries: [] }).success).toBe(false);
    expect(
      businessProfilePatchSchema.safeParse({ seed_domains: ["not a domain"] }).success
    ).toBe(false);
    expect(
      businessProfilePatchSchema.safeParse({
        seed_domains: ["a.com", "b.com", "c.com", "d.com", "e.com", "f.com"],
      }).success
    ).toBe(false);
  });
});

describe("mergeBusinessProfile", () => {
  it("applies the patch over the stored profile", () => {
    const merged = mergeBusinessProfile(VALID_PROFILE, {
      target_industries: ["Healthcare", "Education"],
    });
    expect(merged.ok).toBe(true);
    if (merged.ok) {
      expect(merged.profile.target_industries).toEqual(["Healthcare", "Education"]);
      expect(merged.profile.company_size).toBe(VALID_PROFILE.company_size);
    }
  });

  it("does not require the patch to resend required fields", () => {
    const merged = mergeBusinessProfile(VALID_PROFILE, { deal_size: "$100K+" });
    expect(merged.ok).toBe(true);
  });

  it("cannot leave the stored profile invalid", () => {
    const storedWithoutSize = { ...VALID_PROFILE, company_size: "" };
    const merged = mergeBusinessProfile(storedWithoutSize, { deal_size: "$100K+" });
    expect(merged.ok).toBe(false);
    if (!merged.ok) {
      expect(merged.issues.some((issue) => issue.path === "company_size")).toBe(true);
    }
  });

  it("preserves stored workspace_name and unknown legacy keys", () => {
    const stored = {
      ...VALID_PROFILE,
      workspace_name: "Northwind Analytics",
      legacy_field: "kept",
    };
    const merged = mergeBusinessProfile(stored, { deal_size: "$100K+" });
    expect(merged.ok).toBe(true);
    if (merged.ok) {
      expect(merged.profile.workspace_name).toBe("Northwind Analytics");
      expect(merged.profile).toHaveProperty("legacy_field", "kept");
    }
  });

  it("drops cleared optional lists rather than storing an empty array", () => {
    const stored = { ...VALID_PROFILE, geography: ["ANZ"], seed_domains: ["stripe.com"] };
    const merged = mergeBusinessProfile(stored, { geography: [], seed_domains: [] });
    expect(merged.ok).toBe(true);
    if (merged.ok) {
      expect(merged.profile).not.toHaveProperty("geography");
      expect(merged.profile).not.toHaveProperty("seed_domains");
    }
  });

  it("normalizes pasted domains and dedupes list entries", () => {
    const merged = mergeBusinessProfile(VALID_PROFILE, {
      seed_domains: ["https://www.Stripe.com/pricing"],
      target_industries: ["Technology", "  technology  ", "Healthcare"],
    });
    expect(merged.ok).toBe(true);
    if (merged.ok) {
      expect(merged.profile.seed_domains).toEqual(["stripe.com"]);
      expect(merged.profile.target_industries).toEqual(["Technology", "Healthcare"]);
    }
  });

  it("refuses to create a profile from nothing", () => {
    expect(mergeBusinessProfile(null, { deal_size: "$100K+" }).ok).toBe(false);
    expect(mergeBusinessProfile("garbage", { deal_size: "$100K+" }).ok).toBe(false);
  });
});
