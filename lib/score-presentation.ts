import { z } from "zod";
import { sanitizeUiBlocks, type UiBlock } from "@/lib/gen-ui";

export const toolChipSchema = z.object({ name: z.string().min(1).max(80), status: z.enum(["running", "done"]), result: z.unknown().optional() });
export type ToolChip = z.infer<typeof toolChipSchema>;
export interface PersistedScorePresentation { presentation: UiBlock[]; tools: ToolChip[]; billing?: string }

export function serializePresentation(value: PersistedScorePresentation): PersistedScorePresentation {
  const billing = typeof value.billing === "string" && value.billing.trim() ? value.billing.trim().slice(0, 120) : undefined;
  return {
    presentation: sanitizeUiBlocks(value.presentation),
    tools: z.array(toolChipSchema).max(20).catch([]).parse(value.tools),
    ...(billing ? { billing } : {}),
  };
}

export function parsePersistedPresentation(value: unknown): PersistedScorePresentation | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const presentation = sanitizeUiBlocks(record.presentation);
  if (presentation.length === 0) return null;
  return serializePresentation({ presentation, tools: Array.isArray(record.tools) ? record.tools as ToolChip[] : [], billing: typeof record.billing === "string" ? record.billing : undefined });
}
