"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

// Tooltip for icon-only buttons. It stays mounted so the button can take its
// accessible name from it (aria-labelledby) and lintapple can find the link
// (data-ui-tooltip). CSS in globals.css shows it on hover and keyboard focus;
// Escape hides it until focus leaves or the pointer enters or leaves again.
export function useIconTooltip() {
  const id = useId();
  const [isDismissed, setIsDismissed] = useState(false);
  const reset = () => setIsDismissed(false);

  return {
    id,
    triggerProps: {
      "aria-labelledby": id,
      "data-ui-tooltip": id,
      "data-tip-dismissed": isDismissed ? "" : undefined,
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === "Escape") setIsDismissed(true);
      },
      onBlur: reset,
      onMouseEnter: reset,
      onMouseLeave: reset,
    },
  };
}

interface IconTooltipProps {
  id: string;
  side?: "top" | "bottom";
  children: ReactNode;
}

// Render inside the trigger button so it anchors to the button's box.
export function IconTooltip({ id, side = "top", children }: IconTooltipProps) {
  return (
    <span role="tooltip" id={id} className="icon-tooltip" data-side={side}>
      {children}
    </span>
  );
}
