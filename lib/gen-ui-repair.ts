import { UI_BLOCK_SCHEMAS, type UiBlock } from "./gen-ui-schemas";
import { applyIssues, isRecord, pathString, reportStrippedKeys } from "./zod-repair";
import { buildFallbackBrief, repairBrief, TRIGGER_KEYS, type BriefContribution, type TriggerKey } from "./brief";

export type UiDiagnosticCode =
  | "unknown_type"
  | "unknown_prop"
  | "invalid_prop"
  | "truncated"
  | "dropped_block"
  | "domain_filtered"
  | "limit_exceeded";

export interface UiDiagnostic {
  index: number;
  type?: string;
  code: UiDiagnosticCode;
  path: string;
}

const MAX_PASSES = 3;

function extractBlocksInput(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  if (isRecord(input) && Array.isArray(input.blocks)) return input.blocks;
  return [];
}

type Diagnose = (code: UiDiagnosticCode, path: readonly PropertyKey[]) => void;

const SCORE_BANDS = new Set(["HOT", "WARM", "COLD"]);
const TRIGGER_KEY_SET = new Set<string>(TRIGGER_KEYS);

function isTriggerKey(value: unknown): value is TriggerKey {
  return typeof value === "string" && TRIGGER_KEY_SET.has(value);
}

function extractContributionSignals(value: unknown): TriggerKey[] {
  if (!Array.isArray(value)) return [];
  const signals: TriggerKey[] = [];
  const seen = new Set<TriggerKey>();
  for (const item of value) {
    const type = isRecord(item) ? item.type : undefined;
    if (!isTriggerKey(type) || seen.has(type)) continue;
    seen.add(type);
    signals.push(type);
  }
  return signals;
}

function extractFallbackContributions(value: unknown): BriefContribution[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): BriefContribution[] => {
    if (!isRecord(item) || !isTriggerKey(item.type)) return [];
    return [{
      type: item.type,
      rawScore: typeof item.rawScore === "number" ? item.rawScore : 0,
      effectiveWeight: typeof item.effectiveWeight === "number" ? item.effectiveWeight : 0,
      daysAgo: typeof item.daysAgo === "number" || item.daysAgo === null ? item.daysAgo : null,
      ...(typeof item.halfLifeDays === "number" ? { halfLifeDays: item.halfLifeDays } : {}),
      observedAt: typeof item.observedAt === "string" || item.observedAt === null ? item.observedAt : null,
      summary: typeof item.summary === "string" ? item.summary : "No signal detail available",
      contribution: typeof item.contribution === "number" ? item.contribution : 0,
      ...(typeof item.status === "string" ? { status: item.status as BriefContribution["status"] } : {}),
    }];
  }).slice(0, 6);
}

function mapBriefDiagnosticCode(code: string): UiDiagnosticCode {
  if (code === "unknown_prop") return "unknown_prop";
  if (code === "truncated") return "truncated";
  return "invalid_prop";
}

function normalizeLivingBriefSpec(candidate: unknown, diagnose: Diagnose): unknown {
  if (!isRecord(candidate) || candidate.type !== "living_brief") return candidate;
  const availableSignals = extractContributionSignals(candidate.contributions);
  const repaired = repairBrief(candidate.spec, { availableSignals });
  for (const diagnostic of repaired.diagnostics) {
    const suffix = diagnostic.path ? `spec.${diagnostic.path}` : "spec";
    diagnose(mapBriefDiagnosticCode(diagnostic.code), suffix.split("."));
  }
  if (repaired.spec) return { ...candidate, spec: repaired.spec };

  const company = typeof candidate.company === "string" && candidate.company.trim() ? candidate.company : "Account";
  const score = typeof candidate.intent_score === "number" ? candidate.intent_score : 0;
  const band = typeof candidate.score_band === "string" && SCORE_BANDS.has(candidate.score_band)
    ? candidate.score_band as "HOT" | "WARM" | "COLD"
    : "COLD";
  return {
    ...candidate,
    spec: buildFallbackBrief({
      company,
      score,
      band,
      contributions: extractFallbackContributions(candidate.contributions),
    }),
  };
}

function repairBlock(item: Record<string, unknown>, index: number, diagnostics: UiDiagnostic[]): UiBlock | null {
  const type = String(item.type);
  const schema = UI_BLOCK_SCHEMAS[type as UiBlock["type"]];
  const seen = new Set<string>();
  const diagnose: Diagnose = (code, path) => {
    const key = `${code}:${pathString(path)}`;
    if (seen.has(key)) return;
    seen.add(key);
    diagnostics.push({ index, type, code, path: pathString(path) });
  };

  let candidate: unknown = item;
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    candidate = normalizeLivingBriefSpec(candidate, diagnose);
    const parsed = schema.safeParse(candidate);
    if (parsed.success) {
      reportStrippedKeys(candidate, parsed.data, [], diagnose);
      return parsed.data as UiBlock;
    }
    const next = applyIssues(candidate, parsed.error.issues, diagnose);
    if (next === candidate) break;
    candidate = next;
  }

  diagnose("dropped_block", []);
  return null;
}

function domainOf(block: UiBlock): string | undefined {
  if (block.type === "living_brief" || block.type === "intent_hero" || block.type === "action_rail") return block.domain.toLowerCase();
  return undefined;
}

function applyDomainFilter(
  block: UiBlock,
  index: number,
  allowed: string[] | undefined,
  diagnostics: UiDiagnostic[],
): UiBlock | null {
  if (!allowed?.length) return block;
  const type = block.type;
  const domain = domainOf(block);
  if (domain && !allowed.includes(domain)) {
    diagnostics.push({ index, type, code: "domain_filtered", path: "domain" });
    return null;
  }
  if (block.type !== "comparison") return block;
  const accounts = block.accounts.filter((account, accountIndex) => {
    const keep = allowed.includes(account.domain.toLowerCase());
    if (!keep) diagnostics.push({ index, type, code: "domain_filtered", path: `accounts.${accountIndex}.domain` });
    return keep;
  });
  return accounts.length < 2 ? null : { ...block, accounts };
}

function normalizeActionRail(block: UiBlock): UiBlock {
  if (block.type !== "action_rail" || !block.suggestions?.length) return block;
  return {
    ...block,
    suggestions: block.suggestions.map((suggestion) => ({
      label: suggestion.label,
      prompt: suggestion.label,
    })),
  };
}

export function repairUiBlocks(input: unknown, allowedDomains?: string[]): { blocks: UiBlock[]; diagnostics: UiDiagnostic[] } {
  const diagnostics: UiDiagnostic[] = [];
  const allowed = allowedDomains?.map((domain) => domain.toLowerCase());
  const repaired: Array<{ block: UiBlock; index: number }> = [];

  for (const [index, item] of extractBlocksInput(input).entries()) {
    const type = isRecord(item) && typeof item.type === "string" ? item.type : undefined;
    if (!isRecord(item) || !type || !(type in UI_BLOCK_SCHEMAS)) {
      diagnostics.push({ index, type, code: "unknown_type", path: type ? "type" : "" });
      continue;
    }
    const block = repairBlock(item, index, diagnostics);
    if (block) repaired.push({ block, index });
  }

  const blocks: UiBlock[] = [];
  for (const item of repaired) {
    const filtered = applyDomainFilter(item.block, item.index, allowed, diagnostics);
    if (!filtered) continue;
    const block = normalizeActionRail(filtered);
    if (blocks.length >= 12) {
      diagnostics.push({ index: item.index, type: block.type, code: "limit_exceeded", path: "" });
      continue;
    }
    blocks.push(block);
  }

  return { blocks, diagnostics };
}
