import type { Metadata } from "next";
import { StatusPage } from "@/components/status/status-page";
import { SITE_URL } from "@/lib/api-config";

export const metadata: Metadata = {
  title: "Platform Status — WOPR",
  description: "Real-time health and uptime status for the WOPR platform.",
  openGraph: {
    title: "Platform Status — WOPR",
    description: "Real-time health and uptime status for the WOPR platform.",
    url: `${SITE_URL}/status`,
  },
};

export default function Page() {
  return <StatusPage />;
}
