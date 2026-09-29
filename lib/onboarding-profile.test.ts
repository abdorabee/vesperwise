import { describe, expect, it } from "vitest";

import {
  buildBusinessProfile,
  createOnboardingState,
  findIncompleteStep,
  getOnboardingRedirect,
  MAX_STEP,
  normalizeDomainInput,
  onboardingReducer,
  validateOnboardingStep,
} from "./onboarding-profile";

const COMPLETE_DRAFT = {
  product_category: "SaaS / Software",
  target_industries: ["Technology", "Financial Services"],
  company_size: "Mid-Market (201-1000)",
  buyer_role: "VP / Director",
  sales_motion: "Outbound (cold outreach)",
  deal_size: "$25K - $100K",
  sales_cycle: "1-3 months",
  geography: ["United States", "United Kingdom"],
  tech_stack_include: ["Salesforce", "Snowflake"],
  tech_stack_exclude: ["HubSpot"],
  seed_domains: ["ledgerloop.com", "crestmark.io"],
  workspace_name: "Northwind Analytics",
};

describe("validateOnboardingStep", () => {
  it("step 0 requires a workspace name and what the company sells", () => {
    const state = createOnboardingState();
    expect(validateOnboardingStep(0, state.profile)).toEqual({
      workspace_name: "Name your workspace to continue.",
      product_category: "Tell us what you sell to continue.",
    });
  });

  // Regression: product_category is required by businessProfileSchema, so if no
  // step validates it the user completes every screen and only the final save
  // fails — with nothing on screen explaining which field is missing.
  it("blocks a profile that only omits product_category, before the final save", () => {
    const profile = { ...COMPLETE_DRAFT, product_category: "" };
    expect(validateOnboardingStep(0, profile)).toEqual({
      product_category: "Tell us what you sell to continue.",
    });
    expect(buildBusinessProfile(profile)).toBeNull();
    expect(findIncompleteStep(profile)).toBe(0);
  });

  it("rejects a malformed seed domain at the ICP step rather than on save", () => {
    const profile = { ...COMPLETE_DRAFT, seed_domains: ["not a domain"] };
    expect(validateOnboardingStep(1, profile).seed_domains).toMatch(/not a valid domain/i);
    expect(findIncompleteStep(profile)).toBe(1);
  });

  it("reports no incomplete step for a complete profile", () => {
    expect(findIncompleteStep(COMPLETE_DRAFT)).toBeNull();
  });

  it("step 1 requires industries, company size, and at least one seed domain", () => {
    const state = createOnboardingState();
    expect(validateOnboardingStep(1, state.profile)).toEqual({
      target_industries: "Choose at least one target industry.",
      company_size: "Choose an ideal company size.",
      seed_domains: "Add at least one domain you want to see scored.",
    });
  });

  it("steps 2-4 (signals, run, outcome) have no field validation", () => {
    const state = createOnboardingState(COMPLETE_DRAFT);
    expect(validateOnboardingStep(2, state.profile)).toEqual({});
    expect(validateOnboardingStep(3, state.profile)).toEqual({});
    expect(validateOnboardingStep(4, state.profile)).toEqual({});
  });

  it("a complete draft passes both required steps", () => {
    const state = createOnboardingState(COMPLETE_DRAFT);
    expect(validateOnboardingStep(0, state.profile)).toEqual({});
    expect(validateOnboardingStep(1, state.profile)).toEqual({});
  });
});

