const INTERACTIVE_SELECTOR = "a, button, input, select, textarea, label, [role='checkbox'], [role='button'], [role='link'], [contenteditable='true']";

interface ClosestTarget {
  closest: (selector: string) => unknown;
}

function hasClosest(target: unknown): target is ClosestTarget {
  return typeof (target as Partial<ClosestTarget> | null)?.closest === "function";
}

/**
 * True when a click on a clickable row actually landed on an interactive element
 * inside it (a link, button or checkbox), so the row should not also handle it.
 */
export function isInnerInteractiveClick(target: EventTarget | null, row: EventTarget | null): boolean {
  if (!hasClosest(target)) return false;
  const hit = target.closest(INTERACTIVE_SELECTOR);
  return Boolean(hit) && hit !== row;
}
