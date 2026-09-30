import { cn } from "@/lib/utils";

/**
 * The compact "VW" monogram for tight spots (the collapsed sidebar rail), where the
 * VesperWise wordmark (components/vesperwise-logo.tsx) can't fit. Lime tile, ink glyph —
 * the logo is one of the few places lime is allowed to fill a surface.
 */
export function BrandMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-8 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <rect width="64" height="64" rx="14" style={{ fill: "var(--brand, #DFFF00)" }} />
      <text
        x="32"
        y="33"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="28"
        fontWeight={800}
        letterSpacing="-1.5"
        style={{ fill: "var(--on-brand, #0A0B0C)", fontFamily: "inherit" }}
      >
        VW
      </text>
    </svg>
  );
}
