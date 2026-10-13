// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { IconTooltip, useIconTooltip } from "./icon-tooltip";

function IconButton({ label }: { label: string }) {
  const tip = useIconTooltip();
  return (
    <button type="button" {...tip.triggerProps}>
      <svg aria-hidden="true" />
      <IconTooltip id={tip.id}>{label}</IconTooltip>
    </button>
  );
}

afterEach(cleanup);

describe("IconTooltip", () => {
  it("names the icon button from its always-mounted tooltip", () => {
    render(<IconButton label="Show password" />);

    const button = screen.getByRole("button", { name: "Show password" });
    const tooltip = screen.getByRole("tooltip", { hidden: true });

    expect(tooltip.textContent).toBe("Show password");
    expect(button.getAttribute("aria-labelledby")).toBe(tooltip.id);
    expect(button.getAttribute("data-ui-tooltip")).toBe(tooltip.id);
  });

  it("follows label changes", () => {
    const { rerender } = render(<IconButton label="Pause demo video" />);
    rerender(<IconButton label="Play demo video" />);

    expect(screen.getByRole("button", { name: "Play demo video" })).toBeTruthy();
  });

  it("dismisses on Escape and resets when focus or pointer leaves", () => {
    render(<IconButton label="Open navigation" />);
    const button = screen.getByRole("button", { name: "Open navigation" });

    fireEvent.keyDown(button, { key: "Escape" });
    expect(button.hasAttribute("data-tip-dismissed")).toBe(true);

    fireEvent.blur(button);
    expect(button.hasAttribute("data-tip-dismissed")).toBe(false);

    fireEvent.keyDown(button, { key: "Escape" });
    fireEvent.mouseLeave(button);
    expect(button.hasAttribute("data-tip-dismissed")).toBe(false);
  });

  it("shows again when the pointer re-enters after Escape", () => {
    render(<IconButton label="Pause demo video" />);
    const button = screen.getByRole("button", { name: "Pause demo video" });

    fireEvent.keyDown(button, { key: "Escape" });
    fireEvent.mouseEnter(button);

    expect(button.hasAttribute("data-tip-dismissed")).toBe(false);
  });

  it("ignores keys other than Escape", () => {
    render(<IconButton label="Open navigation" />);
    const button = screen.getByRole("button", { name: "Open navigation" });

    fireEvent.keyDown(button, { key: "Enter" });

    expect(button.hasAttribute("data-tip-dismissed")).toBe(false);
  });
});
