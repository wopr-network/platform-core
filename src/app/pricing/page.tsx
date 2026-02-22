import type { Metadata } from "next";
import { PricingPage } from "@/components/pricing/pricing-page";

export const metadata: Metadata = {
  title: "Pricing — WOPR pays for itself",
  description:
    "Every day, WOPR distributes credits back to active users. The bigger the community grows, the more you receive. Early users get the most.",
  openGraph: {
    title: "Pricing — WOPR pays for itself",
    description:
      "Every day, WOPR distributes credits back to active users. The bigger the community grows, the more you receive.",
    url: "https://wopr.bot/pricing",
  },
};

export default async function Page() {
  return <PricingPage />;
}
