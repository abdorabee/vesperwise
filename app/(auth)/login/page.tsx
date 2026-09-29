import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to VesperWise to score companies by purchase intent.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginForm />;
}
