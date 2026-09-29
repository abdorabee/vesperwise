import { cn } from "@/lib/utils";

/**
 * The VesperWise "V" glyph from public/favicon.svg, inlined so it stays crisp at any size
 * and needs no network request. Lime tile, ink glyph — the logo is one of the few places
 * lime is allowed to fill a surface.
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
      <rect width="64" height="64" rx="14" fill="var(--brand, #DFFF00)" />
      <path d="M13.5 19H24l7.9 25.4L39.9 19h10.6L37.2 48H26.8L13.5 19Z" fill="var(--on-brand, #0A0B0C)" />
    </svg>
  );
}
