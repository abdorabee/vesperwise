import { normalizeDomainInput } from "./business-profile";
import {
  guardPdfProfile,
  PDF_TECH_TOOLS,
  type PdfFillableField,
  type PdfOptionSets,
} from "./onboarding-pdf-guards";
import {
  BUYER_ROLE_OPTIONS,
  COMPANY_SIZE_OPTIONS,
  DEAL_SIZE_OPTIONS,
  GEOGRAPHY_OPTIONS,
  INDUSTRY_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
  SALES_CYCLE_OPTIONS,
  SALES_MOTION_OPTIONS,
} from "./onboarding-profile";
import type { BusinessProfile } from "./types";

export const PDF_MAX_BYTES = 10 * 1024 * 1024;
export const PDF_MAX_PAGES = 20;
/** Below this much real text, the file is treated as a scan or an empty deck. */
export const PDF_MIN_TEXT_CHARS = 40;

export const PDF_UNREADABLE_MESSAGE = "We couldn't read this PDF. Fill it in manually.";
export const PDF_TOO_LARGE_MESSAGE = "PDFs must be 10 MB or smaller.";
export const PDF_TOO_MANY_PAGES_MESSAGE = "PDFs must be 20 pages or fewer.";
export const PDF_NOT_PDF_MESSAGE = "Upload a text PDF.";
export const PDF_RATE_LIMIT_MESSAGE = "You've read too many PDFs. Try again later.";
export const PDF_DISCARD_NOTE =
  "Text PDFs only, up to 10 MB and 20 pages. We discard the file after reading it and don't store it.";

export interface PdfUploadFailure {
  status: number;
  code: "too_large" | "not_pdf" | "too_many_pages" | "unreadable";
  message: string;
}

const WIZARD_OPTIONS: PdfOptionSets = {
  productCategory: PRODUCT_CATEGORY_OPTIONS,
  industries: INDUSTRY_OPTIONS,
  companySize: COMPANY_SIZE_OPTIONS,
  buyerRole: BUYER_ROLE_OPTIONS,
  salesMotion: SALES_MOTION_OPTIONS,
  dealSize: DEAL_SIZE_OPTIONS,
  salesCycle: SALES_CYCLE_OPTIONS,
  geography: GEOGRAPHY_OPTIONS,
};

const INSTRUCTION_PATTERNS = [
  /ignore (all |any |the )?(previous|prior|above|these)/i,
  /disregard (the )?(rules|instructions|prompt)/i,
  /\b(system prompt|jailbreak|do not follow)\b/i,
  /^\s*(system|assistant)\s*:/i,
  /\b(you are now|act as|new instructions)\b/i,
  /\b(set|prefill|fill in|output|return)\b.{0,48}\b(field|json|profile|company[_ ]size|product[_ ]category|buyer[_ ]role|sales[_ ]motion)\b/i,
];

const TARGET_RE =
  /\b(ideal customers?|icp\b|we sell to|selling to|sell to|target(?:ing|s|ed)?|our customers|customers are|customers include|buyer persona|primary buyer|buyers are|accounts we|we serve|target market)\b/i;
