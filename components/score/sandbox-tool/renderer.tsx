"use client";

// Adapted from CopilotKit/OpenIntelligentUI, MIT License.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IDIOMORPH_JS } from "./idiomorph-inline";
import {
  buildFinalFrameContent,
  buildPreviewBodyMorph,
  buildPreviewHeadContent,
  MEASUREMENT_JS,
  PREVIEW_FRAME_CONTENT,
  RESIZE_MESSAGE_TYPE,
} from "./frame-content";
import { extractCompleteStyles, processPartialHtml } from "./process-partial-html";
import type { SandboxFunctionMap } from "./sandbox-functions";
import type { SandboxToolContent, SandboxToolData } from "./schema";
import { loadWebsandbox, type SandboxInstance } from "./websandbox-loader";

export type { SandboxToolContent, SandboxToolData } from "./schema";

export const THROTTLE_MS = 400;

const MIN_HEIGHT = 50;
const MAX_HEIGHT = 4000;
const DEFAULT_INITIAL_HEIGHT = 220;
const DEFAULT_PLACEHOLDERS = ["Preparing interactive tool", "Loading sandbox", "Wiring controls"];

export function clampReportedHeight(height: unknown): number | null {
  if (typeof height !== "number" || !Number.isFinite(height)) return null;
  return Math.max(MIN_HEIGHT, Math.min(Math.ceil(height), MAX_HEIGHT));
}

interface SandboxToolRendererProps {
  content: SandboxToolContent;
  data?: SandboxToolData | null;
  dataReady?: boolean;
  functions?: SandboxFunctionMap;
}

function shouldFlushImmediately(prev: SandboxToolContent | null, next: SandboxToolContent): boolean {
  if (next.cssComplete && !prev?.cssComplete) return true;
  if (next.htmlComplete && !prev?.htmlComplete) return true;
  if (next.generating === false && prev?.generating !== false) return true;
  if (next.jsFunctionsComplete && !prev?.jsFunctionsComplete) return true;
  if ((next.jsExpressions?.length ?? 0) > (prev?.jsExpressions?.length ?? 0)) return true;
  if (next.html?.length && !prev?.html?.length) return true;
  return false;
}

function styleIframe(iframe: HTMLIFrameElement) {
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.style.backgroundColor = "transparent";
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);

  return reduced;
}

function useLoadingMessage(messages: readonly string[] | undefined, active: boolean): string {
  const usableMessages = useMemo(() => {
    const filtered = messages?.map((message) => message.trim()).filter(Boolean);
    return filtered && filtered.length > 0 ? filtered : DEFAULT_PLACEHOLDERS;
  }, [messages]);
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active || reducedMotion || usableMessages.length <= 1) return;
    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % usableMessages.length);
    }, 1800);
    return () => window.clearInterval(interval);
  }, [active, reducedMotion, usableMessages.length]);

  return usableMessages[index % usableMessages.length] ?? DEFAULT_PLACEHOLDERS[0]!;
}

