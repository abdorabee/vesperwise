import { UI_BLOCK_SCHEMAS, type UiBlock } from "./gen-ui-schemas";
import { applyIssues, isRecord, pathString, reportStrippedKeys } from "./zod-repair";

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
  if (block.type === "intent_hero" || block.type === "action_rail") return block.domain.toLowerCase();
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
