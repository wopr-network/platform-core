import { BotIcon, ImageIcon, MicIcon, SmartphoneIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchPublicPricing } from "@/lib/api";
import { mergeApiRates, type PricingCapability, pricingData } from "@/lib/pricing-data";

const iconMap = {
  bot: BotIcon,
  mic: MicIcon,
  image: ImageIcon,
  smartphone: SmartphoneIcon,
} as const;

function formatPrice(price: number): string {
  if (price < 0.01) return `$${price.toFixed(3)}`;
  if (price < 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(2)}`;
}

export async function PricingPage() {
  // Fetch live rates from backend; fall back to static data on failure
  let capabilities: PricingCapability[];
  const apiData = await fetchPublicPricing();
  if (apiData) {
    capabilities = mergeApiRates(apiData.rates);
  } else {
    // Fallback: convert static pricingData.capabilities to PricingCapability shape
    capabilities = pricingData.capabilities.map((c) => ({
      category: c.category,
      icon: c.icon,
      models: c.models.map((m) => ({ name: m.name, unit: m.unit, price: m.price })),
    }));
  }

  return (
    <div className="bg-background text-foreground">
      {/* --- Header --- */}
      <section className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center">
        <Badge variant="terminal" className="mb-8">
          Transparent pricing
        </Badge>

        <h1 className="max-w-3xl text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
          You know exactly what you pay.
        </h1>

        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          No tiers. No gotchas. Your bot is{" "}
          <span className="text-terminal font-semibold">
            ${pricingData.bot_price.amount}/{pricingData.bot_price.period}
          </span>
          . Usage is billed at cost.
        </p>
      </section>

      {/* --- Bot Price Hero --- */}
      <section className="flex flex-col items-center justify-center px-6 pb-24 text-center">
        <Card className="w-full max-w-md border-terminal">
          <CardHeader className="items-center text-center">
            <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
              Your WOPR Bot
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-5xl font-bold text-terminal sm:text-6xl" data-testid="bot-price">
              ${pricingData.bot_price.amount}
              <span className="text-xl font-normal text-muted-foreground">
                /{pricingData.bot_price.period}
              </span>
            </p>
            <p className="text-muted-foreground">That&apos;s it for the bot. Usage below.</p>
          </CardContent>
        </Card>
      </section>

      {/* --- Capability Sections --- */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <h2 className="mb-12 text-center text-2xl font-bold tracking-tight sm:text-3xl">
          Pay per use. Nothing hidden.
        </h2>

        <div className="flex flex-col gap-12">
          {capabilities.map((capability) => {
            const Icon = iconMap[capability.icon];
            return (
              <div key={capability.category}>
                <div className="mb-4 flex items-center gap-3">
                  <Icon className="size-5 text-terminal" />
                  <h3 className="text-lg font-semibold">{capability.category}</h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {capability.models.map((model) => (
                    <Card key={model.name} className="border-border">
                      <CardContent className="flex items-center justify-between py-4">
                        <div>
                          <p className="font-medium">{model.name}</p>
                          <p className="text-sm text-muted-foreground">per {model.unit}</p>
                        </div>
                        <p className="text-lg font-bold text-terminal">
                          {formatPrice(model.price)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- Credits Explainer --- */}
      <section className="flex flex-col items-center justify-center gap-6 px-6 pb-24 text-center">
        <p className="max-w-lg text-lg text-muted-foreground">
          Your bot is ${pricingData.bot_price.amount}/mo. Usage is billed from credits. Free tier
          includes ${pricingData.signup_credit} signup credit.
        </p>
        <p className="text-sm text-muted-foreground">
          Credits in, credits out. You&apos;re always in control.
        </p>
      </section>

      {/* --- CTA --- */}
      <section className="flex min-h-[40dvh] flex-col items-center justify-center gap-8 px-6 text-center">
        <h2 className="max-w-2xl text-2xl font-bold leading-[1.1] tracking-tight sm:text-4xl">
          Five bucks. Your own WOPR Bot.
        </h2>

        <Button variant="terminal" size="lg" asChild>
          <Link href="/signup">Get Started</Link>
        </Button>

        <span className="mt-4 text-sm text-muted-foreground opacity-60">wopr.bot</span>
      </section>

      {/* --- Footer --- */}
      <footer className="flex justify-center gap-6 px-6 pb-8 text-sm text-muted-foreground">
        <Link href="/" className="underline underline-offset-4 hover:text-foreground">
          Home
        </Link>
        <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
          Terms
        </Link>
        <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
          Privacy
        </Link>
      </footer>
    </div>
  );
}
