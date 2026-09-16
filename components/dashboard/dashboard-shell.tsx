"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  ApplicationShell1,
  type ShellBreadcrumb,
  type ShellSidebarData,
} from "@/components/application-shell1";
import { SearchProvider } from "@/components/dashboard/search-provider";
import {
  CRUMB,
  HELP_ITEM,
  NAV_LIBRARY,
  NAV_MAIN,
  NAV_SECONDARY,
  isNavActive,
  type NavItem,
} from "@/components/dashboard/nav-config";
import { PLAN_CREDITS, type DbUser } from "@/lib/types";
import { getWorkspaceLabel } from "@/lib/workspace-label";

interface DashboardShellProps {
  children: React.ReactNode;
  creditsRemaining: number;
  plan: DbUser["plan"];
  workspaceName?: string | null;
  inboxCount?: number;
  watchlistCount?: number;
  pipelineHotCount?: number;
}

function toShellItem(item: NavItem, pathname: string) {
  return {
    label: item.label,
    icon: item.icon as React.ComponentType<React.SVGProps<SVGSVGElement>>,
    href: item.href,
    isActive: isNavActive(pathname, item.href),
  };
}

function buildSidebarData(
  pathname: string,
  user: {
    name: string;
    email: string;
    avatar: string;
  },
  logoDescription: string
): ShellSidebarData {
  return {
    logo: {
      alt: "VesperWise",
      title: "VesperWise",
      description: logoDescription,
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
    user,
  };
}

function resolveBreadcrumb(pathname: string): ShellBreadcrumb {
  if (pathname.startsWith("/settings/")) {
    const current =
      pathname === "/settings/account"
        ? "Account"
        : pathname === "/settings/profile"
          ? "Business profile"
          : "Settings";
    return { parent: "Settings", parentHref: "/settings", current };
  }

  const match = CRUMB[pathname];
  if (match) {
    return {
      parent: match.parent,
      parentHref: "/dashboard",
      current: match.current,
    };
  }

  return { parent: "Workspace", parentHref: "/dashboard", current: "Dashboard" };
}

export default function DashboardShell({
  children,
  creditsRemaining,
  plan,
  workspaceName,
}: DashboardShellProps) {
  const pathname = usePathname();
  const { user } = useUser();

  const displayName = user?.fullName || user?.firstName || "Account";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const avatar = user?.imageUrl ?? "";
  const creditCap = PLAN_CREDITS[plan] ?? PLAN_CREDITS.free;
  const workspaceLabel = getWorkspaceLabel({
    workspaceName,
    fullName: user?.fullName,
    email,
  });

  const data = useMemo(
    () =>
      buildSidebarData(
        pathname,
        { name: displayName, email, avatar },
        workspaceLabel || "Sales intelligence"
      ),
    [pathname, displayName, email, avatar, workspaceLabel]
  );

  const breadcrumb = useMemo(() => resolveBreadcrumb(pathname), [pathname]);

  return (
    <SearchProvider>
      <ApplicationShell1
        data={data}
        breadcrumb={breadcrumb}
        credits={{
          remaining: creditsRemaining,
          cap: creditCap,
          planLabel: `${workspaceLabel} · ${plan}`,
        }}
      >
        {children}
      </ApplicationShell1>
    </SearchProvider>
  );
}

export { buildSidebarData, resolveBreadcrumb };
