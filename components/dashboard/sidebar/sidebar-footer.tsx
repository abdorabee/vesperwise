"use client";

import Link from "next/link";
import { SETTINGS_ITEM, isNavActive } from "@/components/dashboard/nav-config";
import { SidebarTooltip } from "@/components/dashboard/sidebar/nav-item";
import { NavUser, SidebarCredits } from "@/components/dashboard/nav-user";
import type { DbUser } from "@/lib/types";

interface SidebarFooterContentProps {
  pathname: string;
  creditsRemaining: number;
  creditCap: number;
  plan: DbUser["plan"];
  polarSubscriptionId?: string | null;
}

export function SidebarFooterContent({
  pathname,
  creditsRemaining,
  creditCap,
  plan,
  polarSubscriptionId,
}: SidebarFooterContentProps) {
  const Icon = SETTINGS_ITEM.icon;
  const active = isNavActive(pathname, SETTINGS_ITEM.href);

  return (
    <div className="vw-sb-footer" data-slot="sidebar-footer-content">
      <SidebarCredits
        creditsRemaining={creditsRemaining}
        creditCap={creditCap}
        plan={plan}
        polarSubscriptionId={polarSubscriptionId}
      />
      <SidebarTooltip label={SETTINGS_ITEM.label}>
        <Link
          href={SETTINGS_ITEM.href}
          className="vw-sb-item"
          data-active={active}
          aria-current={active ? "page" : undefined}
        >
          <Icon className="vw-sb-item__icon" />
          <span className="vw-sb-item__label">{SETTINGS_ITEM.label}</span>
        </Link>
      </SidebarTooltip>
      <NavUser creditsRemaining={creditsRemaining} creditCap={creditCap} plan={plan} polarSubscriptionId={polarSubscriptionId} />
    </div>
  );
}
