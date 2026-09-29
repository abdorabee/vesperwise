import Link from "next/link";
import VesperWiseLogo from "@/components/vesperwise-logo";
import { CookieSettingsButton } from "@/components/cookie-settings-button";

type FooterLink = { label: string; href: string };

const FOOTER_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "How scoring works", href: "/#product" },
      { label: "Sample score", href: "/#score-section" },
      { label: "Watchlist", href: "/watchlist" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "API reference", href: "/docs" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Pricing", href: "/pricing" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "DPA", href: "/legal/dpa" },
      { label: "Security", href: "/legal/security" },
    ],
  },
];

const SOCIAL_LINKS: { label: string; href: string }[] = [
  { label: "LinkedIn", href: "https://www.linkedin.com/company/vesperwise" },
];

function FooterLinkItem({ label, href }: FooterLink) {
  if (href.startsWith("/")) {
    return (
      <li>
        <Link href={href}>{label}</Link>
      </li>
    );
  }
  return (
    <li>
      <a href={href}>{label}</a>
    </li>
  );
}

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="brand" aria-label="VesperWise home">
              <VesperWiseLogo className="logo" size={42} variant="wordmark" />
            </Link>
            <p>
              B2B intent scoring for sales teams that close. From $29/mo. Built in Cairo.
            </p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title} className="footer-col">
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((link) => (
                  <FooterLinkItem key={link.label} {...link} />
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>© {year} VesperWise. All rights reserved.</span>
          <div className="links">
            {SOCIAL_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {label}
              </a>
            ))}
            <CookieSettingsButton />
          </div>
        </div>
      </div>
    </footer>
  );
}