describe("normalizeDomainInput", () => {
  it("reduces pasted URLs to the bare host the scoring pipeline expects", () => {
    expect(normalizeDomainInput("https://Stripe.com/pricing?ref=x")).toBe("stripe.com");
    expect(normalizeDomainInput("www.stripe.com")).toBe("stripe.com");
    expect(normalizeDomainInput("http://sub.example.co.uk/a/b#frag")).toBe("sub.example.co.uk");
    expect(normalizeDomainInput("  stripe.com:443  ")).toBe("stripe.com");
    expect(normalizeDomainInput("stripe.com.")).toBe("stripe.com");
  });

  it("keeps a pasted URL usable end to end instead of failing the final save", () => {
    const profile = { ...COMPLETE_DRAFT, seed_domains: ["https://stripe.com/pricing"] };
    expect(validateOnboardingStep(1, profile)).toEqual({});
    expect(buildBusinessProfile(profile)?.seed_domains).toEqual(["stripe.com"]);
  });
});

describe("buildBusinessProfile", () => {
  it("builds the exact BusinessProfile payload with multiple industries and the new ICP fields", () => {
    expect(buildBusinessProfile(COMPLETE_DRAFT)).toEqual(COMPLETE_DRAFT);
  });

  it("keeps custom values while normalizing whitespace and duplicate industries", () => {
    expect(buildBusinessProfile({
      ...COMPLETE_DRAFT,
      product_category: "  Revenue operations consulting  ",
      target_industries: [
        " Climate technology ",
        "Technology",
        "climate technology",
        " ",
      ],
      buyer_role: "  Revenue Operations Leader ",
    })).toEqual({
      ...COMPLETE_DRAFT,
      product_category: "Revenue operations consulting",
      target_industries: ["Climate technology", "Technology"],
      buyer_role: "Revenue Operations Leader",
    });
  });

  it("returns null when required values are missing (only product_category, target_industries, company_size)", () => {
    expect(buildBusinessProfile({
      ...COMPLETE_DRAFT,
      target_industries: [],
    })).toBeNull();
    expect(buildBusinessProfile({
      ...COMPLETE_DRAFT,
      product_category: "   ",
    })).toBeNull();
  });

  it("returns null for a malformed seed domain", () => {
    expect(buildBusinessProfile({
      ...COMPLETE_DRAFT,
      seed_domains: ["not a domain"],
    })).toBeNull();
  });

  it("omits the new optional fields entirely when unset, round-tripping the legacy 7-field shape", () => {
    const legacyProfile = {
      product_category: "SaaS / Software",
      target_industries: ["Technology"],
      company_size: "Enterprise (1000+)",
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
    const result = buildBusinessProfile(legacyProfile);
    expect(result).not.toBeNull();
    expect(result).toEqual({
      product_category: "SaaS / Software",
      target_industries: ["Technology"],
      company_size: "Enterprise (1000+)",
      buyer_role: "",
      sales_motion: "",
      deal_size: "",
      sales_cycle: "",
    });
  });

  it("allows optional commercial fields (buyer_role, sales_motion, deal_size, sales_cycle) to be empty", () => {
    const minimalProfile = {
      product_category: "SaaS / Software",
      target_industries: ["Technology"],
      company_size: "Enterprise (1000+)",
      buyer_role: "",
      sales_motion: "",
      deal_size: "",
      sales_cycle: "",
      seed_domains: ["example.com"],
    };
    const result = buildBusinessProfile(minimalProfile);
    expect(result).not.toBeNull();
    expect(result?.product_category).toBe("SaaS / Software");
    expect(result?.target_industries).toEqual(["Technology"]);
    expect(result?.company_size).toBe("Enterprise (1000+)");
    expect(result?.seed_domains).toEqual(["example.com"]);
  });
});

describe("onboardingReducer", () => {
  it("retains entered data when navigating back", () => {
    let state = createOnboardingState();
    state = onboardingReducer(state, {
      type: "update_field",
      field: "workspace_name",
      value: "Northwind Analytics",
    });
    state = onboardingReducer(state, { type: "next_step" });
    state = onboardingReducer(state, { type: "previous_step" });

    expect(state.step).toBe(0);
    expect(state.profile.workspace_name).toBe("Northwind Analytics");
  });

  it("clamps navigation between step 0 and MAX_STEP", () => {
    let state = createOnboardingState();
    for (let i = 0; i < 10; i++) state = onboardingReducer(state, { type: "next_step" });
    expect(state.step).toBe(MAX_STEP);

    state = onboardingReducer(state, { type: "go_to_step", step: -5 });
    expect(state.step).toBe(0);

    state = onboardingReducer(state, { type: "go_to_step", step: 99 });
    expect(state.step).toBe(MAX_STEP);
  });

  it("accumulates rapid successive toggles instead of clobbering earlier ones", () => {
    // Two dispatches derived from the same starting state — the shape React
    // produces when it batches two fast chip clicks. Both must survive.
    let state = createOnboardingState();
    state = onboardingReducer(state, { type: "toggle_industry", industry: "Technology" });
    state = onboardingReducer(state, { type: "toggle_industry", industry: "Financial Services" });
    expect(state.profile.target_industries).toEqual(["Technology", "Financial Services"]);

    state = onboardingReducer(state, { type: "toggle_geography", geo: "United States" });
    state = onboardingReducer(state, { type: "toggle_geography", geo: "United Kingdom" });
    expect(state.profile.geography).toEqual(["United States", "United Kingdom"]);
  });

  it("toggles a selected value back off, case-insensitively", () => {
    let state = createOnboardingState();
    state = onboardingReducer(state, { type: "toggle_industry", industry: "Technology" });
    state = onboardingReducer(state, { type: "toggle_industry", industry: "technology" });
    expect(state.profile.target_industries).toEqual([]);
  });

  it("updates geography, tech stack, and seed domains independently", () => {
    let state = createOnboardingState();
    state = onboardingReducer(state, { type: "set_geography", geography: ["United States"] });
    state = onboardingReducer(state, { type: "set_tech_stack_include", tools: ["Salesforce"] });
    state = onboardingReducer(state, { type: "set_tech_stack_exclude", tools: ["HubSpot"] });
    state = onboardingReducer(state, { type: "set_seed_domains", domains: ["ledgerloop.com"] });

    expect(state.profile.geography).toEqual(["United States"]);
    expect(state.profile.tech_stack_include).toEqual(["Salesforce"]);
    expect(state.profile.tech_stack_exclude).toEqual(["HubSpot"]);
    expect(state.profile.seed_domains).toEqual(["ledgerloop.com"]);
  });

  it("caps seed domains at MAX_SEED_DOMAINS even if the action carries more", () => {
    let state = createOnboardingState();
    state = onboardingReducer(state, {
      type: "set_seed_domains",
      domains: ["a.com", "b.com", "c.com", "d.com", "e.com", "f.com"],
    });
    expect(state.profile.seed_domains).toHaveLength(5);
  });

  it("preserves the complete draft after a save error and supports retry", () => {
    let state = createOnboardingState(COMPLETE_DRAFT);
    state = onboardingReducer(state, { type: "save_started" });
    state = onboardingReducer(state, {
      type: "save_failed",
      message: "We could not save your profile.",
    });

    expect(state.profile).toEqual(COMPLETE_DRAFT);
    expect(state.saveStatus).toBe("error");
    expect(state.saveError).toBe("We could not save your profile.");

    state = onboardingReducer(state, { type: "save_started" });
    expect(state.profile).toEqual(COMPLETE_DRAFT);
    expect(state.saveStatus).toBe("saving");
    expect(state.saveError).toBeNull();
  });
});

describe("getOnboardingRedirect", () => {
  it("redirects incomplete users away from dashboard routes", () => {
    expect(getOnboardingRedirect(false, "dashboard")).toBe("/onboarding");
    expect(getOnboardingRedirect(true, "dashboard")).toBeNull();
  });

  it("redirects completed users away from onboarding", () => {
    expect(getOnboardingRedirect(true, "onboarding")).toBe("/score");
    expect(getOnboardingRedirect(false, "onboarding")).toBeNull();
  });
});
