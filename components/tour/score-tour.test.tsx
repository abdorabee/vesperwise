// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
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
  if (typeof HTMLElement.prototype.scrollIntoView !== "function") {
    HTMLElement.prototype.scrollIntoView = () => {};
  }
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

  it("hides Back on the first step", () => {
    render(<Page />);
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Composer" }).textContent).toBe("Composer");
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });

  it("opens on the first Show me around after the tour was closed", () => {
    localStorage.setItem(SCORE_TOUR_SEEN_KEY, "1");
    render(<Page />);
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => replayScoreTour());
    expect(screen.getByRole("heading", { name: "Composer" }).textContent).toBe("Composer");
  });

  it("restarts at the composer when Show me around runs in the middle of the tour", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Result" }).textContent).toBe("Result");
    act(() => replayScoreTour());
    expect(screen.getByRole("heading", { name: "Composer" }).textContent).toBe("Composer");
  });

  it("opens when Show me around runs before Score mounts", () => {
    localStorage.setItem(SCORE_TOUR_SEEN_KEY, "1");
    act(() => replayScoreTour());
    render(<Page />);
    expect(screen.getByRole("heading", { name: "Composer" }).textContent).toBe("Composer");
  });

  it("keeps Skip inside the phone viewport and remembers it", () => {
    window.innerWidth = 427;
    window.innerHeight = 720;
    render(<Page />);
    const dialog = screen.getByRole("dialog");
    const top = Number.parseFloat(dialog.style.top);
    const left = Number.parseFloat(dialog.style.left);
    const width = Number.parseFloat(dialog.style.width);
    expect(top).toBeGreaterThanOrEqual(12);
    expect(left).toBeGreaterThanOrEqual(12);
    expect(left + width).toBeLessThanOrEqual(427 - 12);
    expect(top + 180).toBeLessThanOrEqual(720 - 12);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(localStorage.getItem(SCORE_TOUR_SEEN_KEY)).toBe("1");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("hugs the composer control instead of a wider wrapper", () => {
    HTMLElement.prototype.getBoundingClientRect = function rectForTour() {
      if (this.classList.contains("score-elements-input")) return rect(24, 80, 280, 64);
      if (this.getAttribute("data-tour") === "composer") return rect(24, 40, 355, 64);
      return originalRect.call(this);
    };
    render(
      <div>
        <div data-tour="composer">
          <form className="score-elements-input"><input aria-label="Company domain" /></form>
        </div>
        <ScoreTour onboardingComplete />
      </div>,
    );
    const ring = document.querySelector("[data-slot='score-tour-ring']") as HTMLElement;
    expect(ring.style.width).toBe(`${280 + 16}px`);
    expect(ring.style.left).toBe("72px");
  });

  it("places the credit card above the chip when below would cover it", () => {
    window.innerWidth = 427;
    window.innerHeight = 700;
    HTMLElement.prototype.getBoundingClientRect = function rectForTour() {
      const name = this.getAttribute("data-tour");
      if (name === "composer") return rect(80, 16, 390, 64);
      if (name === "credits") return rect(640, 40, 180, 28);
      if (name === "result") return rect(20, 16, 390, 48);
      if (name === "chat") return rect(80, 8, 120, 32);
      return originalRect.call(this);
    };
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const dialog = screen.getByRole("dialog");
    const top = Number.parseFloat(dialog.style.top);
    expect(top + 180).toBeLessThanOrEqual(640);
  });

  it("scrolls an off-screen result into view before highlighting it and keeps the card off the composer", () => {
    let resultTop = 1400;
    HTMLElement.prototype.scrollIntoView = function scrollForTour() {
      if (this.getAttribute("data-tour") === "result") resultTop = 280;
    };
    HTMLElement.prototype.getBoundingClientRect = function rectForTour() {
      const name = this.getAttribute("data-tour");
      if (name === "composer") return rect(400, 40, 280, 64);
      if (name === "credits") return rect(480, 40, 180, 28);
      if (name === "result") return rect(resultTop, 40, 280, 80);
      if (name === "chat") return rect(80, 8, 120, 32);
      return originalRect.call(this);
    };
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(resultTop).toBe(280);
    const ring = document.querySelector("[data-slot='score-tour-ring']") as HTMLElement;
    expect(ring).toBeTruthy();
    expect(Number.parseFloat(ring.style.top)).toBeGreaterThanOrEqual(0);
    expect(Number.parseFloat(ring.style.top)).toBeLessThan(window.innerHeight);
    const dialogTop = Number.parseFloat(screen.getByRole("dialog").style.top);
    const dialogBottom = dialogTop + 180;
    const composerTop = 400;
    const composerBottom = 464;
    const overlapsComposer = dialogTop < composerBottom && dialogBottom > composerTop;
    expect(overlapsComposer).toBe(false);
  });

  it("skips Sidebar Chat on a phone when the only control is the threads button", () => {
    window.innerWidth = 427;
    window.innerHeight = 720;
    render(
      <div>
        <form data-tour="composer"><input aria-label="Company domain" /></form>
        <p data-tour="credits">12 credits remaining</p>
        <div data-tour="result">Empty area</div>
        <button type="button" data-tour="chat" aria-label="Open score threads">Threads</button>
        <ScoreTour onboardingComplete />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Done" }).textContent).toBe("Done");
    expect(document.querySelector("[data-slot='score-tour-ring']")).toBeNull();
  });

  it("closes the nav drawer on the composer step and opens it to highlight Chat", () => {
    window.innerWidth = 427;
    window.innerHeight = 720;
    HTMLElement.prototype.getBoundingClientRect = function rectForTour() {
      const label = `${this.getAttribute("aria-label") ?? ""} ${this.textContent ?? ""}`;
      if (/threads/i.test(label)) return rect(40, 300, 48, 32);
      const name = this.getAttribute("data-tour");
      if (name === "composer") return rect(120, 16, 280, 64);
      if (name === "credits") return rect(200, 16, 180, 28);
      if (name === "result") return rect(40, 16, 280, 48);
      if (name === "chat") return rect(80, 12, 220, 40);
      return originalRect.call(this);
    };

    function Harness() {
      const sidebar = useSidebar();
      return (
        <div>
          <form data-tour="composer"><input aria-label="Company domain" /></form>
          <p data-tour="credits">12 credits remaining</p>
          <div data-tour="result">Empty area</div>
          <button type="button" onClick={() => sidebar.setOpenMobile(true)}>Open drawer</button>
          <button type="button" data-tour="chat" aria-label="Open score threads">Threads</button>
          {sidebar.openMobile ? <a data-tour="chat" href="/score#chat">Chat</a> : null}
          <p data-testid="drawer">{sidebar.openMobile ? "open" : "closed"}</p>
          <ScoreTour onboardingComplete />
        </div>
      );
    }

    render(
      <SidebarProvider>
        <Harness />
      </SidebarProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open drawer" }));
    expect(screen.getByTestId("drawer").textContent).toBe("closed");
    expect(screen.getByRole("heading", { name: "Composer" }).textContent).toBe("Composer");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Sidebar Chat" }).textContent).toBe("Sidebar Chat");
    expect(screen.getByTestId("drawer").textContent).toBe("open");
    const ring = document.querySelector("[data-slot='score-tour-ring']") as HTMLElement;
    expect(ring.style.left).toBe("4px");
  });
});
