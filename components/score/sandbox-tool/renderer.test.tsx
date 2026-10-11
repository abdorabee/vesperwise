// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RESIZE_MESSAGE_TYPE } from "./frame-content";
import { clampReportedHeight, SandboxToolRenderer, THROTTLE_MS, type SandboxToolContent } from "./renderer";

const mockRun = vi.fn().mockResolvedValue(undefined);
const mockDestroy = vi.fn();
let mockIframe: HTMLIFrameElement;
let mockPromiseResolve: () => void;
let mockPromise: Promise<void>;

function resetSandboxPromise() {
  mockPromise = new Promise<void>((resolve) => {
    mockPromiseResolve = resolve;
  });
}

const mockCreate = vi.fn(
  (
    localApi: Record<string, (args: unknown) => unknown>,
    options: { frameContainer: HTMLElement; frameContent: string },
  ) => {
    mockIframe = document.createElement("iframe");
    options.frameContainer.appendChild(mockIframe);
    return {
      destroy: mockDestroy,
      iframe: mockIframe,
      promise: mockPromise,
      run: mockRun,
      localApi,
      options,
    };
  },
);

vi.mock("./websandbox-loader", () => ({
  loadWebsandbox: async () => ({
    create: (
      localApi: Record<string, (args: unknown) => unknown>,
      options: { frameContainer: HTMLElement; frameContent: string },
    ) => mockCreate(localApi, options),
  }),
}));

async function flushSandboxImport() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function resolveSandboxReady() {
  await act(async () => {
    mockPromiseResolve();
    await mockPromise;
  });
  await flushSandboxImport();
}

function renderTool(content: SandboxToolContent, options?: { data?: Record<string, unknown> | null; dataReady?: boolean }) {
  return render(
    <SandboxToolRenderer
      content={content}
      data={options?.data}
      dataReady={options?.dataReady}
      functions={{ prefillPrompt: vi.fn() }}
    />,
  );
}

