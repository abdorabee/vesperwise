import Link from "next/link";
import { ArrowDown, ArrowUp, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RANGE_DAYS, type RangeKey } from "@/lib/dashboard-home";

export function ScoreCompanyButton({ className }: { className?: string }) {
  return (
    <Button asChild size="sm" variant="brand" className={className}>
      <Link href="/score">
        <Plus aria-hidden strokeWidth={2} />
        Score company
      </Link>
    </Button>
  );
}

export function RangeToggle({ value }: { value: RangeKey }) {
  return (
    <nav aria-label="Trend range" className="inline-flex h-9 items-center rounded-lg border border-border bg-muted p-0.5">
      {(Object.keys(RANGE_DAYS) as RangeKey[]).map((key) => {
        const active = key === value;
        return (
          <Link
            key={key}
            href={`/dashboard?range=${key}`}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-full min-w-11 items-center justify-center rounded-md px-2.5 text-xs font-medium uppercase tabular-nums transition-[background-color,color] duration-150 motion-reduce:transition-none",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              active ? "bg-card text-foreground shadow-xs ring-1 ring-border dark:bg-white/10" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {key}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Signed change vs a named period. `upIsGood` decides the tone; the arrow and
 * the sign carry direction so it never relies on colour alone.
 */
export function Delta({
  value,
  label = "vs prev 7d",
  upIsGood = true,
  digits = 0,
}: {
  value: number;
  label?: string;
  upIsGood?: boolean;
  digits?: number;
}) {
  const rounded = Number(value.toFixed(digits));
  const Icon = rounded > 0 ? ArrowUp : rounded < 0 ? ArrowDown : Minus;
  const good = rounded === 0 ? null : rounded > 0 === upIsGood;
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-medium",
          good === true && "text-[var(--success)]",
          good === false && "text-[var(--danger)]",
          good === null && "text-muted-foreground",
        )}
      >
        <Icon aria-hidden className="size-3" strokeWidth={2} />
        {rounded > 0 ? "+" : ""}
        {rounded.toFixed(digits)}
      </span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
