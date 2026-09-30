import { Check, Loader2 } from "lucide-react";
import type { ToolChip } from "@/lib/score-presentation";

export function toolLabel(name: string) { return name.replaceAll("_", " "); }

function ToolStatusIcon({ status }: { status: ToolChip["status"] }) {
  if (status === "running") return <Loader2 className="score-tool-spinner size-3" aria-hidden="true" />;
  return <Check className="score-tool-check size-3" aria-hidden="true" />;
}

export function ToolTrace({ tools, billing }: { tools: ToolChip[]; billing?: string }) {
  if (tools.length === 0 && !billing) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-label="Tool activity">
      {tools.map((tool, index) => (
        <span key={`${tool.name}-${index}`} className="score-tool-chip inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2 py-1" data-state={tool.status}>
          {/* Keyed by status so the check remounts and draws on when the result lands. */}
          <span key={tool.status} className="score-tool-status inline-flex size-3 items-center justify-center" data-state={tool.status}><ToolStatusIcon status={tool.status} /></span>
          <span>{toolLabel(tool.name)}</span>
        </span>
      ))}
      {billing ? <span className="score-tool-chip rounded-full border border-border/70 bg-muted/40 px-2 py-1">{billing}</span> : null}
    </div>
  );
}
