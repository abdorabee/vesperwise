import type { ZodIssue } from "zod";

import { UI_BLOCK_SCHEMAS, type UiBlock } from "./gen-ui-schemas";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractBlocksInput(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  if (isRecord(input) && Array.isArray(input.blocks)) return input.blocks;
  return [];
}

function pathString(path: readonly PropertyKey[]): string {
  return path.map(String).join(".");
}

function getAtPath(value: unknown, path: readonly PropertyKey[]): unknown {
  return path.reduce<unknown>((current, key) => {
    if (Array.isArray(current) && typeof key === "number") return current[key];
    if (isRecord(current)) return current[key as string];
    return undefined;
  }, value);
}

function removeAtPath(value: unknown, path: readonly PropertyKey[]): unknown {
  if (path.length === 0) return undefined;
  const [head, ...tail] = path;
  if (Array.isArray(value) && typeof head === "number") {
    if (tail.length === 0) return value.filter((_, index) => index !== head);
    return value.map((item, index) => index === head ? removeAtPath(item, tail) : item);
  }
  if (!isRecord(value)) return value;
  if (tail.length === 0) {
    if (!(String(head) in value)) return value;
    const copy = { ...value };
    delete copy[String(head)];
    return copy;
  }
  if (!(String(head) in value)) return value;
  return { ...value, [String(head)]: removeAtPath(value[String(head)], tail) };
}

function truncateAtPath(value: unknown, path: readonly PropertyKey[], maximum: number): unknown {
  if (path.length === 0) return typeof value === "string" ? value.slice(0, maximum) : value;
  const [head, ...tail] = path;
  if (Array.isArray(value) && typeof head === "number") {
    return value.map((item, index) => index === head ? truncateAtPath(item, tail, maximum) : item);
  }
  if (!isRecord(value)) return value;
  return { ...value, [String(head)]: truncateAtPath(value[String(head)], tail, maximum) };
}

function isStringTooBig(issue: ZodIssue, value: unknown): issue is ZodIssue & { maximum: number } {
  return issue.code === "too_big" && typeof value === "string" && typeof issue.maximum === "number";
}

type Diagnose = (code: UiDiagnosticCode, path: readonly PropertyKey[]) => void;

function comparePathsDescending(a: readonly PropertyKey[], b: readonly PropertyKey[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    if (a[i] === b[i]) continue;
    if (typeof a[i] === "number" && typeof b[i] === "number") return (b[i] as number) - (a[i] as number);
    return String(b[i]).localeCompare(String(a[i]));
  }
  return b.length - a.length;
}

function isPrefix(prefix: readonly PropertyKey[], path: readonly PropertyKey[]): boolean {
  return prefix.length <= path.length && prefix.every((key, i) => key === path[i]);
}

/** Applies one pass of fixes. Highest array indexes go first so removals never shift a later target. */
function applyIssues(candidate: unknown, issues: readonly ZodIssue[], diagnose: Diagnose): unknown {
  const ordered = [...issues].sort((a, b) => comparePathsDescending(a.path, b.path));
  const removed: (readonly PropertyKey[])[] = [];
  let next = candidate;
  for (const issue of ordered) {
    if (removed.some((prefix) => isPrefix(prefix, issue.path))) continue;
    const current = getAtPath(next, issue.path);
    const maximum = isStringTooBig(issue, current) ? issue.maximum : undefined;
    diagnose(maximum === undefined ? "invalid_prop" : "truncated", issue.path);
    if (maximum !== undefined) {
      next = truncateAtPath(next, issue.path, maximum);
      continue;
    }
    const target = current === undefined ? enclosingArrayItem(issue.path) : issue.path;
    if (!target || removed.some((prefix) => isPrefix(prefix, target))) continue;
    removed.push(target);
    next = removeAtPath(next, target);
  }
  return next;
}

/** A missing required field can't be removed; drop the nearest enclosing array item instead. */
function enclosingArrayItem(path: readonly PropertyKey[]): readonly PropertyKey[] | null {
  for (let i = path.length - 1; i >= 0; i -= 1) {
    if (typeof path[i] === "number") return path.slice(0, i + 1);
  }
  return null;
}

/** Reports keys the schema stripped, at any depth, by diffing the input against the parsed output. */
function reportStrippedKeys(input: unknown, output: unknown, path: PropertyKey[], diagnose: Diagnose): void {
  if (Array.isArray(input) && Array.isArray(output)) {
    input.forEach((item, i) => reportStrippedKeys(item, output[i], [...path, i], diagnose));
    return;
  }
  if (!isRecord(input) || !isRecord(output)) return;
  for (const key of Object.keys(input)) {
    if (!(key in output)) diagnose("unknown_prop", [...path, key]);
    else reportStrippedKeys(input[key], output[key], [...path, key], diagnose);
  }
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
