import {
  cleanDomainList,
  cleanStringList,
  cleanText,
  DOMAIN_PATTERN,
  WORKSPACE_NAME_MAX,
} from "./business-profile";
import type { BusinessProfile } from "./types";

/**
 * Profile keys a PDF may fill. Closed lists stay on the wizard allowlist.
 * Workspace name and a short "what you sell" phrase may come from the file
 * only after they pass `safePdfLabel`.
 */
export const PDF_FILLABLE_FIELDS = [
  "workspace_name",
  "product_category",
  "target_industries",
  "company_size",
  "buyer_role",
  "sales_motion",
  "deal_size",
  "sales_cycle",
  "geography",
  "tech_stack_include",
  "tech_stack_exclude",
  "seed_domains",
] as const;

const PDF_LABEL_RE = /^[A-Za-z][A-Za-z0-9 /.&'+-]*$/;
const PDF_PRODUCT_MAX = 80;
const PDF_INJECTION_RE =
  /ignore (all |any |the )?(previous|prior|above|these)|disregard (the )?(rules|instructions|prompt)|\b(system prompt|jailbreak|do not follow|you are now|act as|new instructions|leak the)\b|^\s*(system|assistant)\s*:/i;

/** Letters, spaces, and a few name marks. Instructions and punctuation do not pass. */
export function safePdfLabel(value: unknown, max: number): string {
  const cleaned = cleanText(value).replace(/\s+/g, " ");
  if (!cleaned || cleaned.length > max) return "";
  if (!PDF_LABEL_RE.test(cleaned)) return "";
  if (PDF_INJECTION_RE.test(cleaned)) return "";
  return cleaned;
}

export type PdfFillableField = (typeof PDF_FILLABLE_FIELDS)[number];

export type PdfFilledMap = Partial<Record<PdfFillableField, true>>;

/** Tools a PDF may name. Free text from the file is never stored. */
export const PDF_TECH_TOOLS = [
  "Salesforce",
  "HubSpot",
  "Snowflake",
  "Slack",
  "Marketo",
  "Zendesk",
  "Intercom",
  "Stripe",
  "Shopify",
  "Workday",
  "Okta",
  "Datadog",
  "Kubernetes",
  "Pipedrive",
  "Amplitude",
  "Mixpanel",
  "Looker",
  "Tableau",
  "Figma",
  "Notion",
  "Jira",
  "PostgreSQL",
  "MongoDB",
  "Twilio",
  "SendGrid",
  "Klaviyo",
  "Webflow",
  "WordPress",
  "NetSuite",
  "ServiceNow",
  "ZoomInfo",
  "Clearbit",
  "Demandbase",
  "BigQuery",
  "Redshift",
  "Fivetran",
  "Airbyte",
  "Salesloft",
  "Braze",
  "Iterable",
  "GitHub",
  "GitLab",
  "AWS",
  "Azure",
  "dbt",
  "Segment",
  "Next.js",
  "Python",
] as const;

const TECH_BY_KEY = new Map(PDF_TECH_TOOLS.map((tool) => [tool.toLocaleLowerCase(), tool]));

export function canonicalTechTool(value: string): string | null {
  return TECH_BY_KEY.get(value.trim().toLocaleLowerCase()) ?? null;
}

const DOMAIN_DENYLIST = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "icloud.com",
  "live.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "instagram.com",
  "youtube.com",
  "tiktok.com",
  "github.com",
  "gitlab.com",
  "medium.com",
  "wikipedia.org",
  "crunchbase.com",
  "g2.com",
  "capterra.com",
  "w3.org",
  "schema.org",
  "adobe.com",
  "gravatar.com",
  "google.com",
  "googleapis.com",
  "gstatic.com",
  "microsoft.com",
  "office.com",
  "office365.com",
  "example.com",
  "example.org",
  "example.net",
  "localhost",
];

const DOMAIN_TLDS = new Set([
  "com",
  "org",
  "net",
  "io",
  "co",
  "ai",
  "app",
  "dev",
  "so",
  "xyz",
  "tech",
  "software",
  "cloud",
  "vc",
  "us",
  "uk",
  "de",
  "ca",
  "au",
  "nz",
  "se",
  "no",
  "fi",
  "dk",
  "fr",
  "nl",
  "eu",
  "biz",
  "info",
  "me",
  "gg",
  "tv",
  "cc",
  "sh",
  "is",
  "to",
  "design",
  "studio",
  "tools",
  "health",
  "finance",
  "capital",
  "group",
]);

