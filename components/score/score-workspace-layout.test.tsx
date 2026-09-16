import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ScorePageFrame, ScoreWorkspaceLayout } from "./score-workspace-layout";

describe("ScorePageFrame", () => {
  it("uses one shell-owned gutter and a restrained response width", () => {
    const html = renderToStaticMarkup(
      <ScorePageFrame mode="workspace"><p>Score content</p></ScorePageFrame>
    );

    expect(html).toContain('data-mode="workspace"');
    expect(html).toContain("max-w-[50rem]");
    expect(html).not.toMatch(/(?:^|\s)(?:p-4|sm:p-6|lg:p-8)(?:\s|$)/);
  });
});

describe("ScoreWorkspaceLayout", () => {
  it("renders one conversation canvas with an anchored composer", () => {
    const html = renderToStaticMarkup(
      <ScoreWorkspaceLayout thread={<p>Conversation history</p>} composer={<form>Composer</form>} />
    );

    expect(html).toContain('aria-label="Score conversation"');
    expect(html).toContain('data-slot="score-thread"');
    expect(html).toContain('data-slot="score-composer"');
    expect(html).toContain("Conversation history");
    expect(html).toContain("Composer");
    expect(html).not.toContain('aria-label="Score evidence"');
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain("lg:grid-cols");
  });
});
