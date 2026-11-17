// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiKeySummary } from "@/lib/api-keys";

const { toastSuccess, toastError } = vi.hoisted(() => ({ toastSuccess: vi.fn(), toastError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));

import { ApiKeysView } from "./api-keys-view";

const KEY: ApiKeySummary = {
  id: "k1",
  label: "CRM sync",
  last_used: null,
  is_active: true,
  created_at: "2026-09-01T00:00:00Z",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function createKey() {
  vi.mocked(fetch).mockResolvedValueOnce(
    json({ key: "vesperwise_secret", record: { ...KEY, id: "k2", label: "New key" } }, 201),
  );
  fireEvent.click(screen.getAllByRole("button", { name: /Create (your first )?key/ })[0]);
  fireEvent.click(await screen.findByRole("button", { name: "Create key", hidden: false }));
}

describe("ApiKeysView load error", () => {
  it("shows only the error with a Retry, not the empty state", () => {
    render(<ApiKeysView initialKeys={[]} initialError="Failed to load keys" />);

    expect(screen.getByRole("alert").textContent).toContain("Failed to load keys");
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(screen.queryByText("No API keys yet")).toBeNull();
  });

  it("loads the keys on Retry and clears the error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ keys: [KEY] }));
    render(<ApiKeysView initialKeys={[]} initialError="Failed to load keys" />);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await screen.findByText("CRM sync");
    expect(screen.queryByText("Keys didn't load")).toBeNull();
  });

  it("shows the empty state when there is no error and no keys", () => {
    render(<ApiKeysView initialKeys={[]} initialError={null} />);
    expect(screen.getByText("No API keys yet")).toBeTruthy();
  });
});

describe("ApiKeysView key list", () => {
  it("shows the created date so keys can be told apart", () => {
    render(<ApiKeysView initialKeys={[KEY, { ...KEY, id: "k2", label: "Other", created_at: "2026-10-05T00:00:00Z" }]} initialError={null} />);
    expect(screen.getByText(/created Sep 1, 2026/)).toBeTruthy();
    expect(screen.getByText(/created Oct 5, 2026/)).toBeTruthy();
  });
});

describe("ApiKeysView reveal dialog", () => {
  it("cannot be dismissed with Escape before the key is confirmed copied", async () => {
    render(<ApiKeysView initialKeys={[]} initialError={null} />);
    await createKey();

    await screen.findByText("Copy your new key");
    expect(toastSuccess).toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(screen.getByText("Copy your new key")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("can't be shown again");
  });

  it("closes only after the explicit confirmation", async () => {
    render(<ApiKeysView initialKeys={[]} initialError={null} />);
    await createKey();
    await screen.findByText("Copy your new key");

    fireEvent.click(screen.getByRole("button", { name: /I.ve copied it/ }));

    await waitFor(() => expect(screen.queryByText("Copy your new key")).toBeNull());
  });
});

describe("ApiKeysView create errors", () => {
  it("surfaces the key-cap 409 message", async () => {
    render(<ApiKeysView initialKeys={[]} initialError={null} />);
    vi.mocked(fetch).mockResolvedValueOnce(json({ error: "You can have at most 25 active API keys. Revoke one to create another." }, 409));
    fireEvent.click(screen.getAllByRole("button", { name: /Create (your first )?key/ })[0]);
    fireEvent.click(await screen.findByRole("button", { name: "Create key" }));

    await screen.findByText(/at most 25 active API keys/);
  });

  it("surfaces a 429 with a readable fallback", async () => {
    render(<ApiKeysView initialKeys={[]} initialError={null} />);
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 429 }));
    fireEvent.click(screen.getAllByRole("button", { name: /Create (your first )?key/ })[0]);
    fireEvent.click(await screen.findByRole("button", { name: "Create key" }));

    await screen.findByText(/too many keys recently/);
  });
});
