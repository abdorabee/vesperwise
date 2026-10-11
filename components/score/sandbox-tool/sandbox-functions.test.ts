// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSandboxFunctions } from "./sandbox-functions";

describe("createSandboxFunctions", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("validates and trims prefillPrompt text without sending a message", async () => {
    const onPrefillPrompt = vi.fn();
    const functions = createSandboxFunctions({
      allowedDomains: ["notion.so"],
      onOpenAccount: vi.fn(),
      onPrefillPrompt,
    });

    await expect(functions.prefillPrompt({ text: "  Draft this  " })).resolves.toEqual({ ok: true });

    expect(onPrefillPrompt).toHaveBeenCalledWith("Draft this");
  });

  it("rejects too-long prefillPrompt text", async () => {
    const functions = createSandboxFunctions({
      allowedDomains: [],
      onOpenAccount: vi.fn(),
      onPrefillPrompt: vi.fn(),
    });

    await expect(functions.prefillPrompt({ text: "x".repeat(4001) })).rejects.toThrow(/prefillPrompt: invalid arguments/);
  });

  it("opens only allowed account domains case-insensitively", async () => {
    const onOpenAccount = vi.fn();
    const functions = createSandboxFunctions({
      allowedDomains: ["Notion.so"],
      onOpenAccount,
      onPrefillPrompt: vi.fn(),
    });

    await expect(functions.openAccount({ domain: "NOTION.SO" })).resolves.toEqual({ ok: true });
    await expect(functions.openAccount({ domain: "linear.app" })).rejects.toThrow(/domain not allowed/);

    expect(onOpenAccount).toHaveBeenCalledWith("notion.so");
  });

  it("opens only https links in a new noopener noreferrer tab", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const functions = createSandboxFunctions({
      allowedDomains: [],
      onOpenAccount: vi.fn(),
      onPrefillPrompt: vi.fn(),
    });

    await expect(functions.openLink({ url: "http://example.com" })).rejects.toThrow(/https/);
    await expect(functions.openLink({ url: "https://example.com/path" })).resolves.toEqual({ ok: true });

    expect(open).toHaveBeenCalledWith("https://example.com/path", "_blank", "noopener,noreferrer");
  });

  it("rate limits each function to five calls per ten seconds", async () => {
    vi.useFakeTimers();
    const functions = createSandboxFunctions({
      allowedDomains: [],
      onOpenAccount: vi.fn(),
      onPrefillPrompt: vi.fn(),
    });

    for (let index = 0; index < 5; index += 1) {
      await expect(functions.prefillPrompt({ text: `Draft ${index}` })).resolves.toEqual({ ok: true });
    }
    await expect(functions.prefillPrompt({ text: "Draft 6" })).rejects.toThrow(/rate limit exceeded/);

    vi.advanceTimersByTime(10_001);
    await expect(functions.prefillPrompt({ text: "Draft 7" })).resolves.toEqual({ ok: true });
  });
});
