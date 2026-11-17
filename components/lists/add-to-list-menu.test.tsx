// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddToListMenu } from "./add-to-list-menu";

const push = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) } }));

const LISTS = { lists: [
  { id: "l1", name: "Targets", list_type: "manual" },
  { id: "l2", name: "Hot smart", list_type: "smart" },
] };

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function openMenu() {
  const trigger = screen.getByRole("button", { name: /add to list/i });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "Enter" });
}

beforeEach(() => {
  Object.assign(Element.prototype, {
    hasPointerCapture: () => false,
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
    scrollIntoView: () => {},
  });
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("AddToListMenu", () => {
  it("loads lists lazily on open and posts the domain", async () => {
    const fetchMock = vi.fn(async (url: string) => (url === "/api/dashboard/lists" ? json(200, LISTS) : json(200, { member: {} })));
    vi.stubGlobal("fetch", fetchMock);
    render(<AddToListMenu domain="stripe.com" companyName="Stripe" />);
    expect(fetchMock).not.toHaveBeenCalled();
    openMenu();
    const item = await screen.findByRole("menuitem", { name: "Targets" });
    expect(screen.getByRole("menuitem", { name: /Hot smart/ }).getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(item);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls.find(([u]) => String(u).endsWith("/members"))! as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ domain: "stripe.com", company_name: "Stripe" });
    expect(toastSuccess.mock.calls[0][0]).toBe("Added Stripe to Targets");
  });

  it("shows the server error when adding fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url === "/api/dashboard/lists" ? json(200, LISTS) : json(400, { error: "Only manual lists support members" }))));
    render(<AddToListMenu domain="stripe.com" />);
    openMenu();
    fireEvent.click(await screen.findByRole("menuitem", { name: "Targets" }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Only manual lists support members"));
  });

  it("shows the empty state with a create link", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(200, { lists: [] })));
    render(<AddToListMenu domain="stripe.com" />);
    openMenu();
    expect(await screen.findByText("No lists yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Create a list" }).getAttribute("href")).toBe("/lists?new=1");
  });

  it("offers a retry when loading fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json(500, { error: "boom" }))
      .mockResolvedValueOnce(json(200, LISTS));
    vi.stubGlobal("fetch", fetchMock);
    render(<AddToListMenu domain="stripe.com" />);
    openMenu();
    expect(await screen.findByText("boom")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("menuitem", { name: "Targets" })).toBeTruthy();
  });
});
