// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ListCardSummary, ListsHeroStats } from "@/lib/lists-types";
import { CreateListModal } from "./create-list-modal";
import { DeleteListDialog } from "./delete-list-dialog";
import { ListOverview } from "./list-overview";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh, replace: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const summary: ListCardSummary = {
  id: "l1",
  name: "Targets",
  description: null,
  list_type: "manual",
  color: "#fff",
  icon_initials: "TA",
  isSystem: false,
  accountCount: 1,
  addedThisWeek: null,
  avgScore: 20,
  bandMix: { hot: 0, warm: 0, cold: 1 },
  sparkline: [],
  lastUpdated: "2026-11-01T00:00:00.000Z",
  lastUpdatedLabel: "Edited 3d ago",
  isRecentlyActive: false,
};

const hero: ListsHeroStats = {
  totalAccounts: 1,
  listCount: 1,
  overlapCount: 0,
  recentlyUpdatedCount: 0,
  bandMix: { hot: 0, warm: 0, cold: 1 },
  unscoredCount: 0,
  hotCount: 0,
  hottestList: null,
  firingAccounts: [],
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  push.mockReset();
  refresh.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ListOverview", () => {
  it("renders singular wording and band counts from the same universe", () => {
    render(<ListOverview summaries={[summary]} hero={hero} />);

    expect(screen.getByRole("heading", { level: 1, name: "Lists" })).toBeTruthy();
    expect(screen.getAllByText("1 list").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1 account").length).toBeTruthy();
    expect(screen.getAllByText("COLD 1")).toHaveLength(2);
    expect(screen.getAllByText("HOT 0")).toHaveLength(2);
    expect(screen.getByText("No HOT accounts yet")).toBeTruthy();
    expect(screen.queryByText(/Import CSV/)).toBeNull();
  });

  it("renders cards as links labelled with name and account count", () => {
    render(<ListOverview summaries={[summary]} hero={hero} />);

    const link = screen.getByRole("link", { name: "Targets, 1 account" });
    expect(link.getAttribute("href")).toBe("/lists/l1");
  });
});

describe("CreateListModal", () => {
  it("sends the selected accounts when creating a manual list", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith("/api/dashboard/search")) {
        return json(200, {
          companies: [{ id: "c1", kind: "company", label: "Stripe", sublabel: "stripe.com", href: "/x" }],
          watchlist: [],
        });
      }
      if (init?.method === "POST") return json(201, { list: { id: "new1" } });
      return json(200, { count: 0 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CreateListModal open onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Manual list/ }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Payments" } });
    fireEvent.change(screen.getByLabelText("Search accounts to add"), { target: { value: "stri" } });
    fireEvent.click(await screen.findByRole("button", { name: /Stripe/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/lists/new1"));
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    const body = JSON.parse(String(post?.[1]?.body)) as { domains: unknown; list_type: string };
    expect(body.list_type).toBe("manual");
    expect(body.domains).toEqual([{ domain: "stripe.com", company_name: "Stripe" }]);
  });

  it("shows an inline error and stays open when creation fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === "POST" ? json(500, { error: "Failed to create list" }) : json(200, { count: 0 })));

    render(<CreateListModal open onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "X" } });
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Failed to create list");
    expect(push).not.toHaveBeenCalled();
  });
});

describe("DeleteListDialog", () => {
  it("navigates only after a successful delete", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(200, { ok: true })));

    render(<DeleteListDialog listId="l1" listName="Targets" open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete list" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/lists"));
  });

  it("stays put and reports the error when the delete fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(409, { error: "cannot delete" })));

    render(<DeleteListDialog listId="l1" listName="Targets" open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete list" }));

    expect((await screen.findByRole("alert")).textContent).toContain("cannot delete");
    expect(push).not.toHaveBeenCalled();
  });
});
