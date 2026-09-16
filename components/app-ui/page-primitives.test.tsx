import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentType, ReactNode } from "react";
import { describe, expect, it } from "vitest";

import * as pagePrimitives from "./page-primitives";
import {
  EmptyState,
  InlineError,
  MetricCard,
  PageHeader,
  PageSurface,
} from "./page-primitives";

describe("PageContainer", () => {
  it.each([
    ["form", "max-w-5xl"],
    ["default", "max-w-7xl"],
    ["wide", "max-w-[96rem]"],
    ["workspace", "max-w-none"],
  ] as const)("renders the %s layout inside one shell-owned gutter", (size, widthClass) => {
    const PageContainer = (pagePrimitives as unknown as {
      PageContainer?: ComponentType<{ children: ReactNode; size: typeof size }>;
    }).PageContainer;

    expect(PageContainer).toBeTypeOf("function");
    if (!PageContainer) return;

    const html = renderToStaticMarkup(
      <PageContainer size={size}>
        <p>Page body</p>
      </PageContainer>
    );

    expect(html).toContain('data-slot="page-container"');
    expect(html).toContain(`data-size="${size}"`);
    expect(html).toContain(widthClass);
    expect(html).toContain("p-4");
    expect(html).not.toMatch(/(?:sm|md|lg):p-[678]/);
  });
});

describe("PageHeader", () => {
  it("exposes one page heading and keeps supporting actions alongside it", () => {
    const html = renderToStaticMarkup(
      <PageHeader
        eyebrow="Workspace"
        title="Intent overview"
        description="Accounts showing meaningful buying activity."
        actions={<button type="button">Export</button>}
      />
    );

    expect(html).toContain("<h1");
    expect(html).toContain("Intent overview");
    expect(html).toContain("Accounts showing meaningful buying activity.");
    expect(html).toContain(">Export</button>");
  });
});

describe("MetricCard", () => {
  it("renders a labelled metric with tabular figures and supporting context", () => {
    const html = renderToStaticMarkup(
      <MetricCard label="Hot accounts" value="18" detail="Up 3 this week" />
    );

    expect(html).toContain("Hot accounts");
    expect(html).toContain("tabular-nums");
    expect(html).toContain("Up 3 this week");
  });
});

describe("PageSurface", () => {
  it("uses a semantic section with an accessible title", () => {
    const html = renderToStaticMarkup(
      <PageSurface title="Recent activity" description="Latest account changes">
        <p>Stripe moved to hot.</p>
      </PageSurface>
    );

    expect(html).toContain("<section");
    expect(html).toContain("Recent activity");
    expect(html).toContain('aria-labelledby="');
  });
});

describe("EmptyState", () => {
  it("renders a calm status message and optional recovery action", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="No accounts yet"
        description="Score a company to start building history."
        action={<button type="button">Score company</button>}
      />
    );

    expect(html).toContain("No accounts yet");
    expect(html).toContain("Score a company to start building history.");
    expect(html).toContain(">Score company</button>");
  });
});

describe("InlineError", () => {
  it("announces an error and can include a recovery action", () => {
    const html = renderToStaticMarkup(
      <InlineError
        title="Score unavailable"
        description="The scoring service did not return a result."
        action={<button type="button">Try again</button>}
      />
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Score unavailable");
    expect(html).toContain(">Try again</button>");
  });
});
