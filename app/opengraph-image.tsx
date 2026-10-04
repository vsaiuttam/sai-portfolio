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
        {/* The SU mark. */}
        <div
          style={{
            position: "absolute",
            right: 100,
            top: 195,
            width: 240,
            height: 240,
            borderRadius: 54,
            background: "#f6f3ea",
            color: "#1f2f58",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 118,
            fontWeight: 700,
            fontFamily: "serif",
            letterSpacing: -3,
          }}
        >
          SU
          <div style={{ position: "absolute", right: 30, top: 30, width: 34, height: 34, borderRadius: 17, background: "#e0523a" }} />
        </div>
      </div>
    ),
    size,
  );
}
