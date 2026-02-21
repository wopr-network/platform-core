import type { Metadata } from "next";
import { PricingPage } from "@/components/pricing/pricing-page";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Your WOPR Bot is $5/month. Usage billed at cost. No tiers. No gotchas.",
  openGraph: {
    title: "Pricing -- WOPR Bot",
    description: "Your WOPR Bot is $5/month. Usage billed at cost. No tiers. No gotchas.",
    url: "https://wopr.bot/pricing",
  },
};

export default async function Page() {
  return <PricingPage />;
}
