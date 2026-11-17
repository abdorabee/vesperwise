// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useModKey } from "./use-mod-key";

function Probe() {
  return <output>{useModKey()}</output>;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useModKey", () => {
  it("switches to ⌘ after mount on Apple platforms", () => {
    vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
    render(<Probe />);
    expect(screen.getByRole("status").textContent).toBe("⌘");
  });

  it("stays Ctrl elsewhere", () => {
    vi.spyOn(navigator, "platform", "get").mockReturnValue("Win32");
    render(<Probe />);
    expect(screen.getByRole("status").textContent).toBe("Ctrl");
  });
});
