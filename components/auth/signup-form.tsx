"use client";

import { useClerk, useSignUp } from "@clerk/nextjs";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { AuthCard, AuthFieldError, AuthGlobalError } from "./auth-card";
import { AUTH_FORM_CSS } from "./auth-form-styles";
import {
  fieldError,
  finalizeToDashboard,
  globalError,
  oauthLabel,
  socialStrategiesFromClerk,
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
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              required
              className="h-[42px] rounded-[14px] border-white/10 bg-white/[0.055] text-[#f7f8f8]"
              {...avatar.watch("code")}
              onChange={(event) => {
                setCode(event.target.value);
                avatar.watch("code").onChange(event);
              }}
            />
            <AuthFieldError message={fieldError(errors, "code")} />
          </div>
          <AuthGlobalError message={localError ?? hookError} />
          <Button
            type="submit"
            disabled={busy}
            className="h-[42px] w-full rounded-full bg-[linear-gradient(180deg,#ecff58,#dfff00)] text-[#050505]"
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
                  className="h-[42px] w-full rounded-full border-white/10 bg-white/[0.055] text-[#f7f8f8] hover:bg-white/[0.08]"
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
                autoComplete="given-name"
                value={firstName}
                required
                className="h-[42px] rounded-[14px] border-white/10 bg-white/[0.055] text-[#f7f8f8]"
                {...avatar.watch("name")}
                onChange={(event) => {
                  setFirstName(event.target.value);
                  avatar.watch("name").onChange(event);
                }}
              />
              <AuthFieldError message={fieldError(errors, "firstName")} />
            </div>
          ) : null}

          {needsLastName ? (
            <div className="auth-field">
              <label htmlFor="signup-last-name">Last name</label>
              <Input
                id="signup-last-name"
                autoComplete="family-name"
                value={lastName}
                required
                className="h-[42px] rounded-[14px] border-white/10 bg-white/[0.055] text-[#f7f8f8]"
                {...avatar.watch("name")}
                onChange={(event) => {
                  setLastName(event.target.value);
                  avatar.watch("name").onChange(event);
                }}
              />
              <AuthFieldError message={fieldError(errors, "lastName")} />
            </div>
          ) : null}

          <div className="auth-field">
            <label htmlFor="signup-email">Email</label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              required
              className="h-[42px] rounded-[14px] border-white/10 bg-white/[0.055] text-[#f7f8f8]"
              {...avatar.watch("email")}
              onChange={(event) => {
                setEmail(event.target.value);
                avatar.watch("email").onChange(event);
              }}
            />
            <AuthFieldError message={fieldError(errors, "emailAddress")} />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-password">Password</label>
            <div className="auth-password-wrap">
              <Input
                id="signup-password"
                type={avatar.passwordVisible ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                required
                className="h-[42px] rounded-[14px] border-white/10 bg-white/[0.055] text-[#f7f8f8]"
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
            <AuthFieldError message={fieldError(errors, "password")} />
          </div>

          <div id="clerk-captcha" />
          <AuthGlobalError message={localError ?? hookError} />

          <Button
            type="submit"
            disabled={busy}
            className="h-[42px] w-full rounded-full bg-[linear-gradient(180deg,#ecff58,#dfff00)] text-[#050505] hover:bg-[linear-gradient(180deg,#ecff58,#dfff00)]"
          >
            {busy ? "Creating account…" : "Create account"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
