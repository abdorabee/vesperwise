import { describe, expect, it } from "vitest";
import {
  buildFinalFrameContent,
  buildPreviewBodyMorph,
  buildPreviewHeadContent,
  MEASUREMENT_JS,
  RESIZE_MESSAGE_TYPE,
  SANDBOX_DESIGN_CSS,
} from "./frame-content";

describe("frame content", () => {
  it("builds final HTML with CSP, importmap, design CSS, generated CSS, frozen data, and HTML in order", () => {
    const frame = buildFinalFrameContent(
      '<html><head><title>Tool</title></head><body><div id="tool">Ready</div></body></html>',
      ".metric{color:var(--brand)}",
      { company: "Acme", bad: "</script><script>alert(1)</script>" },
    );

    const cspIndex = frame.indexOf("Content-Security-Policy");
    const importMapIndex = frame.indexOf('<script type="importmap">');
    const designIndex = frame.indexOf("--bg: #0b0c0e");
    const generatedCssIndex = frame.indexOf(".metric{color:var(--brand)}");
    const dataIndex = frame.indexOf("window.VW_DATA = Object.freeze");
    const htmlIndex = frame.indexOf('<div id="tool">Ready</div>');

    expect(cspIndex).toBeGreaterThanOrEqual(0);
    expect(importMapIndex).toBeGreaterThan(cspIndex);
    expect(designIndex).toBeGreaterThan(importMapIndex);
    expect(generatedCssIndex).toBeGreaterThan(designIndex);
    expect(dataIndex).toBeGreaterThan(generatedCssIndex);
    expect(htmlIndex).toBeGreaterThan(dataIndex);
    expect(frame).toContain('"chart.js/auto":"https://cdn.jsdelivr.net/npm/chart.js@4.4.9/auto/+esm"');
    expect(frame).toContain('"d3":"https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm"');
    expect(frame).toContain('"bad":"\\u003c/script>\\u003cscript>alert(1)\\u003c/script>"');
    expect(frame).not.toContain("</script><script>alert(1)</script>");
  });

  it("uses a locked-down CSP with no self access and connect-src limited to jsdelivr", () => {
    const frame = buildFinalFrameContent("<body><p>Done</p></body>", undefined, {});
    const csp = frame.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)?.[1];

    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net");
    expect(csp).toContain("style-src 'unsafe-inline' https://fonts.googleapis.com");
    expect(csp).toContain("font-src https://fonts.gstatic.com data:");
    expect(csp).toContain("img-src data: blob:");
    expect(csp).toContain("connect-src https://cdn.jsdelivr.net");
    expect(csp).not.toContain("'self'");
    expect(csp).not.toContain("/api/");
  });

  it("escapes inline JSON line separators before freezing VW_DATA", () => {
    const frame = buildFinalFrameContent("<body></body>", undefined, {
      line: "first\u2028second\u2029third",
    });

    expect(frame).toContain('Object.freeze({"line":"first\\u2028second\\u2029third"})');
  });

  it("exposes the VesperWise dark design system and preview helpers", () => {
    const head = buildPreviewHeadContent(".x{color:var(--brand)}", "<style>.y{}</style>");
    const morph = buildPreviewBodyMorph("<div>Hello</div>");

    expect(SANDBOX_DESIGN_CSS).toContain("--brand: #dfff00");
    expect(SANDBOX_DESIGN_CSS).toContain(".vw-card");
    expect(SANDBOX_DESIGN_CSS).toContain(".vw-band-hot");
    expect(SANDBOX_DESIGN_CSS).toContain("@media (prefers-reduced-motion: reduce)");
    expect(head).toContain("fonts.googleapis.com/css2?family=Instrument+Sans");
    expect(head).toContain(".x{color:var(--brand)}");
    expect(head).toContain("<style>.y{}</style>");
    expect(morph).toContain("Idiomorph.morph(document.body");
    expect(morph).toContain("morph-enter");
    expect(MEASUREMENT_JS).toContain(RESIZE_MESSAGE_TYPE);
  });
});
