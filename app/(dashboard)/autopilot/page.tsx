import Link from "next/link";
import { Zap } from "lucide-react";

export const metadata = { title: "Autopilot" };

export default function AutopilotPage() {
  return (
    <div className="ap-coming-soon">
      <div className="ap-coming-soon-icon">
        <Zap aria-hidden />
      </div>
      <h1 className="page-title">Autopilot</h1>
      <p className="page-sub" style={{ maxWidth: 420, textAlign: "center" }}>
        Automated workflows that score accounts on a schedule and fire actions when intent signals match.
      </p>
      <span className="ap-coming-soon-badge">Coming soon</span>
      <p className="ap-coming-soon-note">
        We&apos;re finishing the workflow builder and execution engine. Score, watchlist, and history are ready today.
      </p>
      <Link href="/score" className="tb-btn outlined" style={{ marginTop: 8 }}>
        Back to dashboard
      </Link>
    </div>
  );
}
