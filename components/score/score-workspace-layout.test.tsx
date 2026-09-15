import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ScoreWorkspaceLayout } from "./score-workspace-layout";

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
