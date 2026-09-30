import type { CSSProperties } from "react";

import { Orb } from "@/components/ui/orb/orb";
import { cn } from "@/lib/utils";

interface ThinkingOrbProps {
  label: string;
  pill?: boolean;
  size?: number;
  className?: string;
}

/**
 * Decorative by default: the surrounding role="status" text already carries the
 * meaning, so the glyph is hidden from assistive tech unless it's a labelled pill.
 */
export function ThinkingOrb({ label, pill, size = 18, className }: ThinkingOrbProps) {
  return (
    <span aria-hidden={pill ? undefined : true} className="inline-flex shrink-0">
      <Orb
        variant="S1"
        label={label}
        pill={pill}
        size={size}
        className={cn("score-thinking-orb", className)}
        // --brand-ink: olive on light, lime on dark (never lime on a light background).
        style={{ "--orb-fg": "var(--brand-ink, #dfff00)" } as CSSProperties}
      />
    </span>
  );
}
