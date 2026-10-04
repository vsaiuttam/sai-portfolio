import { ImageResponse } from "next/og";
import profile from "@/data/profile.json";

// The card shown when the site is shared (LinkedIn, WhatsApp, Slack, X).
export const alt = `${profile.name}, ${profile.title} at ${profile.company}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#1f2f58",
          backgroundImage: "radial-gradient(circle at 85% -10%, rgba(255,255,255,0.12) 0, rgba(255,255,255,0) 45%)",
          color: "#f3f1ea",
          fontFamily: "serif",
          padding: "72px 80px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 26, letterSpacing: 6, opacity: 0.75, fontFamily: "monospace" }}>
            PORTFOLIO
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>Sai Uttam Dutt</div>
            <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, color: "#9fb6e8" }}>Veeravajhula</div>
            <div style={{ display: "flex", marginTop: 28, fontSize: 32, opacity: 0.9, fontFamily: "sans-serif" }}>{`${profile.title} · ${profile.company}`}</div>
            <div style={{ marginTop: 10, fontSize: 28, color: "#f0a3a8", fontFamily: "sans-serif" }}>AI Engineer · Agentic AI · Oracle Fusion</div>
          </div>
          <div style={{ display: "flex", fontSize: 24, opacity: 0.7, fontFamily: "monospace" }}>{profile.site.replace("https://", "")}</div>
        </div>
        {/* The ensō mark. */}
        <svg width="260" height="260" viewBox="0 0 64 64" style={{ position: "absolute", right: 90, top: 185 }}>
          <path d="M41 9.5C28 5 13 12 10 27c-3 15 8 28 23 28 13 0 22-9 23-21 .6-7-2-13.5-6.5-17.8" fill="none" stroke="#f3f1ea" strokeWidth="5" strokeLinecap="round" />
          <circle cx="41.5" cy="9.6" r="3.2" fill="#e0523a" />
        </svg>
      </div>
    ),
    size,
  );
}
