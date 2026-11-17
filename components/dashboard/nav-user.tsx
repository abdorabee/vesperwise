"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import {
  ChevronsUpDown,
  CircleHelp,
  Coins,
  Compass,
  CreditCard,
  Key,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import { replayScoreTour } from "@/components/tour/score-tour";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarTooltip } from "@/components/dashboard/sidebar/nav-item";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import type { DbUser } from "@/lib/types";
import {
  LOW_CREDIT_PCT,
  LOW_CREDIT_USED_PCT,
  allowanceUsedPercent,
  creditPercent,
  getCreditStatus,
} from "@/lib/credits-status";

export { LOW_CREDIT_PCT, creditPercent };

interface NavUserProps {
  creditsRemaining: number;
  creditCap: number;
  plan?: DbUser["plan"];
  polarSubscriptionId?: string | null;
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

function AccountCredits({ creditsRemaining, creditCap, plan, polarSubscriptionId }: NavUserProps) {
  const creditPct = creditPercent(creditsRemaining, creditCap);
  const low = plan
    ? getCreditStatus({ creditsRemaining, creditCap, plan, polarSubscriptionId }).isLow
    : allowanceUsedPercent(creditsRemaining, creditCap) >= LOW_CREDIT_USED_PCT;

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
        <CreditBar pct={creditPct} low={low} />
      </div>
    </div>
  );
}

/**
 * Always-visible credits meter for the sidebar footer: "42 credits · Growth" with a thin bar,
 * linking to billing. Under 20% it turns into an Upgrade / Top up prompt. Collapsed: a gauge
 * icon with a tooltip.
 */
export function SidebarCredits({
  creditsRemaining,
  creditCap,
  plan,
  polarSubscriptionId,
}: NavUserProps & { plan: DbUser["plan"] }) {
  const { pct, isLow: low, cta, summary, planLabel } = getCreditStatus({
    creditsRemaining,
    creditCap,
    plan,
    polarSubscriptionId,
  });

  return (
    <SidebarTooltip label={low ? `${summary} · ${cta}` : summary}>
      <Link
        href="/billing"
        data-slot="sidebar-credits"
        data-low={low}
        className="vw-sb-credits"
        aria-label={low ? `${summary}. ${cta}` : `${summary}. Billing`}
      >
        <Coins className={cn("vw-sb-item__icon", low && "text-destructive")} aria-hidden="true" />
        <span className="vw-sb-credits__body">
          <span className="vw-sb-credits__line">
            <span className="tabular-nums">
              <span className="vw-sb-credits__value">{creditsRemaining.toLocaleString()}</span> credits · {planLabel}
            </span>
            {low ? <span className="vw-sb-credits__cta">{cta}</span> : null}
          </span>
          <CreditBar pct={pct} low={low} />
        </span>
      </Link>
    </SidebarTooltip>
  );
}

export function NavUser({ creditsRemaining, creditCap, plan, polarSubscriptionId }: NavUserProps) {
  const { user } = useUser();
  const { theme, toggleTheme } = useTheme();
  const { open: openSearch } = useDashboardSearch();
  const router = useRouter();

  function showMeAround() {
    replayScoreTour();
    if (window.location.pathname !== "/score") router.push("/score");
  }

  const displayName = user?.fullName || user?.firstName || "Account";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const initials =
    ((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "") ||
      email.slice(0, 2).toUpperCase() ||
      "VW").slice(0, 2);
  const avatarUrl = user?.imageUrl;
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const contentSide = collapsed ? "right" : "top";
  const contentOffset = collapsed ? 8 : 4;

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
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="vw-sb-account data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          {renderAvatar()}
          <div className="vw-sb-account__text grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{displayName}</span>
            <span className="truncate text-xs text-muted-foreground">{email}</span>
          </div>
          <span className="sr-only">
            {creditsRemaining.toLocaleString()} of {creditCap.toLocaleString()} credits remaining
          </span>
          <ChevronsUpDown className="vw-sb-account__chevron ml-auto size-4" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
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
        <AccountCredits creditsRemaining={creditsRemaining} creditCap={creditCap} plan={plan} polarSubscriptionId={polarSubscriptionId} />
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
          <DropdownMenuItem onSelect={() => showMeAround()}>
            <Compass />
            Show me around
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

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {dropdown}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
