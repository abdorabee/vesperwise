"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  ApplicationShell1,
  type ShellSidebarData,
} from "@/components/application-shell1";
import {
  CRUMB,
  HELP_ITEM,
  NAV_LIBRARY,
  NAV_MAIN,
  NAV_SECONDARY,
  isNavActive,
  type NavItem,
} from "@/components/dashboard/nav-config";
import { getStoredTheme, setStoredTheme } from "@/components/theme-provider";
import { PLAN_CREDITS } from "@/lib/types";

function toShellItem(item: NavItem, pathname: string) {
  return {
    label: item.label,
    icon: item.icon as React.ComponentType<React.SVGProps<SVGSVGElement>>,
    href: item.href,
    isActive: isNavActive(pathname, item.href),
  };
}

/**
 * Public no-auth mock of application-shell1 chrome in dark mode.
 * Restores the prior theme preference on leave.
 */
export default function DevShellDarkPage() {
  const pathname = usePathname();

  useEffect(() => {
    const previous = getStoredTheme();
    setStoredTheme("dark");
    return () => setStoredTheme(previous);
  }, []);

  const data = useMemo<ShellSidebarData>(
    () => ({
      logo: {
        alt: "VesperWise",
        title: "VesperWise",
        description: "Preview Workspace",
      },
      navGroups: [
        {
          title: "Workspace",
          defaultOpen: true,
          items: NAV_MAIN.map((item) => toShellItem(item, pathname)),
        },
        {
          title: "Library",
          defaultOpen: true,
          items: NAV_LIBRARY.map((item) => toShellItem(item, pathname)),
        },
      ],
      footerGroup: {
        title: "Support",
        items: [
          ...NAV_SECONDARY.map((item) => toShellItem(item, pathname)),
          toShellItem(HELP_ITEM, pathname),
        ],
      },
      user: {
        name: "Preview User",
        email: "preview@vesperwise.com",
        avatar: "",
      },
    }),
    [pathname]
  );

  const crumb = CRUMB[pathname] ?? { parent: "Workspace", current: "Shell preview" };
  const creditCap = PLAN_CREDITS.growth;

  return (
    <ApplicationShell1
      data={data}
      breadcrumb={{
        parent: crumb.parent,
        parentHref: "/dashboard",
        current: crumb.current,
      }}
      credits={{
        remaining: 42,
        cap: creditCap,
        planLabel: "Preview Workspace · growth",
      }}
    >
      <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="aspect-video rounded-xl bg-background/60" />
          <div className="aspect-video rounded-xl bg-background/60" />
          <div className="aspect-video rounded-xl bg-background/60" />
          <div className="aspect-video rounded-xl bg-background/60" />
        </div>
        <div className="min-h-[40vh] rounded-xl bg-background/60" />
        <p className="text-sm text-muted-foreground">
          Dark application-shell1 — same block as{" "}
          <span className="font-medium text-foreground">/dev/shell</span>.
        </p>
      </div>
    </ApplicationShell1>
  );
}
