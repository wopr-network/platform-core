import { ImageResponse } from "next/og";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const LAUNCH_DATE = new Date(process.env.NEXT_PUBLIC_LAUNCH_DATE ?? "2026-04-01T00:00:00Z");

export async function GET() {
  const isPrelaunch = new Date() < LAUNCH_DATE;

  if (isPrelaunch) {
    return new ImageResponse(
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#000000",
        }}
      >
        <div style={{ fontSize: "48px", color: "#00CC33" }}>wopr.bot</div>
      </div>,
      { width: 1200, height: 630 },
    );
  }

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: "#000000",
        padding: "80px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "32px",
        }}
      >
        <div
          style={{
            fontSize: "56px",
            fontWeight: 700,
            color: "#00FF41",
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          What would you do with your own WOPR Bot?
        </div>
        <div style={{ fontSize: "32px", color: "#A0A0A0" }}>$5/month. wopr.bot</div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    },
  );
}