const SELF_RE = /\b(we are|we're|our company is|founded|about us)\b/i;
const PRODUCT_RE = /\b(we sell|we build|our product|the product is|what we sell|what we do)\b/i;
const BUYER_RE = /\b(primary buyer|buyer is|buyers are|sell to|selling to|decision maker)\b/i;
const DEAL_RE = /\b(deal size|acv|contract value|average deal|typical deal|annual contract)\b/i;
const FUNDING_RE = /\b(raised|funding|series\s+[a-e]\b|valuation)\b/i;
const CYCLE_RE = /\b(sales cycle|cycle is|time to close|closes in)\b/i;
const GEO_RE = /\b(we sell in|customers in|target market|geograph\w*|regions?|markets include|we serve)\b/i;
const STACK_IN_RE = /\b(tech stack|their stack|stack includes|customers use|they use|runs on|built on|already use|already run)\b/i;
const STACK_OUT_RE = /\b(exclude|excluding|disqualif\w*|not a fit|do not use|don't use|does not use)\b/i;
const CUSTOMER_RE =
  /\b(customers?|clients?|case stud(?:y|ies)|trusted by|used by|teams at|companies like|for example|e\.g\.|logos|portfolio)\b/i;
const OWN_SITE_RE = /\b(our (website|site)|visit us at|visit our)\b/i;
const SALES_CTX_RE = /\b(sell|sales|motion|go-to-market|gtm|pipeline|outreach)\b/i;

type Choice = { value: string; pattern: RegExp };

const PRODUCT_CHOICES: Choice[] = [
  { value: "SaaS / Software", pattern: /\b(saas|software)\b/i },
  { value: "Consulting / Services", pattern: /\b(consulting|professional services)\b/i },
  { value: "Hardware / Physical", pattern: /\b(hardware|physical products?)\b/i },
  { value: "Marketplace / Platform", pattern: /\bmarketplace\b/i },
];

const SIZE_CHOICES: Choice[] = [
  { value: "Startups (1-50)", pattern: /\bstartups?\b|\b1\s*[-–]\s*50\b/i },
  { value: "SMB (51-200)", pattern: /\bsmb\b|\b51\s*[-–]\s*200\b/i },
  { value: "Mid-Market (201-1000)", pattern: /\bmid[- ]?market\b|\b201\s*[-–]\s*1,?000\b/i },
  {
    value: "Enterprise (1000+)",
    pattern: /\benterprise\b(?!\s*[- ]?(?:grade|software|ready|platform|saas))|\b1,?000\s*\+/i,
  },
];

const INDUSTRY_CHOICES: Choice[] = [
  { value: "Technology", pattern: /\b(technology companies|tech companies|technology)\b/i },
  { value: "Financial Services", pattern: /\b(financial services|fintech|banking|banks)\b/i },
  { value: "Healthcare", pattern: /\b(healthcare|health care|hospitals?)\b/i },
  { value: "E-commerce / Retail", pattern: /\b(e-?commerce|retail)\b/i },
  { value: "Manufacturing", pattern: /\b(manufacturing|manufacturers)\b/i },
  { value: "Education", pattern: /\b(education|universit(?:y|ies)|schools)\b/i },
];

const BUYER_CHOICES: Choice[] = [
  { value: "C-Suite / Founders", pattern: /\b(c-suite|c suite|founders?|ceo|cfo|cro|coo|cto|chief)\b/i },
  { value: "VP / Director", pattern: /\b(vice presidents?|\bvps?\b|directors?)\b/i },
  { value: "Manager / Team Lead", pattern: /\b(managers?|team leads?)\b/i },
  { value: "Individual Contributor", pattern: /\b(individual contributors?|practitioners?)\b/i },
];

const MOTION_CHOICES: Choice[] = [
  { value: "Outbound (cold outreach)", pattern: /\boutbound\b|\bcold (?:email|outreach|calls?)\b/i },
  { value: "Inbound (content/SEO/ads)", pattern: /\binbound\b|\bseo\b|\bpaid ads\b/i },
  { value: "Product-Led Growth", pattern: /\b(product-led|product led|\bplg\b|self-serve|self serve)\b/i },
  { value: "Channel / Partners", pattern: /\b(channel partners?|resellers?)\b/i },
];

const GEO_CHOICES: Choice[] = [
  { value: "United States", pattern: /\bUnited States\b|\bU\.S\.A?\.?\b|\bUSA\b|\bUS\b/ },
  { value: "United Kingdom", pattern: /\bUnited Kingdom\b|\bU\.K\.\b|\bBritain\b|\bUK\b/ },
  { value: "Canada", pattern: /\bCanada\b/i },
  { value: "DACH", pattern: /\bDACH\b|\bGermany\b|\bAustria\b|\bSwitzerland\b/i },
  { value: "Nordics", pattern: /\bNordics?\b|\bSweden\b|\bNorway\b|\bDenmark\b|\bFinland\b/i },
  { value: "ANZ", pattern: /\bANZ\b|\bAustralia\b|\bNew Zealand\b/i },
];

const TOOL_CHOICES: Choice[] = PDF_TECH_TOOLS.map((tool) => ({
  value: tool,
  pattern:
    tool === "AWS"
      ? /\bAWS\b|\bAmazon Web Services\b/i
      : tool === "PostgreSQL"
        ? /\bPostgreSQL\b|\bPostgres\b/i
        : new RegExp(`\\b${tool.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
}));

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  six: 6,
  eight: 8,
  twelve: 12,
};

const DOMAIN_FINDER =
  /\b(?:https?:\/\/)?(?:www\.)?((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24})\b/gi;

export function looksLikePdf(bytes: Uint8Array): boolean {
  const head = bytes.subarray(0, Math.min(bytes.length, 1024));
  const text = new TextDecoder("latin1").decode(head);
  return text.includes("%PDF-");
}

export function hasReadableText(text: string): boolean {
  return text.replace(/[^A-Za-z0-9]/g, "").length >= PDF_MIN_TEXT_CHARS;
}

/** Size, type, page count, and empty-scan checks. Null means the file can be mapped. */
export function pdfUploadFailure(input: {
  size?: number;
  header?: Uint8Array;
  pageCount?: number;
  text?: string;
}): PdfUploadFailure | null {
  if (input.size !== undefined && input.size > PDF_MAX_BYTES) {
    return { status: 400, code: "too_large", message: PDF_TOO_LARGE_MESSAGE };
  }
  if (input.header && !looksLikePdf(input.header)) {
    return { status: 400, code: "not_pdf", message: PDF_NOT_PDF_MESSAGE };
  }
  if (input.pageCount !== undefined && input.pageCount > PDF_MAX_PAGES) {
    return { status: 400, code: "too_many_pages", message: PDF_TOO_MANY_PAGES_MESSAGE };
  }
  if (input.text !== undefined && !hasReadableText(input.text)) {
    return { status: 422, code: "unreadable", message: PDF_UNREADABLE_MESSAGE };
  }
  return null;
}

function sentencesOf(text: string): string[] {
  return text
    .replace(/\u0000/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\r\n/g, "\n")
    .split(/\n+|(?<=[.!?])\s+/)
    .map((sentence) => sentence.replace(/[^\S\n]+/g, " ").trim())
    .filter(Boolean);
}

function isInstruction(sentence: string): boolean {
  return INSTRUCTION_PATTERNS.some((pattern) => pattern.test(sentence));
}

function matches(sentence: string, choices: Choice[]): string[] {
  const hits: string[] = [];
  for (const choice of choices) {
    if (choice.pattern.test(sentence) && !hits.includes(choice.value)) hits.push(choice.value);
  }
  return hits;
}

/** One unambiguous value, or nothing when the file disagrees with itself. */
function pickOne(sentences: string[], choices: Choice[], accept: (sentence: string) => boolean): string {
  const counts = new Map<string, number>();
  for (const sentence of sentences) {
    if (!accept(sentence)) continue;
    const hits = matches(sentence, choices);
    if (hits.length !== 1) continue;
    counts.set(hits[0], (counts.get(hits[0]) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return "";
  if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) return "";
  return ranked[0][0];
}

function pickMany(sentences: string[], choices: Choice[], accept: (sentence: string) => boolean): string[] {
  const values: string[] = [];
  for (const sentence of sentences) {
    if (!accept(sentence)) continue;
    for (const hit of matches(sentence, choices)) {
      if (!values.includes(hit)) values.push(hit);
    }
  }
  return values;
}

function usable(sentence: string): boolean {
  return !isInstruction(sentence);
}

function wordNumber(raw: string): number | null {
  const key = raw.toLowerCase();
  if (NUMBER_WORDS[key] !== undefined) return NUMBER_WORDS[key];
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function toDays(amount: number, unit: string): number {
  const name = unit.toLowerCase();
  if (name.startsWith("week")) return amount * 7;
  if (name.startsWith("month")) return amount * 30;
  return amount;
}

function cycleOption(sentence: string): string {
  if (/(?:more than|over|longer than|at least)\s+(?:3|three)\s+months/i.test(sentence)) {
    return "3+ months";
  }
  const range =
    /(\d+|one|two|three|four|six|eight|twelve)\s*(?:-|to)\s*(\d+|one|two|three|four|six|eight|twelve)\s*(days?|weeks?|months?)/i.exec(
      sentence
    );
  if (range) {
    const start = wordNumber(range[1]);
    const end = wordNumber(range[2]);
    if (start === null || end === null) return "";
    const min = toDays(Math.min(start, end), range[3]);
    const max = toDays(Math.max(start, end), range[3]);
    if (max < 14) return "< 2 weeks";
    if (min >= 14 && max <= 28) return "2-4 weeks";
    if (min >= 29 && max <= 92) return "1-3 months";
    if (min >= 93) return "3+ months";
    return "";
  }
  const single =
    /(?:(under|less than|within|<)\s+)?(\d+|one|two|three|four|six|eight|twelve)\s*(\+)?\s*(days?|weeks?|months?)/i.exec(
      sentence
    );
  if (!single) return "";
  const amount = wordNumber(single[2]);
  if (amount === null) return "";
  const days = toDays(amount, single[4]);
  if (single[1]) return days <= 14 ? "< 2 weeks" : "";
  if (days < 14) return "< 2 weeks";
  if (single[3] && single[4].toLowerCase().startsWith("month") && amount >= 3) return "3+ months";
  if (days <= 28) return "2-4 weeks";
  if (days <= 92) return "1-3 months";
  return "3+ months";
}

function uniqueCycle(sentences: string[]): string {
  const counts = new Map<string, number>();
  for (const sentence of sentences) {
    if (!usable(sentence) || !CYCLE_RE.test(sentence)) continue;
    const option = cycleOption(sentence);
    if (!option) continue;
    counts.set(option, (counts.get(option) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return "";
  if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) return "";
  return ranked[0][0];
}

function moneyValues(sentence: string): number[] {
  const values: number[] = [];
  const pattern = /\$\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k|m|thousand|million)?\b/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sentence))) {
    const amount = Number(match[1].replace(/,/g, ""));
    if (!Number.isFinite(amount)) continue;
    const unit = (match[2] ?? "").toLowerCase();
    const scaled =
      unit === "k" || unit === "thousand" ? amount * 1_000 : unit === "m" || unit === "million" ? amount * 1_000_000 : amount;
    if (scaled > 0 && scaled <= 5_000_000) values.push(scaled);
  }
  return values;
}

function dealFromAmounts(amounts: number[]): string {
  if (amounts.length === 0 || amounts.length > 2) return "";
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  if (max < 5_000) return "< $5K";
  if (min >= 5_000 && max <= 25_000) return "$5K - $25K";
  if (min >= 25_000 && max <= 100_000) return "$25K - $100K";
  if (min >= 100_000) return "$100K+";
  if (amounts.length === 1) {
    if (min < 5_000) return "< $5K";
    if (min < 25_000) return "$5K - $25K";
    if (min < 100_000) return "$25K - $100K";
    return "$100K+";
  }
  return "";
}

function pickDeal(sentences: string[]): string {
  const counts = new Map<string, number>();
  for (const sentence of sentences) {
    if (!usable(sentence) || !DEAL_RE.test(sentence) || FUNDING_RE.test(sentence)) continue;
    const option = dealFromAmounts(moneyValues(sentence));
    if (!option) continue;
    counts.set(option, (counts.get(option) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return "";
  if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) return "";
  return ranked[0][0];
}

function customerDomains(sentences: string[]): string[] {
  const domains: string[] = [];
  for (const sentence of sentences) {
    if (!usable(sentence) || !CUSTOMER_RE.test(sentence) || OWN_SITE_RE.test(sentence)) continue;
    DOMAIN_FINDER.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = DOMAIN_FINDER.exec(sentence))) {
      const domain = normalizeDomainInput(match[1] ?? "");
      if (domain && !domains.includes(domain)) domains.push(domain);
    }
  }
  return domains.slice(0, 5);
}

/**
 * Maps PDF text onto wizard fields. Unstated and ambiguous answers stay empty.
 * The text is data: instructions inside it are skipped, and nothing outside the
 * option sets, known tools, and real domains is returned.
 */
export function extractProfileFromPdfText(
  text: string,
  options: { excludeDomains?: string[] } = {}
): { profile: Partial<BusinessProfile>; filled: PdfFillableField[] } {
  const sentences = sentencesOf(text);
  const draft: Partial<BusinessProfile> = {};

  const product = pickOne(sentences, PRODUCT_CHOICES, (sentence) => usable(sentence) && (PRODUCT_RE.test(sentence) || SELF_RE.test(sentence)));
  if (product) draft.product_category = product;

  const industries = pickMany(
    sentences,
    INDUSTRY_CHOICES,
    (sentence) =>
      usable(sentence) &&
      !STACK_IN_RE.test(sentence) &&
      !STACK_OUT_RE.test(sentence) &&
      (TARGET_RE.test(sentence) || PRODUCT_RE.test(sentence) || /\bindustr/i.test(sentence))
  );
  if (industries.length > 0) draft.target_industries = industries;

  const companySize = pickOne(
    sentences,
    SIZE_CHOICES,
    (sentence) => usable(sentence) && TARGET_RE.test(sentence)
  );
  if (companySize) draft.company_size = companySize;

  const buyer = pickOne(
    sentences,
    BUYER_CHOICES,
    (sentence) => usable(sentence) && (BUYER_RE.test(sentence) || TARGET_RE.test(sentence))
  );
  if (buyer) draft.buyer_role = buyer;

  const motion = pickOne(
    sentences,
    MOTION_CHOICES,
    (sentence) => usable(sentence) && SALES_CTX_RE.test(sentence)
  );
  if (motion) draft.sales_motion = motion;

  const deal = pickDeal(sentences);
  if (deal) draft.deal_size = deal;

  const cycle = uniqueCycle(sentences);
  if (cycle) draft.sales_cycle = cycle;

  const geography = pickMany(
    sentences,
    GEO_CHOICES,
    (sentence) => usable(sentence) && (GEO_RE.test(sentence) || TARGET_RE.test(sentence))
  );
  if (geography.length > 0) draft.geography = geography;

  const include = pickMany(
    sentences,
    TOOL_CHOICES,
    (sentence) => usable(sentence) && STACK_IN_RE.test(sentence) && !STACK_OUT_RE.test(sentence)
  );
  const excludeTools = pickMany(sentences, TOOL_CHOICES, (sentence) => usable(sentence) && STACK_OUT_RE.test(sentence));
  if (include.length > 0) draft.tech_stack_include = include.slice(0, 8);
  if (excludeTools.length > 0) draft.tech_stack_exclude = excludeTools.slice(0, 8);

  const seeds = customerDomains(sentences);
  if (seeds.length > 0) draft.seed_domains = seeds;

  return guardPdfProfile(draft, WIZARD_OPTIONS, options.excludeDomains ?? []);
}
