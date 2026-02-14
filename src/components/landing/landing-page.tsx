"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TypingEffect } from "./typing-effect";

const scenarios = [
  {
    id: "research",
    text: "I told my WOPR Bot to research competitors, build a pitch deck, and email it to 50 investors. I went to sleep. I woke up to 3 replies.",
  },
  {
    id: "memory",
    text: "My WOPR Bot remembers every conversation I\u2019ve ever had with it. I said \u2018remember when we talked about that pricing idea last month?\u2019 It did.",
  },
  {
    id: "voice",
    text: "I run my business from Discord voice chat while I drive. My WOPR Bot takes the calls I can\u2019t.",
  },
  {
    id: "multi",
    text: "I have 3 bots. One runs my store. One writes my content. One handles customer support. My total payroll: $15/month.",
  },
  {
    id: "deploy",
    text: "My WOPR Bot wrote the code, tested it, deployed it, and messaged me on Discord when it was live. I was at dinner.",
  },
  {
    id: "website",
    text: "I told my bot \u2018make me a website.\u2019 It asked me 3 questions. 10 minutes later I had a site live at a real URL.",
  },
];

const tiers = [
  { name: "Free", line: "Kick the tires. See what\u2019s possible." },
  { name: "$5/month", line: "Where most people live. This is the one." },
  { name: "Pay as you go", line: "No ceiling. Build as big as you want." },
];

export function LandingPage() {
  return (
    <div className="bg-background text-foreground">
      {/* ─── Above the fold ─── */}
      <section className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
        <h1 className="max-w-4xl text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          <span className="sr-only">What would you do with your own WOPR Bot?</span>
          <TypingEffect text="What would you do with your own WOPR Bot?" speed={40} />
        </h1>

        <div className="mt-12">
          <Button variant="terminal" size="lg" asChild>
            <Link href="/signup">Get yours</Link>
          </Button>
        </div>
      </section>

      {/* ─── Scenarios ─── */}
      {scenarios.map((scenario) => (
        <section key={scenario.id} className="flex min-h-[100dvh] items-center justify-center px-6">
          <blockquote className="max-w-3xl text-xl leading-relaxed text-terminal sm:text-2xl md:text-3xl">
            &ldquo;{scenario.text}&rdquo;
          </blockquote>
        </section>
      ))}

      {/* ─── Pricing ─── */}
      <section className="flex min-h-[100dvh] flex-col items-center justify-center gap-16 px-6 text-center">
        <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl md:text-2xl">
          Your WOPR Bot is a supercomputer. You customize it. You control what it spends. No
          surprise bills. Ever.
        </p>

        <div className="flex flex-col gap-10">
          {tiers.map((tier) => (
            <div key={tier.name} className="text-center">
              <p className="text-2xl font-bold text-terminal sm:text-3xl">{tier.name}</p>
              <p className="mt-2 text-muted-foreground">{tier.line}</p>
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          Credits in, credits out. You&apos;re always in control.
        </p>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="flex min-h-[60dvh] flex-col items-center justify-center gap-8 px-6 text-center">
        <h2 className="max-w-3xl text-2xl font-bold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl">
          Did you get your WOPR Bot yet?
        </h2>

        <Button variant="terminal" size="lg" asChild>
          <Link href="/signup">Get yours</Link>
        </Button>

        <span className="mt-8 text-sm text-muted-foreground opacity-60">wopr.bot</span>
      </section>

      {/* ─── Footer ─── */}
      <footer className="flex justify-center gap-6 px-6 pb-8 text-sm text-muted-foreground">
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
