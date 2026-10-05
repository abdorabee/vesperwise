export type NavItem = { id: string; label: string; method?: string };
export type NavGroup = { heading: string; items: NavItem[] };

/**
 * Filter the docs sidebar. A query matches an item's label, method or id
 * (e.g. "score-history"), and a matching group heading such as "Watchlist"
 * keeps the whole group.
 */
export function filterNavGroups(groups: readonly NavGroup[], query: string): NavGroup[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...groups];

  return groups
    .map((group) => {
      if (group.heading.toLowerCase().includes(needle)) return group;
      const items = group.items.filter((item) =>
        [item.label, item.method ?? "", item.id.replace(/-/g, " ")].some((text) =>
          text.toLowerCase().includes(needle)
        )
      );
      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);
}
