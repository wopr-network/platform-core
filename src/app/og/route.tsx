import { ImageResponse } from "next/og";

export const runtime = "edge";
export async function GET() {
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
