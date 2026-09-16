"use client";

import Link from "next/link";
import { useUser, SignOutButton } from "@clerk/nextjs";
import {
  ChevronsUpDown,
  CircleHelp,
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

interface NavUserProps {
  creditsRemaining: number;
  creditCap: number;
}

function AccountCredits({ creditsRemaining, creditCap }: NavUserProps) {
  const creditPct =
    creditCap > 0 ? Math.min(100, Math.round((creditsRemaining / creditCap) * 100)) : 0;

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
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
          style={{ width: `${creditPct}%` }}
        />
      </div>
    </div>
  );
}

export function NavUser({ creditsRemaining, creditCap }: NavUserProps) {
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

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
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
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
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
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
