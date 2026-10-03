"use client";

import Link from "next/link";
import { useUser, SignOutButton } from "@clerk/nextjs";
import {
  ChevronsUpDown,
  CircleHelp,
  Coins,
  CreditCard,
  Key,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import { useDashboardSearch } from "@/components/dashboard/search-provider";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import type { DbUser } from "@/lib/types";
import {
  LOW_CREDIT_PCT,
  creditPercent,
  getCreditStatus,
} from "@/lib/credits-status";

export { LOW_CREDIT_PCT, creditPercent };

interface NavUserProps {
  creditsRemaining: number;
  creditCap: number;
  variant?: "sidebar" | "rail";
}

function CreditBar({ pct, low }: { pct: number; low: boolean }) {
  return (
    <div className="h-1 overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none",
          low ? "bg-destructive" : "bg-foreground/70"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function AccountCredits({ creditsRemaining, creditCap }: NavUserProps) {
  const creditPct = creditPercent(creditsRemaining, creditCap);

  return (
    <div data-slot="account-credits" className="px-2 py-1.5 text-xs">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Credits</span>
        <Link href="/billing" className="font-medium underline-offset-4 hover:underline">
          Top up
        </Link>
      </div>
      <div className="mt-1 font-medium tabular-nums">
        {creditsRemaining.toLocaleString()}
        <span className="font-normal text-muted-foreground">
          {" "}/ {creditCap.toLocaleString()}
        </span>
      </div>
      <div className="mt-2">
        <CreditBar pct={creditPct} low={creditPct < LOW_CREDIT_PCT} />
      </div>
    </div>
  );
}

/**
 * Always-visible credits meter for the sidebar footer. Expanded: numbers + bar, with an
 * Upgrade / Top up prompt when under 20%. Collapsed: a gauge icon with a tooltip.
 */
export function SidebarCredits({
  creditsRemaining,
  creditCap,
  plan,
}: NavUserProps & { plan: DbUser["plan"] }) {
  const { pct, isLow: low, cta, summary } = getCreditStatus({
    creditsRemaining,
    creditCap,
    plan,
  });

  return (
    <SidebarMenu data-slot="sidebar-credits">
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          tooltip={low ? `${summary} · ${cta}` : summary}
          className="h-auto py-2 group-data-[collapsible=icon]:h-8! group-data-[collapsible=icon]:py-2!"
        >
          <Link href="/billing" aria-label={low ? `${summary}. ${cta}` : `${summary}. Billing`}>
            <Coins className={cn(low && "text-destructive")} aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5 group-data-[collapsible=icon]:hidden">
              <span className="flex items-baseline justify-between gap-2 text-xs">
                <span className="tabular-nums">
                  <span className="font-medium text-sidebar-foreground">
                    {creditsRemaining.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground"> / {creditCap.toLocaleString()} credits</span>
                </span>
                {low ? (
                  <span className="font-medium text-sidebar-foreground underline underline-offset-4">
                    {cta}
                  </span>
                ) : null}
              </span>
              <CreditBar pct={pct} low={low} />
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function NavUser({ creditsRemaining, creditCap, variant = "sidebar" }: NavUserProps) {
  const { user } = useUser();
  const { theme, toggleTheme } = useTheme();
  const { open: openSearch } = useDashboardSearch();

  const displayName = user?.fullName || user?.firstName || "Account";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const initials =
    ((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "") ||
      email.slice(0, 2).toUpperCase() ||
      "VW").slice(0, 2);
  const avatarUrl = user?.imageUrl;
  const contentSide = variant === "rail" ? "right" : "bottom";
  const contentOffset = variant === "rail" ? 8 : 4;

  function renderAvatar() {
    return (
      <Avatar className="h-8 w-8 rounded-lg">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
        <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
      </Avatar>
    );
  }

  const dropdown = (
    <DropdownMenu>
      {variant === "rail" ? (
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-slot="nav-user-rail-trigger"
            className="dashboard-nav-user-rail-trigger"
            aria-label={`${displayName} account menu`}
          >
            {renderAvatar()}
            <span className="sr-only">
              {creditsRemaining.toLocaleString()} of {creditCap.toLocaleString()} credits remaining
            </span>
          </button>
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            {renderAvatar()}
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">{email}</span>
            </div>
            <span className="sr-only">
              {creditsRemaining.toLocaleString()} of {creditCap.toLocaleString()} credits remaining
            </span>
            <ChevronsUpDown className="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
        side={contentSide}
        align="end"
        sideOffset={contentOffset}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            {renderAvatar()}
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">{email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <AccountCredits creditsRemaining={creditsRemaining} creditCap={creditCap} />
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={openSearch}>
            <Search />
            Search
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/billing">
              <CreditCard />
              Billing
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/api-keys">
              <Key />
              API Keys
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/docs">
              <CircleHelp />
              Get Help
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleTheme}>
            {theme === "dark" ? <Sun /> : <Moon />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <SignOutButton redirectUrl="/">
          <DropdownMenuItem>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </SignOutButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (variant === "rail") return dropdown;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {dropdown}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
