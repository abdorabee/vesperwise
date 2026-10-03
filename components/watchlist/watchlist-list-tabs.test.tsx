import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { WatchlistListTabs } from "./watchlist-list-tabs";

describe("WatchlistListTabs", () => {
  it("uses Radix tab roles while preserving counts, swatches, and New list", () => {
    const html = renderToStaticMarkup(
      <WatchlistListTabs
        activeId="all"
        onChange={vi.fn()}
        tabs={[
          { id: "all", name: "All", color: "", count: 4, domains: [] },
          { id: "target", name: "Priority", color: "var(--iq-accent)", count: 2, domains: [] },
        ]}
      />,
    );

    expect(html).toContain('role="tablist"');
    expect(html.match(/role="tab"/g)).toHaveLength(2);
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-selected="false"');
    expect(html).toContain("Priority");
    expect(html).toContain("var(--iq-accent)");
    expect(html).toContain("New list");
  });
});
