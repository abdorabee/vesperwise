import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function LoginSSOCallbackPage() {
  return (
    <AuthenticateWithRedirectCallback
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    />
  );
}
