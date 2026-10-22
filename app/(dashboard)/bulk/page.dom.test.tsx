// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BulkScorerPage from "./page";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

function attachCsv(text: string) {
  const input = screen.getByLabelText("CSV file") as HTMLInputElement;
  const file = new File([text], "accounts.csv", { type: "text/csv" });
  fireEvent.change(input, { target: { files: [file] } });
}

beforeEach(() => {
  refresh.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("BulkScorerPage", () => {
  it("refreshes server data so the status bar credits update after a batch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ total: 1, scored: 1, failed: 0, results: [] }), {
          status: 200,
        }),
      ),
    );
    render(<BulkScorerPage />);

    attachCsv("domain\nstripe.com\n");
    fireEvent.click(await screen.findByRole("button", { name: "Score 1 company" }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it("refreshes credits even when the batch request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Scoring failed" }), { status: 500 }),
      ),
    );
    render(<BulkScorerPage />);

    attachCsv("domain\nstripe.com\n");
    fireEvent.click(await screen.findByRole("button", { name: "Score 1 company" }));

    await screen.findByText("Scoring failed");
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
