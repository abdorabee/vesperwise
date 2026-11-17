// @vitest-environment jsdom
import { useState } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppFrame } from "./app-frame";
import { ShellPanel, ShellPanelProvider, ShellPanelSlot } from "./shell-panel";

afterEach(() => {
  cleanup();
});

function Harness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <ShellPanelProvider>
      <AppFrame rail={<nav>Rail</nav>} panel={<ShellPanelSlot />}>
        <main>Route</main>
      </AppFrame>
      <ShellPanel
        open={open}
        label="Score report"
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      >
        <p>Panel body</p>
      </ShellPanel>
    </ShellPanelProvider>
  );
}

function pressEscape(target: EventTarget = document.body) {
  const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true, bubbles: true });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

function appendLayer(role: string) {
  const layer = document.createElement("div");
  layer.setAttribute("role", role);
  document.body.appendChild(layer);
  return layer;
}

describe("ShellPanel Escape handling", () => {
  it("closes the panel on Escape when nothing else is open", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    expect(screen.getByText("Panel body")).toBeTruthy();

    const event = pressEscape();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    expect(screen.queryByText("Panel body")).toBeNull();
  });

  it("leaves the panel open while a menu is open", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const menu = appendLayer("menu");

    const event = pressEscape();

    expect(onClose).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    expect(screen.getByText("Panel body")).toBeTruthy();
    menu.remove();
  });

  it("leaves the panel open while another dialog such as the search palette is open", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const dialog = appendLayer("dialog");

    pressEscape(dialog);

    expect(onClose).not.toHaveBeenCalled();
    dialog.remove();
  });

  it("ignores Escape that was already handled", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const handler = (event: KeyboardEvent) => event.preventDefault();
    document.addEventListener("keydown", handler);

    pressEscape();

    expect(onClose).not.toHaveBeenCalled();
    document.removeEventListener("keydown", handler);
  });

  it("closes when focus is inside the panel itself", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    pressEscape(screen.getByText("Panel body"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
