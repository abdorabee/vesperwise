import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "VesperWise — B2B Intent Scoring for MENA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#000000",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: -100,
            left: -100,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(223,255,0,0.16) 0%, transparent 70%)",
          }}
        />

        {/* Brand */}
        <div
          style={{
            fontSize: 18,
            letterSpacing: "0.3em",
            color: "#DFFF00",
            marginBottom: 32,
            textTransform: "uppercase",
          }}
        >
          [ VESPER WISE ]
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: "#FFFFFF",
            lineHeight: 1.1,
            marginBottom: 24,
            maxWidth: 900,
          }}
        >
          Score Companies for{" "}
          <span style={{ color: "#DFFF00" }}>Buying Intent</span>
        </div>

        {/* Sub-copy */}
        <div
          style={{
            fontSize: 24,
            color: "#A0A0A0",
            marginBottom: 48,
            maxWidth: 800,
            lineHeight: 1.5,
          }}
        >
          One API call. 4 dated triggers. Explicit coverage. 0–100 intent score.
          100× cheaper than 6sense.
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 48 }}>
          {[
            { value: "$29/mo", label: "Starting price" },
            { value: "4 triggers", label: "Funding · Hiring · News · Technology" },
            { value: "6h", label: "Personalized result cache" },
          ].map((stat) => (
            <div key={stat.label} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: "#DFFF00" }}>
                {stat.value}
              </span>
              <span style={{ fontSize: 14, color: "#666666", marginTop: 4, letterSpacing: "0.05em" }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Domain badge */}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            right: 80,
            fontSize: 16,
            color: "#666666",
            letterSpacing: "0.15em",
          }}
        >
          vesperwise.com
        </div>
      </div>
    ),
    { ...size }
  );
}
