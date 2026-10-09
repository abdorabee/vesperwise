"use client";

import { useClerk, useSignUp } from "@clerk/nextjs";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { captureProductEvent } from "@/lib/product-analytics";

import { AuthCard, AuthFieldError, AuthGlobalError } from "./auth-card";
import { AUTH_FORM_CSS } from "./auth-form-styles";
import {
  fieldError,
  finalizeToDashboard,
  globalError,
  oauthLabel,
  socialStrategiesFromClerk,
  distinctGlobalError,
} from "./clerk-helpers";
import { useAuthAvatar } from "./use-auth-avatar";

export function SignupForm() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const clerk = useClerk();
  const router = useRouter();
  const avatar = useAuthAvatar();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const strategies = useMemo(() => socialStrategiesFromClerk(clerk), [clerk]);
  const busy = fetchStatus === "fetching";
  const needsFirstName = signUp.requiredFields.includes("first_name");
  const needsLastName = signUp.requiredFields.includes("last_name");

  const hookError = globalError(errors);

  const fieldMessages = ["code", "emailAddress", "firstName", "lastName", "password"].map((key) => fieldError(errors, key));

  function fail(message?: string | null) {
    if (message) setLocalError(message);
    avatar.setError(true);
  }

  async function onOauth(strategy: `oauth_${string}`) {
    setLocalError(null);
    const { error } = await signUp.sso({
      strategy: strategy as "oauth_google",
      redirectUrl: "/dashboard",
      redirectCallbackUrl: "/signup/sso-callback",
    });
    if (error) fail(error.message);
  }

  async function onSignUp(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);

    const { error } = await signUp.password({
      emailAddress: email,
      password,
      legalAccepted: true,
      ...(needsFirstName ? { firstName } : {}),
      ...(needsLastName ? { lastName } : {}),
    });

    if (error) {
      fail(error.message);
      return;
    }

    if (signUp.isTransferable) {
      router.push(`/login?email=${encodeURIComponent(email)}`);
      return;
    }

    if (signUp.status === "complete") {
      avatar.setSuccess(true);
      const finalizeError = await finalizeToDashboard((params) => signUp.finalize(params), router);
      if (finalizeError) fail(finalizeError.message);
      else captureProductEvent("signup_completed");
      return;
    }

    if (signUp.unverifiedFields.includes("email_address")) {
      const sent = await signUp.verifications.sendEmailCode();
      if (sent.error) {
        fail(sent.error.message);
        return;
      }
      setPendingVerification(true);
      setCode("");
    }
  }

  async function onVerify(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    const { error } = await signUp.verifications.verifyEmailCode({ code });
    const alreadyVerified = Boolean(error?.message && /already been verified/i.test(error.message));
    if (error && !alreadyVerified) {
      fail(error.message);
      return;
    }

    if (signUp.missingFields.includes("legal_accepted")) {
      const accepted = await signUp.update({ legalAccepted: true });
      if (accepted.error) {
        fail(accepted.error.message);
        return;
      }
    }

    if (signUp.status !== "complete" || !signUp.createdSessionId) {
      fail(
        signUp.missingFields.length > 0
          ? `Email verified. Still need: ${signUp.missingFields.join(", ")}.`
          : "Email verified, but Clerk did not create a session. Try signing in."
      );
      return;
    }

    avatar.setSuccess(true);
    const finalizeError = await finalizeToDashboard((params) => signUp.finalize(params), router);
    if (finalizeError) fail(finalizeError.message);
    else captureProductEvent("signup_completed");
  }

  return (
    <AuthCard
      target={avatar.target}
      title={pendingVerification ? "Check your email" : "Create your account"}
      subtitle={
        pendingVerification
          ? "Enter the verification code we sent you."
          : "Start scoring accounts in minutes."
      }
      caption="20 FREE CREDITS · NO CREDIT CARD"
      footer={
        pendingVerification ? null : (
          <>
            Already have an account? <Link href="/login">Sign in</Link>
          </>
        )
      }
    >
      <style>{AUTH_FORM_CSS}</style>
      {pendingVerification ? (
        <form className="auth-form-stack" onSubmit={onVerify}>
          <div className="auth-field">
            <label htmlFor="signup-code">Verification code</label>
            <Input
              id="signup-code"
              aria-invalid={!!fieldError(errors, "code")}
              aria-describedby={fieldError(errors, "code") ? "signup-code-error" : undefined}
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              required
              className="h-[42px] rounded-md border-input bg-background text-foreground"
              {...avatar.watch("code")}
              onChange={(event) => {
                setCode(event.target.value);
                avatar.watch("code").onChange(event);
              }}
            />
            <AuthFieldError id="signup-code-error" message={fieldError(errors, "code")} />
          </div>
          <AuthGlobalError message={distinctGlobalError(localError ?? hookError, fieldMessages)} />
          <Button
            type="submit"
            disabled={busy}
            className="h-[42px] w-full rounded-md bg-primary text-primary-foreground hover:bg-[var(--brand-hover)]"
          >
            {busy ? "Verifying…" : "Verify email"}
          </Button>
          <button
            type="button"
            className="auth-text-button"
            onClick={() => signUp.verifications.sendEmailCode()}
          >
            Resend code
          </button>
        </form>
      ) : (
        <form className="auth-form-stack" onSubmit={onSignUp}>
          {strategies.length > 0 ? (
            <div className="auth-oauth">
              {strategies.map((strategy) => (
                <Button
                  key={strategy}
                  type="button"
                  variant="outline"
                  className="h-[42px] w-full rounded-md border-border bg-background text-foreground hover:bg-muted"
                  disabled={busy}
                  onClick={() => onOauth(strategy)}
                >
                  Continue with {oauthLabel(strategy)}
                </Button>
              ))}
              <div className="auth-divider">or</div>
            </div>
          ) : null}

          {needsFirstName ? (
            <div className="auth-field">
              <label htmlFor="signup-first-name">First name</label>
              <Input
                id="signup-first-name"
                aria-invalid={!!fieldError(errors, "firstName")}
                aria-describedby={fieldError(errors, "firstName") ? "signup-first-name-error" : undefined}
                autoComplete="given-name"
                value={firstName}
                required
                className="h-[42px] rounded-md border-input bg-background text-foreground"
                {...avatar.watch("name")}
                onChange={(event) => {
                  setFirstName(event.target.value);
                  avatar.watch("name").onChange(event);
                }}
              />
              <AuthFieldError id="signup-first-name-error" message={fieldError(errors, "firstName")} />
            </div>
          ) : null}

          {needsLastName ? (
            <div className="auth-field">
              <label htmlFor="signup-last-name">Last name</label>
              <Input
                id="signup-last-name"
                aria-invalid={!!fieldError(errors, "lastName")}
                aria-describedby={fieldError(errors, "lastName") ? "signup-last-name-error" : undefined}
                autoComplete="family-name"
                value={lastName}
                required
                className="h-[42px] rounded-md border-input bg-background text-foreground"
                {...avatar.watch("name")}
                onChange={(event) => {
                  setLastName(event.target.value);
                  avatar.watch("name").onChange(event);
                }}
              />
              <AuthFieldError id="signup-last-name-error" message={fieldError(errors, "lastName")} />
            </div>
          ) : null}

          <div className="auth-field">
            <label htmlFor="signup-email">Email</label>
            <Input
              id="signup-email"
              aria-invalid={!!fieldError(errors, "emailAddress")}
              aria-describedby={fieldError(errors, "emailAddress") ? "signup-email-error" : undefined}
              type="email"
              autoComplete="email"
              value={email}
              required
              className="h-[42px] rounded-md border-input bg-background text-foreground"
              {...avatar.watch("email")}
              onChange={(event) => {
                setEmail(event.target.value);
                avatar.watch("email").onChange(event);
              }}
            />
            <AuthFieldError id="signup-email-error" message={fieldError(errors, "emailAddress")} />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-password">Password</label>
            <div className="auth-password-wrap">
              <Input
                id="signup-password"
                aria-invalid={!!fieldError(errors, "password")}
                aria-describedby={fieldError(errors, "password") ? "signup-password-error" : undefined}
                type={avatar.passwordVisible ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                required
                className="h-[42px] rounded-md border-input bg-background text-foreground"
                {...avatar.watch("password")}
                onChange={(event) => {
                  setPassword(event.target.value);
                  avatar.watch("password").onChange(event);
                }}
              />
              <button
                type="button"
                className="auth-password-toggle"
                aria-label={avatar.passwordVisible ? "Hide password" : "Show password"}
                onClick={() => avatar.setPasswordVisible(!avatar.passwordVisible)}
              >
                {avatar.passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <AuthFieldError id="signup-password-error" message={fieldError(errors, "password")} />
          </div>

          <div id="clerk-captcha" />
          <AuthGlobalError message={distinctGlobalError(localError ?? hookError, fieldMessages)} />

          <Button
            type="submit"
            disabled={busy}
            className="h-[42px] w-full rounded-md bg-primary text-primary-foreground hover:bg-[var(--brand-hover)]"
          >
            {busy ? "Creating account…" : "Create account"}
          </Button>
          {/* Covers the social sign-up buttons above too: any path that creates an account. */}
          <p className="auth-form-caption">
            By creating an account, you agree to our <Link href="/terms">Terms of Service</Link> and
            acknowledge our <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </form>
      )}
    </AuthCard>
  );
}
