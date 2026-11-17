// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ScoreComposer } from "./score-composer";

afterEach(cleanup);

function type(value: string) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value } });
}

describe("ScoreComposer", () => {
  it("pre-fills a domain and requires an explicit confirm that names the cost", async () => {
    const onSubmit = vi.fn();
    render(<ScoreComposer initial busy={false} hasActiveThread={false} prefill="stripe.com" onSubmit={onSubmit} />);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("stripe.com");
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Score stripe.com · 1 credit" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("stripe.com"));
  });

  it("shows an inline hint and sends nothing for non-domain input without an active thread", async () => {
    const onSubmit = vi.fn();
    render(<ScoreComposer initial busy={false} hasActiveThread={false} onSubmit={onSubmit} />);
    type("tell me about stripe");
    fireEvent.click(screen.getByRole("button", { name: "Score company" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText("Enter a company domain like stripe.com")).toBeTruthy();
    type("stripe");
    expect(screen.queryByText("Enter a company domain like stripe.com")).toBeNull();
  });

  it("sends free text as a follow-up when a thread is active", async () => {
    const onSubmit = vi.fn();
    render(<ScoreComposer busy={false} hasActiveThread company="Stripe" onSubmit={onSubmit} />);
    type("why now?");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("why now?"));
  });

  it("explains the cost in the helper text", () => {
    const { unmount } = render(<ScoreComposer initial busy={false} hasActiveThread={false} onSubmit={vi.fn()} />);
    expect(screen.getByText("Enter a company domain · 1 credit")).toBeTruthy();
    unmount();
    render(<ScoreComposer busy={false} hasActiveThread company="Stripe" onSubmit={vi.fn()} />);
    expect(screen.getByText("Ask a follow-up about Stripe · 0.25 credits")).toBeTruthy();
  });

  it("shows an externally supplied notice", () => {
    render(<ScoreComposer initial busy={false} hasActiveThread={false} notice="That link has an invalid domain." onSubmit={vi.fn()} />);
    expect(screen.getByRole("alert").textContent).toContain("invalid domain");
  });
});
