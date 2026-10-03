import { describe, expect, it } from "vitest";

import {
  isTregFallbackEnabled,
  isTregFallbackSignalKey,
  isTregSignalPromoted,
  isTregSource,
  parsePromotedSignals,
  shouldFallBackToTreg,
  TREG_FALLBACK_SIGNAL_KEYS,
  TREG_FALLBACK_TIMEOUT_MS,
  TREG_SOURCE_PREFIX,
  type TregFallbackSignalKey,
} from "./treg-fallback";
import type { SignalStatus } from "@/lib/types";

const promotionCases: Array<[
  string,
  TregFallbackSignalKey,
  Record<string, string | undefined>,
  boolean,
]> = [
  [
    "keeps shadow mode by default even when the signal is listed",
    "funding",
    { TREG_FALLBACK_SHADOW_MODE: undefined, TREG_PROMOTED_SIGNALS: "funding" },
    false,
  ],
  [
    "keeps the global switch from promoting an empty list",
    "funding",
    { TREG_FALLBACK_SHADOW_MODE: "false", TREG_PROMOTED_SIGNALS: "" },
    false,
  ],
  [
    "promotes listed keys only when shadow mode is explicitly false",
    "hiring",
    { TREG_FALLBACK_SHADOW_MODE: "false", TREG_PROMOTED_SIGNALS: "funding,hiring" },
    true,
  ],
  [
    "does not promote keys missing from the allowlist",
    "news",
    { TREG_FALLBACK_SHADOW_MODE: "false", TREG_PROMOTED_SIGNALS: "funding,hiring" },
    false,
  ],
  [
    "treats shadow mode as case-sensitive",
    "funding",
    { TREG_FALLBACK_SHADOW_MODE: "FALSE", TREG_PROMOTED_SIGNALS: "funding" },
    false,
  ],
];

describe("treg fallback policy", () => {
  it("exports the fallback constants used by callers", () => {
    expect(TREG_FALLBACK_TIMEOUT_MS).toBe(8_000);
    expect(TREG_FALLBACK_SIGNAL_KEYS).toEqual([
      "funding",
      "hiring",
      "news",
      "technology",
      "firmographics",
    ]);
    expect(TREG_SOURCE_PREFIX).toBe("treg-");
  });

  it.each([
    ["treg-people-search", true],
    ["  TREG-news  ", true],
    ["explorium-events", false],
    ["pretreg-news", false],
    ["", false],
    [null, false],
    [undefined, false],
  ])("detects treg source prefix for %s", (source, expected) => {
    expect(isTregSource(source)).toBe(expected);
  });

  it.each([
    ["funding", true],
    ["hiring", true],
    ["news", true],
    ["technology", true],
    ["firmographics", true],
    ["web_activity", false],
    ["FUNDING", false],
    [" funding ", false],
  ])("checks whether %s is a fallback signal key", (value, expected) => {
    expect(isTregFallbackSignalKey(value)).toBe(expected);
  });

  it.each([
    [{ TREG_TOKEN: "token", MOCK_SIGNALS: undefined }, true],
    [{ TREG_TOKEN: " token ", MOCK_SIGNALS: "false" }, true],
    [{ TREG_TOKEN: "", MOCK_SIGNALS: undefined }, false],
    [{ TREG_TOKEN: "   ", MOCK_SIGNALS: undefined }, false],
    [{ TREG_TOKEN: undefined, MOCK_SIGNALS: undefined }, false],
    [{ TREG_TOKEN: "token", MOCK_SIGNALS: "true" }, false],
    [{ TREG_TOKEN: "token", MOCK_SIGNALS: "TRUE" }, true],
  ])("enables fallback only with a non-blank token and without mock signals %#", (env, expected) => {
    expect(isTregFallbackEnabled(env)).toBe(expected);
  });

  it.each([
    [undefined, []],
    ["", []],
    [" funding, hiring,unknown,NEWS,hiring, technology , firmographics ", [
      "funding",
      "hiring",
      "news",
      "technology",
      "firmographics",
    ]],
    ["unknown,web_activity", []],
    ["FUNDING,funding,Funding", ["funding"]],
  ])("parses promoted signals from %s", (value, expected) => {
    expect(parsePromotedSignals(value)).toEqual(expected);
  });

  it.each(promotionCases)(
    "%s",
    (
      _caseName,
      key: TregFallbackSignalKey,
      env: Record<string, string | undefined>,
      expected,
    ) => {
      expect(isTregSignalPromoted(key, env)).toBe(expected);
    },
  );

  it.each([
    ["unavailable", true],
    ["not_found", true],
    ["ok", false],
    ["no_signal", false],
    ["stale", false],
    [undefined, false],
  ])("falls back to treg only for unavailable or not_found status: %s", (status, expected) => {
    expect(shouldFallBackToTreg(status as SignalStatus | undefined)).toBe(expected);
  });
});