export interface PdfOptionSets {
  productCategory: readonly string[];
  industries: readonly string[];
  companySize: readonly string[];
  buyerRole: readonly string[];
  salesMotion: readonly string[];
  dealSize: readonly string[];
  salesCycle: readonly string[];
  geography: readonly string[];
}

function exactOption(options: readonly string[], value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return options.find((option) => option === trimmed) ?? "";
}

function allowedList(options: readonly string[], value: unknown): string[] {
  return cleanStringList(value).filter((item) => options.includes(item));
}

function allowedTools(value: unknown): string[] {
  const seen = new Set<string>();
  return cleanStringList(value).flatMap((item) => {
    const tool = canonicalTechTool(item);
    if (!tool || seen.has(tool)) return [];
    seen.add(tool);
    return [tool];
  });
}

function hostDenied(domain: string): boolean {
  return DOMAIN_DENYLIST.some((host) => domain === host || domain.endsWith(`.${host}`));
}

function hostExcluded(domain: string, exclude: Set<string>): boolean {
  for (const host of exclude) {
    if (domain === host || domain.endsWith(`.${host}`)) return true;
  }
  return false;
}

export function acceptableSeedDomain(domain: string, exclude: Set<string>): boolean {
  if (!DOMAIN_PATTERN.test(domain)) return false;
  if (hostDenied(domain) || hostExcluded(domain, exclude)) return false;
  const tld = domain.slice(domain.lastIndexOf(".") + 1);
  return DOMAIN_TLDS.has(tld);
}

export function guardSeedDomains(value: unknown, excludeDomains: string[] = []): string[] {
  const exclude = new Set(
    excludeDomains.flatMap((domain) => {
      const cleaned = cleanDomainList([domain]);
      return cleaned.length === 1 ? cleaned : [];
    })
  );
  return cleanDomainList(value).filter((domain) => acceptableSeedDomain(domain, exclude));
}

/**
 * Drops anything that is not an existing wizard option, a known tool, or a
 * real seed domain. Raw PDF text cannot survive this.
 */
export function guardPdfProfile(
  input: Partial<BusinessProfile> | null | undefined,
  options: PdfOptionSets,
  excludeDomains: string[] = []
): { profile: Partial<BusinessProfile>; filled: PdfFillableField[] } {
  const source = input ?? {};
  const profile: Partial<BusinessProfile> = {};
  const filled: PdfFillableField[] = [];

  const workspace = safePdfLabel(source.workspace_name, WORKSPACE_NAME_MAX);
  if (workspace) {
    profile.workspace_name = workspace;
    filled.push("workspace_name");
  }

  const product =
    exactOption(options.productCategory, source.product_category) ||
    safePdfLabel(source.product_category, PDF_PRODUCT_MAX);
  if (product) {
    profile.product_category = product;
    filled.push("product_category");
  }

  const industries = allowedList(options.industries, source.target_industries);
  if (industries.length > 0) {
    profile.target_industries = industries;
    filled.push("target_industries");
  }

  const companySize = exactOption(options.companySize, source.company_size);
  if (companySize) {
    profile.company_size = companySize;
    filled.push("company_size");
  }

  const buyer = exactOption(options.buyerRole, source.buyer_role);
  if (buyer) {
    profile.buyer_role = buyer;
    filled.push("buyer_role");
  }

  const motion = exactOption(options.salesMotion, source.sales_motion);
  if (motion) {
    profile.sales_motion = motion;
    filled.push("sales_motion");
  }

  const deal = exactOption(options.dealSize, source.deal_size);
  if (deal) {
    profile.deal_size = deal;
    filled.push("deal_size");
  }

  const cycle = exactOption(options.salesCycle, source.sales_cycle);
  if (cycle) {
    profile.sales_cycle = cycle;
    filled.push("sales_cycle");
  }

  const geography = allowedList(options.geography, source.geography);
  if (geography.length > 0) {
    profile.geography = geography;
    filled.push("geography");
  }

  const include = allowedTools(source.tech_stack_include);
  const exclude = allowedTools(source.tech_stack_exclude).filter((tool) => !include.includes(tool));
  const includeOnly = include.filter((tool) => !allowedTools(source.tech_stack_exclude).includes(tool));
  if (includeOnly.length > 0) {
    profile.tech_stack_include = includeOnly;
    filled.push("tech_stack_include");
  }
  if (exclude.length > 0) {
    profile.tech_stack_exclude = exclude;
    filled.push("tech_stack_exclude");
  }

  const seeds = guardSeedDomains(source.seed_domains, excludeDomains);
  if (seeds.length > 0) {
    profile.seed_domains = seeds;
    filled.push("seed_domains");
  }

  return { profile, filled };
}
