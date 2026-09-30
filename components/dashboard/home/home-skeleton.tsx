import { Skeleton } from "@/components/ui/skeleton";
import { HotAccountsSkeleton } from "./hot-accounts";

/** Mirrors DashboardHomeView's populated grid so nothing jumps when data lands. */
export function HomeSkeleton() {
  return (
    <div className="@container/home flex flex-col gap-6" role="status" aria-live="polite">
      <span className="sr-only">Loading home…</span>

      <div className="flex flex-col gap-5 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-28 bg-muted" />
          <Skeleton className="h-5 w-72 max-w-full bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-36 rounded-lg bg-muted" />
          <Skeleton className="h-9 w-36 bg-muted" />
        </div>
      </div>

      <div className="grid gap-3 @xl/home:grid-cols-2 @5xl/home:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex h-[118px] flex-col gap-3 rounded-xl border border-border bg-card px-5 py-5">
            <Skeleton className="h-3.5 w-24 bg-muted" />
            <Skeleton className="h-7 w-16 bg-muted" />
            <Skeleton className="h-3.5 w-32 bg-muted" />
          </div>
        ))}
      </div>

      <div className="grid items-start gap-4 @5xl/home:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <HotAccountsSkeleton />
        <div className="rounded-xl border border-border/70 bg-card">
          <div className="flex flex-col gap-2 border-b border-border/70 px-5 py-4">
            <Skeleton className="h-4 w-28 bg-muted" />
            <Skeleton className="h-4 w-44 bg-muted" />
          </div>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border/70 px-5 py-3 last:border-b-0">
              <Skeleton className="size-5 rounded-md bg-muted" />
              <Skeleton className="h-4 flex-1 bg-muted" />
              <Skeleton className="h-3.5 w-6 bg-muted" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-card">
        <div className="flex flex-col gap-2 border-b border-border/70 px-5 py-4">
          <Skeleton className="h-4 w-24 bg-muted" />
          <Skeleton className="h-4 w-80 max-w-full bg-muted" />
        </div>
        <div className="flex flex-col gap-4 px-5 py-5">
          <Skeleton className="h-4 w-56 bg-muted" />
          <Skeleton className="h-44 w-full bg-muted" />
        </div>
      </div>
    </div>
  );
}
