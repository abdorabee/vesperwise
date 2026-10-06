import Link from "next/link";
import VesperWiseLogo from "@/components/vesperwise-logo";
import { CookieSettingsButton } from "@/components/cookie-settings-button";

type FooterLink = { label: string; href: string };

const FOOTER_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "How scoring works", href: "/#product" },
      { label: "Pricing", href: "/pricing" },
      { label: "Start free", href: "/signup" },
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
      { label: "Subprocessors", href: "/legal/subprocessors" },
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
              Buying-intent scores for B2B sales teams, with the evidence behind every number. Built in Cairo.
            </p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title} className="footer-col">
              <h2>{col.title}</h2>
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
