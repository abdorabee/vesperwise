import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentType, ReactNode } from "react";
import { describe, expect, it } from "vitest";

import * as scoreLayout from "./score-workspace-layout";
import { ScoreWorkspaceLayout } from "./score-workspace-layout";

describe("ScorePageFrame", () => {
  it.each([
    ["entry", "max-w-5xl"],
    ["workspace", "max-w-[96rem]"],
  ] as const)("keeps the %s frame aligned inside the shell gutter", (mode, widthClass) => {
    const ScorePageFrame = (scoreLayout as unknown as {
      ScorePageFrame?: ComponentType<{ children: ReactNode; mode: typeof mode }>;
    }).ScorePageFrame;

    expect(ScorePageFrame).toBeTypeOf("function");
    if (!ScorePageFrame) return;

    const html = renderToStaticMarkup(
      <ScorePageFrame mode={mode}>
        <p>Score content</p>
      </ScorePageFrame>
    );

    expect(html).toContain(`data-mode="${mode}"`);
    expect(html).toContain(widthClass);
    expect(html).not.toMatch(/(?:^|\s)(?:p-4|sm:p-6|lg:p-8)(?:\s|$)/);
  });
});

describe("ScoreWorkspaceLayout", () => {
  it("renders bounded desktop conversation and evidence panes", () => {
    const html = renderToStaticMarkup(
      <ScoreWorkspaceLayout
        conversation={<p>Conversation history</p>}
        composer={<form>Composer</form>}
        evidence={<p>Verified evidence</p>}
      />
    );

    expect(html).toContain('aria-label="Score conversation"');
    expect(html).toContain('aria-label="Score evidence"');
    expect(html).toContain("Conversation history");
    expect(html).toContain("Verified evidence");
    expect(html).toContain("Composer");
    expect(html).toContain("lg:grid-cols");
  });

  it("exposes keyboard-operable Conversation and Evidence tabs on smaller screens", () => {
    const html = renderToStaticMarkup(
      <ScoreWorkspaceLayout
        conversation={<p>Conversation</p>}
        composer={<form>Composer</form>}
        evidence={<p>Evidence</p>}
      />
    );

    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain("Conversation");
    expect(html).toContain("Evidence");
  });
});
