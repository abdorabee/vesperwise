"use client";

import { useState } from "react";
import Link from "next/link";
import VesperWiseLogo from "@/components/vesperwise-logo";

export const MARKETING_LINKS = [
  { label: "Product", href: "/#product" },
  { label: "Score", href: "/#score-section" },
  { label: "Developers", href: "/docs" },
  { label: "Pricing", href: "/pricing" },
  { label: "Company", href: "/about" },
] as const;

export default function MarketingNav({
  current,
  stickyTop = 0,
}: {
  current?: (typeof MARKETING_LINKS)[number]["label"];
  stickyTop?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="primary" style={{ top: stickyTop }}>
        <div className="row">
          <Link href="/" className="brand" aria-label="VesperWise home">
            <VesperWiseLogo className="logo" size={42} variant="wordmark" />
          </Link>
          <div className="nav-links">
            {MARKETING_LINKS.map((item) => (
              <a
                key={item.href}
                className="nav-link"
                href={item.href}
                aria-current={item.label === current ? "page" : undefined}
                style={item.label === current ? { color: "var(--text-primary)" } : undefined}
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="nav-spacer" />
          <button
            type="button"
            className="nav-mob-btn"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          </button>
          <a href="/login" className="btn btn-ghost">Log in</a>
          <a href="/signup" className="btn btn-accent">Start free</a>
        </div>
      </nav>
      {open ? (
        <div className="nav-mob-overlay" onClick={() => setOpen(false)} aria-label="Close navigation">
          <div
            className="nav-mob-drawer"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Navigation menu"
          >
            <button type="button" className="nav-mob-close" onClick={() => setOpen(false)} aria-label="Close menu">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M2 2l12 12M14 2L2 14" />
              </svg>
            </button>
            <Link href="/" className="brand" style={{ marginBottom: 16 }} aria-label="VesperWise home">
              <VesperWiseLogo className="logo" size={42} variant="wordmark" />
            </Link>
            {MARKETING_LINKS.map((item) => (
              <a key={item.href} href={item.href} className="nav-mob-link" onClick={() => setOpen(false)}>
                {item.label}
              </a>
            ))}
            <a href="/login" className="btn btn-ghost nav-mob-cta" onClick={() => setOpen(false)}>Log in</a>
            <a href="/signup" className="btn btn-accent btn-lg nav-mob-cta" onClick={() => setOpen(false)}>Start free</a>
          </div>
        </div>
      ) : null}
    </>
  );
}
