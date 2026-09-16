import * as React from "react";

import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type PageContainerSize = "form" | "default" | "wide" | "workspace";

const PAGE_CONTAINER_WIDTH: Record<PageContainerSize, string> = {
  form: "max-w-5xl",
  default: "max-w-7xl",
  wide: "max-w-[96rem]",
  workspace: "max-w-none",
};

interface PageContainerProps extends React.ComponentProps<"div"> {
  size?: PageContainerSize;
}

export function PageContainer({
  size = "default",
  className,
  children,
  ...props
}: PageContainerProps) {
  return (
    <div
      data-slot="page-container"
      data-size={size}
      className={cn(
        "mx-auto flex min-h-0 w-full flex-1 flex-col gap-4 overflow-y-auto p-4",
        PAGE_CONTAINER_WIDTH[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface PageHeaderProps extends React.ComponentProps<"header"> {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
      {...props}
    >
      <div className="min-w-0 max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-balance text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-[1.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-[65ch] text-pretty text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

interface MetricCardProps extends React.ComponentProps<typeof Card> {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}

export function MetricCard({ label, value, detail, className, ...props }: MetricCardProps) {
  return (
    <Card className={cn("gap-3 rounded-xl py-5 shadow-none", className)} {...props}>
      <CardHeader className="gap-1 px-5">
        <CardDescription className="text-xs font-medium">{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tracking-[-0.04em] tabular-nums">
          {value}
        </CardTitle>
      </CardHeader>
      {detail ? (
        <CardContent className="px-5 text-xs leading-5 text-muted-foreground">{detail}</CardContent>
      ) : null}
    </Card>
  );
}

interface PageSurfaceProps extends React.ComponentProps<"section"> {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageSurface({
  title,
  description,
  action,
  children,
  className,
  ...props
}: PageSurfaceProps) {
  const titleId = React.useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn("rounded-xl border border-border/70 bg-card/60", className)}
      {...props}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
        <div>
          <h2 id={titleId} className="text-sm font-semibold tracking-[-0.012em] text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}

interface EmptyStateProps extends React.ComponentProps<"div"> {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center",
        className
      )}
      {...props}
    >
      {icon ? (
        <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold tracking-[-0.02em] text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-pretty text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

interface InlineErrorProps extends React.ComponentProps<typeof Alert> {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function InlineError({
  title,
  description,
  action,
  className,
  ...props
}: InlineErrorProps) {
  return (
    <Alert
      role="alert"
      variant="destructive"
      className={cn("grid-cols-[1fr_auto] items-center gap-x-4", className)}
      {...props}
    >
      <div>
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </div>
      {action ? <div className="col-start-2 row-span-2 row-start-1">{action}</div> : null}
    </Alert>
  );
}
