import { z } from "zod";
import { sanitizeUiBlocks, type UiBlock } from "@/lib/gen-ui";
import { SandboxToolContentSchema, type SandboxToolData } from "@/components/score/sandbox-tool/schema";

export const toolChipSchema = z.object({ name: z.string().min(1).max(80), status: z.enum(["running", "done"]), result: z.unknown().optional() });
export type ToolChip = z.infer<typeof toolChipSchema>;
export const widgetSnapshotSchema = z.object({
  id: z.string().min(1).max(120),
  content: SandboxToolContentSchema,
  data: z.record(z.string(), z.unknown()).optional(),
});
export type WidgetSnapshot = z.infer<typeof widgetSnapshotSchema> & { data?: SandboxToolData };
export interface PersistedScorePresentation { presentation: UiBlock[]; tools: ToolChip[]; billing?: string; widgets?: WidgetSnapshot[] }

const WIDGET_JSON_CAP_BYTES = 250_000;

function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function sanitizeWidgets(value: unknown): WidgetSnapshot[] {
  const widgets = z.array(widgetSnapshotSchema).max(20).catch([]).parse(value);
  if (widgets.length === 0) return [];
  if (jsonBytes(widgets) <= WIDGET_JSON_CAP_BYTES) return widgets;
  return widgets.map((widget) => ({ id: widget.id, content: widget.content }));
}

export function serializePresentation(value: PersistedScorePresentation): PersistedScorePresentation {
  const billing = typeof value.billing === "string" && value.billing.trim() ? value.billing.trim().slice(0, 120) : undefined;
  const widgets = sanitizeWidgets(value.widgets);
  return {
    presentation: sanitizeUiBlocks(value.presentation),
    tools: z.array(toolChipSchema).max(20).catch([]).parse(value.tools),
    ...(widgets.length > 0 ? { widgets } : {}),
    ...(billing ? { billing } : {}),
  };
}

export function parsePersistedPresentation(value: unknown): PersistedScorePresentation | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const presentation = sanitizeUiBlocks(record.presentation);
  const widgets = sanitizeWidgets(record.widgets);
  if (presentation.length === 0 && widgets.length === 0) return null;
  return serializePresentation({
    presentation,
    tools: Array.isArray(record.tools) ? record.tools as ToolChip[] : [],
    widgets,
    billing: typeof record.billing === "string" ? record.billing : undefined,
  });
}
