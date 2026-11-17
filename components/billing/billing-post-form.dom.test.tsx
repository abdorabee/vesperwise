// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { params, replace, refresh, toastSuccess } = vi.hoisted(() => ({
  params: { current: new URLSearchParams() },
  replace: vi.fn(),
  refresh: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => params.current,
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: vi.fn() } }));

import { BillingNotification } from "@/app/(dashboard)/billing/billing-notification";
import { BillingPostForm } from "./billing-post-form";

beforeEach(() => {
  vi.useFakeTimers();
  params.current = new URLSearchParams();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("BillingPostForm", () => {
  it("posts natively and locks the button after the first submit", () => {
    render(<BillingPostForm action="/api/billing/checkout" fieldName="plan" fieldValue="plus" label="Upgrade to Plus" buttonClassName="pc-cta" />);
    const button = screen.getByRole("button", { name: "Upgrade to Plus" });
    const form = button.closest("form") as HTMLFormElement;
    expect(form.getAttribute("method")?.toUpperCase()).toBe("POST");
    expect(form.getAttribute("action")).toBe("/api/billing/checkout");

    // jsdom does not navigate on submit; dispatch the event the browser would.
    const first = new Event("submit", { bubbles: true, cancelable: true });
    act(() => {
      form.dispatchEvent(first);
    });
    expect(first.defaultPrevented).toBe(false);
    expect(screen.getByRole("button").getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("button").textContent).toContain("Redirecting");

    const second = new Event("submit", { bubbles: true, cancelable: true });
    act(() => {
      form.dispatchEvent(second);
    });
    expect(second.defaultPrevented).toBe(true);
  });
});

describe("BillingNotification", () => {
  it("tells the truth about a payment, keeps the hash and refreshes once after a delay", () => {
    window.location.hash = "#plans";
    params.current = new URLSearchParams("success=true");
    render(<BillingNotification />);

    expect(toastSuccess).toHaveBeenCalledWith("Payment received — your plan updates in a moment.");
    expect(replace).toHaveBeenCalledWith("/billing#plans");
    expect(refresh).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("renders a fixed message for a known error code", () => {
    params.current = new URLSearchParams("error=rate_limited");
    render(<BillingNotification />);
    expect(screen.getByRole("alert").textContent).toContain("Too many checkout attempts");
  });

  it("never echoes an unknown error value", () => {
    params.current = new URLSearchParams("error=<img src=x onerror=alert(1)>");
    const { container } = render(<BillingNotification />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(container.innerHTML).not.toContain("onerror");
  });
});
