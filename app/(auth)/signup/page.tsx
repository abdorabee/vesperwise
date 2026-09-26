import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Sign Up — Start Free",
  description:
    "Create your free VesperWise account. 20 credits, no credit card required.",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return <SignupForm />;
}
