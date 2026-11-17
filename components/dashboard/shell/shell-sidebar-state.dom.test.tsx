// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/score",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { fullName: "Abdo Rabee", firstName: "Abdo", lastName: "Rabee", imageUrl: "", primaryEmailAddress: { emailAddress: "abdo@example.com" } } }),
  SignOutButton: ({ children }: { children: React.ReactNode }) => children,
}));

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SearchProvider } from "@/components/dashboard/search-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppFrame } from "./app-frame";
import { ShellList, ShellListProvider, ShellListReopenButton, ShellListSlot } from "./shell-list";

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
});

function Page({ defaultOpen = true }: { defaultOpen?: boolean }) {
  return (
    <SearchProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <ShellListProvider>
          <AppFrame
            rail={<AppSidebar creditsRemaining={42} plan="growth" watchlistCount={3} pipelineHotCount={2} />}
            list={<ShellListSlot />}
          >
            <ShellListReopenButton />
            <ShellList label="Score threads" title="Threads">
              <p>Thread body</p>
            </ShellList>
          </AppFrame>
        </ShellListProvider>
      </SidebarProvider>
    </SearchProvider>
  );
}

function frame() {
  return document.querySelector<HTMLElement>('[data-slot="app-frame"]');
}

function listWidth() {
  return frame()?.style.getPropertyValue("--app-frame-list-w");
}

describe("sidebar and list column state", () => {
  it("renders collapsed when the sidebar cookie default is closed", () => {
    render(<Page defaultOpen={false} />);

    expect(frame()?.dataset.sidebarState).toBe("collapsed");
    const toggle = screen.getByRole("button", { name: "Expand sidebar" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("toggling the sidebar leaves the list column open", () => {
    render(<Page />);
    expect(frame()?.dataset.sidebarState).toBe("expanded");
    expect(listWidth()).toBe("var(--list-w)");

    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(frame()?.dataset.sidebarState).toBe("collapsed");
    expect(listWidth()).toBe("var(--list-w)");
    expect(screen.queryByRole("button", { name: "Show Score threads" })).toBeNull();
  });

  it("collapsing the list column leaves the sidebar expanded", () => {
    render(<Page />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse Score threads" }));

    expect(listWidth()).toBe("0px");
    expect(frame()?.dataset.sidebarState).toBe("expanded");
    expect(screen.getByRole("button", { name: "Collapse sidebar" }).getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Show Score threads" }));
    expect(listWidth()).toBe("var(--list-w)");
  });

  it("does not advertise the sidebar shortcut on the list column buttons", () => {
    render(<Page />);

    const collapse = screen.getByRole("button", { name: "Collapse Score threads" });
    expect(collapse.getAttribute("title")).not.toContain("B");
    fireEvent.click(collapse);
    expect(screen.getByRole("button", { name: "Show Score threads" }).getAttribute("title")).toBe("Show Score threads");
  });

  it("marks Score current with grouped, labeled links and count text", () => {
    render(<Page />);

    const score = screen.getByRole("link", { name: "Score" });
    expect(score.getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: /^Intent Hub, 2 hot accounts$/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /^Watchlist, 3 on watchlist$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Search" })).toBeTruthy();
  });
});
