import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";
import { SITE_URL } from "@/lib/api-config";

export const metadata: Metadata = {
  title: "WOPR Bot — Shall we play a game?",
  description:
    "A $5/month supercomputer that runs your business. No really. We know because we run ours on one.",
  openGraph: {
    title: "WOPR Bot — Shall we play a game?",
    description:
      "A $5/month supercomputer that runs your business. No really. We know because we run ours on one.",
    url: SITE_URL,
    siteName: "WOPR Bot",
    type: "website",
    images: [
      {
        url: "/og",
        width: 1200,
        height: 630,
        alt: "WOPR Bot — Shall we play a game?",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WOPR Bot — Shall we play a game?",
    description:
      "A $5/month supercomputer that runs your business. No really. We know because we run ours on one.",
    images: ["/og"],
  },
};

export default function Page() {
  return <LandingPage />;
}
