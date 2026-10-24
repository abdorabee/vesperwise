// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BulkScorerPage from "./page";

const setCreditsRemaining = vi.fn();
const guardBulk = vi.fn(() => false);

vi.mock("@/components/dashboard/workspace-state", () => ({
  useFeatureGuard: () => guardBulk,
  useSetCreditsRemaining: () => setCreditsRemaining,
}));

function attachCsv(text: string) {
  const input = screen.getByLabelText("CSV file") as HTMLInputElement;
  const file = new File([text], "accounts.csv", { type: "text/csv" });
  fireEvent.change(input, { target: { files: [file] } });
}

beforeEach(() => {
  setCreditsRemaining.mockClear();
  guardBulk.mockClear();
  guardBulk.mockReturnValue(false);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("BulkScorerPage", () => {
  it("updates the status bar credits from the batch response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ total: 1, scored: 1, failed: 0, results: [], credits_remaining: 16 }),
          { status: 200 },
        ),
      ),
    );
    render(<BulkScorerPage />);

    attachCsv("domain\nstripe.com\n");
    fireEvent.click(await screen.findByRole("button", { name: "Score 1 company" }));

    await waitFor(() => expect(setCreditsRemaining).toHaveBeenCalledWith(16));
  });

  it("does not submit when the plan guard blocks bulk scoring", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    guardBulk.mockReturnValue(true);
    render(<BulkScorerPage />);

    attachCsv("domain\nstripe.com\n");
    fireEvent.click(await screen.findByRole("button", { name: "Score 1 company" }));

    expect(guardBulk).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
