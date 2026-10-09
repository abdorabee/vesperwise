"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useSyncExternalStore } from "react";
import posthog from "posthog-js";

import { readCookieConsent, subscribeCookieConsent } from "@/lib/cookie-consent";
import { posthogApiHost, posthogProjectKey } from "@/lib/product-analytics";

function startCapturing(key: string) {
  if (!posthog.__loaded) {
    posthog.init(key, {
      api_host: posthogApiHost(),
      person_profiles: "identified_only",
    });
  } else {
    posthog.set_config({
      advanced_disable_feature_flags: false,
      advanced_disable_flags: false,
    });
  }
  if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
}

function stopCapturing() {
  if (!posthog.__loaded) return;
  posthog.opt_out_capturing();
  // reset() always reloads feature flags. Turn that off before it can leave the browser.
  posthog.set_config({
    advanced_disable_feature_flags: true,
    advanced_disable_flags: true,
  });
  posthog.reset();
  // reset() clears stored consent and returns to the default, which captures.
  posthog.opt_out_capturing();
}

/** Loads PostHog Cloud only after the visitor accepts analytics cookies. */
export function PostHogAnalytics() {
  const key = posthogProjectKey();
  const consent = useSyncExternalStore(subscribeCookieConsent, readCookieConsent, () => null);
  const { isLoaded, userId } = useAuth();
  const identifiedId = useRef<string | null>(null);

  useEffect(() => {
    if (!key) return;
    if (consent === "granted") startCapturing(key);
    else stopCapturing();
  }, [consent, key]);

  useEffect(() => {
    if (!key || consent !== "granted" || !isLoaded || !posthog.__loaded || posthog.has_opted_out_capturing()) {
      if (consent !== "granted") identifiedId.current = null;
      return;
    }
    if (!userId || identifiedId.current === userId) return;
    posthog.identify(userId);
    identifiedId.current = userId;
  }, [consent, isLoaded, key, userId]);

  if (!key) return null;
  return null;
}
