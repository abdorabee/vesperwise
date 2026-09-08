import { jsonSchema, tool, type ToolSet } from "ai";
import type { JSONSchema7 } from "@ai-sdk/provider";

import { COPILOT_TOOLS, executeTool } from "@/lib/copilot";
import type { BusinessProfile } from "@/lib/types";

export function copilotSdkTools(
  userId: string,
  productCategory: string,
  businessProfile: BusinessProfile | null
): ToolSet {
  return Object.fromEntries(
    COPILOT_TOOLS.map((definition) => [
      definition.function.name,
      tool({
        description: definition.function.description,
        inputSchema: jsonSchema(definition.function.parameters as JSONSchema7),
        execute: async (input) =>
          executeTool(
            definition.function.name,
            (input ?? {}) as Record<string, unknown>,
            userId,
            productCategory,
            businessProfile
          ),
      }),
    ])
  );
}

export function copilotToolNames(): string[] {
  return COPILOT_TOOLS.map((definition) => definition.function.name);
}
