export type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

const MAX_FULL_LIST = 7;

/**
 * Page numbers to render: always first and last, the current page with one
 * neighbour on each side, and ellipses where pages are skipped.
 * 20 pages at page 10 -> 1 … 9 10 11 … 20.
 */
export function paginationWindow(current: number, total: number): PaginationItem[] {
  if (total <= 0) return [];
  if (total <= MAX_FULL_LIST) return Array.from({ length: total }, (_, i) => i + 1);

  const page = Math.min(Math.max(1, current), total);
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  const items: PaginationItem[] = [1];
  if (start > 2) items.push("ellipsis-start");
  for (let n = start; n <= end; n++) items.push(n);
  if (end < total - 1) items.push("ellipsis-end");
  items.push(total);
  return items;
}
