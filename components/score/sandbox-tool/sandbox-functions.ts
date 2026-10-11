// Adapted from CopilotKit/OpenIntelligentUI, MIT License.

import { z } from "zod";

// Generated tools often build a full email draft; match the source project's 4,000 cap.
export const MAX_PREFILL_LENGTH = 4000;

export type SandboxFunctionMap = Record<string, (args: unknown) => unknown>;

interface CreateSandboxFunctionsOptions {
  onPrefillPrompt: (text: string) => void | Promise<void>;
  onOpenAccount: (domain: string) => void | Promise<void>;
  allowedDomains: readonly string[];
}

const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX_CALLS = 5;

const prefillPromptParameters = z.object({
  text: z.string().trim().min(1).max(MAX_PREFILL_LENGTH),
});

const openAccountParameters = z.object({
  domain: z.string().trim().min(1),
});

const openLinkParameters = z.object({
  url: z.string().url(),
});

function formatIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
}

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase();
}

function withRateLimit(
  name: string,
  handler: (args: unknown) => Promise<{ ok: true }>,
): (args: unknown) => Promise<{ ok: true }> {
  const calls: number[] = [];
  return async (args: unknown) => {
    const now = Date.now();
    while (calls.length > 0 && now - calls[0]! > RATE_LIMIT_WINDOW_MS) {
      calls.shift();
    }
    if (calls.length >= RATE_LIMIT_MAX_CALLS) {
      throw new Error(`${name}: rate limit exceeded`);
    }
    calls.push(now);
    return handler(args);
  };
}

export function createSandboxFunctions({
  allowedDomains,
  onOpenAccount,
  onPrefillPrompt,
}: CreateSandboxFunctionsOptions): SandboxFunctionMap {
  const allowed = new Set(allowedDomains.map(normalizeDomain));

  return {
    prefillPrompt: withRateLimit("prefillPrompt", async (args) => {
      const result = prefillPromptParameters.safeParse(args);
      if (!result.success) {
        throw new Error(`prefillPrompt: invalid arguments - ${formatIssues(result.error)}`);
      }
      await onPrefillPrompt(result.data.text);
      return { ok: true };
    }),

    openAccount: withRateLimit("openAccount", async (args) => {
      const result = openAccountParameters.safeParse(args);
      if (!result.success) {
        throw new Error(`openAccount: invalid arguments - ${formatIssues(result.error)}`);
      }
      const domain = normalizeDomain(result.data.domain);
      if (!allowed.has(domain)) {
        throw new Error(`openAccount: domain not allowed - ${domain}`);
      }
      await onOpenAccount(domain);
      return { ok: true };
    }),

    openLink: withRateLimit("openLink", async (args) => {
      const result = openLinkParameters.safeParse(args);
      if (!result.success) {
        throw new Error(`openLink: invalid arguments - ${formatIssues(result.error)}`);
      }
      const parsed = new URL(result.data.url);
      if (parsed.protocol !== "https:") {
        throw new Error(`openLink: https URLs only - ${result.data.url}`);
      }
      window.open(parsed.toString(), "_blank", "noopener,noreferrer");
      return { ok: true };
    }),
  };
}
