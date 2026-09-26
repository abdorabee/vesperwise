import type { Metadata } from "next";
import Link from "next/link";
import LandingNav from "@/components/landing/LandingNav";
import SiteFooter from "@/components/site-footer";
import { CHANGELOG, formatChangelogDate, groupChangelogByMonth } from "@/lib/changelog";

const CANONICAL = "https://www.vesperwise.com/changelog";

export const metadata: Metadata = {
  title: "Changelog",
  description: "New features, improvements and fixes shipped to VesperWise.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    siteName: "VesperWise",
    url: CANONICAL,
    title: "Changelog — VesperWise",
    description: "New features, improvements and fixes shipped to VesperWise.",
  },
};

export default function ChangelogPage() {
  const groups = groupChangelogByMonth(CHANGELOG);

  return (
    <>
      <LandingNav />
      <main className="changelog-page">
        <header className="changelog-hero">
          <p className="changelog-eyebrow">
            <span aria-hidden="true">✦</span> Changelog
          </p>
          <h1>What&apos;s new in VesperWise</h1>
          <p className="lead">
            New features, improvements and fixes, newest first. Every entry here has shipped.
          </p>
        </header>

        {groups.map((group) => (
          <section key={group.month} className="changelog-month" aria-labelledby={`cl-${group.entries[0].date}`}>
            <h2 id={`cl-${group.entries[0].date}`} className="changelog-month-label">{group.month}</h2>
            <ol className="changelog-list">
              {group.entries.map((entry) => (
                <li key={entry.date} className="changelog-entry" id={entry.date}>
                  <time className="changelog-date" dateTime={entry.date}>
                    {formatChangelogDate(entry.date)}
                  </time>
                  <div className="changelog-body">
                    <div className="changelog-title-row">
                      <h3>{entry.title}</h3>
                      <span className={`changelog-tag changelog-tag-${entry.tag.toLowerCase()}`}>{entry.tag}</span>
                    </div>
                    <p className="changelog-summary">{entry.summary}</p>
                    <ul className="changelog-items">
                      {entry.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <footer className="changelog-cta">
          <p>
            Questions or feedback about an update?{" "}
            <Link href="/contact">Get in touch</Link> or read the <Link href="/docs">API docs</Link>.
          </p>
        </footer>
      </main>
      <SiteFooter />
    </>
  );
}
