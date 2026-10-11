// Adapted from CopilotKit/OpenIntelligentUI, MIT License.

import { z } from "zod";

export const SandboxToolContentSchema = z.object({
  title: z.string().optional(),
  initialHeight: z.number().optional(),
  placeholderMessages: z.array(z.string()).optional(),
  generating: z.boolean().optional(),
  css: z.string().optional(),
  cssComplete: z.boolean().optional(),
  html: z.string().optional(),
  htmlComplete: z.boolean().optional(),
  jsFunctions: z.string().optional(),
  jsFunctionsComplete: z.boolean().optional(),
  jsExpressions: z.array(z.string()).optional(),
  jsExpressionsComplete: z.boolean().optional(),
});

export type SandboxToolContent = z.infer<typeof SandboxToolContentSchema>;
export type SandboxToolData = Record<string, unknown>;
