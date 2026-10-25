// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { replayScoreTour, SCORE_TOUR_SEEN_KEY, ScoreTour } from "./score-tour";

const originalRect = HTMLElement.prototype.getBoundingClientRect;

function rect(top: number, left: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON() {
      return {};
    },
  } as DOMRect;
}

function mockMotion(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("reduce") ? matches : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

function Page({ onboardingComplete = true }: { onboardingComplete?: boolean }) {
  return (
    <div>
      <form data-tour="composer"><input aria-label="Company domain" /></form>
      <p data-tour="credits">12 credits remaining</p>
      <div data-tour="result">Empty area</div>
      <a data-tour="chat" href="/score#chat">Chat</a>
      <ScoreTour onboardingComplete={onboardingComplete} />
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  mockMotion(false);
  window.innerWidth = 1024;
  window.innerHeight = 768;
  HTMLElement.prototype.getBoundingClientRect = function rectForTour() {
    const name = this.getAttribute("data-tour");
    if (name === "composer") return rect(24, 40, 280, 64);
    if (name === "credits") return rect(360, 40, 220, 28);
    if (name === "result") return rect(120, 40, 280, 96);
    if (name === "chat") return rect(80, 8, 120, 32);
    return originalRect.call(this);
  };
});

afterEach(() => {
  cleanup();
  HTMLElement.prototype.getBoundingClientRect = originalRect;
  localStorage.clear();
});

describe("Score tour", () => {
  it("remembers Skip and stays closed on the next visit", () => {
    const first = render(<Page />);
    expect(screen.getByRole("heading", { name: "Composer" }).textContent).toBe("Composer");
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(localStorage.getItem(SCORE_TOUR_SEEN_KEY)).toBe("1");
    expect(screen.queryByRole("dialog")).toBeNull();
    first.unmount();

    render(<Page />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(localStorage.getItem(SCORE_TOUR_SEEN_KEY)).toBe("1");
  });

  it("remembers Close the same way Skip does", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "Close tour" }));
    expect(localStorage.getItem(SCORE_TOUR_SEEN_KEY)).toBe("1");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("starts at the composer again when Show me around clears the seen flag", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Credit chip" }).textContent).toBe("Credit chip");
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    act(() => replayScoreTour());
    expect(localStorage.getItem(SCORE_TOUR_SEEN_KEY)).toBeNull();
    expect(screen.getByRole("heading", { name: "Composer" }).textContent).toBe("Composer");
  });

  it("stays closed until onboarding is complete", () => {
    render(<Page onboardingComplete={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(localStorage.getItem(SCORE_TOUR_SEEN_KEY)).toBeNull();
  });

  it("moves the card without a transition when reduced motion is on", () => {
    mockMotion(true);
    render(<Page />);
    const dialog = screen.getByRole("dialog");
    const firstTop = dialog.style.top;
    expect(dialog.getAttribute("data-reduced-motion")).toBe("true");
    expect(dialog.style.transition).toBe("none");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const next = screen.getByRole("dialog");
    expect(screen.getByRole("heading", { name: "Credit chip" }).textContent).toBe("Credit chip");
    expect(next.getAttribute("data-reduced-motion")).toBe("true");
    expect(next.style.transition).toBe("none");
    expect(next.style.top).not.toBe(firstTop);
  });

  it("transitions the card between steps when motion is allowed", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("data-reduced-motion")).toBe("false");
    expect(dialog.style.transition).toContain("top");
    expect(dialog.style.transition).not.toBe("none");
  });
});