describe("SandboxToolRenderer", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    resetSandboxPromise();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        matches: false,
        removeEventListener: vi.fn(),
      }),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("does not create a visible sandbox before cssComplete", async () => {
    renderTool({
      generating: true,
      html: "<body><div>Streaming</div></body>",
      htmlComplete: false,
      placeholderMessages: ["Building the calculator"],
      title: "ROI calculator",
    });
    await flushSandboxImport();

    expect(screen.getByText("Building the calculator")).toBeTruthy();
    expect(screen.queryByText("Streaming")).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates a preview sandbox after CSS and partial HTML are ready", async () => {
    renderTool({
      css: ".metric{color:var(--brand)}",
      cssComplete: true,
      generating: true,
      html: "<body><div>Streaming</div>",
      htmlComplete: false,
      title: "ROI calculator",
    });
    await flushSandboxImport();

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0]?.[1].frameContent).toBe("<head></head><body></body>");

    await resolveSandboxReady();
    expect(mockRun.mock.calls.some(([code]) => String(code).includes("document.head.innerHTML"))).toBe(true);
    expect(mockRun.mock.calls.some(([code]) => String(code).includes("Idiomorph.morph(document.body"))).toBe(true);
  });

  it("creates the final sandbox after htmlComplete with frozen VW_DATA in frameContent", async () => {
    const { rerender } = renderTool({
      css: ".metric{color:var(--brand)}",
      cssComplete: true,
      generating: true,
      html: "<body><div>Streaming</div>",
      htmlComplete: false,
      title: "ROI calculator",
    });
    await flushSandboxImport();
    expect(mockCreate).toHaveBeenCalledTimes(1);

    resetSandboxPromise();
    rerender(
      <SandboxToolRenderer
        content={{
          css: ".metric{color:var(--brand)}",
          cssComplete: true,
          generating: false,
          html: '<head></head><body><div id="final">Done</div></body>',
          htmlComplete: true,
          title: "ROI calculator",
        }}
        data={{ score: 88 }}
        dataReady
        functions={{ prefillPrompt: vi.fn() }}
      />,
    );
    await flushSandboxImport();

    expect(mockDestroy).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledTimes(2);
    const frameContent = mockCreate.mock.calls[1]?.[1].frameContent ?? "";
    expect(frameContent).toContain('window.VW_DATA = Object.freeze({"score":88})');
    expect(frameContent).toContain('<div id="final">Done</div>');
  });

  it("waits for dataReady before creating the final sandbox", async () => {
    const content: SandboxToolContent = {
      css: ".metric{color:var(--brand)}",
      cssComplete: true,
      generating: false,
      html: '<head></head><body><div id="final">Done</div></body>',
      htmlComplete: true,
      title: "ROI calculator",
    };
    const { rerender } = renderTool(content, { data: null, dataReady: false });
    await flushSandboxImport();

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0]?.[1].frameContent).toBe("<head></head><body></body>");

    resetSandboxPromise();
    rerender(
      <SandboxToolRenderer
        content={content}
        data={{ account: "notion.so" }}
        dataReady
        functions={{ prefillPrompt: vi.fn() }}
      />,
    );
    await flushSandboxImport();

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockCreate.mock.calls[1]?.[1].frameContent).toContain('"account":"notion.so"');
  });

  it("runs jsFunctions before jsExpressions and keeps expression order", async () => {
    renderTool(
      {
        css: ".metric{color:var(--brand)}",
        cssComplete: true,
        generating: false,
        html: "<head></head><body></body>",
        htmlComplete: true,
        jsExpressions: ["renderOne()", "renderTwo()"],
        jsExpressionsComplete: true,
        jsFunctions: "function renderOne(){} function renderTwo(){}",
        jsFunctionsComplete: true,
      },
      { data: {}, dataReady: true },
    );
    await flushSandboxImport();
    await resolveSandboxReady();

    const interestingCalls = mockRun.mock.calls
      .map(([code]) => String(code))
      .filter((code) => code.includes("renderOne") || code === "renderTwo()");

    expect(interestingCalls).toEqual([
      "function renderOne(){} function renderTwo(){}",
      "renderOne()",
      "renderTwo()",
    ]);
  });

  it("ignores not-yet-laid-out and foreign resize reports, applies real ones", async () => {
    renderTool(
      {
        generating: false,
        html: "<head></head><body></body>",
        htmlComplete: true,
        initialHeight: 200,
      },
      { data: {}, dataReady: true },
    );
    await flushSandboxImport();
    await resolveSandboxReady();

    const frameContainer = mockIframe.parentElement as HTMLElement;
    expect(frameContainer.style.height).toBe("200px");

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { height: 1, type: RESIZE_MESSAGE_TYPE },
          source: mockIframe.contentWindow,
        }),
      );
    });
    expect(frameContainer.style.height).toBe("200px");

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { height: 882, type: RESIZE_MESSAGE_TYPE },
          source: mockIframe.contentWindow,
        }),
      );
    });
    expect(frameContainer.style.height).toBe("882px");

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { height: 999999, type: RESIZE_MESSAGE_TYPE },
          source: window,
        }),
      );
    });
    expect(frameContainer.style.height).toBe("882px");
  });

  it("exports clampReportedHeight", () => {
    expect(clampReportedHeight(49.2)).toBe(50);
    expect(clampReportedHeight(4001)).toBe(4000);
    expect(clampReportedHeight(420.2)).toBe(421);
    expect(clampReportedHeight(Number.NaN)).toBeNull();
    expect(clampReportedHeight("420")).toBeNull();
  });

  it("throttles non-milestone streaming updates", async () => {
    vi.useFakeTimers();
    const { rerender } = renderTool({
      css: ".metric{}",
      cssComplete: true,
      generating: true,
      html: "<body><div>One</div>",
      htmlComplete: false,
    });
    await flushSandboxImport();
    await resolveSandboxReady();

    rerender(
      <SandboxToolRenderer
        content={{
          css: ".metric{}",
          cssComplete: true,
          generating: true,
          html: "<body><div>Two</div>",
          htmlComplete: false,
        }}
        dataReady
        functions={{ prefillPrompt: vi.fn() }}
      />,
    );

    expect(mockRun.mock.calls.some(([code]) => String(code).includes("Two"))).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(THROTTLE_MS);
    });
    await flushSandboxImport();

    expect(mockRun.mock.calls.some(([code]) => String(code).includes("Two"))).toBe(true);
  });
});
