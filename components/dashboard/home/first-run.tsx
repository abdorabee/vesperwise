import Form from "next/form";
import Link from "next/link";
import { ArrowRight, Check, Crosshair } from "lucide-react";

import { EmptyState } from "@/components/app-ui/page-primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BRAND_BUTTON_CLASS } from "./home-ui";

export const SAMPLE_DOMAINS = ["stripe.com", "ramp.com", "linear.app"] as const;

interface ChecklistStep {
  label: string;
  hint: string;
  href: string;
  done: boolean;
}

export function FirstRun({ hasWatchlist, hasBulkJob }: { hasWatchlist: boolean; hasBulkJob: boolean }) {
  const steps: ChecklistStep[] = [
    { label: "Score a company", hint: "Get a 0–100 intent score with the evidence behind it", href: "/score", done: false },
    { label: "Add to watchlist", hint: "Track accounts and see when they move bands", href: "/watchlist", done: hasWatchlist },
    { label: "Upload a CSV", hint: "Score a whole account list in one go", href: "/bulk", done: hasBulkJob },
  ];

  return (
    <section aria-label="Get started" className="overflow-hidden rounded-xl border border-border/70 bg-card">
      <EmptyState
        icon={<Crosshair aria-hidden className="size-5" strokeWidth={1.75} />}
        title="Score your first company"
        description="Enter a company domain. VesperWise checks funding, hiring, news, tech stack and web signals, then ranks the account by purchase intent."
        className="min-h-0 py-10"
        action={
          <div className="flex w-full max-w-md flex-col items-center gap-3">
            <Form action="/score" className="flex w-full items-center gap-2">
              <label htmlFor="first-run-domain" className="sr-only">
                Company domain
              </label>
              <Input
                id="first-run-domain"
                name="domain"
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                required
                placeholder="e.g. stripe.com"
                className="h-10"
              />
              <Button type="submit" className={cn(BRAND_BUTTON_CLASS, "h-10")}>
                Score
                <ArrowRight aria-hidden strokeWidth={2} />
              </Button>
            </Form>
            <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
              <span>Try</span>
              {SAMPLE_DOMAINS.map((domain) => (
                <Link
                  key={domain}
                  href={`/score?domain=${encodeURIComponent(domain)}`}
                  className="rounded-md border border-border px-2 py-1 font-medium text-foreground transition-colors duration-150 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                >
                  {domain}
                </Link>
              ))}
            </p>
          </div>
        }
      />
      <ol className="grid border-t border-border/70 sm:grid-cols-3 sm:divide-x divide-border/70">
        {steps.map((step, i) => (
          <li key={step.label} className="border-b border-border/70 last:border-b-0 sm:border-b-0">
            <Link
              href={step.href}
              className="flex h-full items-start gap-3 px-5 py-4 transition-colors duration-150 outline-none hover:bg-muted/50 focus-visible:bg-muted/60 motion-reduce:transition-none"
            >
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[11px] font-semibold tabular-nums",
                  step.done ? "border-transparent bg-foreground text-background" : "border-border text-muted-foreground",
                )}
              >
                {step.done ? <Check className="size-3" strokeWidth={2.5} /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">
                  {step.label}
                  <span className="sr-only">{step.done ? " (done)" : " (to do)"}</span>
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{step.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
