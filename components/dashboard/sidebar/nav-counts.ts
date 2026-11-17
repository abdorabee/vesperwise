import type { NavCountKind } from "@/components/dashboard/nav-config";

export type NavCounts = Record<NavCountKind, number>;

const MAX_DISPLAY_COUNT = 99;

/** Compact visual form: 7, 99+. Empty for zero so nothing renders. */
export function formatNavCount(count: number): string {
  if (count <= 0) return "";
  return count > MAX_DISPLAY_COUNT ? `${MAX_DISPLAY_COUNT}+` : String(count);
}

/** Screen-reader / tooltip sentence for a count. */
export function navCountSentence(kind: NavCountKind, count: number): string {
  if (kind === "hot") return `${count} hot ${count === 1 ? "account" : "accounts"}`;
  return `${count} on watchlist`;
}
