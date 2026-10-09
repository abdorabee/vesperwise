"use client";

import { useState } from "react";
import { Check, Copy, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BriefSection, TriggerKey } from "@/lib/brief";
import { cn } from "@/lib/utils";
import { renderSpecText, signalLabel } from "./brief-ui";
import type { BriefSectionProps } from "./types";

type OpenerSection = Extract<BriefSection, { type: "opener_picker" }>;

function chipClass(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "border-[var(--brand-border)] bg-[var(--brand-soft)] text-foreground"
      : "border-border/70 bg-background text-muted-foreground hover:text-foreground",
  );
}

export function OpenerPicker({ block, ctx, handlers, state }: BriefSectionProps & { section: OpenerSection }) {
  const [copied, setCopied] = useState(false);
  const angles = Object.keys(block.spec.openers).filter((angle): angle is TriggerKey => {
    const openers = block.spec.openers[angle as TriggerKey];
    return Boolean(openers && Object.keys(openers).length > 0);
  });
  const angle = state.angle && angles.includes(state.angle) ? state.angle : angles[0];
  const persona = state.persona && block.spec.personas.includes(state.persona) ? state.persona : block.spec.personas[0];
  const openerByPersona = angle ? block.spec.openers[angle] ?? {} : {};
  const openerTemplate = (persona && openerByPersona[persona])
    ?? Object.values(openerByPersona)[0]
    ?? "";
  const personaLabel = persona ? renderSpecText(persona, ctx) : "";
  const opener = renderSpecText(openerTemplate, { ...ctx, angle, persona: personaLabel });

  async function copyOpener() {
    if (!opener || !navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(opener);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  if (!angle || !persona || !opener) return null;

  return (
    <section aria-labelledby="brief-opener-title" className="space-y-4">
      <div>
        <h3 id="brief-opener-title" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Opening angle</h3>
        <p className="mt-1 text-sm text-muted-foreground">Tune the first line before drafting the full email.</p>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Opener angles">
        {angles.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={item === angle}
            className={chipClass(item === angle)}
            onClick={() => state.setAngle(item)}
          >
            {signalLabel(item)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Personas">
        {block.spec.personas.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={item === persona}
            className={chipClass(item === persona)}
            onClick={() => state.setPersona(item)}
          >
            {renderSpecText(item, ctx)}
          </button>
        ))}
      </div>

      <figure className="rounded-lg border border-border/70 bg-card/45 p-4">
        <blockquote className="text-pretty text-[15px] leading-7 text-foreground">{opener}</blockquote>
      </figure>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => void copyOpener()}>
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="brand"
          disabled={!handlers.onPrompt || handlers.pending}
          onClick={() => handlers.onPrompt?.(`Draft an outreach email to the ${personaLabel} at ${block.company} that leads with the ${angle} signal. Open with: "${opener}"`)}
        >
          <PenLine className="size-4" aria-hidden="true" />
          Write the full email
        </Button>
      </div>
    </section>
  );
}
