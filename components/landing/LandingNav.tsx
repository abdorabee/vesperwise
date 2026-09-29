"use client";

import { useState } from "react";
import Link from "next/link";
import VesperWiseLogo from "@/components/vesperwise-logo";

const NAV_ITEMS = [
  { label: "Product", href: "/#product" },
  { label: "Score", href: "/#score-section" },
  { label: "Developers", href: "/docs" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Company", href: "/about" },
];

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="primary">
        <div className="row">
          <Link href="/" className="brand" aria-label="VesperWise home">
            <VesperWiseLogo className="logo" size={42} variant="wordmark" />
          </Link>

          {/* Homepage sections use plain anchors: next/link does not scroll to the hash from another page. */}
          <div className="nav-links">
            {NAV_ITEMS.map((item) => (
              <a key={item.href} className="nav-link" href={item.href}>{item.label}</a>
            ))}
          </div>

          <div className="nav-spacer" />

          {/* Hamburger — shown on mobile via CSS */}
          <button
            type="button"
            className="nav-mob-btn"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M3 5h14M3 10h14M3 15h14"/>
            </svg>
          </button>

          {/* Desktop CTAs */}
          <a href="/login" className="btn btn-ghost">Log in</a>
          <a href="/signup" className="btn btn-secondary">
            Sign up
            <svg className="arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h6M7 4l2 2-2 2"/></svg>
          </a>
        </div>
      </nav>

      {/* Mobile nav overlay */}
      {open && (
        <div
          className="nav-mob-overlay"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        >
          <div
            className="nav-mob-drawer"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-label="Navigation menu"
          >
            {/* Close button */}
            <button
              type="button"
              className="nav-mob-close"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M2 2l12 12M14 2L2 14"/>
              </svg>
            </button>

            {/* Brand in drawer */}
            <Link href="/" className="brand" style={{ marginBottom: "16px" }} aria-label="VesperWise home">
              <VesperWiseLogo className="logo" size={42} variant="wordmark" />
            </Link>

            {/* Nav links */}
            {NAV_ITEMS.map(item => (
              <a
                key={item.href}
                href={item.href}
                className="nav-mob-link"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}

            {/* CTAs */}
            <a href="/login" className="btn btn-ghost nav-mob-cta" onClick={() => setOpen(false)}>
              Log in
            </a>
            <a href="/signup" className="btn btn-accent btn-lg nav-mob-cta" onClick={() => setOpen(false)}>
              Start free
              <svg className="arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h6M7 4l2 2-2 2"/></svg>
            </a>
          </div>
        </div>
      )}
    </>
  );
}
