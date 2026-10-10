"use client";

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { CHAT_CREDIT_COST } from "@/lib/types";
import { PromptInput, PromptInputBody, PromptInputFooter, PromptInputProvider, PromptInputSubmit, PromptInputTextarea, usePromptInputController } from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import type { UiSuggestion } from "@/lib/gen-ui";

export interface ScoreComposerHandle {
  prefill: (text: string) => void;
}

interface ScoreComposerProps {
  onSubmit: (value: string) => void;
  suggestions?: UiSuggestion[];
  busy: boolean;
  initial?: boolean;
  autoFocus?: boolean;
}

export const ScoreComposer = forwardRef<ScoreComposerHandle, ScoreComposerProps>(function ScoreComposer(props, ref) {
  return (
    <PromptInputProvider>
      <ScoreComposerInner {...props} ref={ref} />
    </PromptInputProvider>
  );
});

const ScoreComposerInner = forwardRef<ScoreComposerHandle, ScoreComposerProps>(function ScoreComposerInner({ onSubmit, suggestions = [], busy, initial = false, autoFocus = false }, ref) {
  const { textInput } = usePromptInputController();
  const rootRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const [prefillNonce, setPrefillNonce] = useState(0);
  const highlightClasses = useRef(["score-prefill-highlight", "bg-primary/5", "transition-colors", "duration-200", "motion-reduce:transition-none"]);

  useImperativeHandle(ref, () => ({
    prefill: (text: string) => {
      textInput.setInput(text);
      setPrefillNonce((current) => current + 1);
    },
  }), [textInput]);

  useLayoutEffect(() => {
    if (prefillNonce === 0) return;
    const textarea = rootRef.current?.querySelector("textarea");
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current);
    textarea.classList.add(...highlightClasses.current);
    highlightTimerRef.current = window.setTimeout(() => {
      textarea.classList.remove(...highlightClasses.current);
    }, 1500);
  }, [prefillNonce]);

  useEffect(() => () => {
    if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current);
  }, []);

  return (
    <div ref={rootRef} className={initial ? "w-full" : "score-chat-composer"}>
      {!initial && suggestions.length > 0 ? <Suggestions className="mb-3 flex flex-wrap gap-2 overflow-visible">{suggestions.map((item, index) => <Suggestion key={item.prompt} suggestion={item.prompt} index={index} disabled={busy} onClick={onSubmit}>{item.label}</Suggestion>)}</Suggestions> : null}
      <PromptInput className="score-elements-input" onSubmit={({ text }) => { const value = text.trim(); if (value) onSubmit(value); }}>
        <PromptInputBody><PromptInputTextarea placeholder={initial ? "Enter a company domain" : "Ask a follow-up or score another domain"} disabled={busy} autoFocus={autoFocus} aria-label={initial ? "Company domain" : "Chat message"} /></PromptInputBody>
        <PromptInputFooter>
          <span className="text-xs text-muted-foreground">{initial ? "Fresh scores use 1 credit" : `Follow-ups use ${CHAT_CREDIT_COST} credits`}</span>
          <PromptInputSubmit status={busy ? "submitted" : undefined} disabled={busy} className="score-elements-submit" aria-label={initial ? "Score company" : "Send message"}><ArrowUp className="size-4" /></PromptInputSubmit>
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
});
