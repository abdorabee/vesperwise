"use client";

import { useSyncExternalStore } from "react";

export type ModKey = "⌘" | "Ctrl";

const APPLE_PLATFORM = /mac|iphone|ipad|ipod/i;

/** The shortcut modifier label for a platform string (`navigator.platform`). */
export function modKeyFor(platform: string): ModKey {
  return APPLE_PLATFORM.test(platform) ? "⌘" : "Ctrl";
}

/** Display form of a shortcut: "Ctrl K" or "⌘K". */
export function shortcutLabel(modKey: ModKey, key: string): string {
  return modKey === "⌘" ? `⌘${key}` : `Ctrl ${key}`;
}

interface NavigatorWithUserAgentData extends Navigator {
  userAgentData?: { platform?: string };
}

function readPlatform(): string {
  const nav = navigator as NavigatorWithUserAgentData;
  return nav.userAgentData?.platform ?? nav.platform ?? "";
}

const subscribeNever = () => () => {};
const readModKey = (): ModKey => modKeyFor(readPlatform());
const readServerModKey = (): ModKey => "Ctrl";

/**
 * Modifier key label for shortcut hints. The server snapshot is "Ctrl", which React also uses
 * for the hydration render, so markup matches; it then switches to "⌘" on Apple platforms.
 */
export function useModKey(): ModKey {
  return useSyncExternalStore(subscribeNever, readModKey, readServerModKey);
}
