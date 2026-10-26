"use client";

import { useAuth } from "@clerk/nextjs";

/** Server snapshot until Clerk has loaded the browser session. */
export function useMarketingSignedIn(serverSignedIn = false): boolean {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return serverSignedIn;
  return isSignedIn === true;
}
