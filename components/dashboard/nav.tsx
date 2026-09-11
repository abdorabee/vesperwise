"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { PLAN_CREDITS, type DbUser } from "@/lib/types";
import { getWorkspaceLabel } from "@/lib/workspace-label";
import {
  LayoutGrid,
  Flame,
  Gauge,
  History,
  UserSearch,
  Eye,
  ListChecks,
  Upload,
  Zap,
  Inbox,
  CreditCard,
  Key,
  Settings,
  LogOut,
  Sun,
  Moon,
  PanelLeft,
  ChevronDown,
  Search,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useDashboardSearch } from "@/components/dashboard/search-provider";
import VesperWiseLogo from "@/components/vesperwise-logo";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  indicator?: boolean;
  hotCount?: boolean;
  beta?: boolean;
  comingSoon?: boolean;
}

const WORKSPACE_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/pipeline", label: "Intent Hub", icon: Flame, hotCount: true },
  { href: "/score", label: "Score", icon: Gauge },
  { href: "/history", label: "History", icon: History },
  { href: "/people", label: "People", icon: UserSearch, beta: true },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/lists", label: "Lists", icon: ListChecks },
  { href: "/bulk", label: "Bulk Score", icon: Upload },
  { href: "/autopilot", label: "Autopilot", icon: Zap, comingSoon: true },
  { href: "/inbox", label: "Inbox", icon: Inbox },
];

const BOTTOM_ITEMS: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/api-keys", label: "API Keys", icon: Key, comingSoon: true },
];

interface DashboardNavProps {
  creditsRemaining?: number;
  plan: DbUser["plan"];
  /** Resolved server-side from users.workspace_name; falls back to the Clerk identity. */
  workspaceName?: string | null;
  collapsed?: boolean;
  onToggle?: () => void;
  inboxCount?: number;
  watchlistCount?: number;
  pipelineHotCount?: number;
}

export default function DashboardNav({
  creditsRemaining = 0,
  plan,
  workspaceName,
  collapsed = false,
  onToggle,
  inboxCount,
  watchlistCount,
  pipelineHotCount,
}: DashboardNavProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { open: openSearch } = useDashboardSearch();
  const { user } = useUser();
  const creditCap = PLAN_CREDITS[plan] ?? PLAN_CREDITS.free;
  const creditPct = creditCap > 0 ? Math.min(100, Math.round((creditsRemaining / creditCap) * 100)) : 0;
  const displayName = user?.fullName || user?.firstName || "Account";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const workspaceLabel = getWorkspaceLabel({ workspaceName, fullName: user?.fullName, email });
  const initials =
    (user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "") ||
    email.slice(0, 2).toUpperCase() ||
    "IQ";

  function navCount(item: NavItem): string | undefined {
    if (item.href === "/inbox" && inboxCount && inboxCount > 0) return String(inboxCount);
    if (item.href === "/pipeline" && pipelineHotCount && pipelineHotCount > 0) return String(pipelineHotCount);
    if (item.href === "/watchlist" && watchlistCount && watchlistCount > 0) return String(watchlistCount);
    return undefined;
  }

  return (
    <aside className="sidebar">
      {/* Head */}
      <div className="sb-head">
        <VesperWiseLogo className="ws-logo" size={24} />
        {!collapsed && (
          <div className="ws-name">
            {workspaceLabel}
            <span className="role">Workspace · {plan}</span>
          </div>
        )}
        {!collapsed && <ChevronDown className="ws-chev" />}
      </div>

      {/* Search */}
      {!collapsed && (
        <button type="button" className="sb-search" onClick={openSearch} aria-label="Search">
          <Search className="ic" />
          <span>Search</span>
          <kbd className="kbd">⌘K</kbd>
        </button>
      )}

      {/* Workspace nav */}
      <div className="sb-section">
        {!collapsed && <span>Workspace</span>}
      </div>
      {WORKSPACE_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
        const displayCount = navCount(item);
        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={cn("sb-item", active && "active")}
          >
            <Icon className="ic" />
            {!collapsed && (
              <>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.label}
                </span>
                {item.comingSoon && (
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-quaternary)" }}>
                    Soon
                  </span>
                )}
                {item.beta && !item.comingSoon && (
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-quaternary)" }}>
                    Beta
                  </span>
                )}
                {displayCount && (
                  <span className={cn("count quantity", item.hotCount && "hot")}>{displayCount}</span>
                )}
                {item.indicator && <span className="indicator" />}
              </>
            )}
          </Link>
        );
      })}


      <div className="sb-divider" />

      {BOTTOM_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={cn("sb-item", active && "active")}
          >
            <Icon className="ic" />
            {!collapsed && (
              <>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.comingSoon && (
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--text-quaternary)" }}>
                    Soon
                  </span>
                )}
              </>
            )}
          </Link>
        );
      })}

      <div className="sb-spacer" />

      {/* Credits */}
      {!collapsed ? (
        <div className="sb-credits">
          <div className="label">Credits this month</div>
          <div className="row">
            <div>
              <span className="val quantity">{creditsRemaining.toLocaleString()}</span>
              <span className="of quantity"> / {creditCap.toLocaleString()}</span>
            </div>
            <Link href="/billing" className="topup">Top up</Link>
          </div>
          <div className="bar">
            <div className="fill" style={{ width: `${creditPct}%` }} />
          </div>
        </div>
      ) : (
        <div
          title={`${creditsRemaining} credits`}
          className="quantity"
          style={{ margin: "8px 4px", padding: "8px 4px", textAlign: "center", fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", fontVariantNumeric: "tabular-nums" }}
        >
          {creditsRemaining}
        </div>
      )}

      {/* User */}
      <div className="sb-user">
        <span className="av">{initials.slice(0, 2)}</span>
        {!collapsed && (
          <div className="info">
            <div className="name">{displayName}</div>
            <div className="email">{email}</div>
          </div>
        )}
        {!collapsed && <ChevronDown style={{ width: 12, height: 12, flexShrink: 0, color: "var(--text-tertiary)" }} />}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 4px 0" }}>
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? "Expand" : "Collapse"}
          style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: "var(--r-sm)", color: "var(--text-tertiary)", cursor: "pointer" }}
          className="hover:bg-foreground/[0.05] hover:text-[var(--text-primary)]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
        {!collapsed && (
          <>
            <button
              type="button"
              onClick={toggleTheme}
              title="Theme"
              style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: "var(--r-sm)", color: "var(--text-tertiary)", cursor: "pointer" }}
              className="hover:bg-foreground/[0.05]"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <SignOutButton redirectUrl="/">
              <button
                type="button"
                title="Sign out"
                style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: "var(--r-sm)", color: "var(--text-tertiary)", cursor: "pointer" }}
                className="hover:bg-red-500/10 hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </SignOutButton>
          </>
        )}
      </div>
    </aside>
  );
}
