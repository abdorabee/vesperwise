"use client";

import type { ReactNode } from "react";

import { AuthAvatar } from "./auth-avatar";
import type { AuthAvatarTarget } from "./resolve-auth-avatar-target";

export function AuthCard({
  target,
  title,
  subtitle,
  children,
  footer,
  caption,
}: {
  target: AuthAvatarTarget;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  caption?: string;
}) {
  return (
    <div className="auth-form-shell">
      <AuthAvatar target={target} />
      <div className="auth-form-card">
        <div className="auth-form-header">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {children}
        {footer ? <div className="auth-form-footer">{footer}</div> : null}
      </div>
      {caption ? <p className="auth-form-caption">{caption}</p> : null}
    </div>
  );
}

/** Field-level error. Pair `id` with the input's aria-describedby. */
export function AuthFieldError({ id, message }: { id: string; message?: string | null }) {
  if (!message) return null;
  return <p id={id} className="auth-field-error" role="alert">{message}</p>;
}

export function AuthGlobalError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="auth-global-error" role="alert">{message}</p>;
}
