import Link from "next/link";
import { Key } from "lucide-react";

export const metadata = { title: "API keys" };

export default function ApiKeysPage() {
  return (
    <div className="ap-coming-soon">
      <div
        className="ap-coming-soon-icon"
        style={{ background: "rgba(223,255,0,0.12)", color: "var(--accent-2)" }}
      >
        <Key aria-hidden />
      </div>
      <h1 className="page-title">API Keys</h1>
      <p className="page-sub" style={{ maxWidth: 420, textAlign: "center" }}>
        Generate keys for programmatic access to intent scoring, bulk jobs, and watchlist endpoints.
      </p>
      <span className="ap-coming-soon-badge">Coming soon</span>
      <p className="ap-coming-soon-note">
        Key creation and revocation are being wired into the dashboard. Explore the REST API reference
        in the meantime — score endpoints are live today.
      </p>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/docs" className="btn-primary">
          API reference
        </Link>
        <Link href="/score" className="tb-btn outlined">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
