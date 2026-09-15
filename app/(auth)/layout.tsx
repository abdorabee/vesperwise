import Link from "next/link";

import VesperWiseLogo from "@/components/vesperwise-logo";

const CAPABILITIES = [
  {
    title: "Account intent scores",
    description: "See a clear 0-100 view of purchase readiness for each company.",
  },
  {
    title: "Evidence behind every score",
    description: "Review the funding, hiring, news, technology, and web signals that shaped it.",
  },
  {
    title: "Recommended next actions",
    description: "Turn current account evidence into a practical sales follow-up.",
  },
] as const;

function LeftPanel() {
  return (
    <div
      className="auth-left-panel"
      style={{
        width: "100%",
        minHeight: "100dvh",
        padding: "44px",
        display: "flex",
        flexDirection: "column",
        background: "var(--card)",
        borderRight: "1px solid var(--border)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-160px",
          left: "-180px",
          width: "620px",
          height: "620px",
          borderRadius: "50%",
          background: "var(--brand-soft)",
          filter: "blur(240px)",
          pointerEvents: "none",
        }}
      />

      <Link
        href="/"
        aria-label="VesperWise home"
        style={{
          display: "inline-flex",
          width: "fit-content",
          textDecoration: "none",
          position: "relative",
          zIndex: 1,
        }}
      >
        <VesperWiseLogo size={48} variant="wordmark" />
      </Link>

      <div style={{ position: "relative", zIndex: 1, margin: "auto 0" }}>
        <p
          style={{
            marginBottom: "18px",
            color: "var(--brand-active)",
            fontFamily: "var(--font-sans)",
            fontSize: "11px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Sales intelligence you can inspect
        </p>
        <h1
          style={{
            maxWidth: "430px",
            margin: 0,
            color: "var(--foreground)",
            fontSize: "clamp(38px, 4.3vw, 60px)",
            fontWeight: 650,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
          }}
        >
          Know why an account is ready before you reach out.
        </h1>
        <p
          style={{
            maxWidth: "420px",
            marginTop: "22px",
            color: "var(--muted-foreground)",
            fontSize: "15px",
            lineHeight: 1.7,
          }}
        >
          VesperWise combines current company signals into an explainable score, then gives your team a clear next move.
        </p>

        <div style={{ marginTop: "34px", maxWidth: "440px" }}>
          {CAPABILITIES.map((capability) => (
            <div
              key={capability.title}
              style={{
                display: "grid",
                gridTemplateColumns: "20px 1fr",
                gap: "12px",
                padding: "16px 0",
                borderTop: "1px solid var(--border)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  marginTop: "4px",
                  color: "var(--brand-active)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "11px",
                }}
              >
                ✓
              </span>
              <div>
                <h2 style={{ margin: 0, color: "var(--foreground)", fontSize: "14px", fontWeight: 600 }}>
                  {capability.title}
                </h2>
                <p style={{ margin: "5px 0 0", color: "var(--muted-foreground)", fontSize: "13px", lineHeight: 1.55 }}>
                  {capability.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p
        style={{
          position: "relative",
          zIndex: 1,
          margin: 0,
          color: "var(--muted-foreground)",
          fontFamily: "var(--font-sans)",
          fontSize: "11px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Start with 20 free credits · no credit card
      </p>
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="auth-shell"
      style={{
        minHeight: "100dvh",
        background: "var(--background)",
        display: "flex",
        fontFamily: "var(--font-sans)",
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .auth-left { display: none !important; }
          .auth-right { padding: 32px 20px !important; }
        }
        .auth-right > * {
          position: relative;
          z-index: 1;
        }
      `}</style>
      <div className="auth-left" style={{ display: "flex", flex: "0 0 44%" }}>
        <LeftPanel />
      </div>

      <div
        className="auth-right"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 32px",
          overflowY: "auto",
          position: "relative",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "auto 12% 10% auto",
            width: "360px",
            height: "360px",
            borderRadius: "999px",
            background: "var(--brand-soft)",
            filter: "blur(150px)",
            pointerEvents: "none",
          }}
        />
        {children}
      </div>
    </div>
  );
}
