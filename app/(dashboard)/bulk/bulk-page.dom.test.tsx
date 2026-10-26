// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkspaceStateProvider } from "@/components/dashboard/workspace-state";
import BulkScorerPage from "./page";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("bulk credit estimate", () => {
  it("shows the parsed row count before Score is clicked", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <WorkspaceStateProvider initialCredits={495} plan="plus">
        <BulkScorerPage />
      </WorkspaceStateProvider>,
    );

    const csv = ["domain,company", ...Array.from({ length: 5 }, (_, i) => `co${i}.example,Co ${i}`)].join("\n");
    const file = new File([csv], "accounts.csv", { type: "text/csv" });
    const input = screen.getByLabelText("CSV file");
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    fireEvent.change(input);

    expect(await screen.findByText(
      "This run uses up to 5 credits for 5 fresh scores. Failed rows are not charged. You have 495 left.",
    )).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
