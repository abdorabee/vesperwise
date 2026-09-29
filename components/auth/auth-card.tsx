"use client";

import type { ReactNode } from "react";

import VesperWiseLogo from "@/components/vesperwise-logo";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  caption,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  caption?: string;
}) {
  return (
    <div className="auth-form-shell">
      <div className="auth-mark">
        <VesperWiseLogo size={36} />
      </div>
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

export function AuthFieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="auth-field-error">{message}</p>;
}

export function AuthGlobalError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="auth-global-error">{message}</p>;
}
