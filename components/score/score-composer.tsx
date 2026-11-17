"use client";

import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { PromptInput, PromptInputBody, PromptInputFooter, PromptInputProvider, PromptInputSubmit, PromptInputTextarea, usePromptInputController } from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { classifyComposerInput, composerHelper, composerPlaceholder, scoreActionLabel } from "@/components/score/score-intent";
import type { UiSuggestion } from "@/lib/gen-ui";

interface ScoreComposerProps {
  onSubmit: (value: string) => void;
  suggestions?: UiSuggestion[];
  busy: boolean;
  initial?: boolean;
  autoFocus?: boolean;
  /** Whether a result/thread is open, which turns free text into a paid follow-up. */
  hasActiveThread?: boolean;
  company?: string | null;
  /** Domain to pre-fill. It is only sent after the user confirms. */
  prefill?: string;
  /** Message supplied by the page (e.g. an invalid `?domain=` link). */
  notice?: string | null;
}

type ComposerBodyProps = Omit<ScoreComposerProps, "suggestions" | "prefill">;

function ComposerBody({ onSubmit, busy, initial, autoFocus, hasActiveThread = false, company = null, notice = null }: ComposerBodyProps) {
  const { textInput } = usePromptInputController();
  const [rejected, setRejected] = useState<{ text: string; message: string } | null>(null);
  const text = textInput.value;
  const decision = classifyComposerInput(text, hasActiveThread);
  const hint = rejected && rejected.text === text ? rejected.message : notice;
  const confirmLabel = decision.kind === "score" ? scoreActionLabel(decision.domain) : null;

  function handleSubmit({ text: raw }: { text: string }) {
    const next = classifyComposerInput(raw, hasActiveThread);
    if (next.kind === "empty") return;
    if (next.kind === "invalid") {
      setRejected({ text: raw, message: next.message });
      // PromptInput keeps the typed text when onSubmit throws, so the hint stays attached to it.
      throw new Error(next.message);
    }
    setRejected(null);
    onSubmit(raw.trim());
  }

  return (
    <>
      <PromptInput className="score-elements-input" data-tour="chat" onSubmit={handleSubmit}>
        <PromptInputBody><PromptInputTextarea placeholder={composerPlaceholder(hasActiveThread ? company : null)} disabled={busy} autoFocus={autoFocus} aria-label={initial ? "Company domain" : "Chat message"} aria-describedby={hint ? "score-composer-hint" : undefined} /></PromptInputBody>
        <PromptInputFooter>
          <span data-tour={initial ? undefined : "credits"} className="text-xs text-muted-foreground">{composerHelper(hasActiveThread, company)}</span>
          <PromptInputSubmit status={busy ? "submitted" : undefined} disabled={busy} className={confirmLabel ? "score-elements-submit w-auto gap-1.5 px-3 text-xs font-semibold" : "score-elements-submit"} aria-label={confirmLabel ?? (initial ? "Score company" : "Send message")}>
            {confirmLabel ? <span>{confirmLabel}</span> : <ArrowUp className="size-4" />}
          </PromptInputSubmit>
        </PromptInputFooter>
      </PromptInput>
      {hint ? <p id="score-composer-hint" role="alert" className="mt-2 px-1 text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );
}

export function ScoreComposer({ suggestions = [], prefill = "", ...rest }: ScoreComposerProps) {
  const { onSubmit, busy, initial = false } = rest;
  return (
    <div id="chat" data-tour="composer" className={initial ? "w-full" : "score-chat-composer"}>
      {!initial && suggestions.length > 0 ? <Suggestions className="mb-3 flex flex-wrap gap-2 overflow-visible">{suggestions.map((item, index) => <Suggestion key={item.prompt} suggestion={item.prompt} index={index} disabled={busy} onClick={onSubmit}>{item.label}</Suggestion>)}</Suggestions> : null}
      <PromptInputProvider initialInput={prefill}>
        <ComposerBody {...rest} initial={initial} />
      </PromptInputProvider>
    </div>
  );
}
