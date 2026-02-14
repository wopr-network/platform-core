import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "WOPR Bot — What would you do with your own WOPR Bot?",
  description: "What would you do with your own WOPR Bot? $5/month. wopr.bot",
  openGraph: {
    title: "WOPR Bot",
    description: "What would you do with your own WOPR Bot? $5/month.",
    url: "https://wopr.bot",
    siteName: "WOPR Bot",
    type: "website",
    images: [
      {
        url: "/og",
        width: 1200,
        height: 630,
        alt: "What would you do with your own WOPR Bot? $5/month. wopr.bot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WOPR Bot",
    description: "What would you do with your own WOPR Bot? $5/month.",
    images: ["/og"],
  },
};

export default function Page() {
  return <LandingPage />;
}
