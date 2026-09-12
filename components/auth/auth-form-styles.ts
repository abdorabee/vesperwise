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
    background: rgba(20,20,22,0.82);
    backdrop-filter: blur(28px) saturate(180%);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 24px;
    box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 40px 110px -30px rgba(0,0,0,0.9);
    padding: 30px;
  }
  .auth-form-header {
    margin-bottom: 22px;
  }
  .auth-form-header h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 650;
    color: #f7f8f8;
    letter-spacing: 0;
  }
  .auth-form-header p {
    margin: 8px 0 0;
    color: #a8afb9;
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
    color: #b4bbc8;
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
    padding-right: 44px;
  }
  .auth-password-toggle {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: 0;
    color: #8a8f98;
    cursor: pointer;
    padding: 4px;
    display: inline-flex;
  }
  .auth-password-toggle:hover {
    color: #f7f8f8;
  }
  .auth-field-error,
  .auth-global-error {
    margin: 0;
    color: #f87171;
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
    color: #62666d;
    font-size: 12px;
  }
  .auth-divider::before,
  .auth-divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.07);
  }
  .auth-form-footer {
    margin-top: 18px;
    text-align: center;
    color: #8a8f98;
    font-size: 13px;
  }
  .auth-form-footer a {
    color: #f7f8f8;
    font-weight: 500;
    text-decoration: none;
  }
  .auth-form-footer a:hover {
    text-decoration: underline;
  }
  .auth-form-caption {
    text-align: center;
    font-size: 11px;
    color: #62666d;
    margin: 16px 0 0;
    font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .auth-text-button {
    background: none;
    border: 0;
    padding: 0;
    color: #a8afb9;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
  }
  .auth-text-button:hover {
    text-decoration: underline;
  }
  @media (max-width: 768px) {
    .auth-avatar-wrap,
    .auth-avatar,
    .auth-avatar .bs-avatar,
    .auth-avatar .bs-avatar__svg {
      width: 160px !important;
      height: 160px !important;
    }
    .auth-avatar-wrap {
      margin-bottom: 4px;
    }
  }
`;
