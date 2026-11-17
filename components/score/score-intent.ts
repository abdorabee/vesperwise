import { extractDomain } from "@/lib/chat-client";
import { CHAT_CREDIT_COST } from "@/lib/types";

export const DOMAIN_HINT = "Enter a company domain like stripe.com";
export const INVALID_DOMAIN_PARAM_MESSAGE = "That link's domain isn't valid. Enter a company domain like stripe.com.";

/** What a `/score?domain=…&view=…` URL asks the page to do on load. */
export type InitialDomainIntent =
  | { kind: "none" }
  | { kind: "last"; domain: string }
  | { kind: "prefill"; domain: string }
  | { kind: "invalid"; message: string };

interface ParamReader { get(name: string): string | null }

/** `?domain=X` only pre-fills (never spends a credit); `view=last` opens the stored result. */
export function resolveInitialDomainIntent(params: ParamReader): InitialDomainIntent {
  const raw = params.get("domain")?.trim();
  if (!raw) return { kind: "none" };
  const domain = extractDomain(raw);
  if (!domain) return { kind: "invalid", message: INVALID_DOMAIN_PARAM_MESSAGE };
  return params.get("view") === "last" ? { kind: "last", domain } : { kind: "prefill", domain };
}

export type ComposerInputDecision =
  | { kind: "score"; domain: string }
  | { kind: "follow_up" }
  | { kind: "invalid"; message: string }
  | { kind: "empty" };

/** Without an active result, only domains may be sent; free text would be a context-less paid chat. */
export function classifyComposerInput(text: string, hasActiveThread: boolean): ComposerInputDecision {
  const value = text.trim();
  if (!value) return { kind: "empty" };
  const domain = extractDomain(value);
  if (domain) return { kind: "score", domain };
  return hasActiveThread ? { kind: "follow_up" } : { kind: "invalid", message: DOMAIN_HINT };
}

export function composerPlaceholder(company: string | null): string {
  return company ? `Ask a follow-up about ${company}` : "Enter a company domain";
}

export function composerHelper(hasActiveThread: boolean, company: string | null): string {
  if (!hasActiveThread) return "Enter a company domain · 1 credit";
  const about = company ? ` about ${company}` : "";
  return `Ask a follow-up${about} · ${CHAT_CREDIT_COST} credits`;
}

/** The explicit, cost-bearing confirm action shown whenever a domain is about to be scored. */
export function scoreActionLabel(domain: string): string {
  return `Score ${domain} · 1 credit`;
}