export function SandboxToolRenderer({ content, data, dataReady = true, functions }: SandboxToolRendererProps) {
  const [throttledContent, setThrottledContent] = useState<SandboxToolContent>(content);
  const [prevContent, setPrevContent] = useState<SandboxToolContent>(content);
  const latestContentRef = useRef(content);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (content !== prevContent) {
    setPrevContent(content);
    if (shouldFlushImmediately(throttledContent, content)) {
      setThrottledContent(content);
    }
  }

  useEffect(() => {
    latestContentRef.current = content;
  });

  const flush = useCallback(() => {
    timerRef.current = null;
    setThrottledContent(latestContentRef.current);
  }, []);

  useEffect(() => {
    if (throttledContent === content) {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (timerRef.current === null) {
      timerRef.current = setTimeout(flush, THROTTLE_MS);
    }
  }, [content, flush, throttledContent]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <SandboxToolRendererInner
      content={throttledContent}
      data={data}
      dataReady={dataReady}
      functions={functions}
    />
  );
}

const SandboxToolRendererInner = React.memo(function SandboxToolRendererInner({
  content,
  data,
  dataReady,
  functions,
}: Required<Pick<SandboxToolRendererProps, "content" | "dataReady">> &
  Pick<SandboxToolRendererProps, "data" | "functions">) {
  const initialHeight = clampReportedHeight(content.initialHeight) ?? DEFAULT_INITIAL_HEIGHT;
  const [autoHeight, setAutoHeight] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewSandboxRef = useRef<SandboxInstance | null>(null);
  const finalSandboxRef = useRef<SandboxInstance | null>(null);
  const previewReadyRef = useRef(false);
  const finalReadyRef = useRef(false);
  const pendingQueueRef = useRef<string[]>([]);
  const executionChainRef = useRef<Promise<void>>(Promise.resolve());
  const jsFunctionsInjectedRef = useRef(false);
  const executedExpressionCountRef = useRef(0);

  const localApi = useMemo(() => functions ?? {}, [functions]);
  const cssReady = content.cssComplete === true || content.generating === false;
  const css = cssReady ? content.css : undefined;
  const html = content.html;
  const finalHtml = html && (content.htmlComplete || content.generating === false) ? html : undefined;
  const shouldBootFinal = Boolean(finalHtml && cssReady && dataReady);
  const previewSource = !shouldBootFinal && cssReady && html ? html : !finalHtml && cssReady && html ? html : undefined;
  const previewBody = previewSource ? processPartialHtml(previewSource) : undefined;
  const previewStyles = previewSource ? extractCompleteStyles(previewSource) : "";
  const hasPreview = Boolean(previewBody?.trim());
  const finalFrameContent = useMemo(() => {
    if (!shouldBootFinal || !finalHtml) return undefined;
    return buildFinalFrameContent(finalHtml, css, data ?? {});
  }, [css, data, finalHtml, shouldBootFinal]);
  const hasVisibleSandbox = Boolean(finalFrameContent || hasPreview);
  const showLoading = !hasVisibleSandbox;
  const loadingMessage = useLoadingMessage(content.placeholderMessages, showLoading);

  const scheduleRun = useCallback((code: string) => {
    const sandbox = finalSandboxRef.current;
    if (!sandbox || !finalReadyRef.current) {
      pendingQueueRef.current.push(code);
      return;
    }
    executionChainRef.current = executionChainRef.current
      .catch(() => undefined)
      .then(() => sandbox.run(code))
      .then(() => undefined);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || finalFrameContent || !hasPreview || previewSandboxRef.current) return;

    let cancelled = false;

    loadWebsandbox()
      .then((Websandbox) => {
        if (cancelled) return;
        const sandbox = Websandbox.create(
          {},
          {
            allowAdditionalAttributes: "",
            frameContainer: container,
            frameContent: PREVIEW_FRAME_CONTENT,
          },
        );
        previewSandboxRef.current = sandbox;
        styleIframe(sandbox.iframe);

        sandbox.promise.then(async () => {
          if (cancelled) return;
          previewReadyRef.current = true;
          await sandbox.run(IDIOMORPH_JS);
          await sandbox.run(`document.head.innerHTML = ${JSON.stringify(buildPreviewHeadContent(css, previewStyles))}`);
          if (previewBody) {
            await sandbox.run(buildPreviewBodyMorph(previewBody));
          }
        });
      })
      .catch((error: unknown) => {
        console.error("[SandboxToolRenderer] Failed to load preview sandbox:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [css, finalFrameContent, hasPreview, previewBody, previewStyles]);

  useEffect(() => {
    const sandbox = previewSandboxRef.current;
    if (!sandbox || !previewReadyRef.current || finalFrameContent) return;
    void sandbox.run(`document.head.innerHTML = ${JSON.stringify(buildPreviewHeadContent(css, previewStyles))}`);
    if (previewBody) {
      void sandbox.run(buildPreviewBodyMorph(previewBody));
    }
  }, [css, finalFrameContent, previewBody, previewStyles]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !finalFrameContent) return;

    if (previewSandboxRef.current) {
      previewSandboxRef.current.destroy();
      previewSandboxRef.current = null;
      previewReadyRef.current = false;
    }

    let cancelled = false;
    finalReadyRef.current = false;
    pendingQueueRef.current = [];
    executionChainRef.current = Promise.resolve();
    jsFunctionsInjectedRef.current = false;
    executedExpressionCountRef.current = 0;

    const onMessage = (event: MessageEvent) => {
      const sandbox = finalSandboxRef.current;
      if (!sandbox) return;
      if (event.source === sandbox.iframe.contentWindow && event.data?.type === RESIZE_MESSAGE_TYPE) {
        const nextHeight = clampReportedHeight(event.data.height);
        if (nextHeight !== null) setAutoHeight(nextHeight);
      }
    };
    window.addEventListener("message", onMessage);

    loadWebsandbox()
      .then((Websandbox) => {
        if (cancelled) return;
        const sandbox = Websandbox.create(localApi, {
          allowAdditionalAttributes: "",
          frameContainer: container,
          frameContent: finalFrameContent,
        });
        finalSandboxRef.current = sandbox;
        styleIframe(sandbox.iframe);

        sandbox.promise.then(() => {
          if (cancelled) return;
          finalReadyRef.current = true;
          const queued = pendingQueueRef.current;
          pendingQueueRef.current = [];
          scheduleRun(MEASUREMENT_JS);
          for (const code of queued) {
            scheduleRun(code);
          }
        });
      })
      .catch((error: unknown) => {
        console.error("[SandboxToolRenderer] Failed to load final sandbox:", error);
      });

    return () => {
      cancelled = true;
      window.removeEventListener("message", onMessage);
      if (finalSandboxRef.current) {
        finalSandboxRef.current.destroy();
        finalSandboxRef.current = null;
      }
      finalReadyRef.current = false;
      setAutoHeight(null);
    };
  }, [finalFrameContent, localApi, scheduleRun]);

  const jsFunctionsReady = Boolean(
    content.jsFunctions &&
      (content.jsFunctionsComplete ||
        content.jsExpressionsComplete ||
        (content.jsExpressions?.length ?? 0) > 0 ||
        content.generating === false),
  );

  useEffect(() => {
    if (!content.jsFunctions || !jsFunctionsReady || jsFunctionsInjectedRef.current || !finalFrameContent) return;
    jsFunctionsInjectedRef.current = true;
    scheduleRun(content.jsFunctions);
  }, [content.jsFunctions, finalFrameContent, jsFunctionsReady, scheduleRun]);

  useEffect(() => {
    if (!finalFrameContent) return;
    const expressions = content.jsExpressions ?? [];
    if (content.jsFunctions && !jsFunctionsInjectedRef.current && !jsFunctionsReady) return;
    const startIndex = executedExpressionCountRef.current;
    if (startIndex >= expressions.length) return;
    const nextExpressions = expressions.slice(startIndex);
    executedExpressionCountRef.current = expressions.length;
    for (const expression of nextExpressions) {
      scheduleRun(expression);
    }
  }, [content.jsExpressions, content.jsFunctions, finalFrameContent, jsFunctionsReady, scheduleRun]);

  useEffect(() => {
    return () => {
      if (previewSandboxRef.current) {
        previewSandboxRef.current.destroy();
        previewSandboxRef.current = null;
      }
      if (finalSandboxRef.current) {
        finalSandboxRef.current.destroy();
        finalSandboxRef.current = null;
      }
    };
  }, []);

  const height = autoHeight ?? initialHeight;
  const title = content.title?.trim() || "Interactive tool";

  return (
    <section className="overflow-hidden rounded-xl border border-border/70 bg-card/40">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 px-4 py-3">
        <h3 className="min-w-0 truncate text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Interactive tool · sandboxed
        </p>
      </div>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden bg-transparent transition-[height] duration-200 ease-out"
        style={{ height: `${height}px` }}
      >
        {showLoading ? (
          <div className="absolute inset-0 flex items-center justify-center gap-2 px-4 text-center text-xs font-medium text-muted-foreground">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-full border border-border border-t-foreground motion-safe:animate-spin"
            />
            <span>{loadingMessage}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
});
