"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, SlidersHorizontal, Target, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface RailItem {
  href: string;
  label: string;
  sub: string;
  icon: LucideIcon;
  /** Leaves the Settings section — billing keeps its own top-level page. */
  external?: boolean;
}

const ITEMS: RailItem[] = [
  {
    href: "/settings/profile",
    label: "Business profile",
    sub: "Your ICP",
    icon: Target,
  },
  {
    href: "/settings/account",
    label: "Account",
    sub: "Workspace and role",
    icon: SlidersHorizontal,
  },
  {
    href: "/billing",
    label: "Billing",
    sub: "Plan, credits, invoices",
    icon: CreditCard,
    external: true,
  },
];

export default function SettingsRail() {
  const pathname = usePathname();

  return (
    <nav className="set-rail" aria-label="Settings sections">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = !item.external && pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn("set-rail-item", active && "active", item.external && "external")}
          >
            <Icon className="ic" aria-hidden="true" />
            <span className="set-rail-text">
              <span className="set-rail-label">{item.label}</span>
              <span className="set-rail-sub">{item.sub}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
