"use client";

import { NAV_GROUPS } from "@/components/dashboard/nav-config";
import { NavItemLink } from "@/components/dashboard/sidebar/nav-item";
import type { NavCounts } from "@/components/dashboard/sidebar/nav-counts";

interface NavGroupsProps {
  pathname: string;
  counts: NavCounts;
}

export function NavGroups({ pathname, counts }: NavGroupsProps) {
  return (
    <nav aria-label="Dashboard" data-slot="sidebar-nav" className="vw-sb-nav">
      {NAV_GROUPS.map((group) => (
        <section key={group.id} aria-labelledby={`vw-sb-group-${group.id}`} className="vw-sb-group">
          <div id={`vw-sb-group-${group.id}`} className="vw-sb-group__label">
            {group.label}
          </div>
          <div aria-hidden="true" className="vw-sb-group__rule" />
          <ul className="vw-sb-list">
            {group.items.map((item) => (
              <NavItemLink key={item.href} item={item} pathname={pathname} counts={counts} />
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
