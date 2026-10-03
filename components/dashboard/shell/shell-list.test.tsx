import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppFrame } from "./app-frame";
import { ShellListColumn, ShellListProvider, ShellListSlot } from "./shell-list";

function renderFrame({
  active = true,
  expanded = true,
}: {
  active?: boolean;
  expanded?: boolean;
}) {
  return renderToStaticMarkup(
    <SidebarProvider defaultOpen={expanded}>
      <ShellListProvider initialList={active ? { open: true, label: "Score threads" } : undefined}>
        <AppFrame rail={<nav>Rail</nav>} list={<ShellListSlot />}>
          <main>Route</main>
        </AppFrame>
      </ShellListProvider>
    </SidebarProvider>,
  );
}

describe("ShellList", () => {
  it("sets the frame list width only when a list is mounted and expanded", () => {
    expect(renderFrame({ active: true, expanded: true })).toContain(
      "--app-frame-list-w:var(--list-w)",
    );
    expect(renderFrame({ active: true, expanded: true })).toContain('data-has-list="true"');

    const collapsed = renderFrame({ active: true, expanded: false });
    expect(collapsed).toContain("--app-frame-list-w:0px");
    expect(collapsed).toContain('data-has-list="false"');

    const empty = renderFrame({ active: false, expanded: true });
    expect(empty).toContain("--app-frame-list-w:0px");
    expect(empty).toContain('data-has-list="false"');
  });

  it("renders the reusable target and column chrome with title and actions", () => {
    const frame = renderFrame({ active: true, expanded: true });
    expect(frame).toContain('data-slot="app-frame-list"');
    expect(frame).toContain('data-slot="shell-list-target"');

    const column = renderToStaticMarkup(
      <ShellListColumn
        label="Score threads"
        title="Threads"
        actions={<button type="button">New score</button>}
      >
        <p>Recent work</p>
      </ShellListColumn>,
    );

    expect(column).toContain('aria-label="Score threads"');
    expect(column).toContain('data-slot="shell-list-title"');
    expect(column).toContain(">Threads<");
    expect(column).toContain("New score");
    expect(column).toContain("Recent work");
  });
});
