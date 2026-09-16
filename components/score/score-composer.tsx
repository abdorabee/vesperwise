"use client";

import { ArrowUp } from "lucide-react";
import { CHAT_CREDIT_COST } from "@/lib/types";
import { PromptInput, PromptInputBody, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import type { UiSuggestion } from "@/lib/gen-ui";

export function ScoreComposer({ onSubmit, suggestions = [], busy, initial = false, autoFocus = false }: { onSubmit: (value: string) => void; suggestions?: UiSuggestion[]; busy: boolean; initial?: boolean; autoFocus?: boolean }) {
  return (
    <div className={initial ? "w-full" : "score-chat-composer"}>
      {!initial && suggestions.length > 0 ? <Suggestions className="mb-3 flex flex-wrap gap-2 overflow-visible">{suggestions.map((item) => <Suggestion key={item.prompt} suggestion={item.prompt} disabled={busy} onClick={onSubmit}>{item.label}</Suggestion>)}</Suggestions> : null}
      <PromptInput className="score-elements-input" onSubmit={({ text }) => { const value = text.trim(); if (value) onSubmit(value); }}>
        <PromptInputBody><PromptInputTextarea placeholder={initial ? "Enter a company domain" : "Ask a follow-up or score another domain"} disabled={busy} autoFocus={autoFocus} aria-label={initial ? "Company domain" : "Chat message"} /></PromptInputBody>
        <PromptInputFooter>
          <span className="text-xs text-muted-foreground">{initial ? "Fresh scores use 1 credit" : `Follow-ups use ${CHAT_CREDIT_COST} credits`}</span>
          <PromptInputSubmit status={busy ? "submitted" : undefined} disabled={busy} className="score-elements-submit" aria-label={initial ? "Score company" : "Send message"}><ArrowUp className="size-4" /></PromptInputSubmit>
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
