import type { Metadata } from "next";
import { StatusPage } from "@/components/status/status-page";

export const metadata: Metadata = {
  title: "Platform Status — WOPR",
  description: "Real-time health and uptime status for the WOPR platform.",
  openGraph: {
    title: "Platform Status — WOPR",
    description: "Real-time health and uptime status for the WOPR platform.",
    url: "https://wopr.bot/status",
  },
};

export default function Page() {
  return <StatusPage />;
}
