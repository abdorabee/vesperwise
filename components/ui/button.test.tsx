import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button, buttonVariants } from "./button";

describe("Button", () => {
  it("exposes the VesperWise brand variant", () => {
    const classes = buttonVariants({ variant: "brand" });

    expect(classes).toContain("bg-primary");
    expect(classes).toContain("text-primary-foreground");
    expect(classes).toContain("hover:bg-[var(--brand)]");
    expect(classes).toContain("hover:shadow-[0_0_0_3px_var(--brand-soft)]");
    expect(classes).not.toContain("hover:bg-[var(--brand-hover)]");
    expect(classes).toContain("active:bg-[var(--brand-active)]");
  });

  it("marks loading buttons busy and disabled with a spinner", () => {
    const html = renderToStaticMarkup(<Button loading>Save</Button>);

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("disabled");
    expect(html).toContain("animate-spin");
    expect(html).toContain("Save");
  });

  it("keeps loading asChild buttons spinner-free and aria-disabled", () => {
    const html = renderToStaticMarkup(
      <Button asChild loading>
        <a href="/billing">Top up</a>
      </Button>,
    );

    expect(html).toContain("<a");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain("animate-spin");
  });
});
