import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SignupSSOCallbackPage() {
  return (
    <AuthenticateWithRedirectCallback
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    />
  );
}
