"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { InlineError } from "@/components/app-ui/page-primitives";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary for the dashboard. It renders inside the shell (the layout
 * stays mounted), so the sidebar and credits remain usable while the page recovers.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] route error", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col gap-4 py-2">
      <InlineError
        title="This page didn't load"
        description={
          error.digest
            ? `Something went wrong on our side. Try again, and if it keeps happening, share reference ${error.digest} with support.`
            : "Something went wrong on our side. Try again in a moment."
        }
        action={
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => reset()}>
              <RotateCw className="size-4" aria-hidden="true" />
              Retry
            </Button>
            <Button type="button" size="sm" variant="ghost" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
