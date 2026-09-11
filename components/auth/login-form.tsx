"use client";

import { useClerk, useSignIn } from "@clerk/nextjs";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type FormEvent } from "react";

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

type Step = "credentials" | "forgot-code" | "forgot-password" | "mfa";

function LoginFormInner() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const clerk = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  const avatar = useAuthAvatar();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<Step>("credentials");
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState(
    searchParams.get("email") ? "That email already has an account. Sign in instead." : null
  );

  const strategies = useMemo(() => socialStrategiesFromClerk(clerk), [clerk]);
  const busy = fetchStatus === "fetching";
  const identifierError = fieldError(errors, "identifier") ?? fieldError(errors, "emailAddress");
  const passwordError = fieldError(errors, "password");
  const codeError = fieldError(errors, "code");
  const hookError = globalError(errors);

  const title =
    step === "forgot-code"
      ? "Check your email"
      : step === "forgot-password"
        ? "Set a new password"
        : step === "mfa"
          ? "Verify it’s you"
          : "Sign in";

  const subtitle =
    step === "forgot-code"
      ? "Enter the reset code we sent you."
      : step === "forgot-password"
        ? "Choose a new password for your account."
        : step === "mfa"
          ? "Enter the verification code to continue."
          : "Welcome back. Continue to your workspace.";

  function fail(message?: string | null) {
    if (message) setLocalError(message);
    avatar.setError(true);
  }

  async function afterAuthComplete() {
    if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
      const factors = signIn.supportedSecondFactors ?? [];
      const hasEmail = factors.some((factor) => factor.strategy === "email_code");
      if (hasEmail) {
        const { error } = await signIn.mfa.sendEmailCode();
        if (error) {
          fail(error.message);
          return;
        }
      }
      setStep("mfa");
      setCode("");
      return;
    }

    if (signIn.status === "complete") {
      avatar.setSuccess(true);
      const error = await finalizeToDashboard((params) => signIn.finalize(params), router);
      if (error) fail(error.message);
    }
  }

  async function onOauth(strategy: `oauth_${string}`) {
    setLocalError(null);
    const { error } = await signIn.sso({
      strategy: strategy as "oauth_google",
      redirectUrl: "/dashboard",
      redirectCallbackUrl: "/login/sso-callback",
    });
    if (error) fail(error.message);
  }

  async function onPasswordSignIn(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    setNotice(null);
    const { error } = await signIn.password({ identifier: email, password });
    if (error) {
      fail(error.message);
      return;
    }
    await afterAuthComplete();
  }

  async function onForgot() {
    setLocalError(null);
    if (!email) {
      fail("Enter your email so we can send a reset code.");
      return;
    }
    const created = await signIn.create({ identifier: email });
    if (created.error) {
      fail(created.error.message);
      return;
    }
    const sent = await signIn.resetPasswordEmailCode.sendCode();
    if (sent.error) {
      fail(sent.error.message);
      return;
    }
    setStep("forgot-code");
    setCode("");
  }

  async function onVerifyResetCode(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code });
    if (error) {
      fail(error.message);
      return;
    }
    setStep("forgot-password");
    setNewPassword("");
  }

  async function onSubmitNewPassword(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    const { error } = await signIn.resetPasswordEmailCode.submitPassword({
      password: newPassword,
    });
    if (error) {
      fail(error.message);
      return;
    }
    await afterAuthComplete();
  }

  async function onVerifyMfa(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    const factors = signIn.supportedSecondFactors ?? [];
    const hasTotp = factors.some((factor) => factor.strategy === "totp");
    const result = hasTotp
      ? await signIn.mfa.verifyTOTP({ code })
      : await signIn.mfa.verifyEmailCode({ code });
    if (result.error) {
      fail(result.error.message);
      return;
    }
    await afterAuthComplete();
  }

  return (
    <AuthCard
      target={avatar.target}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          Don&apos;t have an account? <Link href="/signup">Sign up</Link>
        </>
      }
    >
      <style>{AUTH_FORM_CSS}</style>
      {step === "credentials" ? (
        <form className="auth-form-stack" onSubmit={onPasswordSignIn}>
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

          <div className="auth-field">
            <label htmlFor="login-email">Email</label>
            <Input
              id="login-email"
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
            <AuthFieldError message={identifierError} />
          </div>

          <div className="auth-field">
            <div className="auth-field-row">
              <label htmlFor="login-password">Password</label>
              <button type="button" className="auth-text-button" onClick={onForgot}>
                Forgot password?
              </button>
            </div>
            <div className="auth-password-wrap">
              <Input
                id="login-password"
                type={avatar.passwordVisible ? "text" : "password"}
                autoComplete="current-password"
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
            <AuthFieldError message={passwordError} />
          </div>

          <AuthGlobalError message={localError ?? hookError} />
          {notice ? <p className="auth-form-caption" style={{ marginTop: 0 }}>{notice}</p> : null}

          <Button
            type="submit"
            disabled={busy}
            className="h-[42px] w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {busy ? "Signing in…" : "Continue"}
          </Button>
        </form>
      ) : null}

      {step === "forgot-code" ? (
        <form className="auth-form-stack" onSubmit={onVerifyResetCode}>
          <div className="auth-field">
            <label htmlFor="reset-code">Reset code</label>
            <Input
              id="reset-code"
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
            <AuthFieldError message={codeError} />
          </div>
          <AuthGlobalError message={localError ?? hookError} />
          <Button
            type="submit"
            disabled={busy}
            className="h-[42px] w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {busy ? "Checking…" : "Verify code"}
          </Button>
          <button type="button" className="auth-text-button" onClick={() => setStep("credentials")}>
            Back to sign in
          </button>
        </form>
      ) : null}

      {step === "forgot-password" ? (
        <form className="auth-form-stack" onSubmit={onSubmitNewPassword}>
          <div className="auth-field">
            <label htmlFor="new-password">New password</label>
            <div className="auth-password-wrap">
              <Input
                id="new-password"
                type={avatar.passwordVisible ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                required
                className="h-[42px] rounded-[14px] border-white/10 bg-white/[0.055] text-[#f7f8f8]"
                {...avatar.watch("password")}
                onChange={(event) => {
                  setNewPassword(event.target.value);
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
            <AuthFieldError message={passwordError} />
          </div>
          <AuthGlobalError message={localError ?? hookError} />
          <Button
            type="submit"
            disabled={busy}
            className="h-[42px] w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {busy ? "Saving…" : "Update password"}
          </Button>
        </form>
      ) : null}

      {step === "mfa" ? (
        <form className="auth-form-stack" onSubmit={onVerifyMfa}>
          <div className="auth-field">
            <label htmlFor="mfa-code">Verification code</label>
            <Input
              id="mfa-code"
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
            <AuthFieldError message={codeError} />
          </div>
          <AuthGlobalError message={localError ?? hookError} />
          <Button
            type="submit"
            disabled={busy}
            className="h-[42px] w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {busy ? "Verifying…" : "Verify"}
          </Button>
        </form>
      ) : null}
    </AuthCard>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={<div className="auth-form-shell" style={{ minHeight: 360 }} />}>
      <LoginFormInner />
    </Suspense>
  );
}
