// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ScoreComposer, type ScoreComposerHandle } from "./score-composer";

describe("ScoreComposer prefill", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("fills, focuses, places the caret at the end, highlights, and does not submit", async () => {
    vi.useFakeTimers();
    const onSubmit = vi.fn();
    const ref = createRef<ScoreComposerHandle>();
    render(<ScoreComposer ref={ref} busy={false} onSubmit={onSubmit} />);

    await act(async () => {
      ref.current?.prefill("Draft this into my email");
    });

    const textarea = screen.getByLabelText("Chat message") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Draft this into my email");
    expect(document.activeElement).toBe(textarea);
    expect(textarea.selectionStart).toBe(textarea.value.length);
    expect(textarea.selectionEnd).toBe(textarea.value.length);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(textarea.className).toContain("score-prefill-highlight");

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(textarea.className).not.toContain("score-prefill-highlight");

    await act(async () => {
      ref.current?.prefill("Draft this into my email");
    });
    expect(textarea.value).toBe("Draft this into my email");
    expect(onSubmit).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.submit(textarea.closest("form")!);
      await Promise.resolve();
    });
    expect(onSubmit).toHaveBeenCalledWith("Draft this into my email");
  });

  it("does not restart prefill focus or highlight while the user edits", async () => {
    vi.useFakeTimers();
    const ref = createRef<ScoreComposerHandle>();
    render(<ScoreComposer ref={ref} busy={false} onSubmit={() => undefined} />);

    await act(async () => {
      ref.current?.prefill("Draft this into my email");
    });

    const textarea = screen.getByLabelText("Chat message") as HTMLTextAreaElement;
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(textarea.className).not.toContain("score-prefill-highlight");

    textarea.setSelectionRange(5, 5);
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Draft this into my email please" } });
    });

    expect(textarea.className).not.toContain("score-prefill-highlight");
  });
});
