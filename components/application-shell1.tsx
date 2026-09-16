"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { ChevronRight, ChevronsUpDown, LogOut, User } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import VesperWiseLogo from "@/components/vesperwise-logo";

export type ShellNavItem = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  isActive?: boolean;
  children?: ShellNavItem[];
};

export type ShellNavGroup = {
  title: string;
  items: ShellNavItem[];
  defaultOpen?: boolean;
};

export type ShellUserData = {
  name: string;
  email: string;
  avatar: string;
};

export type ShellSidebarData = {
  logo: {
    src?: string;
    alt: string;
    title: string;
    description: string;
  };
  navGroups: ShellNavGroup[];
  footerGroup: ShellNavGroup;
  user?: ShellUserData;
};

export type ShellBreadcrumb = {
  parent: string;
  parentHref?: string;
  current: string;
};

export type ShellCredits = {
  remaining: number;
  cap: number;
  planLabel?: string;
};

const SidebarLogo = ({ logo }: { logo: ShellSidebarData["logo"] }) => {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Link href="/dashboard">
            <div className="flex aspect-square size-8 items-center justify-center rounded-sm bg-primary">
              <VesperWiseLogo
                className="size-6 text-primary-foreground invert dark:invert-0"
                size={20}
              />
            </div>
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="font-medium">{logo.title}</span>
              <span className="text-xs text-muted-foreground">{logo.description}</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

const NavMenuItem = ({ item }: { item: ShellNavItem }) => {
  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;

  if (!hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={item.isActive}>
          <Link href={item.href}>
            <Icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible asChild defaultOpen className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={item.isActive}>
            <Icon className="size-4" />
            <span>{item.label}</span>
            <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children!.map((child) => (
              <SidebarMenuSubItem key={child.label}>
                <SidebarMenuSubButton asChild isActive={child.isActive}>
                  <Link href={child.href}>{child.label}</Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
};

const ShellNavUser = ({
  user,
  accountHref = "/settings/account",
}: {
  user: ShellUserData;
  accountHref?: string;
}) => {
  const initials =
    user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    user.email.slice(0, 2).toUpperCase() ||
    "VW";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                {user.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
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
                <Avatar className="size-8 rounded-lg">
                  {user.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={accountHref}>
                <User className="mr-2 size-4" />
                Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <SignOutButton redirectUrl="/">
              <DropdownMenuItem>
                <LogOut className="mr-2 size-4" />
                Log out
              </DropdownMenuItem>
            </SignOutButton>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

function CreditsStrip({ credits }: { credits: ShellCredits }) {
  const pct =
    credits.cap > 0
      ? Math.min(100, Math.round((credits.remaining / credits.cap) * 100))
      : 0;

  return (
    <div className="px-2 py-1.5 group-data-[collapsible=icon]:hidden">
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>Credits</span>
        <Link href="/billing" className="hover:underline">
          {credits.remaining.toLocaleString()}
          <span className="text-muted-foreground/80"> / {credits.cap.toLocaleString()}</span>
        </Link>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-sidebar-border">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      {credits.planLabel ? (
        <div className="mt-1 truncate text-[10px] text-muted-foreground">{credits.planLabel}</div>
      ) : null}
    </div>
  );
}

const AppSidebar = ({
  data,
  credits,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  data: ShellSidebarData;
  credits?: ShellCredits;
}) => {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarLogo logo={data.logo} />
      </SidebarHeader>
      <SidebarContent className="overflow-hidden">
        <ScrollArea className="min-h-0 flex-1">
          {data.navGroups.map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <NavMenuItem key={`${item.href}-${item.label}`} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
          <SidebarGroup>
            <SidebarGroupLabel>{data.footerGroup.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {data.footerGroup.items.map((item) => (
                  <NavMenuItem key={`${item.href}-${item.label}`} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter>
        {credits ? <CreditsStrip credits={credits} /> : null}
        {data.user ? <ShellNavUser user={data.user} /> : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

interface ApplicationShell1Props {
  className?: string;
  children?: React.ReactNode;
  data: ShellSidebarData;
  breadcrumb: ShellBreadcrumb;
  credits?: ShellCredits;
}

export function ApplicationShell1({
  className,
  children,
  data,
  breadcrumb,
  credits,
}: ApplicationShell1Props) {
  return (
    <SidebarProvider className={cn(className)}>
      <AppSidebar data={data} credits={credits} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 hidden data-[orientation=vertical]:h-4 md:block"
          />
          <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
            <div className="flex aspect-square size-8 items-center justify-center rounded-sm bg-primary">
              <VesperWiseLogo
                className="size-6 text-primary-foreground invert dark:invert-0"
                size={20}
              />
            </div>
            <span className="font-semibold">{data.logo.title}</span>
          </Link>
          <Breadcrumb className="hidden md:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href={breadcrumb.parentHref ?? "/dashboard"}>
                  {breadcrumb.parent}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{breadcrumb.current}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
