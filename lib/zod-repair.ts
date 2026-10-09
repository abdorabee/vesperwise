import type { ZodIssue } from "zod";

export type RepairIssueCode = "invalid_prop" | "truncated";
export type RepairDiagnose = (code: RepairIssueCode, path: readonly PropertyKey[]) => void;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function pathString(path: readonly PropertyKey[]): string {
  return path.map(String).join(".");
}

function getAtPath(value: unknown, path: readonly PropertyKey[]): unknown {
  return path.reduce<unknown>((current, key) => {
    if (Array.isArray(current) && typeof key === "number") return current[key];
    if (isRecord(current)) return current[key as string];
    return undefined;
  }, value);
}

export function removeAtPath(value: unknown, path: readonly PropertyKey[]): unknown {
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

export function truncateAtPath(value: unknown, path: readonly PropertyKey[], maximum: number): unknown {
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

/** A missing required field can't be removed; drop the nearest enclosing array item instead. */
function enclosingArrayItem(path: readonly PropertyKey[]): readonly PropertyKey[] | null {
  for (let i = path.length - 1; i >= 0; i -= 1) {
    if (typeof path[i] === "number") return path.slice(0, i + 1);
  }
  return null;
}

/** Applies one pass of fixes. Highest array indexes go first so removals never shift a later target. */
export function applyIssues(candidate: unknown, issues: readonly ZodIssue[], diagnose: RepairDiagnose): unknown {
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

/** Reports keys the schema stripped, at any depth, by diffing the input against the parsed output. */
export function reportStrippedKeys<Code extends string = "unknown_prop">(
  input: unknown,
  output: unknown,
  path: PropertyKey[],
  diagnose: (code: Code, path: readonly PropertyKey[]) => void,
  code: Code = "unknown_prop" as Code,
): void {
  if (Array.isArray(input) && Array.isArray(output)) {
    input.forEach((item, i) => reportStrippedKeys(item, output[i], [...path, i], diagnose, code));
    return;
  }
  if (!isRecord(input) || !isRecord(output)) return;
  for (const key of Object.keys(input)) {
    if (!(key in output)) diagnose(code, [...path, key]);
    else reportStrippedKeys(input[key], output[key], [...path, key], diagnose, code);
  }
}
