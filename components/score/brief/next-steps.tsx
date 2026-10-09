"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BriefSection } from "@/lib/brief";
import { renderSpecText } from "./brief-ui";
import type { BriefSectionProps } from "./types";

type NextStepsSection = Extract<BriefSection, { type: "next_steps" }>;

export function NextSteps({ section, ctx, handlers }: BriefSectionProps & { section: NextStepsSection }) {
  return (
    <section aria-labelledby="brief-next-title" className="space-y-3">
      <h3 id="brief-next-title" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Next steps</h3>
      <div className="flex flex-wrap gap-2">
        {section.actions.map((action) => {
          const label = renderSpecText(action.label, ctx);
          const prompt = renderSpecText(action.prompt, ctx);
          return (
            <Button
              key={`${label}-${prompt}`}
              type="button"
              size="sm"
              variant="outline"
              disabled={!handlers.onPrompt || handlers.pending}
              onClick={() => handlers.onPrompt?.(prompt)}
            >
              {label}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Button>
          );
        })}
      </div>
    </section>
  );
}
