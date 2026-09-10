import type { ReactNode } from "react";

/**
 * The repeating Settings primitive: label + help on the left, control on the
 * right, stacking to one column on narrow viewports. Same shape as
 * components/billing/billing-danger-zone.tsx's rows.
 */
export function SettingsRow({
  label,
  help,
  htmlFor,
  badge,
  error,
  children,
}: {
  label: string;
  help?: string;
  /** Set when the control is a single labelable input. */
  htmlFor?: string;
  badge?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="set-row">
      <div className="set-row-l">
        <div className="set-row-label">
          {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span>{label}</span>}
          {badge}
        </div>
        {help && <p className="set-row-help">{help}</p>}
        {error && (
          <p role="alert" className="set-row-error">
            {error}
          </p>
        )}
      </div>
      <div className="set-row-c">{children}</div>
    </div>
  );
}

export function SettingsCard({
  title,
  sub,
  actions,
  children,
}: {
  title: string;
  sub?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card set-card">
      <div className="card-head">
        <div>
          <div className="card-title">{title}</div>
          {sub && <div className="card-sub">{sub}</div>}
        </div>
        {actions && <div className="card-actions">{actions}</div>}
      </div>
      <div className="card-body">{children}</div>
    </section>
  );
}
