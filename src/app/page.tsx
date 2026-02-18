import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";
import { PrelaunchPage } from "@/components/landing/prelaunch-page";

export const dynamic = "force-dynamic";

const LAUNCH_DATE = new Date(process.env.NEXT_PUBLIC_LAUNCH_DATE ?? "2026-04-01T00:00:00Z");

const isPrelaunch = () => new Date() < LAUNCH_DATE;

export function generateMetadata(): Metadata {
  if (isPrelaunch()) {
    return {
      title: "wopr.bot",
      description: "wopr.bot",
      openGraph: {
        title: "wopr.bot",
        description: "wopr.bot",
        url: "https://wopr.bot",
        siteName: "wopr.bot",
        type: "website",
        images: [
          {
            url: "/og",
            width: 1200,
            height: 630,
            alt: "wopr.bot",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: "wopr.bot",
        description: "wopr.bot",
        images: ["/og"],
      },
    };
  }

  return {
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
}

export default function Page() {
  return isPrelaunch() ? <PrelaunchPage /> : <LandingPage />;
}
