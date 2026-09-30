export const AUTH_FORM_CSS = `
  .auth-form-shell {
    width: 100%;
    max-width: 380px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .auth-avatar-wrap {
    width: 200px;
    height: 200px;
    margin: 0 auto 8px;
    pointer-events: none;
  }
  .auth-avatar,
  .auth-avatar .bs-avatar,
  .auth-avatar .bs-avatar__svg {
    width: 200px !important;
    height: 200px !important;
  }
  .auth-form-card {
    width: 100%;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 14px;
    box-shadow: var(--shadow-md);
    padding: 30px;
  }
  .auth-form-header {
    margin-bottom: 22px;
  }
  .auth-form-header h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 650;
    color: var(--foreground);
    letter-spacing: -0.025em;
  }
  .auth-form-header p {
    margin: 8px 0 0;
    color: var(--muted-foreground);
    font-size: 14px;
    line-height: 1.5;
  }
  .auth-form-stack {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .auth-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .auth-field label {
    color: var(--foreground);
    font-size: 13px;
    font-weight: 500;
  }
  .auth-field-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .auth-password-wrap {
    position: relative;
  }
  .auth-password-wrap input {
    padding-right: 52px;
  }
  .auth-password-toggle {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 44px;
    height: 44px;
    background: none;
    border: 0;
    color: var(--muted-foreground);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .auth-password-toggle:hover {
    color: var(--foreground);
  }
  .auth-field-error,
  .auth-global-error {
    margin: 0;
    color: var(--destructive);
    font-size: 12px;
    line-height: 1.4;
  }
  .auth-global-error {
    text-align: center;
  }
  .auth-oauth {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .auth-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--muted-foreground);
    font-size: 12px;
  }
  .auth-divider::before,
  .auth-divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--border);
  }
  .auth-form-footer {
    margin-top: 18px;
    text-align: center;
    color: var(--muted-foreground);
    font-size: 13px;
  }
  .auth-form-footer a {
    color: var(--brand-active);
    font-weight: 500;
    text-decoration: none;
  }
  .auth-form-footer a:hover {
    text-decoration: underline;
  }
  .auth-form-caption {
    text-align: center;
    font-size: 11px;
    color: var(--muted-foreground);
    margin: 16px 0 0;
    font-family: var(--font-sans);
    letter-spacing: 0.06em;
  }
  .auth-text-button {
    background: none;
    border: 0;
    min-width: 44px;
    min-height: 44px;
    margin: -12px -8px;
    padding: 0 8px;
    color: var(--brand-active);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .auth-text-button:hover {
    text-decoration: underline;
  }
  @media (max-width: 768px) {
    .auth-avatar-wrap,
    .auth-avatar,
    .auth-avatar .bs-avatar,
    .auth-avatar .bs-avatar__svg {
      width: 104px !important;
      height: 104px !important;
    }
    .auth-avatar-wrap {
      margin-bottom: 0;
    }
    .auth-form-card {
      padding: 24px;
    }
    .auth-form-header {
      margin-bottom: 18px;
    }
  }
  @media (max-width: 768px) and (max-height: 740px) {
    .auth-avatar-wrap {
      display: none;
    }
    .auth-form-stack {
      gap: 12px;
    }
  }
`;
