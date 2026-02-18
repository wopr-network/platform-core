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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-black">
      {/* Blinking cursor -- the only visible element */}
      <span
        role="img"
        className="inline-block h-8 w-4 animate-pulse bg-terminal"
        aria-label="Coming soon"
      />

      {/* Countdown -- visible only if timeLeft exists */}
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
    </div>
  );
}
