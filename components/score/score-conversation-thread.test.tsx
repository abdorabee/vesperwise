// @vitest-environment jsdom

import { cleanup, render as renderDom } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScoreConversationThread } from "./score-conversation-thread";
import type { ThreadMessage } from "./score-thread-types";
import type { ScoreReport } from "./score-report-model";

const rendererFunctionProps = vi.hoisted((): Array<Record<string, unknown> | undefined> => []);

vi.mock("@/components/score/sandbox-tool/renderer", () => ({
  SandboxToolRenderer: (props: {
    content: { title?: string };
    dataReady?: boolean;
    functions?: Record<string, unknown>;
  }) => {
    rendererFunctionProps.push(props.functions);
    return (
      <div
        data-data-ready={String(props.dataReady)}
        data-functions={Object.keys(props.functions ?? {}).sort().join(",")}
        data-testid="sandbox-tool"
      >
        {props.content.title}
      </div>
    );
  },
}));

const report: Extract<ScoreReport, { kind: "ui" }> = {
  kind: "ui",
  id: "report-1",
  messageId: "assistant-1",
  label: "Notion",
  blocks: [],
  fresh: true,
};

const noop = () => undefined;
const reportForMessage = () => report;

function threadElement(messages: ThreadMessage[], allowedDomains: readonly string[] = ["notion.so"]) {
  return (
    <ScoreConversationThread
      activeStreamingMessageId={null}
      allowedDomains={allowedDomains}
      latestArtifactId="assistant-1"
      messages={messages}
      onOpenAccount={noop}
      onOpenReport={noop}
      onPrefillPrompt={noop}
      onReset={noop}
      onRetryScore={noop}
      reportForMessage={reportForMessage}
    />
  );
}

function renderThread(messages: ThreadMessage[]) {
  return renderToStaticMarkup(
    threadElement(messages),
  );
}

describe("ScoreConversationThread sandbox widgets", () => {
  beforeEach(() => {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      value: ResizeObserverStub,
    });
  });

  afterEach(() => {
    cleanup();
    rendererFunctionProps.length = 0;
  });

  it("renders widgets after the markdown response for text messages", () => {
    const html = renderThread([
      {
        id: "assistant-1",
        role: "assistant",
        kind: "text",
        content: "Here is the tool.",
        tools: [],
        widgets: [{
          id: "widget-1",
          content: { title: "ROI calculator", generating: false },
          dataReady: true,
        }],
      },
    ]);

    expect(html.indexOf("Here is the tool.")).toBeLessThan(html.indexOf("ROI calculator"));
    expect(html).toContain('data-testid="sandbox-tool"');
    expect(html).toContain('data-functions="openAccount,openLink,prefillPrompt"');
  });

  it("renders widgets after ui markdown and before the compact report card", () => {
    const html = renderThread([
      {
        id: "assistant-1",
        role: "assistant",
        kind: "ui",
        blocks: [],
        content: "I built this from the stored score.",
        tools: [],
        widgets: [{
          id: "widget-1",
          content: { title: "Signal timeline", generating: false },
          dataReady: true,
        }],
      },
    ]);

    expect(html.indexOf("I built this from the stored score.")).toBeLessThan(html.indexOf("Signal timeline"));
    expect(html.indexOf("Signal timeline")).toBeLessThan(html.indexOf("View report"));
  });

  it("keeps the sandbox bridge stable when allowed-domain contents are unchanged", () => {
    const messages: ThreadMessage[] = [{
      id: "assistant-1",
      role: "assistant",
      kind: "text",
      content: "Compare these.",
      tools: [],
      widgets: [{
        id: "widget-1",
        content: { title: "Account comparison", generating: false },
        dataReady: true,
      }],
    }];

    const { rerender } = renderDom(threadElement(messages, ["notion.so", "linear.app"]));
    const firstFunctions = rendererFunctionProps.at(-1);

    rerender(threadElement(messages, ["notion.so", "linear.app"]));

    expect(rendererFunctionProps.at(-1)).toBe(firstFunctions);
  });
});
