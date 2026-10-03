import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { ChatSessionSummary } from "@/lib/chat-client";
import { groupScoreThreads, ScoreThreadList } from "./score-thread-list";

const NOW = Date.parse("2026-10-03T12:00:00.000Z");

function session(id: string, title: string, updatedAt: string): ChatSessionSummary {
  return {
    id,
    title,
    created_at: updatedAt,
    updated_at: updatedAt,
  };
}

describe("groupScoreThreads", () => {
  it("groups by Today, This week, and Earlier with fixed boundaries", () => {
    const groups = groupScoreThreads(
      [
        session("earlier", "Earlier", "2026-09-25T23:59:59.000Z"),
        session("week", "Week", "2026-09-27T00:00:00.000Z"),
        session("today", "Today", "2026-10-03T00:00:00.000Z"),
      ],
      NOW,
    );

    expect(groups.map((group) => [group.label, group.sessions.map((item) => item.id)])).toEqual([
      ["Today", ["today"]],
      ["This week", ["week"]],
      ["Earlier", ["earlier"]],
    ]);
  });
});

describe("ScoreThreadList", () => {
  it("renders loading, error, and empty states", () => {
    expect(
      renderToStaticMarkup(
        <ScoreThreadList activeId={null} onSelect={vi.fn()} loading sessions={[]} />,
      ),
    ).toContain('data-slot="score-thread-loading"');

    expect(
      renderToStaticMarkup(
        <ScoreThreadList activeId={null} onSelect={vi.fn()} error="Failed to load threads" sessions={[]} />,
      ),
    ).toContain('role="alert"');

    expect(
      renderToStaticMarkup(
        <ScoreThreadList activeId={null} onSelect={vi.fn()} sessions={[]} />,
      ),
    ).toContain("No saved score threads yet.");
  });

  it("marks the active thread and shows relative time", () => {
    const html = renderToStaticMarkup(
      <ScoreThreadList
        activeId="active"
        onSelect={vi.fn()}
        now={NOW}
        sessions={[session("active", "Ramp score", "2026-10-03T10:00:00.000Z")]}
      />,
    );

    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Ramp score");
    expect(html).toContain("2 h ago");
  });

  it("shows the busy orb on the active row or a pending new-thread row", () => {
    const active = renderToStaticMarkup(
      <ScoreThreadList
        activeId="active"
        busy
        onSelect={vi.fn()}
        sessions={[session("active", "Ramp score", "2026-10-03T10:00:00.000Z")]}
      />,
    );
    expect(active).toContain('data-slot="score-thread-busy"');
    expect(active).toContain("score-thinking-orb");

    const pending = renderToStaticMarkup(
      <ScoreThreadList activeId={null} busy onSelect={vi.fn()} sessions={[]} />,
    );
    expect(pending).toContain("New thread");
    expect(pending).toContain('data-slot="score-thread-pending"');
  });
});
