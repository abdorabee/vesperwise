"use client";

import { useEffect, useState, type ReactNode } from "react";

interface BillingPostFormProps {
  /** Route the native form POSTs to; it answers with a 303 to Polar on success. */
  action: string;
  fieldName: string;
  fieldValue: string;
  label: string;
  buttonClassName: string;
  ariaDescribedBy?: string;
  /** Rendered inside the form after the button, e.g. renewal terms. */
  children?: ReactNode;
}

/**
 * A native `<form method="POST">` whose submit button locks after the first
 * submit, so a double click cannot create two checkouts. It uses local state
 * rather than useFormStatus because useFormStatus only reports pending for
 * function actions, not for a native URL POST that navigates away. The lock is
 * released when the page is restored from the back/forward cache.
 */
export function BillingPostForm({
  action,
  fieldName,
  fieldValue,
  label,
  buttonClassName,
  ariaDescribedBy,
  children,
}: BillingPostFormProps) {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) setPending(false);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return (
    <form
      action={action}
      method="POST"
      onSubmit={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }
        setPending(true);
      }}
    >
      <input type="hidden" name={fieldName} value={fieldValue} />
      <button
        type="submit"
        className={buttonClassName}
        aria-describedby={ariaDescribedBy}
        aria-disabled={pending}
        data-pending={pending ? "true" : undefined}
        style={pending ? { opacity: 0.6, cursor: "progress" } : undefined}
      >
        {pending ? "Redirecting to checkout…" : label}
      </button>
      {children}
    </form>
  );
}
