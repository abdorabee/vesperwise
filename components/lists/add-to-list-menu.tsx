"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export interface AddToListMenuProps {
  domain: string;
  companyName?: string | null;
  /** "button" = labelled button (default); "icon" = icon-only with aria-label; "menuitem" = renders items for embedding in an existing DropdownMenu */
  variant?: "button" | "icon" | "menuitem";
  className?: string;
}

interface ListOption {
  id: string;
  name: string;
  isManual: boolean;
}

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; lists: ListOption[] };

const SKELETON_ROWS = 3;
const LOAD_ERROR = "Couldn't load your lists.";
const ADD_ERROR = "Couldn't add to the list. Try again.";

function readErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const value = (payload as { error?: unknown }).error;
    if (typeof value === "string" && value) return value;
  }
  return fallback;
}

function parseLists(payload: unknown): ListOption[] {
  const rows = payload && typeof payload === "object" ? (payload as { lists?: unknown }).lists : null;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap<ListOption>((row) => {
    if (!row || typeof row !== "object") return [];
    const { id, name, list_type: listType, is_system: isSystem } = row as { id?: unknown; name?: unknown; list_type?: unknown; is_system?: unknown };
    if (typeof id !== "string" || typeof name !== "string") return [];
    return [{ id, name, isManual: listType === "manual" && isSystem !== true }];
  });
}

async function fetchLists(): Promise<ListOption[]> {
  const response = await fetch("/api/dashboard/lists");
  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) throw new Error(readErrorMessage(payload, LOAD_ERROR));
  return parseLists(payload);
}

function useAddToList(domain: string, companyName: string | null | undefined) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [pending, setPending] = useState(false);
  const startedRef = useRef(false);
  const label = companyName?.trim() || domain;

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      setState({ status: "ready", lists: await fetchLists() });
    } catch (reason) {
      startedRef.current = false;
      setState({ status: "error", message: reason instanceof Error ? reason.message : LOAD_ERROR });
    }
  }, []);

  const loadOnce = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void load();
  }, [load]);

  const retry = useCallback(() => {
    startedRef.current = true;
    void load();
  }, [load]);

  const add = useCallback(async (list: ListOption) => {
    setPending(true);
    try {
      const response = await fetch(`/api/dashboard/lists/${encodeURIComponent(list.id)}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, company_name: companyName?.trim() || undefined }),
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        toast.error(readErrorMessage(payload, ADD_ERROR));
        return;
      }
      toast.success(`Added ${label} to ${list.name}`, {
        action: { label: "View list", onClick: () => router.push(`/lists/${list.id}`) },
      });
    } catch {
      toast.error(ADD_ERROR);
    } finally {
      setPending(false);
    }
  }, [companyName, domain, label, router]);

  return { state, pending, loadOnce, retry, add };
}

type ListMenuApi = ReturnType<typeof useAddToList>;

function ListRows({ api }: { api: ListMenuApi }) {
  const { state } = api;
  if (state.status === "idle" || state.status === "loading") {
    return (
      <div role="status" aria-label="Loading lists" className="flex flex-col gap-1.5 px-2 py-1.5">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => <Skeleton key={index} className="h-6 w-40" />)}
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div role="alert" className="flex flex-col gap-1.5 px-2 py-1.5 text-sm">
        <span className="text-muted-foreground">{state.message}</span>
        <Button type="button" size="xs" variant="outline" onClick={api.retry}>Retry</Button>
      </div>
    );
  }
  if (state.lists.length === 0) {
    return (
      <div className="flex flex-col gap-1.5 px-2 py-1.5 text-sm">
        <span className="text-muted-foreground">No lists yet</span>
        <Link href="/lists?new=1" className="font-medium text-foreground underline underline-offset-2">Create a list</Link>
      </div>
    );
  }
  return (
    <>
      {state.lists.map((list) => (
        <DropdownMenuItem
          key={list.id}
          disabled={!list.isManual || api.pending}
          onSelect={() => void api.add(list)}
          title={list.isManual ? undefined : "Filled automatically"}
        >
          <span className="truncate">{list.name}</span>
          {list.isManual ? null : <span className="ml-auto text-xs text-muted-foreground">Auto</span>}
        </DropdownMenuItem>
      ))}
    </>
  );
}

export function AddToListMenu({ domain, companyName, variant = "button", className }: AddToListMenuProps) {
  const api = useAddToList(domain, companyName);

  if (variant === "menuitem") {
    return (
      <DropdownMenuSub onOpenChange={(open) => { if (open) api.loadOnce(); }}>
        <DropdownMenuSubTrigger disabled={api.pending} className={className}>
          <ListPlus aria-hidden /> Add to list
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent><ListRows api={api} /></DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  }

  const Icon = api.pending ? Loader2 : ListPlus;
  const iconClass = api.pending ? "animate-spin motion-reduce:animate-none" : undefined;
  return (
    <DropdownMenu onOpenChange={(open) => { if (open) api.loadOnce(); }}>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button type="button" variant="outline" size="icon" disabled={api.pending} className={className} aria-label={`Add ${companyName?.trim() || domain} to list`}>
            <Icon aria-hidden className={iconClass} />
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled={api.pending} className={className}>
            <Icon aria-hidden className={iconClass} /> Add to list
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel>Add to list</DropdownMenuLabel>
        <ListRows api={api} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
