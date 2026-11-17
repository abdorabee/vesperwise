"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { InlineError } from "@/components/app-ui/page-primitives";
import { billingErrorMessage } from "@/lib/billing-errors";

/** The webhook that updates the plan can lag the redirect from Polar; refresh once after this delay. */
const WEBHOOK_REFRESH_DELAY_MS = 3000;

export function BillingNotification() {
  const params = useSearchParams();
  const router = useRouter();
  const refreshTimer = useRef<number | null>(null);
  const errorMessage = billingErrorMessage(params.get("error"));

  useEffect(() => {
    const subscribed = params.get("success") === "true";
    const toppedUp = params.get("topup") === "true";
    if (!subscribed && !toppedUp) return;

    toast.success(
      subscribed
        ? "Payment received — your plan updates in a moment."
        : "Payment received — your credits update in a moment.",
    );
    router.replace(`/billing${window.location.hash}`);
    refreshTimer.current = window.setTimeout(() => router.refresh(), WEBHOOK_REFRESH_DELAY_MS);
  }, [params, router]);

  // Not cleared when params change (router.replace re-runs the effect above); only on unmount.
  useEffect(
    () => () => {
      if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
    },
    [],
  );

  if (!errorMessage) return null;
  return (
    <div style={{ margin: "0 0 16px" }}>
      <InlineError
        title="Checkout didn't start"
        description={errorMessage}
        action={
          <button type="button" className="tb-btn outlined" onClick={() => router.replace(`/billing${window.location.hash}`)}>
            Dismiss
          </button>
        }
      />
    </div>
  );
}
