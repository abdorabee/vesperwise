// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/bulk",
}));
vi.mock("@/components/account-panel/account-panel", () => ({ AccountPanel: () => null }));
vi.mock("@/components/account-panel/use-account-param", () => ({
  useAccountParam: () => ({ account: null, openAccount: vi.fn(), closeAccount: vi.fn() }),
}));
vi.mock("@/components/lists/add-to-list-menu", () => ({ AddToListMenu: () => null }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { WorkspaceStateProvider } from "@/components/dashboard/workspace-state";
import type { PlanKey } from "@/lib/plan-features";
import BulkScorerPage from "./page";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderPage(plan: PlanKey, credits = 495) {
  return render(
    <WorkspaceStateProvider initialCredits={credits} plan={plan}>
      <BulkScorerPage />
    </WorkspaceStateProvider>,
  );
}

function attachCsv(rows = 5) {
  const csv = ["domain,company", ...Array.from({ length: rows }, (_, i) => `co${i}.example,Co ${i}`)].join("\n");
  const file = new File([csv], "accounts.csv", { type: "text/csv" });
  const input = screen.getByLabelText("CSV file");
  Object.defineProperty(input, "files", { configurable: true, value: [file] });
  fireEvent.change(input);
}

describe("bulk credit estimate", () => {
  it("shows the parsed row count before Score is clicked", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderPage("plus");
    attachCsv(5);

    expect(await screen.findByText(
      "This run uses up to 5 credits for 5 fresh scores. Failed rows are not charged. You have 495 left.",
    )).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("bulk plan gating", () => {
  it.each(["free", "starter"] as const)("shows the upgrade panel and no uploader on the %s plan", (plan) => {
    renderPage(plan);

    expect(screen.getByRole("heading", { name: /Bulk scoring is on Plus and above/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: "See plans" }).getAttribute("href")).toBe("/billing#plans");
    expect(screen.queryByLabelText("CSV file")).toBeNull();
    expect(screen.queryByRole("button", { name: "Score companies" })).toBeNull();
  });

  it("shows the uploader on a plan that includes bulk", () => {
    renderPage("plus");
    expect(screen.getByLabelText("CSV file")).toBeTruthy();
    expect(screen.queryByText(/Bulk scoring is on/)).toBeNull();
  });
});

describe("bulk insufficient credits", () => {
  it("adds a Top up link to the error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "Insufficient credits", credits_needed: 5, credits_remaining: 1 }), { status: 402 }),
      ),
    );
    renderPage("plus", 1);
    attachCsv(5);
    await screen.findAllByText(/This run uses up to 5 credits/);

    fireEvent.click(screen.getByRole("button", { name: "Score companies" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByRole("link", { name: "Top up" }).getAttribute("href")).toBe("/billing");
  });
});
