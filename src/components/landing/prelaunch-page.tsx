"use client";

import { useEffect, useState } from "react";

const LAUNCH_DATE = new Date(process.env.NEXT_PUBLIC_LAUNCH_DATE ?? "2026-04-01T00:00:00Z");

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(): TimeLeft | null {
  const diff = LAUNCH_DATE.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function PrelaunchPage() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(getTimeLeft);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = getTimeLeft();
      setTimeLeft(next);
      if (next === null) {
        clearInterval(interval);
        setTimeout(() => window.location.reload(), 1000);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6">
      {/* Blinking cursor */}
      <span
        role="img"
        className="inline-block h-8 w-4 animate-pulse bg-terminal"
        aria-label="Coming soon"
      />

      {/* Countdown */}
      {timeLeft && (
        <div className="mt-12 font-mono text-sm text-terminal/60">
          <span>{String(timeLeft.days).padStart(2, "0")}</span>
          <span className="mx-1 text-terminal/30">:</span>
          <span>{String(timeLeft.hours).padStart(2, "0")}</span>
          <span className="mx-1 text-terminal/30">:</span>
          <span>{String(timeLeft.minutes).padStart(2, "0")}</span>
          <span className="mx-1 text-terminal/30">:</span>
          <span>{String(timeLeft.seconds).padStart(2, "0")}</span>
        </div>
      )}

      {/* Product info */}
      <div className="mt-16 max-w-md text-center font-mono">
        <p className="text-terminal text-lg font-semibold tracking-tight">WOPR Bot</p>
        <p className="mt-3 text-sm text-terminal/60 leading-relaxed">
          An autonomous AI agent that runs your business while you sleep. Connects to Discord,
          Slack, Telegram, and 60+ other channels. Works with every major AI provider. You set the
          direction. It executes.
        </p>

        <div className="mt-8 border border-terminal/20 px-6 py-4">
          <p className="text-terminal/40 text-xs uppercase tracking-widest mb-3">Pricing</p>
          <div className="flex flex-col items-center text-sm text-terminal/70">
            <div>
              <span className="text-terminal font-semibold text-lg">$5</span>
              <span className="text-terminal/40 ml-1">/ month per bot</span>
            </div>
            <p className="text-xs text-terminal/40 mt-2">
              $5 signup credit included. Usage billed from credits.
            </p>
          </div>
        </div>

        <p className="mt-8 text-xs text-terminal/30">
          Questions?{" "}
          <a
            href="mailto:wopr@nefariousplan.com"
            className="text-terminal/50 underline underline-offset-2"
          >
            wopr@nefariousplan.com
          </a>
        </p>
      </div>
    </div>
  );
}
