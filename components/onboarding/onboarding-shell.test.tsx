import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs", () => ({
  SignOutButton: ({ children }: { children: ReactNode }) => children,
}));

import { OnboardingHeader } from "./onboarding-shell";

describe("OnboardingHeader", () => {
  it("offers sign out once a workspace session is open", () => {
    const html = renderToStaticMarkup(
      <OnboardingHeader phase={0} showLedger credits={20} email="ada@acme.com" signedIn />
    );
    expect(html).toContain("Sign out");
    expect(html).toContain("ada@acme.com");
  });

  it("hides sign out on the signed-out preview", () => {
    const html = renderToStaticMarkup(
      <OnboardingHeader phase={0} showLedger={false} credits={20} email="preview@example.com" />
    );
    expect(html).not.toContain("Sign out");
  });
});
