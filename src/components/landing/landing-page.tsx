"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LandingNav } from "./landing-nav";
import { PortfolioChart } from "./portfolio-chart";
import { StorySections } from "./story-sections";
import { TerminalSequence } from "./terminal-sequence";

function CtaBlock({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className ?? ""}`}>
      <Button variant="terminal" size="lg" asChild>
        <Link href="/signup">Start for $5/month</Link>
      </Button>
      <span className="mt-4 font-mono text-xs text-terminal/40">Your WOPR Bot is waiting.</span>
    </div>
  );
}

export function LandingPage() {
  const [animationDone, setAnimationDone] = useState(false);
  const milestoneRef = useRef<(() => void) | null>(null);
  const fadeStartRef = useRef<(() => void) | null>(null);

  return (
    <div className="bg-black font-mono">
      <LandingNav />
      {/* Hero — Terminal Animation */}
      <div className="relative bg-black">
        <PortfolioChart onMilestoneRef={milestoneRef} onFadeStartRef={fadeStartRef} />
        <TerminalSequence
          onComplete={() => setAnimationDone(true)}
          onMilestone={() => milestoneRef.current?.()}
          onFadeStart={() => fadeStartRef.current?.()}
        />
      </div>

      {/* Top CTA — fades in after animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={animationDone ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
        className="bg-black"
      >
        <CtaBlock className="py-16" />
      </motion.div>

      {/* Story Sections */}
      <div className="bg-black">
        <StorySections />
      </div>

      {/* Bottom CTA — always visible (scrolled to) */}
      <div className="bg-black">
        <CtaBlock className="py-24" />
      </div>

      {/* Footer */}
      <footer className="border-t border-terminal/10 bg-black px-4 py-12">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
          <span className="font-mono text-sm font-semibold text-terminal/60">WOPR Bot</span>
          <div className="flex gap-6 font-mono text-xs text-terminal/30">
            <Link href="/privacy" className="underline underline-offset-4 hover:text-terminal/60">
              Privacy
            </Link>
            <Link href="/terms" className="underline underline-offset-4 hover:text-terminal/60">
              Terms
            </Link>
          </div>
          <span className="font-mono text-xs text-terminal/20">wopr.bot</span>
        </div>
      </footer>
    </div>
  );
}
